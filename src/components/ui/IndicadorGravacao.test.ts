import { describe, it, expect } from 'vitest'
import { createElement as h } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { IndicadorGravacao, horaCurta } from './IndicadorGravacao'

describe('indicador de gravação', () => {
  it('mostra pendência, gravação e hora salva', () => {
    expect(renderToStaticMarkup(h(IndicadorGravacao, { pendente: true }))).toContain('Alterações não salvas')
    expect(renderToStaticMarkup(h(IndicadorGravacao, { pendente: true, salvando: true }))).toContain('Salvando')
    const d = new Date('2026-10-18T17:32:00Z')
    expect(horaCurta(d)).toBe('14:32')
    expect(renderToStaticMarkup(h(IndicadorGravacao, { pendente: false, salvoEm: d }))).toContain('Salvo às 14:32')
  })

  it('não mostra nada antes da primeira alteração', () => {
    expect(renderToStaticMarkup(h(IndicadorGravacao, { pendente: false }))).not.toMatch(/Salvo|não salvas/)
  })
})
