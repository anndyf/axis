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
