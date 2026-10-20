import { cache } from 'react'
import { prisma } from '@/lib/prisma'
import { MODULOS } from '@/lib/modules'
import { getModulosAtivos } from '@/lib/modules-server'
import { estadosPeloCatalogo } from '@/lib/services/modulos'
import type { EstadoModulo, ModuloId } from './tipos'

/**
 * Estado de cada módulo para a escola. Fase 1: derivado do modelo atual
 * (plano + EscolaModulo via getModulosAtivos). Lido uma vez por requisição
 * (cache do React), sem cache entre requisições - mudança vale na hora.
 */
export const estadosDaEscola = cache(async (escolaId: string): Promise<Record<ModuloId, EstadoModulo>> => {
  const escola = await prisma.escola.findUnique({ where: { id: escolaId }, select: { plano: true } })
  const ativos = await getModulosAtivos(escolaId, escola?.plano || 'BASICO')
  return estadosPeloCatalogo(MODULOS, ativos)
})
