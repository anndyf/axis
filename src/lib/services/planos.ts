import { MODULOS, LIMITE_USUARIOS } from '@/lib/modules'
import { MODULO_IDS, type ModuloId } from '@/lib/modulos/tipos'
import { estadosPeloCatalogo, type SituacaoAssinatura } from './modulos'

export type PlanoLegado = 'BASICO' | 'PRO' | 'ENTERPRISE'
export type StatusEscolaLegado = 'TRIAL' | 'ATIVA' | 'SUSPENSA' | 'CANCELADA'

const ORDEM: Record<PlanoLegado, number> = { BASICO: 0, PRO: 1, ENTERPRISE: 2 }

/**
 * Os três planos de hoje como pacotes de módulos, calculados do próprio
 * catálogo (mesma regra do getModulosAtivos antigo) para o backfill dar
 * resultado idêntico. Sem preço: decisão comercial (D-11).
 */
export function planosIniciais(): { codigo: PlanoLegado; nome: string; ordem: number; limiteUsuarios: number | null; modulos: ModuloId[] }[] {
  const nomes: Record<PlanoLegado, string> = { BASICO: 'Básico', PRO: 'Pro', ENTERPRISE: 'Enterprise' }
  return (Object.keys(ORDEM) as PlanoLegado[]).map((codigo) => {
    const itens = MODULOS.filter((m) => !m.planoMinimo || ORDEM[codigo] >= ORDEM[m.planoMinimo as PlanoLegado]).map((m) => m.id)
    const estados = estadosPeloCatalogo(MODULOS, itens)
    const limite = LIMITE_USUARIOS[codigo]
    return {
      codigo,
      nome: nomes[codigo],
      ordem: ORDEM[codigo],
      limiteUsuarios: Number.isFinite(limite) ? limite : null,
      modulos: MODULO_IDS.filter((m) => estados[m] === 'ATIVO'),
    }
  })
}

/** Escola.status (antigo) → situação da assinatura. TRIAL vira TESTE sem data de fim (a definir). */
export function situacaoDoStatus(status: StatusEscolaLegado): SituacaoAssinatura {
  return status === 'TRIAL' ? 'TESTE' : status
}

/**
 * Situação → Escola.status, que o proxy ainda lê (suspensa/cancelada
 * bloqueiam a escola). Inadimplente continua acessando, em somente leitura.
 */
export function statusDaSituacao(situacao: SituacaoAssinatura): StatusEscolaLegado {
  if (situacao === 'TESTE') return 'TRIAL'
  if (situacao === 'INADIMPLENTE') return 'ATIVA'
  return situacao
}

/** Itens antigos do catálogo (EscolaModulo) que representam cada módulo pago. */
export function itensLegadosDoModulo(modulo: ModuloId): string[] {
  return MODULOS.filter((m) => m.moduloId === modulo && m.planoMinimo).map((m) => m.id)
}

export function ehPlanoLegado(codigo: string): codigo is PlanoLegado {
  return codigo in ORDEM
}

const SITUACOES: SituacaoAssinatura[] = ['TESTE', 'ATIVA', 'INADIMPLENTE', 'SUSPENSA', 'CANCELADA']
const DATA = /^\d{4}-\d{2}-\d{2}$/
const dataOk = (v: unknown) => typeof v === 'string' && DATA.test(v) && !isNaN(new Date(`${v}T00:00:00Z`).getTime())
const limiteOk = (v: unknown) => v === null || (typeof v === 'number' && Number.isInteger(v) && v >= 0)

/** Valida o corpo do PATCH de assinatura do painel da plataforma (só os campos conhecidos). */
export function validarMudancaAssinatura(corpo: unknown):
  | { ok: true; mudanca: { planoCodigo?: string; situacao?: SituacaoAssinatura; fimTeste?: string | null; observacoes?: string | null; limiteUsuarios?: number | null; limiteEstudantes?: number | null } }
  | { ok: false; erro: string } {
  if (!corpo || typeof corpo !== 'object') return { ok: false, erro: 'Corpo inválido' }
  const c = corpo as Record<string, unknown>
  const m: Record<string, unknown> = {}
  if (c.planoCodigo !== undefined) {
    if (typeof c.planoCodigo !== 'string' || !c.planoCodigo) return { ok: false, erro: 'Plano inválido' }
    m.planoCodigo = c.planoCodigo
  }
  if (c.situacao !== undefined) {
    if (!SITUACOES.includes(c.situacao as SituacaoAssinatura)) return { ok: false, erro: 'Situação inválida' }
    m.situacao = c.situacao
  }
  if (c.fimTeste !== undefined) {
    if (c.fimTeste !== null && !dataOk(c.fimTeste)) return { ok: false, erro: 'Data de fim do teste inválida' }
    m.fimTeste = c.fimTeste
  }
  if (c.observacoes !== undefined) {
    if (c.observacoes !== null && typeof c.observacoes !== 'string') return { ok: false, erro: 'Observações inválidas' }
    m.observacoes = typeof c.observacoes === 'string' ? c.observacoes.trim().slice(0, 2000) || null : null
  }
  for (const campo of ['limiteUsuarios', 'limiteEstudantes'] as const) {
    if (c[campo] !== undefined) {
      if (!limiteOk(c[campo])) return { ok: false, erro: 'Limite inválido' }
      m[campo] = c[campo]
    }
  }
  if (!Object.keys(m).length) return { ok: false, erro: 'Nada para atualizar' }
  return { ok: true, mudanca: m }
}

const ORIGENS = ['ADICIONAL', 'CORTESIA', 'TESTE', 'EXCECAO'] as const
const ESTADOS = ['ATIVO', 'SOMENTE_LEITURA', 'INATIVO'] as const

/** Valida o corpo do PUT de módulo da assinatura. estado null = volta ao plano. */
export function validarModuloAssinatura(corpo: unknown):
  | { ok: true; moduloId: Exclude<ModuloId, 'NUC'>; alvo: { estado: (typeof ESTADOS)[number]; origem: (typeof ORIGENS)[number]; fim: string | null; leituraAte: string | null } | null }
  | { ok: false; erro: string } {
  if (!corpo || typeof corpo !== 'object') return { ok: false, erro: 'Corpo inválido' }
  const c = corpo as Record<string, unknown>
  if (!(MODULO_IDS as readonly unknown[]).includes(c.moduloId) || c.moduloId === 'NUC') return { ok: false, erro: 'Módulo inválido' }
  const moduloId = c.moduloId as Exclude<ModuloId, 'NUC'>
  if (c.estado === null) return { ok: true, moduloId, alvo: null }
  if (!ESTADOS.includes(c.estado as (typeof ESTADOS)[number])) return { ok: false, erro: 'Estado inválido' }
  const origem = c.origem ?? 'EXCECAO'
  if (!ORIGENS.includes(origem as (typeof ORIGENS)[number])) return { ok: false, erro: 'Origem inválida' }
  for (const campo of ['fim', 'leituraAte'] as const) {
    if (c[campo] !== undefined && c[campo] !== null && !dataOk(c[campo])) return { ok: false, erro: 'Data inválida' }
  }
  return {
    ok: true, moduloId,
    alvo: { estado: c.estado as (typeof ESTADOS)[number], origem: origem as (typeof ORIGENS)[number], fim: (c.fim as string) ?? null, leituraAte: (c.leituraAte as string) ?? null },
  }
}
