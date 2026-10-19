/** Busca tolerante a acento e caixa ("conselho" acha "Conselho de Classe", "frequencia" acha "Frequência"). */
export function normalizarBusca(texto: string): string {
  return texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()
}

/** Todas as palavras do termo aparecem no texto (em qualquer ordem). */
export function combina(texto: string, termo: string): boolean {
  const alvo = normalizarBusca(texto)
  return normalizarBusca(termo).split(/\s+/).filter(Boolean).every((p) => alvo.includes(p))
}
