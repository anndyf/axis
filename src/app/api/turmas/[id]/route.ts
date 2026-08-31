import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

export const runtime = 'nodejs'

// GET single turma
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const session = await auth()

    if (!session?.user?.escolaId) {
      return NextResponse.json({ message: 'Não autorizado' }, { status: 401 })
    }

    const turma = await prisma.turma.findUnique({
      where: { id, escolaId: session.user.escolaId }
    })

    if (!turma) {
      return NextResponse.json({ message: 'Turma não encontrada' }, { status: 404 })
    }

    return NextResponse.json(turma)
  } catch (error) {
    console.error('Erro ao buscar turma:', error)
    return NextResponse.json(
      { message: 'Erro ao buscar turma' },
      { status: 500 }
    )
  }
}

// PUT update turma
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const session = await auth()

    if (!session?.user?.escolaId || (!session.user.isSuperuser && !session.user.isDirecao)) {
      return NextResponse.json({ message: 'Não autorizado' }, { status: 401 })
    }

    const turmaExistente = await prisma.turma.findUnique({ where: { id, escolaId: session.user.escolaId } })
    if (!turmaExistente) {
      return NextResponse.json({ message: 'Turma não encontrada' }, { status: 404 })
    }

    const { nome, curso, turno, modalidade, serie, numero } = await request.json()

    if (!nome || nome.trim() === '') {
      return NextResponse.json(
        { message: 'Nome da turma é obrigatório' },
        { status: 400 }
      )
    }

    try {
      const turma = await prisma.turma.update({
        where: { id },
        data: {
          nome: nome.trim(),
          curso: curso?.trim(),
          turno: turno?.trim(),
          modalidade: modalidade?.trim(),
          serie: serie?.toString(),
          numero: numero ? parseInt(numero.toString()) : null
        }
      })
      revalidatePath('/dashboard/turmas')
      revalidatePath(`/dashboard/turmas/${id}/editar`)
      return NextResponse.json(turma)
    } catch (prismaError: any) {
      console.warn('Prisma falhou ao atualizar turma, tentando SQL bruto...', prismaError.message)
      
      const numVal = numero ? parseInt(numero.toString()) : null
      
      await prisma.$executeRawUnsafe(`
        UPDATE "turmas" 
        SET nome = $1, curso = $2, turno = $3, modalidade = $4, serie = $5, numero = $6, updated_at = NOW()
        WHERE id = $7
      `, nome.trim(), curso?.trim(), turno?.trim(), modalidade?.trim(), serie?.toString(), numVal, id)

      revalidatePath('/dashboard/turmas')
      revalidatePath(`/dashboard/turmas/${id}/editar`)
      return NextResponse.json({ id, nome, message: 'Turma atualizada via SQL' })
    }
  } catch (error) {
    console.error('Erro ao atualizar turma:', error)
    return NextResponse.json(
      { message: 'Erro ao atualizar turma' },
      { status: 500 }
    )
  }
}

// DELETE turma
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const resolvedParams = await params
  const id = resolvedParams.id
  
  if (!id || id === 'undefined') {
    return NextResponse.json({ message: 'ID da turma inválido ou ausente' }, { status: 400 })
  }
  try {
    const session = await auth()

    if (!session?.user?.escolaId || (!session.user.isSuperuser && !session.user.isDirecao)) {
      return NextResponse.json({ message: 'Não autorizado' }, { status: 401 })
    }

    // Verificar se a turma existe, pertence a escola do usuario logado, e ver
    // se ha estudantes ou disciplinas vinculados
    const turma = await prisma.turma.findUnique({
      where: { id, escolaId: session.user.escolaId },
      include: {
        _count: {
          select: {
            estudantes: true,
            disciplinas: true
          }
        }
      }
    })

    if (!turma) {
      return NextResponse.json({ message: 'Turma não encontrada' }, { status: 404 })
    }

    console.log('API DELETE: Iniciando exclusão da turma ID:', id)

    // Excluir tudo em cascata manualmente para garantir que as constraints não bloqueiem
    try {
      // DEFININDO UM TIMEOUT MAIOR (30 SEGUNDOS) PARA CASO O BANCO ESTEJA LENTO
      await prisma.$transaction(async (tx) => {
        console.log('API DELETE: Removendo notas vinculadas aos estudantes da turma...')
        await tx.notaFinal.deleteMany({
          where: { estudante: { turmaId: id } }
        })

        console.log('API DELETE: Removendo notas vinculadas às disciplinas da turma...')
        await tx.notaFinal.deleteMany({
          where: { disciplina: { turmaId: id } }
        })

        console.log('API DELETE: Removendo estudantes da turma...')
        await tx.estudante.deleteMany({
          where: { turmaId: id }
        })

        console.log('API DELETE: Removendo disciplinas da turma...')
        await tx.disciplina.deleteMany({
          where: { turmaId: id }
        })

        console.log('API DELETE: Removendo a turma final...')
        await tx.turma.delete({
          where: { id }
        })
      }, {
        maxWait: 5000, // Tempo máximo para esperar por uma conexão no pool
        timeout: 30000 // Tempo máximo para a transação completa (30 segundos)
      })

      revalidatePath('/dashboard/turmas')
      console.log('API DELETE: Turma excluída com sucesso!')
      return NextResponse.json({ message: 'Turma e todos os dados vinculados excluídos com sucesso' })
    } catch (dbError: any) {
      console.error('API DELETE: Erro de banco de dados ao excluir:', dbError.message)
      return NextResponse.json(
        { message: 'Erro ao excluir do banco: ' + dbError.message },
        { status: 500 }
      )
    }
  } catch (error: any) {
    console.error('API DELETE: Erro fatal ao excluir turma:', error.message)
    return NextResponse.json(
      { message: 'Erro fatal: ' + error.message },
      { status: 500 }
    )
  }
}
