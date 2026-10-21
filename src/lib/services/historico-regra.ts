import { can, type RbacUser } from '@/lib/rbac'

/** Aba "Histórico" das fichas: mesma permissão da tela /dashboard/auditoria. */
export function podeVerHistorico(user: RbacUser | null | undefined): boolean {
  return can(user, 'auditoria.ler') && !can(user, 'portal.acessar')
}
