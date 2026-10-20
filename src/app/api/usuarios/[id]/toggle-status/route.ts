
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { can } from '@/lib/rbac'
import { contaProtegidaDaPlataforma, MSG_CONTA_PROTEGIDA } from '@/lib/plataforma'
import { rotaDoModulo } from '@/lib/modulos/guarda'

export const runtime = 'nodejs'

export const PUT = rotaDoModulo('NUC', 'escrita', async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()

    // Apenas superusuários podem alterar status
    if (!session?.user?.escolaId || !can(session.user, 'usuario.gerenciar')) {
      return NextResponse.json({ message: 'Não autorizado' }, { status: 403 })
    }

    const { id } = await params
    const body = await request.json()
    const { isActive } = body

    // Verifica se está tentando manipular o próprio admin
    if (session.user.id === id && isActive === false) {
      return NextResponse.json(
        { message: 'Você não pode pausar seu próprio acesso.' },
        { status: 400 }
      )
    }

    const existing = await prisma.user.findUnique({ where: { id, escolaId: session.user.escolaId } })
    if (!existing) {
      return NextResponse.json({ message: 'Usuário não encontrado' }, { status: 404 })
    }

    if (contaProtegidaDaPlataforma(existing, session.user)) {
      return NextResponse.json({ message: MSG_CONTA_PROTEGIDA }, { status: 403 })
    }

    const user = await prisma.user.update({
      where: { id },
      data: { isActive },
      select: { id: true, isActive: true, username: true }
    })

    return NextResponse.json({ 
      message: `Usuário ${user.isActive ? 'reativado' : 'pausado'} com sucesso.`,
      user 
    })
  } catch (error) {
    console.error('Erro ao alterar status:', error)
    return NextResponse.json(
      { message: 'Erro ao processar solicitação' }, 
      { status: 500 }
    )
  }
})
