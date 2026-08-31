import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { hash } from 'bcryptjs'
import { logAudit } from '@/lib/audit'

export const runtime = 'nodejs'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const session = await auth()

    if (!session?.user?.escolaId || !session.user.isSuperuser) {
      return NextResponse.json({ message: 'Não autorizado' }, { status: 403 })
    }

    // Verificar se o usuário existe E pertence à escola do superuser logado -
    // checado antes de qualquer mutação, para não editar/vincular disciplinas
    // de um usuário de outra escola.
    const existingUser = await prisma.user.findUnique({
      where: { id, escolaId: session.user.escolaId }
    })

    if (!existingUser) {
      return NextResponse.json({ message: 'Usuário não encontrado' }, { status: 404 })
    }

    const data = await request.json()
    const {
      name, email, username, password,
      isSuperuser, isDirecao, isStaff, isAEE, isActive, disciplinasIds
    } = data

    // Regra de Exclusividade: Se houver novas disciplinas, remover de outros professores
    if (disciplinasIds && Array.isArray(disciplinasIds) && disciplinasIds.length > 0) {
      const placeholders = disciplinasIds.map((_, i) => `$${i + 1}`).join(',')
      await prisma.$executeRawUnsafe(`
        DELETE FROM "_DisciplinaUsuarios"
        WHERE "A" IN (${placeholders}) AND "B" != $${disciplinasIds.length + 1}
      `, ...disciplinasIds, id)
    }

    const updateData: any = {}
    if (name !== undefined) updateData.name = name
    if (email !== undefined) {
      updateData.email = email
      updateData.username = email
    }
    if (isSuperuser !== undefined) updateData.isSuperuser = isSuperuser
    if (isDirecao !== undefined) updateData.isDirecao = isDirecao
    if (isStaff !== undefined) updateData.isStaff = isStaff
    if (isAEE !== undefined) updateData.isAEE = isAEE
    if (isActive !== undefined) updateData.isActive = isActive
    
    if (disciplinasIds !== undefined) {
      updateData.disciplinasPermitidas = {
        set: disciplinasIds.map((id: string) => ({ id }))
      }
    }

    if (password && password.trim() !== '') {
      updateData.password = await hash(password, 10)
    }

    try {
      // Tentar atualização normal via Prisma Client
        await prisma.user.update({
          where: { id },
          data: updateData
        })
        
        await logAudit(
          session.user.id,
          'USUARIO',
          id,
          'UPDATE',
          { fields: Object.keys(updateData).filter(k => k !== 'password') }
        )

        return NextResponse.json({ message: 'Usuário atualizado com sucesso' })
    } catch (prismaError: any) {
      console.warn('Prisma Client falhou no UPDATE, tentando fallback via SQL bruto...', prismaError.message)
      
      // Fallback via SQL Bruto para campos que o Prisma pode não reconhecer por cache
      const sqlFields: string[] = []
      const values: any[] = []
      let valIdx = 1

      if (name !== undefined) { sqlFields.push(`name = $${valIdx++}`); values.push(name) }
      if (email !== undefined) { 
        sqlFields.push(`email = $${valIdx++}`); values.push(email)
        sqlFields.push(`username = $${valIdx++}`); values.push(email) 
      }
      if (isSuperuser !== undefined) { sqlFields.push(`is_superuser = $${valIdx++}`); values.push(!!isSuperuser) }
      if (isDirecao !== undefined) { sqlFields.push(`is_direcao = $${valIdx++}`); values.push(!!isDirecao) }
      if (isStaff !== undefined) { sqlFields.push(`is_staff = $${valIdx++}`); values.push(!!isStaff) }
      if (isAEE !== undefined) { sqlFields.push(`is_aee = $${valIdx++}`); values.push(!!isAEE) }
      if (isActive !== undefined) { sqlFields.push(`is_active = $${valIdx++}`); values.push(!!isActive) }
      if (updateData.password) { sqlFields.push(`password = $${valIdx++}`); values.push(updateData.password) }

      if (sqlFields.length > 0) {
        values.push(id)
        await prisma.$executeRawUnsafe(`
          UPDATE "users" SET ${sqlFields.join(', ')}, updated_at = NOW() WHERE id = $${valIdx}
        `, ...values)
      }

      // Disciplinas precisam ser tratadas separadamente se houver alteração
      if (disciplinasIds !== undefined) {
        await prisma.$executeRawUnsafe(`DELETE FROM "_DisciplinaUsuarios" WHERE "B" = $1`, id)
        for (const dId of disciplinasIds) {
          await prisma.$executeRawUnsafe(`INSERT INTO "_DisciplinaUsuarios" ("A", "B") VALUES ($1, $2)`, dId, id)
        }
      }

      await logAudit(
        session.user.id,
        'USUARIO',
        id,
        'UPDATE',
        { method: 'SQL_FALLBACK', fields: sqlFields.map((f: string) => f.split(' ')[0]) }
      )

      return NextResponse.json({ message: 'Usuário atualizado via SQL (Fallback)' })
    }

  } catch (error) {
    console.error('Erro ao atualizar usuário:', error)
    return NextResponse.json(
      { message: 'Erro ao atualizar usuário' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const session = await auth()

    if (!session?.user?.escolaId || !session.user.isSuperuser) {
      return NextResponse.json({ message: 'Não autorizado' }, { status: 403 })
    }

    // Impedir que o usuário se exclua
    if (session.user.id === id) {
      return NextResponse.json({ message: 'Você não pode excluir seu próprio usuário' }, { status: 400 })
    }

    const userToDelete = await prisma.user.findUnique({ where: { id, escolaId: session.user.escolaId } })
    if (!userToDelete) {
      return NextResponse.json({ message: 'Usuário não encontrado' }, { status: 404 })
    }

    try {
      await prisma.$transaction(async (tx) => {
        // 1. Limpezas seguras de relacionamentos menores/transitórios
        await tx.auditLog.deleteMany({ where: { userId: id } })
        await tx.messageRead.deleteMany({ where: { userId: id } })
        await tx.messageDelete.deleteMany({ where: { userId: id } })
        
        // Relacionamentos muitos-para-muitos explícitos via SQL (Prisma às vezes não faz cascade manual a tempo)
        await tx.$executeRawUnsafe(`DELETE FROM "_DisciplinaUsuarios" WHERE "B" = $1`, id)
        await tx.$executeRawUnsafe(`DELETE FROM "_TurmaUsuarios" WHERE "B" = $1`, id)

        // 2. Apagar TODOS os vínculos pedagógicos diretos criados pelo usuário (Forçar Exclusão Estrita)
        await tx.ocorrencia.deleteMany({ where: { registradoPorId: id } })
        await tx.planoEnsino.deleteMany({ where: { professorId: id } })
        
        // Excluir mensagens enviadas pelo usuário (Pode apagar threads)
        await tx.message.deleteMany({ where: { senderId: id } })

        // Excluir questões criadas (Isto excluirá as questões do banco de questões)
        await tx.questao.deleteMany({ where: { professorId: id } })

        // 3. Desvincular chaves estrangeiras opcionais
        await tx.notaFinal.updateMany({ where: { modifiedById: id }, data: { modifiedById: null } })
        await tx.notaFinalAudit.updateMany({ where: { modifiedById: id }, data: { modifiedById: null } })
        await tx.prova.updateMany({ where: { professorCriadorId: id }, data: { professorCriadorId: null } })
        await tx.prova.updateMany({ where: { savedByUserId: id }, data: { savedByUserId: null } })
        await tx.questao.updateMany({ where: { adminFeedbackId: id }, data: { adminFeedbackId: null } })

        // 4. Deletar o usuário definitivamente
        await tx.user.delete({ where: { id } })
      })
    } catch (e: any) {
      console.error('Erro forçado P2003 durante exclusão:', e)
      return NextResponse.json(
        { message: 'Erro crítico ao excluir o usuário. Algumas amarrações no banco de dados ainda existem (Ex: Notas Lançadas fortemente vinculadas).' }, 
        { status: 400 }
      )
    }

    await logAudit(
      session.user.id,
      'USUARIO',
      id,
      'DELETE',
      { name: userToDelete.name, email: userToDelete.email }
    )

    return NextResponse.json({ message: 'Usuário excluído com sucesso' })

  } catch (error) {
    console.error('Erro ao excluir usuário:', error)
    return NextResponse.json(
      { message: 'Erro ao excluir usuário' },
      { status: 500 }
    )
  }
}
