/**
 * Início do professor (ideia do "Minhas Turmas" do SIGEduc) - funções puras.
 *
 * Um cartão por turma × disciplina com as três ações do dia a dia
 * (Chamada · Notas · Diário) e o destaque "Agora"/"Próxima aula" pelo
 * horário de hoje. Os dados chegam já escopados pela escola e pelo
 * professor (painel-leitura.ts); aqui só se monta o que a tela mostra.
 */
import { FUSO_ESCOLA } from '@/lib/services/chamada'

/** "HH:MM" agora, no fuso das escolas. */
export function horaNaEscola(agora = new Date()): string {
  return agora.toLocaleTimeString('en-GB', { timeZone: FUSO_ESCOLA, hour: '2-digit', minute: '2-digit', hour12: false })
}

export interface TempoDoDia {
  ordem: number
  inicio: string
  fim: string
}

export interface AulaParaDestaque {
  turmaId: string
  disciplinaId: string | null
  tempos: number[]
  feita: boolean
}

export type Destaque<A extends AulaParaDestaque> =
  | { tipo: 'agora' | 'proxima'; aula: A; inicio: string; fim: string }
  | { tipo: 'pendente'; aula: A; inicio: null; fim: null }

/**
 * Aula em destaque: a que está acontecendo agora; senão a próxima de hoje;
 * senão a primeira de hoje ainda sem chamada. Horários vêm dos tempos de aula
 * do turno da turma (`temposDoTurno(turmaId)`); tempo sem horário cadastrado
 * não entra no "agora/próxima". `agora` em "HH:MM".
 */
export function destaqueDoDia<A extends AulaParaDestaque>(aulas: A[], temposDoTurno: (aula: A) => TempoDoDia[], agora: string): Destaque<A> | null {
  let atual: Destaque<A> | null = null
  let proxima: Destaque<A> | null = null
  for (const aula of aulas) {
    const tempos = temposDoTurno(aula).filter((t) => aula.tempos.includes(t.ordem)).sort((a, b) => a.ordem - b.ordem)
    for (const t of tempos) {
      if (t.inicio <= agora && agora < t.fim && !atual) atual = { tipo: 'agora', aula, inicio: t.inicio, fim: t.fim }
      if (t.inicio > agora && (!proxima || t.inicio < proxima.inicio!)) proxima = { tipo: 'proxima', aula, inicio: t.inicio, fim: t.fim }
    }
  }
  if (atual) return atual
  if (proxima) return proxima
  const pendente = aulas.find((a) => !a.feita)
  return pendente ? { tipo: 'pendente', aula: pendente, inicio: null, fim: null } : null
}

/** "1º e 6º tempos", "2º tempo", "1º, 2º e 3º tempos". */
export function rotuloTempos(tempos: number[]): string {
  if (tempos.length === 0) return 'Chamada do dia'
  const nomes = tempos.map((t) => `${t}º`)
  const lista = nomes.length === 1 ? nomes[0] : `${nomes.slice(0, -1).join(', ')} e ${nomes.at(-1)}`
  return `${lista} ${tempos.length === 1 ? 'tempo' : 'tempos'}`
}

export interface DisciplinaDoCartao {
  id: string
  nome: string
  turmaId: string
  turmaNome: string
  alunos: number
  semNota: number
}

export interface PendenciaDoCartao {
  disciplinaId: string | null
  turmaId: string
  chamadasPendentes: number
  ultimaPendente: string | null
}

export interface CartaoTurmaDisciplina {
  chave: string
  disciplinaId: string
  nome: string
  turmaId: string
  turmaNome: string
  alunos: number
  semNota: number
  chamadasPendentes: number
  /** turma com chamada diária (POR_DIA): a chamada não é por disciplina */
  chamadaDiaria: boolean
  temAulaHoje: boolean
  links: { chamada: string; notas: string; diario: string }
}

/**
 * Cartões turma × disciplina. A ação "Chamada" abre direto o dia que faz
 * sentido: hoje, se houver aula hoje ainda sem chamada; senão o último dia
 * pendente; senão hoje (para revisar) ou o diário (onde fica o calendário da disciplina). Na chamada diária, a
 * chamada e o diário são da turma (sem disciplina) e as pendências também.
 */
export function cartoesDoProfessor(p: {
  disciplinas: DisciplinaDoCartao[]
  pendencias: PendenciaDoCartao[]
  turmasChamadaDiaria: Set<string>
  /** "turmaId|disciplinaId" (ou "turmaId|" na chamada diária) com aula hoje */
  aulasHoje: Set<string>
  /** subconjunto de aulasHoje com a chamada já salva */
  feitasHoje?: Set<string>
  hoje: string
}): CartaoTurmaDisciplina[] {
  const pend = new Map(p.pendencias.map((x) => [`${x.turmaId}|${x.disciplinaId ?? ''}`, x]))
  return p.disciplinas
    .map((d) => {
      const diaria = p.turmasChamadaDiaria.has(d.turmaId)
      const chave = `${d.turmaId}|${diaria ? '' : d.id}`
      const pendencia = pend.get(chave)
      const temAulaHoje = p.aulasHoje.has(chave)
      const alvo = diaria ? `turma=${d.turmaId}` : `turma=${d.turmaId}&disciplina=${d.id}`
      const diario = `/dashboard/chamada/diario?${alvo}`
      // Chamada de hoje já feita: abre o último dia pendente, se houver
      const feitaHoje = temAulaHoje && !!p.feitasHoje?.has(chave)
      const data = temAulaHoje && !feitaHoje ? p.hoje : pendencia?.ultimaPendente ?? (temAulaHoje ? p.hoje : null)
      return {
        chave: `${d.turmaId}|${d.id}`,
        disciplinaId: d.id,
        nome: d.nome,
        turmaId: d.turmaId,
        turmaNome: d.turmaNome,
        alunos: d.alunos,
        semNota: d.semNota,
        chamadasPendentes: pendencia?.chamadasPendentes ?? 0,
        chamadaDiaria: diaria,
        temAulaHoje,
        links: {
          chamada: data ? `/dashboard/chamada/fazer?${alvo}&data=${data}` : diario,
          notas: `/dashboard/notas/lancar/${d.turmaId}?disciplina=${d.id}`,
          diario,
        },
      }
    })
    .sort((a, b) => a.turmaNome.localeCompare(b.turmaNome) || a.nome.localeCompare(b.nome))
}

/** Turmas para as fichas de filtro (sem repetir, em ordem). */
export function turmasDosCartoes(cartoes: { turmaId: string; turmaNome: string }[]): { id: string; nome: string }[] {
  const vistas = new Map<string, string>()
  for (const c of cartoes) vistas.set(c.turmaId, c.turmaNome)
  return [...vistas].map(([id, nome]) => ({ id, nome })).sort((a, b) => a.nome.localeCompare(b.nome))
}
