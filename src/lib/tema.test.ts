import { describe, it, expect } from 'vitest'
import { temaValido, TEMA_PADRAO } from './tema'

describe('temaValido', () => {
  it('aceita os três temas', () => {
    expect(temaValido('light')).toBe('light')
    expect(temaValido('dark')).toBe('dark')
    expect(temaValido('system')).toBe('system')
  })
  it('qualquer outra coisa volta ao padrão (claro)', () => {
    expect(TEMA_PADRAO).toBe('light')
    for (const v of [undefined, null, '', 'DARK', 'azul', '"><script>', 1]) expect(temaValido(v)).toBe('light')
  })
})
