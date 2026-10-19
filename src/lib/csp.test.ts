import { describe, it, expect } from 'vitest'
import { politicaDeSeguranca } from './csp'

const diretiva = (csp: string, nome: string) => csp.split('; ').find((d) => d.startsWith(nome + ' '))?.split(' ').slice(1) ?? []

describe('politicaDeSeguranca', () => {
  const prod = politicaDeSeguranca(false)
  const dev = politicaDeSeguranca(true)

  it('bloqueia plugins, embutir em outro site e troca de base', () => {
    expect(diretiva(prod, 'object-src')).toEqual(["'none'"])
    expect(diretiva(prod, 'frame-ancestors')).toEqual(["'self'"])
    expect(diretiva(prod, 'base-uri')).toEqual(["'self'"])
    expect(diretiva(prod, 'form-action')).toEqual(["'self'"])
  })

  it('eval só em desenvolvimento', () => {
    expect(diretiva(prod, 'script-src')).not.toContain("'unsafe-eval'")
    expect(diretiva(dev, 'script-src')).toContain("'unsafe-eval'")
    expect(diretiva(prod, 'connect-src')).not.toContain('ws:')
  })

  it('aceita logo e imagens por https e dados enviados', () => {
    expect(diretiva(prod, 'img-src')).toEqual(expect.arrayContaining(['https:', 'data:', 'blob:']))
  })
})
