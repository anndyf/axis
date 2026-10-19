import { describe, it, expect } from 'vitest'
import { notaMaximaDaEtapa, validarAvaliacoesDaEtapa, validarDadosAvaliacao } from './avaliacoes-professor'

describe('notaMaximaDaEtapa', () => {
  it('por forma de cálculo', () => {
    const itens = [{ notaMaxima: 6, peso: 2 }, { notaMaxima: 4, peso: 1 }]
    expect(notaMaximaDaEtapa(itens, 'SOMA')).toBe(10)
    expect(notaMaximaDaEtapa(itens, 'MEDIA_ARITMETICA')).toBe(5)
    expect(notaMaximaDaEtapa(itens, 'MEDIA_PONDERADA')).toBeCloseTo(16 / 3)
    expect(notaMaximaDaEtapa(itens, 'MAIOR_NOTA')).toBe(6)
    expect(notaMaximaDaEtapa(itens, 'SOMA_COM_DIVISOR', 2)).toBe(5)
    expect(notaMaximaDaEtapa([], 'SOMA')).toBe(0)
  })
})

describe('validarAvaliacoesDaEtapa', () => {
  const template = [{ notaMaxima: 10 }]
  it('SOMA: a soma das avaliações não passa do teto', () => {
    expect(validarAvaliacoesDaEtapa([{ notaMaxima: 4 }, { notaMaxima: 6 }], template, 'SOMA')).toBeNull()
    expect(validarAvaliacoesDaEtapa([{ notaMaxima: 4 }, { notaMaxima: 6.5 }], template, 'SOMA')).toMatch(/somam 10,5/)
  })
  it('teto vem do template inteiro (vários itens)', () => {
    expect(validarAvaliacoesDaEtapa([{ notaMaxima: 3 }, { notaMaxima: 3 }, { notaMaxima: 4 }], [{ notaMaxima: 6 }, { notaMaxima: 4 }], 'SOMA')).toBeNull()
  })
  it('médias: cada avaliação até o teto', () => {
    expect(validarAvaliacoesDaEtapa([{ notaMaxima: 10 }, { notaMaxima: 10 }, { notaMaxima: 10 }], template, 'MEDIA_ARITMETICA')).toBeNull()
    expect(validarAvaliacoesDaEtapa([{ notaMaxima: 10 }, { notaMaxima: 12 }], template, 'MAIOR_NOTA')).toMatch(/Nenhuma avaliação/)
  })
  it('SOMA_COM_DIVISOR usa o divisor nos dois lados', () => {
    // template 2 x 10 / 2 = 10; professor 3 x 7 = 21 / 2 = 10,5
    expect(validarAvaliacoesDaEtapa([{ notaMaxima: 7 }, { notaMaxima: 7 }, { notaMaxima: 7 }], [{ notaMaxima: 10 }, { notaMaxima: 10 }], 'SOMA_COM_DIVISOR', 2)).not.toBeNull()
    expect(validarAvaliacoesDaEtapa([{ notaMaxima: 5 }, { notaMaxima: 15 }], [{ notaMaxima: 10 }, { notaMaxima: 10 }], 'SOMA_COM_DIVISOR', 2)).toBeNull()
  })
  it('etapa sem avaliações é válida', () => {
    expect(validarAvaliacoesDaEtapa([], template, 'SOMA')).toBeNull()
  })
})

describe('validarDadosAvaliacao', () => {
  it('normaliza', () => {
    expect(validarDadosAvaliacao({ nome: ' Prova 1 ', notaMaxima: '6,5', data: '2026-03-10' })).toEqual({ nome: 'Prova 1', notaMaxima: 6.5, peso: 1, data: '2026-03-10' })
    expect(validarDadosAvaliacao({ nome: 'T', notaMaxima: 2, peso: '2' })).toEqual({ nome: 'T', notaMaxima: 2, peso: 2, data: null })
  })
  it('recusa', () => {
    expect(validarDadosAvaliacao({ nome: '', notaMaxima: 2 })).toHaveProperty('erro')
    expect(validarDadosAvaliacao({ nome: 'x', notaMaxima: 0 })).toHaveProperty('erro')
    expect(validarDadosAvaliacao({ nome: 'x', notaMaxima: 2, peso: -1 })).toHaveProperty('erro')
    expect(validarDadosAvaliacao({ nome: 'x', notaMaxima: 2, data: '10/03/2026' })).toHaveProperty('erro')
    expect(validarDadosAvaliacao(null)).toHaveProperty('erro')
  })
})
