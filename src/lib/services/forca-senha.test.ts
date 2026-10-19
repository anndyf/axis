import { describe, it, expect } from 'vitest'
import { forcaSenha } from './forca-senha'

describe('forcaSenha', () => {
  it('abaixo do mínimo do servidor (8)', () => {
    expect(forcaSenha('')).toMatchObject({ nivel: 0, atendeMinimo: false })
    expect(forcaSenha('abc1234')).toMatchObject({ nivel: 1, atendeMinimo: false })
  })
  it('níveis', () => {
    expect(forcaSenha('abcdefgh')).toMatchObject({ nivel: 2, atendeMinimo: true })
    expect(forcaSenha('Bolacha7')).toMatchObject({ nivel: 3 })
    expect(forcaSenha('Bolacha7!Mar')).toMatchObject({ nivel: 4, rotulo: 'Forte' })
  })
  it('sequências óbvias não passam de razoável', () => {
    expect(forcaSenha('12345678').nivel).toBe(2)
    expect(forcaSenha('aaaaaaaaaaaa').nivel).toBe(2)
    expect(forcaSenha('Senha123!').nivel).toBe(2)
  })
})
