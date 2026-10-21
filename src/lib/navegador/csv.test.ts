import { describe, it, expect } from 'vitest'
import { nomeArquivoCSV, paraCSV } from './csv'

describe('exportar CSV do navegador', () => {
  const colunas = [
    { titulo: 'Nome', valor: (l: { nome: string; media: number | null }) => l.nome },
    { titulo: 'Média', valor: (l: { nome: string; media: number | null }) => l.media },
  ]

  it('usa ; como separador e número no formato brasileiro', () => {
    expect(paraCSV(colunas, [{ nome: 'Ana', media: 8.5 }])).toBe('Nome;Média\r\nAna;8,5')
  })

  it('protege aspas, separador e quebra de linha', () => {
    expect(paraCSV(colunas, [{ nome: 'Silva; "Ana"', media: null }])).toBe('Nome;Média\r\n"Silva; ""Ana""";')
  })

  it('neutraliza texto que o Excel leria como fórmula', () => {
    expect(paraCSV(colunas, [{ nome: '=HYPERLINK("x")', media: 1 }]).split('\r\n')[1]).toBe(`"'=HYPERLINK(""x"")";1`)
  })

  it('gera nome de arquivo sem acentos nem espaços', () => {
    expect(nomeArquivoCSV('Estudantes — 1TIM1 Matutino')).toBe('estudantes-1tim1-matutino.csv')
  })
})
