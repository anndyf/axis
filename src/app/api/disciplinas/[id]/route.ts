import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { can } from '@/lib/rbac'

export const runtime = 'nodejs'

// PUT update disciplina
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const session = await auth()
    
    if (!session?.user?.escolaId || !can(session.user, 'gestao')) {
      return NextResponse.json({ message: 'Não autorizado' }, { status: 401 })
    }
    const escolaId = session.user.escolaId

    const { nome, turmaId, areaId } = await request.json()

    if (!nome || nome.trim() === '') {
      return NextResponse.json(
        { message: 'Nome da disciplina é obrigatório' },
        { status: 400 }
      )
    }

    if (!turmaId) {
      return NextResponse.json(
        { message: 'Turma é obrigatória' },
        { status: 400 }
      )
    }

    const [atual, turmaDestino, area] = await Promise.all([
      prisma.disciplina.findFirst({ where: { id, turma: { escolaId } }, select: { id: true } }),
      prisma.turma.findUnique({ where: { id: turmaId, escolaId }, select: { id: true } }),
      areaId ? prisma.areaConhecimento.findUnique({ where: { id: areaId, escolaId }, select: { id: true } }) : null
    ])
    if (!atual || !turmaDestino || (areaId && !area)) {
      return NextResponse.json({ message: 'Disciplina não encontrada' }, { status: 404 })
    }

    // Check for duplicate name in the same turma (excluding the current discipline)
    const existing = await prisma.disciplina.findFirst({
      where: {
        turmaId,
        nome: nome.trim(),
        NOT: {
          id
        }
      }
    })

    if (existing) {
      return NextResponse.json(
        { message: 'Já existe uma disciplina com este nome nesta turma' },
        { status: 400 }
      )
    }

    const disciplina = await prisma.disciplina.update({
      where: { id },
      data: {
        nome: nome.trim(),
        turmaId,
        areaId: areaId || null
      }
    })

    return NextResponse.json(disciplina)
  } catch (error) {
    console.error('Erro ao atualizar disciplina:', error)
    return NextResponse.json(
      { message: 'Erro ao atualizar disciplina' },
      { status: 500 }
    )
  }
}

// DELETE disciplina
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const session = await auth()
    
    if (!session?.user?.escolaId || !can(session.user, 'gestao')) {
      return NextResponse.json({ message: 'Não autorizado' }, { status: 401 })
    }

    // Verificar se há notas vinculadas
    const disciplina = await prisma.disciplina.findFirst({
      where: { id, turma: { escolaId: session.user.escolaId } },
      include: {
        _count: {
          select: {
            notas: true
          }
        }
      }
    })

    if (!disciplina) {
      return NextResponse.json({ message: 'Disciplina não encontrada' }, { status: 404 })
    }

    if (disciplina._count.notas > 0) {
      return NextResponse.json(
        { message: 'Não é possível excluir uma disciplina com notas lançadas' },
        { status: 400 }
      )
    }

    await prisma.disciplina.delete({
      where: { id }
    })

    return NextResponse.json({ message: 'Disciplina excluída com sucesso' })
  } catch (error) {
    console.error('Erro ao excluir disciplina:', error)
    return NextResponse.json(
      { message: 'Erro ao excluir disciplina' },
      { status: 500 }
    )
  }
}
