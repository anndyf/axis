import { PlanoTipo } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { MODULOS, ORDEM_PLANO } from '@/lib/modules'

/**
 * Resolve quais módulos estão disponíveis para uma escola, combinando o
 * plano contratado com eventuais overrides em EscolaModulo (que sempre
 * vencem, pra cima ou pra baixo, independente do plano).
 *
 * Server-only (consulta o banco) - por isso fica separado de src/lib/modules.ts,
 * que precisa ser importável por componentes client (ex. DashboardSidebar).
 */
export async function getModulosAtivos(escolaId: string, plano: PlanoTipo): Promise<string[]> {
  const overrides = await prisma.escolaModulo.findMany({ where: { escolaId } })
  const overrideMap = new Map(overrides.map((o) => [o.moduloId, o.ativo]))

  return MODULOS.filter((m) => {
    const override = overrideMap.get(m.id)
    if (override !== undefined) return override
    return !m.planoMinimo || ORDEM_PLANO[plano] >= ORDEM_PLANO[m.planoMinimo]
  }).map((m) => m.id)
}
