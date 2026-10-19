import { prisma } from '@/lib/prisma'

/**
 * Limitador de tentativas guardado no banco (TentativaAcesso) - funciona
 * entre várias instâncias serverless, ao contrário de um contador em memória.
 * Chaves usadas: `login:<escolaId>:<usuario>`, `reset:<escolaId>:<email>`.
 */

export async function excedeuLimite(chave: string, maximo: number, janelaMinutos: number): Promise<boolean> {
  const desde = new Date(Date.now() - janelaMinutos * 60_000)
  const tentativas = await prisma.tentativaAcesso.count({ where: { chave, criadoEm: { gte: desde } } })
  return tentativas >= maximo
}

export async function registrarTentativa(chave: string): Promise<void> {
  await prisma.tentativaAcesso.create({ data: { chave } })
  // Faxina oportunista: nada aqui precisa de mais de 1 dia de histórico
  await prisma.tentativaAcesso.deleteMany({ where: { chave, criadoEm: { lt: new Date(Date.now() - 86_400_000) } } })
}

export async function limparTentativas(chave: string): Promise<void> {
  await prisma.tentativaAcesso.deleteMany({ where: { chave } })
}
