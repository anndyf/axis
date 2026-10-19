import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { resolverEsquemaAvaliacaoId } from '@/lib/services/notas'
import { atividadesDaDisciplina } from '@/lib/services/notas-leitura'
import { can } from '@/lib/rbac'

export const runtime = 'nodejs'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ turmaId: string; disciplinaId: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.escolaId || session.user.isPortalUser || !can(session.user, 'staff')) {
      return NextResponse.json({ message: 'Não autorizado' }, { status: 401 })
    }
    const escolaId = session.user.escolaId
    const { turmaId, disciplinaId } = await params

    // A disciplina precisa ser da turma; professor só vê as notas das disciplinas dele
    const disciplina = await prisma.disciplina.findFirst({
      where: {
        id: disciplinaId,
        turmaId,
        turma: { escolaId },
        ...(can(session.user, 'gestao') ? {} : { usuariosPermitidos: { some: { id: session.user.id } } }),
      },
      select: { id: true },
    })
    if (!disciplina) {
      return NextResponse.json({ message: 'Disciplina não encontrada' }, { status: 404 })
    }

    const turma = await prisma.turma.findUnique({
      where: { id: turmaId, escolaId },
      select: { cursoId: true, esquemaAvaliacaoId: true }
    })
    if (!turma) {
      return NextResponse.json({ message: 'Turma não encontrada' }, { status: 404 })
    }

    const curso = turma.cursoId
      ? await prisma.curso.findFirst({ where: { id: turma.cursoId, escolaId }, select: { esquemaAvaliacaoId: true } })
      : null
    const esquemaId = resolverEsquemaAvaliacaoId(turma, curso)
    if (!esquemaId) {
      return NextResponse.json({ message: 'Esquema de avaliação não configurado para esta turma' }, { status: 400 })
    }

    const esquema = await prisma.esquemaAvaliacao.findFirst({
      where: { id: esquemaId, escolaId },
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
        unidades: { include: { atividades: true, avaliacoes: true } }
      }
    })
    const porProfessor = esquema.definicaoAtividades === 'PROFESSOR'
    const atividades = await atividadesDaDisciplina(esquema, disciplinaId)

    return NextResponse.json({
      esquema: {
        id: esquema.id,
        notaMinimaAprovacao: esquema.notaMinimaAprovacao,
        recuperacaoUnidadeAtiva: esquema.recuperacaoUnidadeAtiva,
        modoRecuperacaoUnidade: esquema.modoRecuperacaoUnidade,
        recuperacaoFinalAtiva: esquema.recuperacaoFinalAtiva,
        modoRecuperacaoFinal: esquema.modoRecuperacaoFinal,
        formaCalculoFinal: esquema.formaCalculoFinal,
        divisorFinal: esquema.divisorFinal,
        notaMinimaExameFinal: esquema.notaMinimaExameFinal,
        casasDecimais: esquema.casasDecimais,
        // PROFESSOR: as "atividades" de cada etapa são as avaliações que o
        // professor criou para esta disciplina (mesmo formato do template)
        definicaoAtividades: esquema.definicaoAtividades,
        unidades: esquema.unidades.map((u) => ({
          id: u.id,
          ordem: u.ordem,
          nome: u.nome,
          peso: u.peso,
          formaCalculo: u.formaCalculo,
          divisor: u.divisor,
          atividades: (atividades.get(u.id) ?? []).map((a) => ({ id: a.id, ordem: a.ordem, nome: a.nome, notaMaxima: a.notaMaxima, peso: a.peso }))
        }))
      },
      notas: notasFinais.map((nf) => ({
        estudanteId: nf.estudante.matricula,
        status: nf.status,
        unidades: nf.unidades.map((u) => ({
          esquemaUnidadeId: u.esquemaUnidadeId,
          notaRecuperacao: u.notaRecuperacao,
          isDesistente: u.isDesistente,
          atividades: porProfessor
            ? u.avaliacoes.map((a) => ({ esquemaAtividadeId: a.avaliacaoId, valor: a.valor }))
            : u.atividades.map((a) => ({ esquemaAtividadeId: a.esquemaAtividadeId, valor: a.valor }))
        }))
      }))
    })
  } catch (error) {
    console.error('Erro ao buscar notas:', error)
    return NextResponse.json({ message: 'Erro ao buscar notas' }, { status: 500 })
  }
}
