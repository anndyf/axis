import { randomInt } from 'crypto'

// Sem caracteres ambíguos (0/O, 1/l/I) - a senha é digitada a partir do e-mail
const CHARSET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789abcdefghijkmnopqrstuvwxyz'

/** Senha provisória de 10 caracteres com gerador criptográfico (não Math.random). */
export function gerarSenhaProvisoria(tamanho = 10): string {
  return Array.from({ length: tamanho }, () => CHARSET[randomInt(CHARSET.length)]).join('')
}
