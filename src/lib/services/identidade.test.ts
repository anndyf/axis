import { describe, it, expect } from 'vitest'
import { normalizarHex, contraste, textoSobre, avaliarCor, variaveisDaEscola, validarLogo, logoParaPdf, DESTAQUE_PADRAO } from './identidade'

describe('cor de destaque', () => {
  it('normaliza hex', () => {
    expect(normalizarHex('#ABC')).toBe('#aabbcc')
    expect(normalizarHex(' 4F46E5 ')).toBe('#4f46e5')
    expect(normalizarHex('#12345')).toBeNull()
    expect(normalizarHex('red')).toBeNull()
    expect(normalizarHex('#4f46e5; background:url(x)')).toBeNull()
    expect(normalizarHex(123)).toBeNull()
  })

  it('contraste WCAG', () => {
    expect(contraste('#000000', '#ffffff')).toBe(21)
    expect(contraste('#ffffff', '#ffffff')).toBe(1)
    expect(contraste('#4f46e5', '#ffffff')).toBeGreaterThan(6)
  })

  it('texto legível sobre a cor', () => {
    expect(textoSobre('#4f46e5')).toBe('#ffffff')
    expect(textoSobre('#1e3a8a')).toBe('#ffffff')
    expect(textoSobre('#facc15')).toBe('#18181b') // amarelo: texto escuro
    expect(textoSobre('#a3e635')).toBe('#18181b')
  })

  it('avisa quando o contraste não basta', () => {
    expect(avaliarCor('#4f46e5')?.avisos).toEqual([])
    const amarelo = avaliarCor('#fde047')!
    expect(amarelo.textoSobre).toBe('#18181b')
    expect(amarelo.avisos.some((a) => a.includes('fundo branco'))).toBe(true)
    // cinza médio: nem branco nem preto chegam a 4,5
    expect(avaliarCor('#7a7a7a')!.avisos.some((a) => a.includes('texto dos botões'))).toBe(true)
    expect(avaliarCor('xyz')).toBeNull()
  })

  it('destaque fixo no azul Áxis, que passa AA com texto branco', () => {
    expect(DESTAQUE_PADRAO).toBe('#205ee6')
    expect(avaliarCor(DESTAQUE_PADRAO)).toMatchObject({ textoSobre: '#ffffff', avisos: [] })
    expect(contraste(DESTAQUE_PADRAO, '#ffffff')).toBeGreaterThanOrEqual(4.5)
  })

  it('cor da escola vira só o detalhe --escola, com fallback', () => {
    expect(variaveisDaEscola(null)).toEqual({ '--escola': DESTAQUE_PADRAO })
    expect(variaveisDaEscola('invalida')).toEqual({ '--escola': DESTAQUE_PADRAO })
    expect(variaveisDaEscola('#FACC15')).toEqual({ '--escola': '#facc15' })
  })
})

describe('logo', () => {
  const png = 'data:image/png;base64,iVBORw0KGgo='
  it('aceita https e imagem enviada', () => {
    expect(validarLogo('https://escola.com.br/logo.png')).toBe('https://escola.com.br/logo.png')
    expect(validarLogo(png)).toBe(png)
    expect(validarLogo('')).toBeNull()
    expect(validarLogo(null)).toBeNull()
  })
  it('recusa http, javascript:, credenciais, svg e imagem grande', () => {
    expect(validarLogo('http://escola.com.br/logo.png')).toHaveProperty('erro')
    expect(validarLogo('javascript:alert(1)')).toHaveProperty('erro')
    expect(validarLogo('https://user:senha@escola.com/logo.png')).toHaveProperty('erro')
    expect(validarLogo('data:image/svg+xml;base64,PHN2Zz4=')).toHaveProperty('erro')
    expect(validarLogo('data:image/png;base64,' + 'A'.repeat(300_000))).toHaveProperty('erro')
    expect(validarLogo('nao é url')).toHaveProperty('erro')
  })
  it('PDF só usa imagem enviada PNG/JPEG (nada é buscado na rede)', () => {
    expect(logoParaPdf(png)).toEqual({ dados: png, formato: 'PNG' })
    expect(logoParaPdf('https://escola.com.br/logo.png')).toBeNull()
    expect(logoParaPdf('data:image/webp;base64,AAAA')).toBeNull()
    expect(logoParaPdf(null)).toBeNull()
  })
})
