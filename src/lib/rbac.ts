export type RbacUser = {
  isSuperuser: boolean
  isDirecao: boolean
  isStaff: boolean
  isAEE?: boolean
}

export type Acao = 'gestao' | 'staff' | 'superuser' | 'aee' | 'staffPuro'

const REGRAS: Record<Acao, (u: RbacUser) => boolean> = {
  gestao: (u) => u.isSuperuser || u.isDirecao,
  staff: (u) => u.isStaff || u.isSuperuser || u.isDirecao,
  superuser: (u) => u.isSuperuser,
  aee: (u) => u.isDirecao || u.isSuperuser || !!u.isAEE,
  staffPuro: (u) => u.isStaff && !u.isSuperuser && !u.isDirecao,
}

export function can(user: RbacUser, acao: Acao): boolean {
  return REGRAS[acao](user)
}
