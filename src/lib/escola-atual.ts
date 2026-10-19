import { cache } from 'react'
import { headers } from 'next/headers'
import { prisma } from '@/lib/prisma'

/**
 * Escola da requisição pelo header x-escola-id (definido pelo src/proxy.ts a
 * partir do subdomínio; nunca vem do cliente). Usado nas páginas públicas
 * (login, acesso) e no layout raiz para a identidade visual. null no
 * domínio raiz (página de entrada). Uma consulta por requisição (cache).
 */
export const escolaDaRequisicao = cache(async () => {
  const escolaId = (await headers()).get('x-escola-id')
  if (!escolaId) return null
  return prisma.escola.findUnique({
    where: { id: escolaId },
    select: { id: true, nome: true, logoUrl: true, corPrimaria: true },
  })
})
