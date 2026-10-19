/**
 * Endereços do Áxis por escola (subdomínio do ROOT_DOMAIN) - funções puras
 * para a página de entrada e a de escola inválida.
 */

export interface Origem {
  /** domínio raiz configurado (ROOT_DOMAIN), ex.: "axis.app" ou "localhost" */
  raiz: string
  /** header Host da requisição (para manter a porta em dev) */
  host?: string | null
  /** x-forwarded-proto, se houver */
  protocolo?: string | null
}

const LOCAL = /^(localhost|127\.0\.0\.1)$/

function partes(o: Origem) {
  const raiz = o.raiz.split(':')[0].toLowerCase()
  const porta = (o.host ?? '').split(':')[1]
  const proto = o.protocolo === 'http' || o.protocolo === 'https' ? o.protocolo : LOCAL.test(raiz) ? 'http' : 'https'
  return { raiz, proto, porta: porta ? `:${porta}` : '' }
}

/** "Cetep " -> "cetep"; null se não for um endereço de escola válido. */
export function normalizarSlug(valor: string): string | null {
  const v = valor.trim().toLowerCase()
  return /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(v) ? v : null
}

export function enderecoDaEscola(slug: string, o: Origem): string {
  const { raiz, proto, porta } = partes(o)
  return `${proto}://${slug}.${raiz}${porta}/login`
}

export function enderecoRaiz(o: Origem): string {
  const { raiz, proto, porta } = partes(o)
  return `${proto}://${raiz}${porta}/`
}
