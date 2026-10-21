import { prisma } from '@/lib/prisma'
import { resolverEsquemaAvaliacaoId } from '@/lib/services/notas'
import { anoLetivoDaTurma } from '@/lib/services/frequencia-leitura'
import { hojeNaEscola } from '@/lib/services/chamada'
import { chaveData } from '@/lib/services/calendario'

/**
 * Cadeado de unidade encerrada - a regra única, no servidor.
 *
 * Uma unidade (EtapaCalendario: uma etapa do esquema de avaliação num ano
 * letivo da escola) fica ENCERRADA:
 * - automaticamente a partir do dia seguinte ao prazoLancamento (data no
 *   fuso da escola); sem prazo cadastrado, não encerra sozinha;
 * - ou antes, quando a gestão encerra (encerradaEm/encerradaPorId).
 * Encerrada, nada que pertença a ela pode ser gravado: notas da unidade
 * (NotaUnidade, NotaAtividade, NotaAvaliacao, infrequente/não realizou),
 * avaliações do professor da etapa, e aulas/faltas de datas entre o início
 * e o fim da etapa. Recuperação final e conselho seguem a ÚLTIMA unidade
 * (maior ordem). Uma reabertura (ReaberturaUnidade) libera só a turma +
 * disciplina dela (disciplina nula = chamada diária POR_DIA) até a data
 * `ate`, inclusive.
 *
 * Não tranca: turma sem esquema, ano sem calendário cadastrado, etapa sem
 * datas no calendário, data de aula fora de qualquer etapa.
 *
 * É uma checagem A MAIS, depois da regra de quem pode gravar (só quem
 * leciona): quem chama confere o acesso antes, como sempre.
 */

/** Status HTTP da recusa por unidade encerrada (Locked). */
export const STATUS_CADEADO = 423

export type Liberacao = { ok: true } | { ok: false; mensagem: string }
const LIBERADO: Liberacao = { ok: true }

export interface EtapaCadeado {
  id: string
  esquemaUnidadeId: string
  nome: string
  ordem: number
  inicio: string // YYYY-MM-DD
  fim: string
  prazoLancamento: string | null
  encerradaEm: Date | null
}

export interface ReaberturaCadeado {
  id: string
  etapaCalendarioId: string
  disciplinaId: string | null
  ate: string // YYYY-MM-DD, inclusive
}

export interface ContextoCadeado {
  turmaId: string
  /** etapas do esquema da turma com datas no calendário do ano (ordem crescente) */
  etapas: EtapaCadeado[]
  /** maior ordem do esquema (a "última unidade"), mesmo sem datas no calendário */
  ultimaOrdem: number | null
  /** reaberturas não revogadas da turma (vigência conferida na hora) */
  reaberturas: ReaberturaCadeado[]
}

/* ------------------------------- parte pura ------------------------------- */

/** "2026-10-18" → "18/10/2026" */
export function dataBR(data: string): string {
  const [a, m, d] = data.slice(0, 10).split('-')
  return `${d}/${m}/${a}`
}

/** Reabertura: padrão de 7 dias, no máximo 30 (a partir de hoje). */
export const REABERTURA_PADRAO_DIAS = 7
export const REABERTURA_MAXIMA_DIAS = 30

export function somarDias(data: string, dias: number): string {
  const d = new Date(`${data}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + dias)
  return d.toISOString().slice(0, 10)
}

/** "1ª Unidade" → "A"; "2º Bimestre" → "O" (para "A 1ª Unidade foi encerrada"). */
function masculino(nome: string): boolean {
  return /\bbimestre|\btrimestre|\bsemestre|\bper[ií]odo|\bciclo|\bm[oó]dulo|^\s*\d+\s*º/i.test(nome)
}

export interface Encerramento {
  /** dia (YYYY-MM-DD) a partir do qual está encerrada */
  data: string
  origem: 'PRAZO' | 'MANUAL'
}

/** Quando a etapa ficou encerrada (ou null se ainda está aberta em `hoje`). */
export function encerramentoDaEtapa(etapa: Pick<EtapaCadeado, 'prazoLancamento' | 'encerradaEm'>, hoje: string): Encerramento | null {
  const manual = etapa.encerradaEm ? hojeNaEscola(etapa.encerradaEm) : null
  const peloPrazo = etapa.prazoLancamento && hoje > etapa.prazoLancamento ? somarDias(etapa.prazoLancamento, 1) : null
  if (manual && (!peloPrazo || manual <= peloPrazo)) return { data: manual, origem: 'MANUAL' }
  if (peloPrazo) return { data: peloPrazo, origem: 'PRAZO' }
  return null
}

/** Encerramento manual que ainda pode ser desfeito (antecipado: o prazo não passou). */
export function podeDesfazerEncerramento(etapa: Pick<EtapaCadeado, 'prazoLancamento' | 'encerradaEm'>, hoje: string): boolean {
  if (!etapa.encerradaEm) return false
  return !etapa.prazoLancamento || hoje <= etapa.prazoLancamento
}

/** Reabertura vigente da etapa para a disciplina (null = chamada diária). */
export function reaberturaVigente(reaberturas: ReaberturaCadeado[], etapaId: string, disciplinaId: string | null, hoje: string): ReaberturaCadeado | null {
  const vigentes = reaberturas.filter((r) => r.etapaCalendarioId === etapaId && r.disciplinaId === disciplinaId && r.ate >= hoje)
  return vigentes.sort((a, b) => (a.ate < b.ate ? 1 : -1))[0] ?? null
}

/** "A 1ª Unidade foi encerrada em 18/10/2026. Para alterar, solicite a reabertura à coordenação." */
export function mensagemBloqueio(nome: string, encerradaEm: string): string {
  const m = masculino(nome)
  return `${m ? 'O' : 'A'} ${nome} foi ${m ? 'encerrado' : 'encerrada'} em ${dataBR(encerradaEm)}. Para alterar, solicite a reabertura à coordenação.`
}

/** Aviso das telas: "1ª Unidade encerrada em 18/10/2026. Para alterar, solicite a reabertura à coordenação." */
export function avisoEncerrada(nome: string, encerradaEm: string): string {
  return `${nome} ${masculino(nome) ? 'encerrado' : 'encerrada'} em ${dataBR(encerradaEm)}. Para alterar, solicite a reabertura à coordenação.`
}

export function avisoReaberta(ate: string): string {
  return `Reaberta para você até ${dataBR(ate)}`
}

export type EstadoUnidade =
  | { estado: 'ABERTA'; prazo: string | null }
  | { estado: 'ENCERRADA'; encerramento: Encerramento }
  | { estado: 'REABERTA'; encerramento: Encerramento; ate: string }

/** Situação da etapa para uma turma + disciplina (null = chamada diária). */
export function estadoDaEtapa(etapa: EtapaCadeado, reaberturas: ReaberturaCadeado[], disciplinaId: string | null, hoje: string): EstadoUnidade {
  const encerramento = encerramentoDaEtapa(etapa, hoje)
  if (!encerramento) return { estado: 'ABERTA', prazo: etapa.prazoLancamento }
  const r = reaberturaVigente(reaberturas, etapa.id, disciplinaId, hoje)
  return r ? { estado: 'REABERTA', encerramento, ate: r.ate } : { estado: 'ENCERRADA', encerramento }
}

function liberacaoDaEtapa(ctx: ContextoCadeado, etapa: EtapaCadeado, disciplinaId: string | null, hoje: string): Liberacao {
  const e = estadoDaEtapa(etapa, ctx.reaberturas, disciplinaId, hoje)
  return e.estado === 'ENCERRADA' ? { ok: false, mensagem: mensagemBloqueio(etapa.nome, e.encerramento.data) } : LIBERADO
}

/** Notas, avaliações e infrequente/não realizou de uma etapa (esquemaUnidade). */
export function verificarNotaUnidade(ctx: ContextoCadeado, disciplinaId: string, esquemaUnidadeId: string, hoje = hojeNaEscola()): Liberacao {
  const etapa = ctx.etapas.find((e) => e.esquemaUnidadeId === esquemaUnidadeId)
  return etapa ? liberacaoDaEtapa(ctx, etapa, disciplinaId, hoje) : LIBERADO
}

/** Aula (chamada, diário, faltas, observação) de uma data. disciplinaId null = chamada diária. */
export function verificarAula(ctx: ContextoCadeado, disciplinaId: string | null, data: string, hoje = hojeNaEscola()): Liberacao {
  for (const etapa of ctx.etapas.filter((e) => e.inicio <= data && data <= e.fim)) {
    const r = liberacaoDaEtapa(ctx, etapa, disciplinaId, hoje)
    if (!r.ok) return r
  }
  return LIBERADO
}

/** Recuperação final e conselho de classe: seguem a última etapa do esquema. */
export function verificarRecuperacaoOuConselho(ctx: ContextoCadeado, disciplinaId: string, hoje = hojeNaEscola()): Liberacao {
  if (ctx.ultimaOrdem === null) return LIBERADO
  const ultima = ctx.etapas.find((e) => e.ordem === ctx.ultimaOrdem)
  return ultima ? liberacaoDaEtapa(ctx, ultima, disciplinaId, hoje) : LIBERADO
}

/* ------------------------------ parte do banco ------------------------------ */

/**
 * Tudo o que o cadeado precisa para uma turma, numa leitura: etapas do
 * esquema da turma (turma ?? curso) no calendário do ano letivo dela e as
 * reaberturas não revogadas. null = turma fora da escola.
 */
export async function contextoCadeado(escolaId: string, turmaId: string): Promise<ContextoCadeado | null> {
  const turma = await prisma.turma.findFirst({
    where: { id: turmaId, escolaId },
    select: { id: true, anoLetivo: true, esquemaAvaliacaoId: true, cursoId: true },
  })
  if (!turma) return null
  const curso = turma.cursoId
    ? await prisma.curso.findFirst({ where: { id: turma.cursoId, escolaId }, select: { esquemaAvaliacaoId: true } })
    : null
  const esquemaId = resolverEsquemaAvaliacaoId(turma, curso)
  const vazio: ContextoCadeado = { turmaId: turma.id, etapas: [], ultimaOrdem: null, reaberturas: [] }
  if (!esquemaId) return vazio

  const anoLetivo = await anoLetivoDaTurma(escolaId, turma)
  const [ultima, etapas, reaberturas] = await Promise.all([
    prisma.esquemaUnidade.findFirst({ where: { esquemaId, esquema: { escolaId } }, orderBy: { ordem: 'desc' }, select: { ordem: true } }),
    prisma.etapaCalendario.findMany({
      where: { periodoLetivo: { escolaId, anoLetivo }, esquemaUnidade: { esquemaId, esquema: { escolaId } } },
      select: { id: true, esquemaUnidadeId: true, inicio: true, fim: true, prazoLancamento: true, encerradaEm: true, esquemaUnidade: { select: { nome: true, ordem: true } } },
    }),
    prisma.reaberturaUnidade.findMany({
      where: { escolaId, turmaId: turma.id, revogadaEm: null },
      select: { id: true, etapaCalendarioId: true, disciplinaId: true, ate: true },
    }),
  ])
  return {
    turmaId: turma.id,
    ultimaOrdem: ultima?.ordem ?? null,
    etapas: etapas
      .map((e) => ({
        id: e.id,
        esquemaUnidadeId: e.esquemaUnidadeId,
        nome: e.esquemaUnidade.nome,
        ordem: e.esquemaUnidade.ordem,
        inicio: chaveData(e.inicio),
        fim: chaveData(e.fim),
        prazoLancamento: e.prazoLancamento ? chaveData(e.prazoLancamento) : null,
        encerradaEm: e.encerradaEm,
      }))
      .sort((a, b) => a.ordem - b.ordem),
    reaberturas: reaberturas.map((r) => ({ ...r, ate: chaveData(r.ate) })),
  }
}

/** Turma fora da escola: quem chama já recusou pelo acesso; aqui não libera por engano. */
const TURMA_INVALIDA: Liberacao = { ok: false, mensagem: 'Turma não encontrada.' }

export async function podeGravarNotaUnidade(escolaId: string, turmaId: string, disciplinaId: string, esquemaUnidadeId: string): Promise<Liberacao> {
  const ctx = await contextoCadeado(escolaId, turmaId)
  return ctx ? verificarNotaUnidade(ctx, disciplinaId, esquemaUnidadeId) : TURMA_INVALIDA
}

export async function podeGravarAula(escolaId: string, turmaId: string, disciplinaId: string | null, data: string): Promise<Liberacao> {
  const ctx = await contextoCadeado(escolaId, turmaId)
  return ctx ? verificarAula(ctx, disciplinaId, data.slice(0, 10)) : TURMA_INVALIDA
}

export async function podeGravarRecuperacaoOuConselho(escolaId: string, turmaId: string, disciplinaId: string): Promise<Liberacao> {
  const ctx = await contextoCadeado(escolaId, turmaId)
  return ctx ? verificarRecuperacaoOuConselho(ctx, disciplinaId) : TURMA_INVALIDA
}

/** Para as telas: situação de cada etapa (por esquemaUnidadeId) para a turma + disciplina. */
export interface SituacaoUnidadeTela {
  esquemaUnidadeId: string
  nome: string
  trancada: boolean
  /** texto do aviso (encerrada ou reaberta); null quando aberta */
  aviso: string | null
  reabertaAte: string | null
}

export function situacoesParaTela(ctx: ContextoCadeado, disciplinaId: string | null, hoje = hojeNaEscola()): SituacaoUnidadeTela[] {
  return ctx.etapas.map((etapa) => {
    const e = estadoDaEtapa(etapa, ctx.reaberturas, disciplinaId, hoje)
    return {
      esquemaUnidadeId: etapa.esquemaUnidadeId,
      nome: etapa.nome,
      trancada: e.estado === 'ENCERRADA',
      aviso: e.estado === 'ENCERRADA' ? avisoEncerrada(etapa.nome, e.encerramento.data) : e.estado === 'REABERTA' ? avisoReaberta(e.ate) : null,
      reabertaAte: e.estado === 'REABERTA' ? e.ate : null,
    }
  })
}
