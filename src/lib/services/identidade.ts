/**
 * Identidade visual da escola - funções puras (cor de destaque e logo).
 *
 * O destaque do sistema é sempre o azul Áxis (#205EE6): menu, botões, links,
 * foco e item ativo. A cor da escola não substitui o destaque; vira só um
 * detalhe (`--escola`: faixa de boas-vindas e marca no menu). A identidade
 * da escola aparece principalmente pelo logo.
 */

export const DESTAQUE_PADRAO = '#205ee6'
export const TEXTO_CLARO = '#ffffff'
export const TEXTO_ESCURO = '#18181b'

/** "#ABC", "abc123", " #aabbcc " -> "#aabbcc"; null se não for hex válido. */
export function normalizarHex(valor: unknown): string | null {
  if (typeof valor !== 'string') return null
  let h = valor.trim().replace(/^#/, '').toLowerCase()
  if (/^[0-9a-f]{3}$/.test(h)) h = h.split('').map((c) => c + c).join('')
  return /^[0-9a-f]{6}$/.test(h) ? `#${h}` : null
}

function canal(c: number) {
  const s = c / 255
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
}

/** Luminância relativa (0 = preto, 1 = branco). */
export function luminancia(hex: string): number {
  const h = normalizarHex(hex)
  if (!h) return 0
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16))
  return 0.2126 * canal(r) + 0.7152 * canal(g) + 0.0722 * canal(b)
}

/** Razão de contraste entre duas cores (1 a 21). */
export function contraste(a: string, b: string): number {
  const [l1, l2] = [luminancia(a), luminancia(b)].sort((x, y) => y - x)
  return Math.round(((l1 + 0.05) / (l2 + 0.05)) * 100) / 100
}

/** Texto (branco ou quase preto) mais legível sobre a cor. */
export function textoSobre(hex: string): string {
  return contraste(hex, TEXTO_CLARO) >= contraste(hex, TEXTO_ESCURO) ? TEXTO_CLARO : TEXTO_ESCURO
}

export interface AvaliacaoCor {
  cor: string
  textoSobre: string
  /** contraste do texto sobre o destaque (botões) - AA pede 4,5 */
  contrasteTexto: number
  /** contraste do destaque contra o fundo branco (links, item ativo, foco) - AA pede 3 para elementos de interface */
  contrasteFundo: number
  avisos: string[]
}

export function avaliarCor(hex: string): AvaliacaoCor | null {
  const cor = normalizarHex(hex)
  if (!cor) return null
  const texto = textoSobre(cor)
  const contrasteTexto = contraste(cor, texto)
  const contrasteFundo = contraste(cor, '#ffffff')
  const avisos: string[] = []
  if (contrasteTexto < 4.5) avisos.push('O texto dos botões fica com pouco contraste sobre esta cor. Prefira um tom mais escuro ou mais claro.')
  if (contrasteFundo < 3) avisos.push('Esta cor é clara demais sobre o fundo branco: links e o item ativo do menu ficam difíceis de ver.')
  return { cor, textoSobre: texto, contrasteTexto, contrasteFundo, avisos }
}

/** Variável CSS do detalhe da escola para o layout (azul Áxis se a escola não definiu ou a cor é inválida). */
export function variaveisDaEscola(corPrimaria?: string | null): { '--escola': string } {
  return { '--escola': normalizarHex(corPrimaria) ?? DESTAQUE_PADRAO }
}

/** Imagem enviada pela tela (já reduzida no navegador): PNG/JPEG/WebP em data URL. */
const DATA_URL = /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/
export const LOGO_MAX_BYTES = 150_000

/**
 * Logo da escola: endereço https ou imagem enviada (data URL de até
 * ~150 KB). Retorna o valor a gravar, null para remover, ou { erro }.
 */
export function validarLogo(valor: unknown): string | null | { erro: string } {
  if (valor === null || valor === undefined || valor === '') return null
  if (typeof valor !== 'string') return { erro: 'Logo inválido.' }
  const v = valor.trim()
  if (v.startsWith('data:')) {
    if (!DATA_URL.test(v)) return { erro: 'Envie uma imagem PNG, JPEG ou WebP.' }
    if (v.length > (LOGO_MAX_BYTES * 4) / 3 + 64) return { erro: 'Imagem grande demais (máximo de 150 KB depois de reduzida).' }
    return v
  }
  let url: URL
  try {
    url = new URL(v)
  } catch {
    return { erro: 'Informe um endereço válido, começando com https://' }
  }
  if (url.protocol !== 'https:') return { erro: 'O endereço do logo precisa começar com https://' }
  if (url.username || url.password) return { erro: 'Endereço do logo inválido.' }
  if (v.length > 2000) return { erro: 'Endereço do logo longo demais.' }
  return url.toString()
}

/** Logo pode ir para um PDF (jsPDF) sem buscar nada na rede: só imagem enviada PNG/JPEG. */
export function logoParaPdf(logoUrl?: string | null): { dados: string; formato: 'PNG' | 'JPEG' } | null {
  if (!logoUrl) return null
  const m = /^data:image\/(png|jpeg);base64,/.exec(logoUrl)
  return m ? { dados: logoUrl, formato: m[1] === 'png' ? 'PNG' : 'JPEG' } : null
}
