/**
 * Content-Security-Policy do app. Fica fora do next.config para ter teste.
 *
 * - script: 'unsafe-inline' porque o Next injeta scripts inline de hidratação
 *   (nonce exigiria renderização dinâmica em todas as páginas); unpkg só para
 *   o worker do pdf.js (importação de alunos); 'wasm-unsafe-eval' para o
 *   @react-pdf (layout em WebAssembly). Em desenvolvimento o Next usa eval.
 * - img: https/data/blob porque o logo da escola e imagens de questões podem
 *   ser endereços externos ou dados enviados.
 * - Sem plugins, sem <base> trocado, formulários só para o próprio site e
 *   página não pode ser embutida por outro site.
 */
export function politicaDeSeguranca(dev: boolean): string {
  const diretivas: Record<string, string[]> = {
    'default-src': ["'self'"],
    'script-src': ["'self'", "'unsafe-inline'", "'wasm-unsafe-eval'", 'https://unpkg.com', ...(dev ? ["'unsafe-eval'"] : [])],
    'style-src': ["'self'", "'unsafe-inline'"],
    'img-src': ["'self'", 'data:', 'blob:', 'https:'],
    'font-src': ["'self'", 'data:'],
    'connect-src': ["'self'", 'https://unpkg.com', ...(dev ? ['ws:', 'wss:'] : [])],
    'worker-src': ["'self'", 'blob:'],
    'frame-src': ["'self'", 'blob:', 'data:'],
    'media-src': ["'self'", 'blob:', 'data:'],
    'manifest-src': ["'self'"],
    'object-src': ["'none'"],
    'base-uri': ["'self'"],
    'form-action': ["'self'"],
    'frame-ancestors': ["'self'"],
  }
  return Object.entries(diretivas).map(([k, v]) => `${k} ${v.join(' ')}`).join('; ')
}
