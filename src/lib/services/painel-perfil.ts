import { can, type RbacUser } from '@/lib/rbac'

/**
 * Visões do painel por perfil (rota /dashboard/modelos). Usa as mesmas
 * permissões dos módulos (src/lib/modules.ts): o AEE não entra nas telas de
 * gestão nem de diário, então só tem a visão pedagógica.
 */
export type PerfilPainel = 'professor' | 'pedagogia' | 'administracao'

/** Do mais alto para o mais baixo. */
export const ORDEM_PERFIS: PerfilPainel[] = ['administracao', 'pedagogia', 'professor']

export const ROTULO_PERFIL: Record<PerfilPainel, string> = {
  administracao: 'Administração',
  pedagogia: 'Pedagogia',
  professor: 'Professor',
}

export function perfisDoUsuario(u: RbacUser): PerfilPainel[] {
  const perfis: PerfilPainel[] = []
  if (!u.isAEE && can(u, 'gestao')) perfis.push('administracao')
  if (can(u, 'aee')) perfis.push('pedagogia')
  if (!u.isAEE && u.isStaff) perfis.push('professor')
  return perfis
}

/** Visão pedida, se o usuário tiver; senão a mais alta dele (null = nenhuma). */
export function perfilEfetivo(u: RbacUser, pedido?: string | null): PerfilPainel | null {
  const perfis = perfisDoUsuario(u)
  if (pedido && (perfis as string[]).includes(pedido)) return pedido as PerfilPainel
  return perfis[0] ?? null
}

export type ModeloPainel = 'a' | 'b'

export function modeloValido(valor?: string | null): ModeloPainel {
  return valor === 'b' ? 'b' : 'a'
}
