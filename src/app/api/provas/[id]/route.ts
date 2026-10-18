import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { provaDaEscola } from '@/lib/data-fetching'
import { logAudit } from '@/lib/audit'

export const runtime = 'nodejs'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.escolaId) return NextResponse.json({ message: 'Não autorizado' }, { status: 401 })

    const { id } = await params

    const prova = await prisma.prova.findFirst({
      where: { id, ...provaDaEscola(session.user.escolaId) },
      include: {
        turma: { 
          select: { 
            id: true, 
            nome: true,
            curso: true,
            disciplinas: { select: { id: true, nome: true } }
          } 
        },
        questoes: {
          include: {
            disciplinas: { select: { id: true, nome: true } }
          }
        }
      }
    })

    if (!prova) return NextResponse.json({ message: 'Prova não encontrada' }, { status: 404 })

    return NextResponse.json(prova)
  } catch (error) {
    console.error('Erro ao buscar prova:', error)
    return NextResponse.json({ message: 'Erro interno' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.escolaId) return NextResponse.json({ message: 'Não autorizado' }, { status: 401 })

    const { id } = await params

    const prova = await prisma.prova.findFirst({
      where: { id, ...provaDaEscola(session.user.escolaId) }
    })

    if (!prova) return NextResponse.json({ message: 'Prova não encontrada' }, { status: 404 })

    // Apenas o criador ou admin pode excluir
    const isAdmin = session.user.isSuperuser || session.user.isDirecao
    if (!isAdmin && prova.professorCriadorId !== session.user.id) {
      return NextResponse.json({ message: 'Sem permissão para excluir' }, { status: 403 })
    }

    await prisma.prova.delete({
      where: { id }
    })

    await logAudit(
      session.user.id,
      'PROVA',
      id,
      'DELETE',
      { titulo: prova.titulo }
    )

    return NextResponse.json({ message: 'Prova excluída com sucesso' })
  } catch (error) {
    console.error('Erro ao excluir prova:', error)
    return NextResponse.json({ message: 'Erro ao excluir prova' }, { status: 500 })
  }
}

