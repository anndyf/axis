/**
 * Diário de classe por unidade e "Salvar e replicar" conteúdo - funções puras.
 * Datas em "AAAA-MM-DD".
 */
import { aulasDoDia, dataValida, type HorarioTempo } from '@/lib/services/chamada'
import type { CalendarioEntrada } from '@/lib/services/calendario'

/* ------------------------------ por unidade ------------------------------ */

export interface UnidadeDatada {
  id: string
  nome: string
  ordem: number
  /** datas da EtapaCalendario; sem etapa datada, a unidade não recebe aulas */
  inicio: string | null
  fim: string | null
}

export interface GrupoDoDiario<A> {
  /** id da unidade; "fora" = aulas fora das datas de todas as unidades */
  id: string
  nome: string
  inicio: string | null
  fim: string | null
  aulas: A[]
}

/**
 * Agrupa as aulas (já em ordem) pelas datas das unidades (EtapaCalendario).
 * Unidade sem datas aparece vazia; aula fora de todas as unidades vai para
 * "Fora das unidades" (no fim, só se houver). "1ª UNIDADE" etc. vem do nome
 * da unidade no esquema.
 */
export function agruparPorUnidade<A extends { data: string }>(aulas: A[], unidades: UnidadeDatada[]): GrupoDoDiario<A>[] {
  const ordenadas = [...unidades].sort((a, b) => a.ordem - b.ordem)
  const grupos: GrupoDoDiario<A>[] = ordenadas.map((u) => ({ id: u.id, nome: u.nome, inicio: u.inicio, fim: u.fim, aulas: [] }))
  const fora: GrupoDoDiario<A> = { id: 'fora', nome: 'Fora das unidades', inicio: null, fim: null, aulas: [] }
  for (const aula of aulas) {
    const g = grupos.find((x) => x.inicio && x.fim && aula.data >= x.inicio && aula.data <= x.fim)
    ;(g ?? fora).aulas.push(aula)
  }
  return fora.aulas.length ? [...grupos, fora] : grupos
}

/** Unidade em andamento hoje (ou a última que já começou) - fica aberta no diário. */
export function unidadeAtual(unidades: UnidadeDatada[], hoje: string): string | null {
  const iniciadas = unidades.filter((u) => u.inicio && u.inicio <= hoje).sort((a, b) => b.inicio!.localeCompare(a.inicio!))
  return iniciadas[0]?.id ?? null
}

/* --------------------------- replicar conteúdo --------------------------- */

/** "Robótica ", "robotica", "ROBÓTICA" -> "robotica" */
export function normalizarNome(nome: string): string {
  return nome.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim().toLowerCase()
}

export interface DisciplinaDoProfessor {
  id: string
  nome: string
  turmaId: string
  turmaNome: string
}

/**
 * Para onde dá para replicar: as outras disciplinas DO MESMO professor com o
 * mesmo nome (sem acento/caixa) em OUTRAS turmas. A lista de entrada já deve
 * ser só das disciplinas do professor, na escola da sessão.
 */
export function disciplinasParaReplicar(origem: { id: string; nome: string; turmaId: string }, doProfessor: DisciplinaDoProfessor[]): DisciplinaDoProfessor[] {
  const nome = normalizarNome(origem.nome)
  return doProfessor
    .filter((d) => d.id !== origem.id && d.turmaId !== origem.turmaId && normalizarNome(d.nome) === nome)
    .sort((a, b) => a.turmaNome.localeCompare(b.turmaNome))
}

/** A disciplina tem aula (tempos no horário) nesse dia letivo da turma? */
export function temposNoDia(data: string, turmaId: string, disciplinaId: string, calendario: CalendarioEntrada, horario: HorarioTempo[]): number[] {
  if (!dataValida(data)) return []
  const dia = aulasDoDia(data, turmaId, calendario, horario)
  return dia.letivo ? dia.temposPorDisciplina.get(disciplinaId) ?? [] : []
}

/**
 * Data sugerida na turma de destino: a mesma data, se a disciplina tiver
 * aula no horário naquele dia; senão a aula anterior mais próxima ainda sem
 * conteúdo (dia com aula no horário, sem aula registrada ou com conteúdo
 * vazio), até o início do período. null = nenhuma.
 */
export function sugerirData(p: {
  data: string
  turmaId: string
  disciplinaId: string
  calendario: CalendarioEntrada
  horario: HorarioTempo[]
  /** data -> conteúdo das aulas já registradas da disciplina na turma de destino */
  conteudos: Map<string, string | null>
}): string | null {
  if (temposNoDia(p.data, p.turmaId, p.disciplinaId, p.calendario, p.horario).length) return p.data
  const inicio = new Date(p.calendario.inicio).toISOString().slice(0, 10)
  for (let t = Date.parse(`${p.data}T00:00:00Z`) - 86_400_000; ; t -= 86_400_000) {
    const d = new Date(t).toISOString().slice(0, 10)
    if (d < inicio) return null
    if (!temposNoDia(d, p.turmaId, p.disciplinaId, p.calendario, p.horario).length) continue
    if (!(p.conteudos.get(d) ?? '').trim()) return d
  }
}

export type DecisaoReplicacao =
  | { acao: 'criar'; tempos: number[] }
  | { acao: 'atualizar' }
  | { acao: 'igual' }
  | { acao: 'conflito'; conteudoAtual: string }
  | { acao: 'recusar'; erro: string }

/**
 * O que fazer numa turma de destino. Só mexe no conteúdo: nunca em faltas
 * nem na situação. Sem aula registrada, cria a aula como PREVISTA (não conta
 * na frequência) - para isso a data precisa ter a disciplina no horário.
 * Conteúdo diferente já gravado só é trocado com `sobrescrever`.
 */
export function decidirReplicacao(p: {
  data: string
  tempos: number[]
  existente: { conteudo: string | null } | null
  conteudo: string
  sobrescrever: boolean
}): DecisaoReplicacao {
  if (!dataValida(p.data)) return { acao: 'recusar', erro: 'Data inválida.' }
  if (!p.conteudo.trim()) return { acao: 'recusar', erro: 'Sem conteúdo para replicar.' }
  if (!p.existente) {
    return p.tempos.length ? { acao: 'criar', tempos: p.tempos } : { acao: 'recusar', erro: 'A disciplina não tem aula no horário desta turma nesse dia.' }
  }
  const atual = (p.existente.conteudo ?? '').trim()
  if (!atual) return { acao: 'atualizar' }
  if (atual === p.conteudo.trim()) return { acao: 'igual' }
  return p.sobrescrever ? { acao: 'atualizar' } : { acao: 'conflito', conteudoAtual: atual }
}
