import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

/**
 * Acesso ao painel da plataforma (gestão de todas as escolas).
 *
 * A marca isPlatformAdmin vai no JWT no login; se for retirada no banco, o
 * token antigo continuaria valendo até expirar. Por isso toda rota/página da
 * plataforma confere a marca (e a conta ativa) no banco a cada requisição.
 */
export async function exigirAdminPlataforma(): Promise<{ id: string; escolaId: string } | null> {
  const session = await auth()
  if (!session?.user?.id || !session.user.isPlatformAdmin) return null
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, escolaId: true, isPlatformAdmin: true, isActive: true },
  })
  if (!user?.isPlatformAdmin || !user.isActive) return null
  return { id: user.id, escolaId: user.escolaId }
}

/**
 * A conta de admin da plataforma vive dentro de uma escola (hoje a CETEP).
 * Sem esta regra, qualquer superuser daquela escola poderia trocar a senha
 * dela, desativá-la ou excluí-la pela gestão de usuários - e com isso tomar
 * o painel que enxerga todas as escolas. Só outro admin da plataforma mexe.
 */
export function contaProtegidaDaPlataforma(alvo: { isPlatformAdmin: boolean } | null | undefined, ator: { isPlatformAdmin?: boolean } | null | undefined): boolean {
  return !!alvo?.isPlatformAdmin && !ator?.isPlatformAdmin
}

export const MSG_CONTA_PROTEGIDA = 'Esta conta administra a plataforma e só pode ser alterada por um administrador da plataforma.'

export async function registrarAcaoPlataforma(userId: string, action: string, escolaId: string, details: Record<string, unknown>) {
  await prisma.auditLog.create({
    data: { userId, entityType: 'PLATAFORMA_ESCOLA', entityId: escolaId, action, details: JSON.stringify(details) },
  })
}

/** Campos da escola que o painel mostra (sem dados internos). */
export const SELECT_ESCOLA_PLATAFORMA = {
  id: true, nome: true, slug: true, plano: true, status: true, createdAt: true,
  _count: { select: { users: true, estudantes: true } },
} as const
