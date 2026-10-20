import {
  ehPermissao,
  papeisDosBooleanos,
  permissoesDosPapeis,
  type Booleanos,
  type Permissao,
} from '@/lib/permissoes'

/**
 * Quem pede a permissão. Fase 3: o que vale são os papéis.
 * - `permissoes`: lidas do banco no login (VinculoPapel → PapelPermissao) e
 *   guardadas na sessão;
 * - `papeis`: códigos dos papéis (quando só eles vierem, as permissões saem
 *   de PAPEIS_SISTEMA);
 * - sem nenhum dos dois (sessão aberta antes da fase 3, ou objeto montado a
 *   partir do banco só com os booleanos): os papéis saem dos booleanos pela
 *   tabela 2.5.3. Os booleanos saem na fase 3c.
 */
export type RbacUser = Booleanos & {
  isPlatformAdmin?: boolean
  papeis?: readonly string[] | null
  permissoes?: readonly string[] | null
}

/** As 5 ações de antes da fase 3, mantidas como atalhos. */
export type Acao = 'gestao' | 'staff' | 'superuser' | 'aee' | 'staffPuro'

const ATALHOS: Record<Exclude<Acao, 'staffPuro'>, Permissao> = {
  gestao: 'escola.gerir',
  staff: 'equipe.acessar',
  superuser: 'escola.administrar',
  aee: 'aee.ler',
}

const cache = new WeakMap<object, ReadonlySet<string>>()

export function permissoesDoUsuario(user: RbacUser): ReadonlySet<string> {
  const guardado = cache.get(user)
  if (guardado) return guardado
  let s: ReadonlySet<string>
  if (Array.isArray(user.permissoes)) s = new Set(user.permissoes.filter(ehPermissao))
  else if (Array.isArray(user.papeis)) s = permissoesDosPapeis(user.papeis)
  else s = permissoesDosPapeis(papeisDosBooleanos(user))
  cache.set(user, s)
  return s
}

/** Papéis do usuário (da sessão; sem eles, derivados dos booleanos). */
export function papeisDoUsuario(user: RbacUser): readonly string[] {
  return Array.isArray(user.papeis) ? user.papeis : papeisDosBooleanos(user)
}

/** A única porta de decisão de acesso: `can(user, 'recurso.acao')` (ou um atalho antigo). */
export function can(user: RbacUser | null | undefined, acao: Acao | Permissao): boolean {
  if (!user) return false
  const p = permissoesDoUsuario(user)
  if (acao === 'staffPuro') return p.has('docencia.exercer') && !p.has('escola.gerir')
  const permissao = acao in ATALHOS ? ATALHOS[acao as keyof typeof ATALHOS] : acao
  return p.has(permissao)
}

/** Regra de antes da fase 3, só com os booleanos. Usada no teste de equivalência. */
export function canLegado(u: Booleanos, acao: Acao): boolean {
  switch (acao) {
    case 'gestao': return !!(u.isSuperuser || u.isDirecao)
    case 'staff': return !!(u.isStaff || u.isSuperuser || u.isDirecao)
    case 'superuser': return !!u.isSuperuser
    case 'aee': return !!(u.isDirecao || u.isSuperuser || u.isAEE)
    case 'staffPuro': return !!(u.isStaff && !u.isSuperuser && !u.isDirecao)
  }
}

export const ACOES_ANTIGAS: Acao[] = ['gestao', 'staff', 'superuser', 'aee', 'staffPuro']

/**
 * Professor que só enxerga as próprias turmas/disciplinas (era
 * `isStaff && !isSuperuser && !isDirecao`). Quem tem escopo da escola
 * (direção, secretaria, coordenação, admin) não fica restrito.
 */
export function restritoADocencia(user: RbacUser | null | undefined): boolean {
  return can(user, 'docencia.exercer') && !can(user, 'escopo.escola')
}
