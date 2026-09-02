import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.escolaId) {
      return NextResponse.json({ message: 'Não autorizado' }, { status: 401 })
    }

    const esquemas = await prisma.esquemaAvaliacao.findMany({
      where: { escolaId: session.user.escolaId },
      include: {
        unidades: {
          orderBy: { ordem: 'asc' },
          include: { atividades: { orderBy: { ordem: 'asc' } } }
        },
        _count: { select: { cursos: true, turmas: true } }
      },
      orderBy: { nome: 'asc' }
    })

    return NextResponse.json(esquemas)
  } catch (error) {
    console.error('Erro ao buscar esquemas de avaliação:', error)
    return NextResponse.json({ message: 'Erro ao buscar esquemas de avaliação' }, { status: 500 })
  }
}

interface AtividadeInput {
  nome: string
  peso: number
}

interface UnidadeInput {
  nome: string
  atividades: AtividadeInput[]
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.escolaId || !session.user.isSuperuser) {
      return NextResponse.json({ message: 'Não autorizado' }, { status: 403 })
    }
    const escolaId = session.user.escolaId

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
      const criado = await tx.esquemaAvaliacao.create({
        data: {
          escolaId,
          nome,
          numUnidades: unidades.length,
          notaMinimaAprovacao: notaMinimaAprovacao ?? 5,
          recuperacaoUnidadeAtiva: !!recuperacaoUnidadeAtiva,
          modoRecuperacaoUnidade: recuperacaoUnidadeAtiva ? (modoRecuperacaoUnidade as any) ?? 'SUBSTITUI_SE_MAIOR' : null,
          recuperacaoFinalAtiva: recuperacaoFinalAtiva ?? true,
          modoRecuperacaoFinal: (recuperacaoFinalAtiva ?? true) ? (modoRecuperacaoFinal as any) ?? 'NOTA_MINIMA_ISOLADA' : null,
        }
      })

      for (let i = 0; i < unidades.length; i++) {
        const u = unidades[i]
        const unidadeCriada = await tx.esquemaUnidade.create({
          data: { esquemaId: criado.id, ordem: i + 1, nome: u.nome }
        })
        for (let j = 0; j < u.atividades.length; j++) {
          const a = u.atividades[j]
          await tx.esquemaAtividade.create({
            data: { esquemaUnidadeId: unidadeCriada.id, ordem: j + 1, nome: a.nome, peso: a.peso }
          })
        }
      }

      return tx.esquemaAvaliacao.findUnique({
        where: { id: criado.id },
        include: { unidades: { orderBy: { ordem: 'asc' }, include: { atividades: { orderBy: { ordem: 'asc' } } } } }
      })
    })

    return NextResponse.json(esquema, { status: 201 })
  } catch (error) {
    console.error('Erro ao criar esquema de avaliação:', error)
    return NextResponse.json({ message: 'Erro ao criar esquema de avaliação' }, { status: 500 })
  }
}
