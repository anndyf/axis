import { can, type RbacUser } from '@/lib/rbac'

/**
 * Visões do painel inicial (/dashboard). ÚNICO lugar que decide qual visão
 * cada usuário vê; as telas usam isto, nunca as marcas do usuário direto.
 * Só usa can() de rbac.ts, sem mudar permissões:
 *   administração = can('painel.gestao')    (direção, admin; secretaria e coordenação)
 *   pedagogia     = can('aee.ler')          (AEE, direção e admin)
 *   professor     = can('painel.professor') (professor, direção e admin)
 * Cada bloco do painel ainda só aparece se o usuário puder abrir a tela de
 * origem (modulosVisiveis), então nenhuma visão mostra dados além do que o
 * menu já libera.
 */
export type VisaoPainel = 'administracao' | 'pedagogia' | 'professor'

/** Da mais alta para a mais baixa. */
export const ORDEM_VISOES: VisaoPainel[] = ['administracao', 'pedagogia', 'professor']

export const ROTULO_VISAO: Record<VisaoPainel, string> = {
  administracao: 'Administração',
  pedagogia: 'Pedagogia',
  professor: 'Professor',
}

const REGRA: Record<VisaoPainel, (u: RbacUser) => boolean> = {
  administracao: (u) => can(u, 'painel.gestao'),
  pedagogia: (u) => can(u, 'aee.ler'),
  professor: (u) => can(u, 'painel.professor'),
}

export function visoesDoUsuario(u: RbacUser): VisaoPainel[] {
  return ORDEM_VISOES.filter((v) => REGRA[v](u))
}

/** Visão pedida, se o usuário tiver; senão a mais alta dele (null = nenhuma). */
export function visaoEfetiva(u: RbacUser, pedida?: string | null): VisaoPainel | null {
  const visoes = visoesDoUsuario(u)
  if (pedida && (visoes as string[]).includes(pedida)) return pedida as VisaoPainel
  return visoes[0] ?? null
}
