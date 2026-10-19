/**
 * Calendário da disciplina (ideia do SIGEduc) - funções puras.
 *
 * Para cada dia do período letivo, o estado da chamada daquela disciplina
 * (ou da chamada diária da turma, com disciplinaId null), a partir do
 * calendário letivo (calendario.ts), do horário da turma (chamada.ts) e das
 * aulas já registradas. Datas em "AAAA-MM-DD" (UTC).
 */
import { chaveData, type CalendarioEntrada } from '@/lib/services/calendario'
import { aulasDoDia, type HorarioTempo } from '@/lib/services/chamada'

export type EstadoDia =
  /** chamada lançada (aula REALIZADA) */
  | 'feita'
  /** dia com aula no horário, já passado (ou hoje), sem chamada */
  | 'pendente'
  /** dia com aula no horário, ainda por vir */
  | 'futura'
  /** feriado, recesso etc. (DiaNaoLetivo da escola ou da turma) */
  | 'nao-letivo'
  /** aula marcada como não dada */
  | 'cancelada'
  /** fim de semana, fora do período ou dia sem a disciplina no horário */
  | 'sem-aula'

export interface DiaDoCalendario {
  data: string
  estado: EstadoDia
  /** dia letivo extra / reposição (DiaLetivoExtra) */
  extra: boolean
  /** descrição do feriado/recesso ou do dia extra */
  descricao?: string
  /** tempos da disciplina no horário daquele dia */
  tempos: number[]
}

export const ROTULO_ESTADO: Record<EstadoDia, string> = {
  feita: 'Chamada lançada',
  pendente: 'Chamada pendente',
  futura: 'Aula futura',
  'nao-letivo': 'Feriado ou recesso',
  cancelada: 'Aula não dada',
  'sem-aula': 'Sem aula',
}

/** Estados em que tocar no dia abre a chamada daquela data. */
export const ESTADOS_COM_CHAMADA: EstadoDia[] = ['feita', 'pendente', 'cancelada']

type NaoLetivo = { data: Date | string; turmaId?: string | null; descricao?: string }
type Extra = { data: Date | string; seguirHorarioDe: number; descricao?: string }

const MS_DIA = 86_400_000

export function calendarioDaDisciplina(p: {
  calendario: Omit<CalendarioEntrada, 'naoLetivos' | 'extras'> & { naoLetivos: NaoLetivo[]; extras: Extra[] }
  turmaId: string
  /** null = chamada diária: vale qualquer disciplina no horário do dia */
  disciplinaId: string | null
  horario: HorarioTempo[]
  aulas: { data: Date | string; situacao: 'PREVISTA' | 'REALIZADA' | 'CANCELADA' }[]
  hoje: string
}): DiaDoCalendario[] {
  const naoLetivos = new Map<string, string>()
  for (const n of p.calendario.naoLetivos) {
    if (!n.turmaId || n.turmaId === p.turmaId) naoLetivos.set(chaveData(n.data), n.descricao ?? '')
  }
  const extras = new Map(p.calendario.extras.map((e) => [chaveData(e.data), e.descricao ?? '']))
  const situacao = new Map<string, string>()
  for (const a of p.aulas) if (a.situacao !== 'PREVISTA') situacao.set(chaveData(a.data), a.situacao)

  const dias: DiaDoCalendario[] = []
  const fim = Date.parse(`${chaveData(p.calendario.fim)}T00:00:00Z`)
  for (let t = Date.parse(`${chaveData(p.calendario.inicio)}T00:00:00Z`); t <= fim; t += MS_DIA) {
    const data = new Date(t).toISOString().slice(0, 10)
    const dia = aulasDoDia(data, p.turmaId, p.calendario, p.horario)
    const tempos = p.disciplinaId === null
      ? [...new Set([...dia.temposPorDisciplina.values()].flat())].sort((a, b) => a - b)
      : dia.temposPorDisciplina.get(p.disciplinaId) ?? []
    const extra = extras.has(data)
    const registrada = situacao.get(data)

    let estado: EstadoDia
    let descricao: string | undefined = extra ? extras.get(data) : undefined
    // Aula registrada vale mesmo que o horário/calendário tenha mudado depois
    if (registrada === 'REALIZADA') estado = 'feita'
    else if (registrada === 'CANCELADA') estado = 'cancelada'
    else if (naoLetivos.has(data)) { estado = 'nao-letivo'; descricao = naoLetivos.get(data) }
    else if (dia.letivo && tempos.length > 0) estado = data <= p.hoje ? 'pendente' : 'futura'
    else estado = 'sem-aula'

    dias.push({ data, estado, extra, ...(descricao ? { descricao } : {}), tempos })
  }
  return dias
}

export interface MesDoCalendario {
  /** "AAAA-MM" */
  chave: string
  ano: number
  /** 1..12 */
  mes: number
  /** semanas de domingo a sábado; null = dia de outro mês */
  semanas: (DiaDoCalendario | null)[][]
}

/** Agrupa os dias em meses e semanas (domingo a sábado) para desenhar a grade. */
export function mesesDoCalendario(dias: DiaDoCalendario[]): MesDoCalendario[] {
  const porMes = new Map<string, DiaDoCalendario[]>()
  for (const d of dias) {
    const chave = d.data.slice(0, 7)
    porMes.set(chave, [...(porMes.get(chave) ?? []), d])
  }
  return [...porMes].map(([chave, lista]) => {
    const [ano, mes] = chave.split('-').map(Number)
    const doMes = new Map(lista.map((d) => [d.data, d]))
    const ultimo = new Date(Date.UTC(ano, mes, 0)).getUTCDate()
    const celulas: (DiaDoCalendario | null)[] = Array(new Date(Date.UTC(ano, mes - 1, 1)).getUTCDay()).fill(null)
    for (let dia = 1; dia <= ultimo; dia++) {
      const data = `${chave}-${String(dia).padStart(2, '0')}`
      // dias do mês fora do período letivo entram como "sem aula"
      celulas.push(doMes.get(data) ?? { data, estado: 'sem-aula', extra: false, tempos: [] })
    }
    while (celulas.length % 7) celulas.push(null)
    const semanas: (DiaDoCalendario | null)[][] = []
    for (let i = 0; i < celulas.length; i += 7) semanas.push(celulas.slice(i, i + 7))
    return { chave, ano, mes, semanas }
  })
}

/** Quantos dias em cada estado (para a legenda). */
export function contarEstados(dias: DiaDoCalendario[]): Record<EstadoDia, number> & { extra: number } {
  const total = { feita: 0, pendente: 0, futura: 0, 'nao-letivo': 0, cancelada: 0, 'sem-aula': 0, extra: 0 }
  for (const d of dias) {
    total[d.estado]++
    if (d.extra) total.extra++
  }
  return total
}
