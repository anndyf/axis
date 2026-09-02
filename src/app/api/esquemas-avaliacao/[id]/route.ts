import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'

interface AtividadeInput {
  nome: string
  peso: number
}

interface UnidadeInput {
  nome: string
  atividades: AtividadeInput[]
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()
    if (!session?.user?.escolaId || !session.user.isSuperuser) {
      return NextResponse.json({ message: 'Não autorizado' }, { status: 403 })
    }
    const escolaId = session.user.escolaId
    const { id } = await params

    const existente = await prisma.esquemaAvaliacao.findUnique({ where: { id, escolaId } })
    if (!existente) {
      return NextResponse.json({ message: 'Esquema não encontrado' }, { status: 404 })
    }

    const {
      nome,
      notaMinimaAprovacao,
      recuperacaoUnidadeAtiva,
      modoRecuperacaoUnidade,
      recuperacaoFinalAtiva,
      modoRecuperacaoFinal,
      unidades
    }: {
      nome: string
      notaMinimaAprovacao?: number
      recuperacaoUnidadeAtiva?: boolean
      modoRecuperacaoUnidade?: string | null
      recuperacaoFinalAtiva?: boolean
      modoRecuperacaoFinal?: string | null
      unidades: UnidadeInput[]
    } = await request.json()

    if (!nome || !Array.isArray(unidades) || unidades.length === 0) {
      return NextResponse.json({ message: 'Nome e ao menos 1 unidade são obrigatórios' }, { status: 400 })
    }
    for (const u of unidades) {
      if (!u.nome || !Array.isArray(u.atividades) || u.atividades.length === 0) {
        return NextResponse.json({ message: 'Cada unidade precisa de nome e ao menos 1 atividade' }, { status: 400 })
      }
    }

    const esquema = await prisma.$transaction(async (tx) => {
      await tx.esquemaAvaliacao.update({
        where: { id },
        data: {
          nome,
          numUnidades: unidades.length,
          notaMinimaAprovacao: notaMinimaAprovacao ?? 5,
          recuperacaoUnidadeAtiva: !!recuperacaoUnidadeAtiva,
          modoRecuperacaoUnidade: recuperacaoUnidadeAtiva ? (modoRecuperacaoUnidade as any) ?? 'SUBSTITUI_SE_MAIOR' : null,
          recuperacaoFinalAtiva: recuperacaoFinalAtiva ?? true,
          modoRecuperacaoFinal: (recuperacaoFinalAtiva ?? true) ? (modoRecuperacaoFinal as any) ?? 'NOTA_MINIMA_ISOLADA' : null,
        }
      })

      // Editar a estrutura não corrompe notas já lançadas (NotaAtividade.valor
      // é um snapshot, não recalcula a partir do peso atual) - apagar e
      // recriar unidades/atividades é seguro e mais simples que diff
      // incremental. NotaUnidade/NotaAtividade de unidades removidas são
      // apagadas em cascata (onDelete: Cascade) - só bloqueia (P2003) se
      // alguma NotaUnidade referenciar uma unidade que sobreviveu à edição
      // mas não deveria... na prática isso não acontece aqui porque tudo é
      // recriado do zero.
      await tx.esquemaUnidade.deleteMany({ where: { esquemaId: id } })

      for (let i = 0; i < unidades.length; i++) {
        const u = unidades[i]
        const unidadeCriada = await tx.esquemaUnidade.create({
          data: { esquemaId: id, ordem: i + 1, nome: u.nome }
        })
        for (let j = 0; j < u.atividades.length; j++) {
          const a = u.atividades[j]
          await tx.esquemaAtividade.create({
            data: { esquemaUnidadeId: unidadeCriada.id, ordem: j + 1, nome: a.nome, peso: a.peso }
          })
        }
      }

      return tx.esquemaAvaliacao.findUnique({
        where: { id },
        include: { unidades: { orderBy: { ordem: 'asc' }, include: { atividades: { orderBy: { ordem: 'asc' } } } } }
      })
    })

    return NextResponse.json(esquema)
  } catch (error: any) {
    if (error.code === 'P2003') {
      return NextResponse.json(
        { message: 'Não é possível editar: já existem notas lançadas usando as unidades atuais deste esquema.' },
        { status: 409 }
      )
    }
    console.error('Erro ao atualizar esquema de avaliação:', error)
    return NextResponse.json({ message: 'Erro ao atualizar esquema de avaliação' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()
    if (!session?.user?.escolaId || !session.user.isSuperuser) {
      return NextResponse.json({ message: 'Não autorizado' }, { status: 403 })
    }
    const escolaId = session.user.escolaId
    const { id } = await params

    const existente = await prisma.esquemaAvaliacao.findUnique({
      where: { id, escolaId },
      include: { _count: { select: { cursos: true, turmas: true } } }
    })
    if (!existente) {
      return NextResponse.json({ message: 'Esquema não encontrado' }, { status: 404 })
    }
    if (existente._count.cursos > 0 || existente._count.turmas > 0) {
      return NextResponse.json(
        { message: 'Não é possível excluir: este esquema está atribuído a cursos ou turmas.' },
        { status: 409 }
      )
    }

    await prisma.esquemaAvaliacao.delete({ where: { id } })

    return NextResponse.json({ message: 'Esquema removido com sucesso' })
  } catch (error: any) {
    if (error.code === 'P2003') {
      return NextResponse.json(
        { message: 'Não é possível excluir: já existem notas lançadas usando este esquema.' },
        { status: 409 }
      )
    }
    console.error('Erro ao remover esquema de avaliação:', error)
    return NextResponse.json({ message: 'Erro ao remover esquema de avaliação' }, { status: 500 })
  }
}
