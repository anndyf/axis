import { describe, it, expect } from 'vitest'
import { normalizarSlug, enderecoDaEscola, enderecoRaiz } from './dominio'

describe('endereços por escola', () => {
  it('normaliza o endereço digitado', () => {
    expect(normalizarSlug(' Cetep ')).toBe('cetep')
    expect(normalizarSlug('colegio-horizonte')).toBe('colegio-horizonte')
    expect(normalizarSlug('-x')).toBeNull()
    expect(normalizarSlug('a.b')).toBeNull()
    expect(normalizarSlug('evil.com/x')).toBeNull()
    expect(normalizarSlug('')).toBeNull()
  })
  it('produção: https e sem porta', () => {
    expect(enderecoDaEscola('cetep', { raiz: 'axis.app', host: 'axis.app' })).toBe('https://cetep.axis.app/login')
    expect(enderecoRaiz({ raiz: 'axis.app', host: 'cetep.axis.app' })).toBe('https://axis.app/')
  })
  it('dev: http e mantém a porta', () => {
    expect(enderecoDaEscola('cetep', { raiz: 'localhost', host: 'localhost:3000' })).toBe('http://cetep.localhost:3000/login')
    expect(enderecoRaiz({ raiz: 'localhost', host: 'x.localhost:3000', protocolo: 'http' })).toBe('http://localhost:3000/')
  })
})
