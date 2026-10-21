import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { can } from '@/lib/rbac'
import { turmasSaoDaEscola } from '@/lib/data-fetching'
import { rotaDoModulo } from '@/lib/modulos/guarda'

export const GET = rotaDoModulo('PLA', 'leitura', async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()
    if (!session?.user?.escolaId) return NextResponse.json({ message: 'Não autorizado' }, { status: 401 })

    const { id } = await params

    const plano = await prisma.planoEnsino.findFirst({
      where: { id, professor: { escolaId: session.user.escolaId } },
      include: {
        turmas: true,
        professor: { select: { id: true, name: true } }
      }
    })

    if (!plano) return NextResponse.json({ message: 'Plano não encontrado' }, { status: 404 })

    // Apenas o dono ou admin podem ver os detalhes
    if (!can(session.user, 'plano.acompanhar') && plano.professorId !== session.user.id) {
        return NextResponse.json({ message: 'Acesso negado' }, { status: 403 })
    }

    return NextResponse.json(plano)
  } catch (err) {
    return NextResponse.json({ message: 'Erro ao buscar plano' }, { status: 500 })
  }
})

export const PUT = rotaDoModulo('PLA', 'escrita', async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()
    if (!session?.user?.escolaId) return NextResponse.json({ message: 'Não autorizado' }, { status: 401 })

    const { id } = await params

    const data = await request.json()
    const { 
        disciplinaNome, periodoInicio, periodoFim,
        indicadores, conteudos, metodologias, recursos, avaliacao,
        observacoes, turmasIds 
    } = data

    const existing = await prisma.planoEnsino.findFirst({ where: { id, professor: { escolaId: session.user.escolaId } } })
    if (!existing) return NextResponse.json({ message: 'Plano não encontrado' }, { status: 404 })

    if (!can(session.user, 'plano.acompanhar') && existing.professorId !== session.user.id) {
        return NextResponse.json({ message: 'Acesso negado' }, { status: 403 })
    }

    if (!Array.isArray(turmasIds) || !(await turmasSaoDaEscola(turmasIds, session.user.escolaId))) {
      return NextResponse.json({ message: 'Turma não encontrada' }, { status: 404 })
    }

    const updated = await prisma.planoEnsino.update({
      where: { id },
      data: {
        disciplinaNome,
        periodoInicio: new Date(periodoInicio),
        periodoFim: new Date(periodoFim),
        indicadores,
        conteudos,
        metodologias,
        recursos,
        avaliacao,
        observacoes,
        turmas: {
          set: turmasIds.map((id: string) => ({ id }))
        }
      }
    })

    return NextResponse.json(updated)
  } catch (err) {
    console.error(err)
    return NextResponse.json({ message: 'Erro ao editar plano' }, { status: 500 })
  }
})

export const DELETE = rotaDoModulo('PLA', 'escrita', async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()
    if (!session?.user?.escolaId) return NextResponse.json({ message: 'Não autorizado' }, { status: 401 })

    const { id } = await params

    const existing = await prisma.planoEnsino.findFirst({ where: { id, professor: { escolaId: session.user.escolaId } } })
    if (!existing) return NextResponse.json({ message: 'Plano não encontrado' }, { status: 404 })

    if (!can(session.user, 'plano.acompanhar') && existing.professorId !== session.user.id) {
        return NextResponse.json({ message: 'Acesso negado' }, { status: 403 })
    }

    await prisma.planoEnsino.delete({ where: { id } })
    return NextResponse.json({ message: 'Plano excluído com sucesso' })
  } catch (err) {
    return NextResponse.json({ message: 'Erro ao excluir plano' }, { status: 500 })
  }
})
