import { describe, it, expect } from 'vitest'
import { agruparPorUnidade, decidirReplicacao, disciplinasParaReplicar, normalizarNome, sugerirData, unidadeAtual } from './diario'

const unidades = [
  { id: 'u2', nome: '2ª UNIDADE', ordem: 2, inicio: '2026-05-01', fim: '2026-07-31' },
  { id: 'u1', nome: '1ª UNIDADE', ordem: 1, inicio: '2026-02-02', fim: '2026-04-30' },
  { id: 'u3', nome: '3ª UNIDADE', ordem: 3, inicio: null, fim: null },
]

describe('diário por unidade', () => {
  it('agrupa pelas datas das etapas, em ordem; fora das datas vai para o fim', () => {
    const g = agruparPorUnidade([{ data: '2026-06-10' }, { data: '2026-03-02' }, { data: '2026-04-30' }, { data: '2026-01-15' }], unidades)
    expect(g.map((x) => [x.nome, x.aulas.map((a) => a.data)])).toEqual([
      ['1ª UNIDADE', ['2026-03-02', '2026-04-30']],
      ['2ª UNIDADE', ['2026-06-10']],
      ['3ª UNIDADE', []],
      ['Fora das unidades', ['2026-01-15']],
    ])
    expect(agruparPorUnidade([{ data: '2026-03-02' }], unidades).map((x) => x.id)).toEqual(['u1', 'u2', 'u3'])
  })
  it('unidade atual: a que já começou mais recentemente', () => {
    expect(unidadeAtual(unidades, '2026-06-01')).toBe('u2')
    expect(unidadeAtual(unidades, '2026-01-01')).toBeNull()
  })
})

describe('replicar conteúdo - destinos', () => {
  const doProfessor = [
    { id: 'rob-a', nome: 'Robótica', turmaId: 'ta', turmaNome: '3SA' },
    { id: 'rob-c', nome: ' ROBOTICA ', turmaId: 'tc', turmaNome: '3SC' },
    { id: 'rob-b', nome: 'robótica', turmaId: 'tb', turmaNome: '3SB' },
    { id: 'mat-b', nome: 'Matemática', turmaId: 'tb', turmaNome: '3SB' },
    { id: 'rob-a2', nome: 'Robótica', turmaId: 'ta', turmaNome: '3SA' },
  ]
  it('mesmo nome (sem acento/caixa), outras turmas, sem a própria', () => {
    expect(normalizarNome(' Robótica  Educacional ')).toBe('robotica educacional')
    expect(disciplinasParaReplicar({ id: 'rob-a', nome: 'Robótica', turmaId: 'ta' }, doProfessor).map((d) => d.id)).toEqual(['rob-b', 'rob-c'])
    expect(disciplinasParaReplicar({ id: 'mat-b', nome: 'Matemática', turmaId: 'tb' }, doProfessor)).toEqual([])
  })
})

describe('replicar conteúdo - data sugerida', () => {
  // Março/2026. Turma de destino: Robótica na segunda (1º) e na quinta (2º); 09/03 é feriado.
  const calendario = { inicio: '2026-03-02', fim: '2026-03-31', naoLetivos: [{ data: '2026-03-09' }], extras: [] }
  const horario = [{ diaSemana: 1, horario: 1, disciplinaId: 'rob' }, { diaSemana: 4, horario: 2, disciplinaId: 'rob' }]
  const base = { turmaId: 't', disciplinaId: 'rob', calendario, horario }

  it('mesma data quando há aula nela (mesmo já com conteúdo: aí pede confirmação)', () => {
    expect(sugerirData({ ...base, data: '2026-03-16', conteudos: new Map([['2026-03-16', 'algo']]) })).toBe('2026-03-16')
  })
  it('senão, a aula anterior mais próxima sem conteúdo', () => {
    // quarta 18/03 -> segunda 16/03
    expect(sugerirData({ ...base, data: '2026-03-18', conteudos: new Map() })).toBe('2026-03-16')
    // 16/03 já tem conteúdo -> quinta 12/03 (pula o feriado de 09/03)
    expect(sugerirData({ ...base, data: '2026-03-18', conteudos: new Map([['2026-03-16', 'Sensores'], ['2026-03-12', '  ']]) })).toBe('2026-03-12')
    expect(sugerirData({ ...base, data: '2026-03-13', conteudos: new Map([['2026-03-12', 'x'], ['2026-03-05', 'y'], ['2026-03-02', 'z']]) })).toBeNull()
  })
})

describe('replicar conteúdo - decisão', () => {
  const base = { data: '2026-03-16', tempos: [1], conteudo: 'Sensores', sobrescrever: false }
  it('cria PREVISTA só se houver aula no horário', () => {
    expect(decidirReplicacao({ ...base, existente: null })).toEqual({ acao: 'criar', tempos: [1] })
    expect(decidirReplicacao({ ...base, tempos: [], existente: null }).acao).toBe('recusar')
  })
  it('preenche conteúdo vazio; igual não faz nada', () => {
    expect(decidirReplicacao({ ...base, existente: { conteudo: null } })).toEqual({ acao: 'atualizar' })
    expect(decidirReplicacao({ ...base, existente: { conteudo: ' Sensores ' } })).toEqual({ acao: 'igual' })
  })
  it('nunca sobrescreve sem confirmação', () => {
    expect(decidirReplicacao({ ...base, existente: { conteudo: 'Outro' } })).toEqual({ acao: 'conflito', conteudoAtual: 'Outro' })
    expect(decidirReplicacao({ ...base, existente: { conteudo: 'Outro' }, sobrescrever: true })).toEqual({ acao: 'atualizar' })
  })
  it('recusa data inválida e conteúdo vazio', () => {
    expect(decidirReplicacao({ ...base, data: '2026-02-30', existente: null }).acao).toBe('recusar')
    expect(decidirReplicacao({ ...base, conteudo: '  ', existente: null }).acao).toBe('recusar')
  })
})
