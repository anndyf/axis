/**
 * Força da senha para o indicador das telas de acesso. O mínimo que vale é
 * o do servidor (8 caracteres); o resto é só orientação.
 */
export const SENHA_MINIMA = 8

export type NivelSenha = 0 | 1 | 2 | 3 | 4

export function forcaSenha(senha: string): { nivel: NivelSenha; rotulo: string; atendeMinimo: boolean } {
  if (!senha) return { nivel: 0, rotulo: '', atendeMinimo: false }
  const atendeMinimo = senha.length >= SENHA_MINIMA
  if (!atendeMinimo) return { nivel: 1, rotulo: `Curta demais (mínimo ${SENHA_MINIMA} caracteres)`, atendeMinimo }
  let pontos = 0
  if (senha.length >= 12) pontos++
  if (/[a-z]/.test(senha) && /[A-Z]/.test(senha)) pontos++
  if (/\d/.test(senha)) pontos++
  if (/[^A-Za-z0-9]/.test(senha)) pontos++
  if (/^(.)\1+$/.test(senha) || /^(?:0123|1234|2345|3456|4567|5678|6789|abcd|qwer|senha|password)/i.test(senha)) pontos = 0
  const nivel = (pontos <= 1 ? 2 : pontos === 2 ? 3 : 4) as NivelSenha
  return { nivel, rotulo: nivel === 2 ? 'Razoável' : nivel === 3 ? 'Boa' : 'Forte', atendeMinimo }
}
