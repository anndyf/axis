/**
 * Motor de frequência - funções puras (plano-avaliacao-frequencia.md, 3.4/3.5).
 *
 * frequência = (aulas realizadas − faltas não abonadas) / aulas realizadas
 *
 * - Só aulas REALIZADAS (chamada salva) contam; PREVISTA/CANCELADA não.
 * - Só a falta é gravada: aluno sem falta numa aula realizada estava presente
 *   (100% com zero faltas, nunca "vazio" - bug clássico do i-Educar #1209).
 * - Justificativa vale pelo intervalo de datas e é aplicada aqui, na hora do
 *   cálculo: ABONA tira a falta da conta; SO_JUSTIFICA mantém, só registra.
 * - A regra do esquema decide qual número vale para aprovação: GERAL (total
 *   de horas letivas, LDB art. 24, VI) ou POR_COMPONENTE (cada disciplina).
 */
import { chaveData } from '@/lib/services/calendario'
import type { StatusNota } from '@/lib/services/notas'

export type SituacaoAula = 'PREVISTA' | 'REALIZADA' | 'CANCELADA'
export type EfeitoJustificativa = 'ABONA' | 'SO_JUSTIFICA'
export type ApuracaoFrequencia = 'GERAL' | 'POR_COMPONENTE'
export type RegistroFrequencia = 'POR_AULA' | 'POR_DIA'

export interface AulaFreq {
  id: string
  /** null = chamada diária (POR_DIA) */
  disciplinaId: string | null
  data: Date | string
  quantidade: number
  situacao: SituacaoAula
}

export interface FaltaFreq {
  aulaId: string
  estudanteId: string
  quantidade: number
}

export interface JustificativaFreq {
  estudanteId: string
  inicio: Date | string
  fim: Date | string
  efeito: EfeitoJustificativa
}

export interface ContagemFrequencia {
  /** aulas (tempos) realizadas */
  aulas: number
  /** todas as faltas lançadas */
  faltas: number
  /** faltas cobertas por justificativa que ABONA - não contam */
  faltasAbonadas: number
  /** faltas cobertas por justificativa SO_JUSTIFICA - contam */
  faltasJustificadas: number
  /** faltas que pesam na frequência (faltas − abonadas) */
  faltasConsideradas: number
  /** 0-100 com 1 casa; null = nenhuma aula realizada ainda */
  percentual: number | null
}

export interface FrequenciaAluno {
  geral: ContagemFrequencia
  porDisciplina: Record<string, ContagemFrequencia>
}

export interface RegraFrequencia {
  apuracao: ApuracaoFrequencia
  minimo: number
}

/** Chave usada em porDisciplina para a chamada diária (sem disciplina). */
export const CHAVE_DIA = 'DIA'

function vazia(): ContagemFrequencia {
  return { aulas: 0, faltas: 0, faltasAbonadas: 0, faltasJustificadas: 0, faltasConsideradas: 0, percentual: null }
}

function fechar(c: ContagemFrequencia): ContagemFrequencia {
  const faltasConsideradas = c.faltas - c.faltasAbonadas
  const percentual = c.aulas > 0 ? Math.round(((c.aulas - faltasConsideradas) / c.aulas) * 1000) / 10 : null
  return { ...c, faltasConsideradas, percentual }
}

/** Efeito que vale numa data para o aluno (ABONA prevalece sobre SO_JUSTIFICA). */
function efeitoNaData(justificativas: JustificativaFreq[], data: string): EfeitoJustificativa | null {
  let efeito: EfeitoJustificativa | null = null
  for (const j of justificativas) {
    if (data >= chaveData(j.inicio) && data <= chaveData(j.fim)) {
      if (j.efeito === 'ABONA') return 'ABONA'
      efeito = 'SO_JUSTIFICA'
    }
  }
  return efeito
}

/**
 * Frequência de vários alunos de uma vez (uma passada pelas aulas/faltas).
 * Alunos sem nenhuma falta saem com 100% se houve aula realizada.
 */
export function calcularFrequenciaTurma(
  estudanteIds: string[],
  aulas: AulaFreq[],
  faltas: FaltaFreq[],
  justificativas: JustificativaFreq[]
): Map<string, FrequenciaAluno> {
  const realizadas = aulas.filter((a) => a.situacao === 'REALIZADA' && a.quantidade > 0)
  const aulaPorId = new Map(realizadas.map((a) => [a.id, a]))

  // Base comum: as aulas realizadas valem para todos os alunos
  const base: FrequenciaAluno = { geral: vazia(), porDisciplina: {} }
  for (const a of realizadas) {
    const k = a.disciplinaId ?? CHAVE_DIA
    base.geral.aulas += a.quantidade
    base.porDisciplina[k] = base.porDisciplina[k] ?? vazia()
    base.porDisciplina[k].aulas += a.quantidade
  }

  const just = new Map<string, JustificativaFreq[]>()
  for (const j of justificativas) just.set(j.estudanteId, [...(just.get(j.estudanteId) ?? []), j])

  const resultado = new Map<string, FrequenciaAluno>()
  const copiaBase = (): FrequenciaAluno => ({
    geral: { ...base.geral },
    porDisciplina: Object.fromEntries(Object.entries(base.porDisciplina).map(([k, v]) => [k, { ...v }])),
  })
  for (const id of estudanteIds) resultado.set(id, copiaBase())

  for (const f of faltas) {
    const aula = aulaPorId.get(f.aulaId)
    const freq = resultado.get(f.estudanteId)
    if (!aula || !freq) continue
    const qtd = Math.max(0, Math.min(f.quantidade, aula.quantidade))
    if (qtd === 0) continue
    const efeito = efeitoNaData(just.get(f.estudanteId) ?? [], chaveData(aula.data))
    for (const c of [freq.geral, freq.porDisciplina[aula.disciplinaId ?? CHAVE_DIA]]) {
      c.faltas += qtd
      if (efeito === 'ABONA') c.faltasAbonadas += qtd
      if (efeito === 'SO_JUSTIFICA') c.faltasJustificadas += qtd
    }
  }

  for (const freq of resultado.values()) {
    freq.geral = fechar(freq.geral)
    for (const k of Object.keys(freq.porDisciplina)) freq.porDisciplina[k] = fechar(freq.porDisciplina[k])
  }
  return resultado
}

export function calcularFrequenciaAluno(
  estudanteId: string,
  aulas: AulaFreq[],
  faltas: FaltaFreq[],
  justificativas: JustificativaFreq[]
): FrequenciaAluno {
  return calcularFrequenciaTurma([estudanteId], aulas, faltas, justificativas).get(estudanteId)!
}

/**
 * Regra do esquema. Chamada diária não tem disciplina, então POR_COMPONENTE
 * não se aplica: cai para GERAL.
 */
export function regraDoEsquema(esquema?: {
  apuracaoFrequencia?: ApuracaoFrequencia | null
  registroFrequencia?: RegistroFrequencia | null
  frequenciaMinima?: number | null
} | null): RegraFrequencia {
  const apuracao = esquema?.registroFrequencia === 'POR_DIA' ? 'GERAL' : (esquema?.apuracaoFrequencia ?? 'GERAL')
  return { apuracao, minimo: esquema?.frequenciaMinima ?? 75 }
}

/**
 * Percentual que vale para aprovação. GERAL: o geral. POR_COMPONENTE: o da
 * disciplina pedida; sem disciplina, o pior entre as disciplinas (para o
 * status geral do aluno). null = sem aulas realizadas.
 */
export function frequenciaConsiderada(freq: FrequenciaAluno, regra: RegraFrequencia, disciplinaId?: string): number | null {
  if (regra.apuracao === 'GERAL') return freq.geral.percentual
  if (disciplinaId) return freq.porDisciplina[disciplinaId]?.percentual ?? null
  const valores = Object.entries(freq.porDisciplina)
    .filter(([k]) => k !== CHAVE_DIA)
    .map(([, c]) => c.percentual)
    .filter((p): p is number => p !== null)
  return valores.length ? Math.min(...valores) : freq.geral.percentual
}

export type SituacaoFrequencia = 'SEM_AULAS' | 'REGULAR' | 'ALERTA' | 'ABAIXO_MINIMO'

/** ALERTA = acima do mínimo, mas a menos de `margem` pontos dele. */
export function situacaoFrequencia(percentual: number | null, minimo: number, margem = 10): SituacaoFrequencia {
  if (percentual === null) return 'SEM_AULAS'
  if (percentual < minimo) return 'ABAIXO_MINIMO'
  if (percentual < minimo + margem) return 'ALERTA'
  return 'REGULAR'
}

export type SituacaoFinal = StatusNota | 'REPROVADO_FALTA'

/** Decisões que a frequência não derruba: conselho de classe e desistência. */
const PREVALECEM_SOBRE_FALTA = new Set<StatusNota>(['APROVADO_CONSELHO', 'DEPENDENCIA', 'CONSERVADO', 'DESISTENTE'])

/**
 * Situação final = status das notas + frequência. Abaixo do mínimo vira
 * REPROVADO_FALTA, mas só quando o período está `encerrado` (antes disso a
 * frequência ainda pode subir - é alerta, não reprovação). Decisão do
 * conselho de classe e desistência prevalecem.
 */
export function calcularSituacaoFinal(
  statusNota: StatusNota,
  percentual: number | null,
  regra: RegraFrequencia,
  encerrado: boolean
): SituacaoFinal {
  if (percentual === null || !encerrado) return statusNota
  if (PREVALECEM_SOBRE_FALTA.has(statusNota)) return statusNota
  return percentual < regra.minimo ? 'REPROVADO_FALTA' : statusNota
}

/**
 * O período conta como encerrado quando o ano letivo já terminou ou quando
 * todas as etapas já têm nota (fechamento antecipado).
 */
export function periodoEncerrado(params: { fimPeriodo?: Date | string | null; hoje: string; notasCompletas?: boolean }): boolean {
  if (params.notasCompletas) return true
  return !!params.fimPeriodo && chaveData(params.fimPeriodo) < params.hoje
}

/**
 * Projeção até o fim do período: com `aulasRestantes` previstas pelo
 * horário × calendário, quantas faltas o aluno ainda pode ter e qual a maior
 * frequência que ainda consegue atingir (faltando a nenhuma aula mais).
 */
export function projetarFrequencia(c: ContagemFrequencia, aulasRestantes: number, minimo: number) {
  const total = c.aulas + Math.max(0, aulasRestantes)
  if (total === 0) return { maximaPossivel: null as number | null, faltasRestantesPermitidas: null as number | null }
  const maximaPossivel = Math.round(((total - c.faltasConsideradas) / total) * 1000) / 10
  const limiteFaltas = Math.floor(total * (1 - minimo / 100) + 1e-9)
  return { maximaPossivel, faltasRestantesPermitidas: limiteFaltas - c.faltasConsideradas }
}

/** "87,5%" ou "—" */
export function formatarFrequencia(p: number | null): string {
  return p === null ? '—' : `${p.toFixed(1).replace('.', ',')}%`
}
