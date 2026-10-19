/** Tema da interface (claro, escuro ou o do sistema), guardado num cookie do navegador. */
export type Tema = 'light' | 'dark' | 'system'

export const COOKIE_TEMA = 'axis_tema'
export const TEMA_PADRAO: Tema = 'light'

export function temaValido(valor: unknown): Tema {
  return valor === 'dark' || valor === 'system' || valor === 'light' ? valor : TEMA_PADRAO
}

/** Aplica na página e lembra por um ano (só preferência visual, sem dado sensível). */
export function definirTema(tema: Tema) {
  document.documentElement.dataset.theme = tema
  document.cookie = `${COOKIE_TEMA}=${tema}; path=/; max-age=31536000; samesite=lax`
}
