import { cache } from 'react'
import { prisma } from '@/lib/prisma'
import { MODULOS } from '@/lib/modules'
import { getModulosAtivosLegado } from '@/lib/modules-server'
import { assinaturaVigente, dadosDaAssinatura } from '@/lib/modulos/assinatura'
import { estadosDaAssinatura, estadosPeloCatalogo } from '@/lib/services/modulos'
import { hojeNaEscola } from '@/lib/services/chamada'
import type { EstadoModulo, ModuloId } from './tipos'

/**
 * Estado de cada módulo para a escola: pela assinatura (fase 2) ou, se a
 * escola ainda não tem assinatura, pelo modelo antigo (plano + EscolaModulo).
 * Lido uma vez por requisição (cache do React), sem cache entre requisições -
 * mudança de assinatura vale na hora.
 */
export const estadosDaEscola = cache(async (escolaId: string): Promise<Record<ModuloId, EstadoModulo>> => {
  const assinatura = await assinaturaVigente(escolaId)
  if (assinatura) return estadosDaAssinatura(dadosDaAssinatura(assinatura), hojeNaEscola())
  return estadosLegados(escolaId)
})

/** Modelo antigo (fase 1). Usado no fallback e no teste de equivalência. */
export async function estadosLegados(escolaId: string): Promise<Record<ModuloId, EstadoModulo>> {
  const escola = await prisma.escola.findUnique({ where: { id: escolaId }, select: { plano: true } })
  const ativos = await getModulosAtivosLegado(escolaId, escola?.plano || 'BASICO')
  return estadosPeloCatalogo(MODULOS, ativos)
}
