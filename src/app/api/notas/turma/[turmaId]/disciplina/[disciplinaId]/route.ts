import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { resolverEsquemaAvaliacaoId } from '@/lib/services/notas'

export const runtime = 'nodejs'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ turmaId: string; disciplinaId: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.escolaId) {
      return NextResponse.json({ message: 'Não autorizado' }, { status: 401 })
    }
    const escolaId = session.user.escolaId
    const { turmaId, disciplinaId } = await params

    const turma = await prisma.turma.findUnique({
      where: { id: turmaId, escolaId },
      select: { cursoId: true, esquemaAvaliacaoId: true }
    })
    if (!turma) {
      return NextResponse.json({ message: 'Turma não encontrada' }, { status: 404 })
    }

    const curso = turma.cursoId
      ? await prisma.curso.findUnique({ where: { id: turma.cursoId }, select: { esquemaAvaliacaoId: true } })
      : null
    const esquemaId = resolverEsquemaAvaliacaoId(turma, curso)
    if (!esquemaId) {
      return NextResponse.json({ message: 'Esquema de avaliação não configurado para esta turma' }, { status: 400 })
    }

    const esquema = await prisma.esquemaAvaliacao.findUnique({
      where: { id: esquemaId },
      include: { unidades: { orderBy: { ordem: 'asc' }, include: { atividades: { orderBy: { ordem: 'asc' } } } } }
    })
    if (!esquema) {
      return NextResponse.json({ message: 'Esquema de avaliação inválido' }, { status: 400 })
    }

    // "estudante_id" guarda o id tecnico do estudante desde a Migration 3b (nao mais
    // a matricula) - o frontend (LancarNotasClient.tsx) espera a matricula de volta
    // em "estudanteId" (usa como chave do dicionario de estado).
    const notasFinais = await prisma.notaFinal.findMany({
      where: { disciplinaId, estudante: { turmaId, escolaId } },
      include: {
        estudante: { select: { matricula: true } },
        unidades: { include: { atividades: true } }
      }
    })

    return NextResponse.json({
      esquema: {
        id: esquema.id,
        notaMinimaAprovacao: esquema.notaMinimaAprovacao,
        recuperacaoUnidadeAtiva: esquema.recuperacaoUnidadeAtiva,
        modoRecuperacaoUnidade: esquema.modoRecuperacaoUnidade,
        recuperacaoFinalAtiva: esquema.recuperacaoFinalAtiva,
        modoRecuperacaoFinal: esquema.modoRecuperacaoFinal,
        unidades: esquema.unidades.map((u) => ({
          id: u.id,
          ordem: u.ordem,
          nome: u.nome,
          atividades: u.atividades.map((a) => ({ id: a.id, ordem: a.ordem, nome: a.nome, peso: a.peso }))
        }))
      },
      notas: notasFinais.map((nf) => ({
        estudanteId: nf.estudante.matricula,
        status: nf.status,
        unidades: nf.unidades.map((u) => ({
          esquemaUnidadeId: u.esquemaUnidadeId,
          notaRecuperacao: u.notaRecuperacao,
          isDesistente: u.isDesistente,
          atividades: u.atividades.map((a) => ({ esquemaAtividadeId: a.esquemaAtividadeId, valor: a.valor }))
        }))
      }))
    })
  } catch (error) {
    console.error('Erro ao buscar notas:', error)
    return NextResponse.json({ message: 'Erro ao buscar notas' }, { status: 500 })
  }
}
