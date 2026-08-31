import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user?.escolaId || !session.user.isSuperuser) {
      return NextResponse.json({ message: 'Não autorizado' }, { status: 403 })
    }
    const escolaId = session.user.escolaId

    const { fromUserId, toUserId } = await request.json()

    if (!fromUserId || !toUserId) {
      return NextResponse.json({ message: 'IDs de usuário são obrigatórios' }, { status: 400 })
    }

    if (fromUserId === toUserId) {
      return NextResponse.json({ message: 'Os usuários de origem e destino devem ser diferentes' }, { status: 400 })
    }

    // Verificar se ambos os usuários existem E pertencem a escola do superuser logado
    const [fromUser, toUser] = await Promise.all([
      prisma.user.findUnique({ where: { id: fromUserId, escolaId }, include: { disciplinasPermitidas: true, turmasPermitidas: true } }),
      prisma.user.findUnique({ where: { id: toUserId, escolaId } })
    ])

    if (!fromUser || !toUser) {
      return NextResponse.json({ message: 'Um ou ambos os usuários não foram encontrados' }, { status: 404 })
    }

    // Executar a transferência em uma transação
    await prisma.$transaction(async (tx) => {
      // 1. Transferir a "autoria" das notas
      await tx.notaFinal.updateMany({
        where: { modifiedById: fromUserId },
        data: { modifiedById: toUserId }
      })

      // 2. Transferir a "autoria" das auditorias
      await tx.notaFinalAudit.updateMany({
        where: { modifiedById: fromUserId },
        data: { modifiedById: toUserId }
      })

      // 3. Transferir permissões de disciplinas
      // Adicionar as disciplinas do usuário antigo ao novo
      const disciplinasIds = fromUser.disciplinasPermitidas.map(d => d.id)
      if (disciplinasIds.length > 0) {
        await tx.user.update({
          where: { id: toUserId },
          data: {
            disciplinasPermitidas: {
              connect: disciplinasIds.map(id => ({ id }))
            }
          }
        })
      }

      // 4. Transferir permissões de turmas
      const turmasIds = fromUser.turmasPermitidas.map(t => t.id)
      if (turmasIds.length > 0) {
        await tx.user.update({
          where: { id: toUserId },
          data: {
            turmasPermitidas: {
              connect: turmasIds.map(id => ({ id }))
            }
          }
        })
      }

      // 5. Opcional: Remover permissões do usuário antigo ou desativá-lo
      // Aqui vamos apenas desativá-lo para segurança se ele estiver saindo
      await tx.user.update({
        where: { id: fromUserId },
        data: { 
          isActive: false,
          disciplinasPermitidas: { set: [] },
          turmasPermitidas: { set: [] }
        }
      })
    })

    return NextResponse.json({ 
      message: `Dados e permissões transferidos com sucesso de ${fromUser.name} para ${toUser.name}.` 
    })

  } catch (error: any) {
    console.error('Erro na transferência de usuário:', error)
    return NextResponse.json(
      { message: 'Erro ao processar transferência de dados' },
      { status: 500 }
    )
  }
}
