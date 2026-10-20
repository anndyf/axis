import { cache } from 'react'
import { prisma } from '@/lib/prisma'
import type { DadosAssinatura } from '@/lib/services/modulos'

const INCLUDE = { plano: { include: { modulos: true } }, modulos: true } as const

/** Assinatura vigente da escola (a mais recente) ou null. Uma consulta por requisição. */
export const assinaturaVigente = cache(async (escolaId: string) => {
  return prisma.assinatura.findFirst({ where: { escolaId }, orderBy: { createdAt: 'desc' }, include: INCLUDE })
})

type AssinaturaCompleta = NonNullable<Awaited<ReturnType<typeof assinaturaVigente>>>

const dia = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : null)

export function dadosDaAssinatura(a: AssinaturaCompleta): DadosAssinatura {
  return {
    situacao: a.situacao,
    fimTeste: dia(a.fimTeste),
    modulosDoPlano: a.plano.modulos.map((m) => m.moduloId),
    excecoes: a.modulos.map((m) => ({ moduloId: m.moduloId, estado: m.estado, fim: dia(m.fim), leituraAte: dia(m.leituraAte) })),
  }
}
