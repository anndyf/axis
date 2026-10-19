/**
 * Chamada - funções puras (plano-avaliacao-frequencia.md, passo 7).
 *
 * A Aula é criada sob demanda quando o professor abre a chamada. Esta parte
 * decide, a partir do calendário letivo e do horário da turma, se existe
 * aula naquele dia e quantos tempos ela tem, e valida as faltas recebidas.
 */
import { chaveData, diasLetivos, type CalendarioEntrada } from '@/lib/services/calendario'
import type { RegistroFrequencia } from '@/lib/services/frequencia'

export const FUSO_ESCOLA = 'America/Sao_Paulo'

/** Data de hoje (YYYY-MM-DD) no fuso das escolas, não no do servidor. */
export function hojeNaEscola(agora = new Date()): string {
  return agora.toLocaleDateString('en-CA', { timeZone: FUSO_ESCOLA })
}

export function dataValida(valor: unknown): valor is string {
  if (typeof valor !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(valor)) return false
  const d = new Date(`${valor}T00:00:00Z`)
  return !isNaN(d.getTime()) && d.toISOString().slice(0, 10) === valor
}

/** turma|data|disciplina (ou DIA) - Aula.chave, uma aula por disciplina/dia. */
export function chaveAula(turmaId: string, data: string, disciplinaId: string | null): string {
  return `${turmaId}|${data}|${disciplinaId ?? 'DIA'}`
}

export interface HorarioTempo {
  diaSemana: number
  horario: number
  disciplinaId: string | null
}

export interface DiaDaTurma {
  letivo: boolean
  /** grade que vale no dia (num dia extra, a do dia que ele segue) */
  diaSemana: number | null
  /** disciplinaId -> tempos (HorarioAula.horario) do dia, em ordem */
  temposPorDisciplina: Map<string, number[]>
}

/**
 * O que a turma tem num dia: se é letivo (dentro do período, dia útil ou
 * extra, fora de feriado/recesso da escola ou da turma) e os tempos de cada
 * disciplina segundo o horário.
 */
export function aulasDoDia(data: string, turmaId: string, calendario: CalendarioEntrada, horario: HorarioTempo[]): DiaDaTurma {
  const vazio: DiaDaTurma = { letivo: false, diaSemana: null, temposPorDisciplina: new Map() }
  if (data < chaveData(calendario.inicio) || data > chaveData(calendario.fim)) return vazio
  const [dia] = diasLetivos({ ...calendario, inicio: data, fim: data }, turmaId)
  if (!dia) return vazio

  const temposPorDisciplina = new Map<string, number[]>()
  for (const h of [...horario].sort((a, b) => a.horario - b.horario)) {
    if (h.diaSemana !== dia.diaSemana || !h.disciplinaId) continue
    temposPorDisciplina.set(h.disciplinaId, [...(temposPorDisciplina.get(h.disciplinaId) ?? []), h.horario])
  }
  return { letivo: true, diaSemana: dia.diaSemana, temposPorDisciplina }
}

export type PlanoChamada =
  | { ok: true; disciplinaId: string | null; tempos: number[]; quantidade: number; chave: string }
  | { ok: false; erro: string }

/**
 * Decide a aula a criar/abrir. POR_AULA: precisa de disciplina com tempo no
 * horário daquele dia. POR_DIA: uma chamada diária (sem disciplina), em dia
 * letivo com algum tempo no horário. Datas futuras são recusadas.
 */
export function planejarChamada(p: {
  registro: RegistroFrequencia
  data: string
  hoje: string
  turmaId: string
  disciplinaId: string | null
  calendario: CalendarioEntrada | null
  horario: HorarioTempo[]
}): PlanoChamada {
  if (!dataValida(p.data)) return { ok: false, erro: 'Data inválida.' }
  if (p.data > p.hoje) return { ok: false, erro: 'Não é possível fazer chamada de um dia que ainda não chegou.' }
  if (!p.calendario) return { ok: false, erro: 'O calendário letivo deste ano ainda não foi configurado (Configurações → Calendário letivo).' }

  const dia = aulasDoDia(p.data, p.turmaId, p.calendario, p.horario)
  if (!dia.letivo) return { ok: false, erro: 'Este dia não é letivo para a turma (fora do período, fim de semana, feriado ou recesso).' }

  if (p.registro === 'POR_DIA') {
    if (dia.temposPorDisciplina.size === 0) return { ok: false, erro: 'A turma não tem aulas no horário deste dia.' }
    return { ok: true, disciplinaId: null, tempos: [], quantidade: 1, chave: chaveAula(p.turmaId, p.data, null) }
  }

  if (!p.disciplinaId) return { ok: false, erro: 'Escolha a disciplina.' }
  const tempos = dia.temposPorDisciplina.get(p.disciplinaId) ?? []
  if (tempos.length === 0) return { ok: false, erro: 'Esta disciplina não tem aula no horário da turma neste dia.' }
  return { ok: true, disciplinaId: p.disciplinaId, tempos, quantidade: tempos.length, chave: chaveAula(p.turmaId, p.data, p.disciplinaId) }
}

export interface FaltaValida {
  estudanteId: string
  /** nº de tempos perdidos - o que o motor de frequência usa */
  quantidade: number
  /** quais tempos da aula (subconjunto de aula.tempos, em ordem); vazio na chamada diária */
  tempos: number[]
}

/**
 * Faltas recebidas do navegador: só alunos da turma, sem repetição.
 *
 * Falta por tempo: numa aula com tempos (ex.: 1º e 6º), cada falta traz os
 * `tempos` que o aluno perdeu - todos precisam ser tempos DESTA aula, sem
 * repetir - e a quantidade passa a ser o nº de tempos. Sem `tempos`, vale a
 * `quantidade` (1..nº de tempos) e entram os primeiros tempos da aula.
 * Chamada diária (aula sem tempos): só quantidade, e tempos fica vazio.
 * Falta sem nenhum tempo/quantidade 0 = presente (descartada).
 */
export function validarFaltas(
  faltas: unknown,
  alunosDaTurma: Set<string>,
  aula: { tempos: number[]; quantidade: number }
): { ok: true; faltas: FaltaValida[] } | { ok: false; erro: string } {
  if (!Array.isArray(faltas)) return { ok: false, erro: 'Dados inválidos.' }
  const temposDaAula = [...aula.tempos].sort((a, b) => a - b)
  const limite = temposDaAula.length || aula.quantidade
  const vistos = new Set<string>()
  const validas: FaltaValida[] = []
  for (const f of faltas) {
    const estudanteId = f?.estudanteId
    if (typeof estudanteId !== 'string' || !alunosDaTurma.has(estudanteId)) return { ok: false, erro: 'Aluno não pertence a esta turma.' }
    if (vistos.has(estudanteId)) return { ok: false, erro: 'Aluno repetido na chamada.' }
    vistos.add(estudanteId)

    if (f?.tempos !== undefined) {
      const tempos = f.tempos
      if (!Array.isArray(tempos) || tempos.some((t: unknown) => !Number.isInteger(t))) return { ok: false, erro: 'Tempos inválidos.' }
      if (temposDaAula.length === 0 && tempos.length > 0) return { ok: false, erro: 'A chamada diária não tem falta por tempo.' }
      if (new Set(tempos).size !== tempos.length) return { ok: false, erro: 'Tempo repetido na falta.' }
      if (tempos.some((t: number) => !temposDaAula.includes(t))) return { ok: false, erro: 'Tempo não pertence a esta aula.' }
      if (temposDaAula.length > 0) {
        if (tempos.length > 0) validas.push({ estudanteId, quantidade: tempos.length, tempos: [...tempos].sort((a: number, b: number) => a - b) })
        continue
      }
      // chamada diária com tempos: [] segue pela quantidade
    }

    const quantidade = f?.quantidade ?? 1
    if (!Number.isInteger(quantidade) || quantidade < 0 || quantidade > limite) {
      return { ok: false, erro: `Quantidade de faltas deve estar entre 0 e ${limite}.` }
    }
    if (quantidade > 0) validas.push({ estudanteId, quantidade, tempos: temposDaAula.slice(0, quantidade) })
  }
  return { ok: true, faltas: validas }
}

/** Dias letivos já passados (inclusive hoje) em que a disciplina tem aula - para "aulas pendentes". */
export function diasComAulaAte(
  hoje: string,
  turmaId: string,
  calendario: CalendarioEntrada,
  horario: HorarioTempo[],
  disciplinaId: string | null
): string[] {
  const fim = chaveData(calendario.fim) < hoje ? chaveData(calendario.fim) : hoje
  if (fim < chaveData(calendario.inicio)) return []
  const dias = diasLetivos({ ...calendario, fim }, turmaId)
  const semanas = new Set(horario.filter((h) => h.disciplinaId && (disciplinaId === null || h.disciplinaId === disciplinaId)).map((h) => h.diaSemana))
  return dias.filter((d) => semanas.has(d.diaSemana)).map((d) => d.data)
}

/**
 * Aulas (tempos) previstas pelo horário × calendário DEPOIS de `depoisDe`
 * até o fim do período - base da projeção de frequência. POR_DIA conta 1
 * por dia letivo com aula no horário.
 */
export function aulasRestantes(
  depoisDe: string,
  turmaId: string,
  calendario: CalendarioEntrada,
  horario: HorarioTempo[],
  registro: RegistroFrequencia
): { total: number; porDisciplina: Map<string, number> } {
  const porDisciplina = new Map<string, number>()
  const inicio = depoisDe >= chaveData(calendario.inicio)
    ? new Date(Date.parse(`${depoisDe}T00:00:00Z`) + 86_400_000).toISOString().slice(0, 10)
    : chaveData(calendario.inicio)
  if (inicio > chaveData(calendario.fim)) return { total: 0, porDisciplina }

  let total = 0
  for (const dia of diasLetivos({ ...calendario, inicio }, turmaId)) {
    const tempos = horario.filter((h) => h.diaSemana === dia.diaSemana && h.disciplinaId)
    if (registro === 'POR_DIA') {
      if (tempos.length) total += 1
      continue
    }
    for (const h of tempos) {
      porDisciplina.set(h.disciplinaId!, (porDisciplina.get(h.disciplinaId!) ?? 0) + 1)
      total += 1
    }
  }
  return { total, porDisciplina }
}

/**
 * Início da contagem de chamadas pendentes: a unidade (etapa) em andamento
 * hoje; entre duas etapas, a última que já começou; sem etapas datadas, o
 * início do período letivo. Datas em "AAAA-MM-DD".
 */
export function inicioDaContagemDePendencias(etapas: { inicio: string; fim: string }[], hoje: string, inicioPeriodo: string): string {
  const iniciadas = etapas.filter((e) => e.inicio <= hoje).sort((a, b) => b.inicio.localeCompare(a.inicio))
  const inicio = iniciadas[0]?.inicio
  return inicio && inicio > inicioPeriodo ? inicio : inicioPeriodo
}
