/**
 * Calendário letivo - funções puras (plano-avaliacao-frequencia.md, passo 6).
 *
 * Aulas previstas = horário da turma × dias letivos. Dias letivos = dias
 * úteis (seg-sex) do período, menos dias não letivos (feriado, recesso...),
 * mais dias letivos extras (sábado letivo/reposição, que seguem o horário de
 * um dia da semana).
 *
 * Datas trabalhadas em UTC, no formato YYYY-MM-DD - colunas @db.Date do
 * Prisma chegam como meia-noite UTC.
 */

/** 1 = segunda ... 5 = sexta (mesma convenção de HorarioAula.diaSemana) */
export type DiaDaSemana = 1 | 2 | 3 | 4 | 5

export interface DiaLetivo {
  data: string
  /** grade de horário que vale no dia (num dia extra, a do dia que ele segue) */
  diaSemana: number
}

export interface CalendarioEntrada {
  inicio: Date | string
  fim: Date | string
  naoLetivos: { data: Date | string; turmaId?: string | null }[]
  extras: { data: Date | string; seguirHorarioDe: number }[]
}

const MS_DIA = 86_400_000

export function chaveData(d: Date | string): string {
  return (typeof d === 'string' ? new Date(`${d.slice(0, 10)}T00:00:00Z`) : d).toISOString().slice(0, 10)
}

function paraUTC(d: Date | string): number {
  return Date.parse(`${chaveData(d)}T00:00:00Z`)
}

/** "Matutino", "MATUTINO", "matutino " -> "MATUTINO" (sem acento) */
export function normalizarTurno(turno?: string | null): string {
  return (turno ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toUpperCase()
}

/**
 * Dias letivos do período, em ordem. Um dia não letivo com turmaId só vale
 * para aquela turma; sem turmaId vale para a escola toda.
 */
export function diasLetivos(cal: CalendarioEntrada, turmaId?: string): DiaLetivo[] {
  const bloqueados = new Set(
    cal.naoLetivos.filter((n) => !n.turmaId || n.turmaId === turmaId).map((n) => chaveData(n.data))
  )
  const extras = new Map(cal.extras.map((e) => [chaveData(e.data), e.seguirHorarioDe]))

  const dias: DiaLetivo[] = []
  for (let t = paraUTC(cal.inicio); t <= paraUTC(cal.fim); t += MS_DIA) {
    const data = new Date(t).toISOString().slice(0, 10)
    if (bloqueados.has(data)) continue
    const extra = extras.get(data)
    if (extra !== undefined) {
      dias.push({ data, diaSemana: extra })
      continue
    }
    const semana = new Date(t).getUTCDay() // 0 = domingo
    if (semana >= 1 && semana <= 5) dias.push({ data, diaSemana: semana })
  }
  return dias
}

/** Recorta os dias de um intervalo (ex.: as datas de uma etapa). */
export function diasNoIntervalo(dias: DiaLetivo[], inicio: Date | string, fim: Date | string): DiaLetivo[] {
  const de = chaveData(inicio)
  const ate = chaveData(fim)
  return dias.filter((d) => d.data >= de && d.data <= ate)
}

/**
 * Aulas previstas por disciplina: para cada dia letivo, conta os tempos do
 * horário daquele dia da semana. Tempos sem disciplina vinculada são ignorados.
 */
export function aulasPrevistasPorDisciplina(
  horario: { diaSemana: number; disciplinaId: string | null }[],
  dias: DiaLetivo[]
): Map<string, number> {
  const temposPorDia = new Map<number, string[]>()
  for (const h of horario) {
    if (!h.disciplinaId) continue
    temposPorDia.set(h.diaSemana, [...(temposPorDia.get(h.diaSemana) ?? []), h.disciplinaId])
  }

  const total = new Map<string, number>()
  for (const dia of dias) {
    for (const disciplinaId of temposPorDia.get(dia.diaSemana) ?? []) {
      total.set(disciplinaId, (total.get(disciplinaId) ?? 0) + 1)
    }
  }
  return total
}
