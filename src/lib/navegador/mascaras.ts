/**
 * Máscaras e validação no navegador (formulários). Não substituem a
 * validação do servidor: só ajudam a digitar certo e mostram o erro na
 * linha do campo antes de enviar.
 */

const digitos = (v: string) => v.replace(/\D/g, '')

/** (00) 00000-0000 ou (00) 0000-0000 */
export function mascaraTelefone(v: string): string {
  const d = digitos(v).slice(0, 11)
  if (d.length <= 2) return d.length ? `(${d}` : ''
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
}

/** Vazio é válido (campo opcional); senão DDD + 8 ou 9 dígitos. */
export function telefoneValido(v: string): boolean {
  const d = digitos(v)
  return d.length === 0 || ((d.length === 10 || d.length === 11) && !/^0/.test(d))
}

/** 000.000.000-00 */
export function mascaraCPF(v: string): string {
  const d = digitos(v).slice(0, 11)
  return d
    .replace(/^(\d{3})(\d)/, '$1.$2')
    .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d{1,2})$/, '.$1-$2')
}

/** CPF com os dois dígitos verificadores (rejeita 000.000.000-00 e repetidos). */
export function cpfValido(v: string): boolean {
  const d = digitos(v)
  if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false
  const dv = (base: string, peso: number) => {
    let soma = 0
    for (const c of base) soma += Number(c) * peso--
    const r = (soma * 10) % 11
    return r === 10 ? 0 : r
  }
  return dv(d.slice(0, 9), 10) === Number(d[9]) && dv(d.slice(0, 10), 11) === Number(d[10])
}

/** 00000-000 */
export function mascaraCEP(v: string): string {
  const d = digitos(v).slice(0, 8)
  return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d
}

export function cepValido(v: string): boolean {
  const d = digitos(v)
  return d.length === 0 || d.length === 8
}

/**
 * Data ISO (aaaa-mm-dd) existente e dentro do intervalo; vazia é válida
 * (o "obrigatório" é do atributo required). Mensagem pronta para a linha
 * do campo, ou null.
 */
/** rotuloMin/rotuloMax: complemento da frase, ex.: "à data de início". */
export function erroDeData(v: string, limites: { min?: string; max?: string; rotuloMin?: string; rotuloMax?: string } = {}): string | null {
  if (!v) return null
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v)
  if (!m) return 'Informe uma data válida.'
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])))
  if (d.getUTCDate() !== Number(m[3]) || d.getUTCMonth() !== Number(m[2]) - 1) return 'Informe uma data válida.'
  if (limites.min && v < limites.min) return `A data deve ser igual ou posterior ${limites.rotuloMin ?? `a ${limites.min.split('-').reverse().join('/')}`}.`
  if (limites.max && v > limites.max) return `A data deve ser igual ou anterior ${limites.rotuloMax ?? `a ${limites.max.split('-').reverse().join('/')}`}.`
  return null
}
