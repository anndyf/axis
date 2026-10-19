import { prisma } from '@/lib/prisma'
import { getGlobalConfig } from '@/lib/data-fetching'
import type { CalendarioEntrada } from '@/lib/services/calendario'
import { carregarEsquemaDaTurma } from '@/lib/services/notas-leitura'
import { hojeNaEscola, aulasRestantes } from '@/lib/services/chamada'
import {
  calcularFrequenciaTurma,
  regraDoEsquema,
  periodoEncerrado,
  type FrequenciaAluno,
  type RegraFrequencia,
  type RegistroFrequencia,
} from '@/lib/services/frequencia'

/**
 * Leitura de frequência para telas e PDFs (server-only, usa Prisma). Toda
 * consulta é escopada pela escola recebida - que deve vir da sessão. As
 * contas ficam em frequencia.ts (puro).
 */

/** Calendário letivo da escola no ano (período + dias não letivos + extras), ou null se não configurado. */
export async function carregarCalendario(escolaId: string, anoLetivo: number): Promise<(CalendarioEntrada & { fim: Date }) | null> {
  const periodo = await prisma.periodoLetivo.findUnique({ where: { escolaId_anoLetivo: { escolaId, anoLetivo } } })
  if (!periodo) return null
  const [naoLetivos, extras] = await Promise.all([
    prisma.diaNaoLetivo.findMany({ where: { escolaId, data: { gte: periodo.inicio, lte: periodo.fim } }, select: { data: true, turmaId: true } }),
    prisma.diaLetivoExtra.findMany({ where: { escolaId, data: { gte: periodo.inicio, lte: periodo.fim } }, select: { data: true, seguirHorarioDe: true } }),
  ])
  return { inicio: periodo.inicio, fim: periodo.fim, naoLetivos, extras }
}

/** Ano letivo da turma, senão o ano letivo atual da escola. */
export async function anoLetivoDaTurma(escolaId: string, turma: { anoLetivo: number | null }): Promise<number> {
  if (turma.anoLetivo) return turma.anoLetivo
  const config = await getGlobalConfig(escolaId)
  return config?.anoLetivoAtual ?? new Date().getFullYear()
}

export interface FrequenciaDaTurma {
  regra: RegraFrequencia
  registro: RegistroFrequencia
  porAluno: Map<string, FrequenciaAluno>
  /** fim do ano letivo já passou (REPROVADO_FALTA pode valer) */
  anoEncerrado: boolean
  /** aulas (tempos) ainda previstas pelo horário × calendário até o fim do período, por disciplina e no total */
  aulasRestantes: { total: number; porDisciplina: Map<string, number> }
  /** houve alguma chamada realizada na turma */
  temChamada: boolean
}

/**
 * Frequência de todos os alunos da turma (ou dos `estudanteIds` pedidos,
 * sempre dentro da turma). null se a turma não for da escola.
 */
export async function carregarFrequenciaDaTurma(escolaId: string, turmaId: string, estudanteIds?: string[]): Promise<FrequenciaDaTurma | null> {
  const turma = await prisma.turma.findFirst({
    where: { id: turmaId, escolaId },
    select: { id: true, cursoId: true, esquemaAvaliacaoId: true, anoLetivo: true, estudantes: { select: { id: true } } },
  })
  if (!turma) return null

  const ids = turma.estudantes.map((e) => e.id).filter((id) => !estudanteIds || estudanteIds.includes(id))
  const [esquema, aulas, faltas, justificativas, horario, ano] = await Promise.all([
    carregarEsquemaDaTurma(turma),
    prisma.aula.findMany({ where: { escolaId, turmaId }, select: { id: true, disciplinaId: true, data: true, quantidade: true, situacao: true } }),
    prisma.falta.findMany({ where: { aula: { escolaId, turmaId }, estudanteId: { in: ids } }, select: { aulaId: true, estudanteId: true, quantidade: true } }),
    prisma.justificativa.findMany({ where: { escolaId, estudanteId: { in: ids } }, select: { estudanteId: true, inicio: true, fim: true, efeito: true } }),
    prisma.horarioAula.findMany({ where: { turmaId }, select: { diaSemana: true, horario: true, disciplinaId: true } }),
    anoLetivoDaTurma(escolaId, turma),
  ])
  const calendario = await carregarCalendario(escolaId, ano)
  const hoje = hojeNaEscola()
  const registro = esquema?.registroFrequencia ?? 'POR_AULA'

  const restantes = calendario ? aulasRestantes(hoje, turmaId, calendario, horario, registro) : { total: 0, porDisciplina: new Map<string, number>() }

  return {
    regra: esquema?.frequencia ?? regraDoEsquema(null),
    registro,
    porAluno: calcularFrequenciaTurma(ids, aulas, faltas, justificativas),
    anoEncerrado: periodoEncerrado({ fimPeriodo: calendario?.fim ?? null, hoje }),
    aulasRestantes: restantes,
    temChamada: aulas.some((a) => a.situacao === 'REALIZADA'),
  }
}
