import { prisma } from '@/lib/prisma'

/**
 * Registra o login: o acesso atual vira o "anterior" e last_login passa a
 * ser agora, numa só instrução (o lado direito do SET lê os valores antigos).
 * Falha aqui nunca impede o login (quem chama trata o erro).
 */
export async function registrarAcesso(userId: string): Promise<void> {
  await prisma.$executeRaw`UPDATE "users" SET acesso_anterior = last_login, last_login = NOW() WHERE id = ${userId}`
}

/** "Seu último acesso foi em 19/10/2026 às 21:14" (horário de Brasília). Sem IP. */
export function textoUltimoAcesso(anterior: Date): string {
  const dia = anterior.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', year: 'numeric' })
  const hora = anterior.toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' })
  return `Seu último acesso foi em ${dia} às ${hora}`
}
