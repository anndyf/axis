import { PlanoTipo } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { MODULOS, ORDEM_PLANO, LIMITE_USUARIOS } from '@/lib/modules'
import { assinaturaVigente, dadosDaAssinatura } from '@/lib/modulos/assinatura'
import { estadosDaAssinatura, itensAtivosPelosEstados } from '@/lib/services/modulos'
import { hojeNaEscola } from '@/lib/services/chamada'

/**
 * Itens do catálogo de menu disponíveis para a escola. Lê a assinatura
 * (fase 2); escola ainda sem assinatura cai no modelo antigo (plano +
 * EscolaModulo) - "leitura dupla" do roteiro, até o backfill cobrir todas.
 *
 * Server-only (consulta o banco) - por isso fica separado de src/lib/modules.ts,
 * que precisa ser importável por componentes client (ex. DashboardSidebar).
 */
export async function getModulosAtivos(escolaId: string, plano: PlanoTipo): Promise<string[]> {
  const assinatura = await assinaturaVigente(escolaId)
  if (!assinatura) return getModulosAtivosLegado(escolaId, plano)
  return itensAtivosPelosEstados(MODULOS, estadosDaAssinatura(dadosDaAssinatura(assinatura), hojeNaEscola()))
}

/**
 * Modelo antigo: plano contratado + overrides em EscolaModulo (que sempre
 * vencem, pra cima ou pra baixo, independente do plano). Mantido para o
 * fallback e para o teste de equivalência; sai depois da validação da fase 2.
 */
export async function getModulosAtivosLegado(escolaId: string, plano: PlanoTipo): Promise<string[]> {
  const overrides = await prisma.escolaModulo.findMany({ where: { escolaId } })
  const overrideMap = new Map(overrides.map((o) => [o.moduloId, o.ativo]))

  return MODULOS.filter((m) => {
    const override = overrideMap.get(m.id)
    if (override !== undefined) return override
    return !m.planoMinimo || ORDEM_PLANO[plano] >= ORDEM_PLANO[m.planoMinimo]
  }).map((m) => m.id)
}

/**
 * Conta usuários STAFF (não-portal) da escola, para checar contra o limite
 * do plano (LIMITE_USUARIOS) antes de permitir a criação de um novo.
 */
export async function contarUsuariosStaff(escolaId: string): Promise<number> {
  return prisma.user.count({ where: { escolaId, isPortalUser: false } })
}

/**
 * true se a escola ainda tem espaço pra criar mais 1 usuário staff dado o
 * plano contratado.
 */
export async function podeAdicionarUsuarioStaff(escolaId: string, plano: PlanoTipo): Promise<boolean> {
  const total = await contarUsuariosStaff(escolaId)
  return total < LIMITE_USUARIOS[plano]
}
