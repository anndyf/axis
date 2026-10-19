import { describe, it, expect } from 'vitest'
import { montarLancamentoAluno, ErroLancamento, parseNota, type EsquemaParaLancamento } from './lancamento-notas'

const esquema: EsquemaParaLancamento = {
  config: { numUnidades: 2, notaMinimaAprovacao: 5, recuperacaoUnidadeAtiva: false, recuperacaoFinalAtiva: true, modoRecuperacaoFinal: 'NOTA_MINIMA_ISOLADA' },
  notaMaxima: 10,
  casasDecimais: 1,
  unidades: [
    { id: 'u1', peso: 1, formaCalculo: 'SOMA', divisor: null, atividades: [{ id: 'a1', nome: 'Prova', notaMaxima: 6, peso: 1 }, { id: 'a2', nome: 'Trabalho', notaMaxima: 4, peso: 1 }] },
    { id: 'u2', peso: 1, formaCalculo: 'SOMA', divisor: null, atividades: [{ id: 'b1', nome: 'Prova', notaMaxima: 10, peso: 1 }] },
  ],
}

describe('parseNota', () => {
  it('aceita vírgula e trata vazio como null', () => {
    expect(parseNota('7,5')).toBe(7.5)
    expect(parseNota('')).toBeNull()
    expect(parseNota(undefined)).toBeNull()
    expect(parseNota('abc')).toBeNull()
  })
})

describe('montarLancamentoAluno', () => {
  it('calcula etapas, média e status', () => {
    const r = montarLancamentoAluno(esquema, [
      { esquemaUnidadeId: 'u1', atividades: [{ esquemaAtividadeId: 'a1', valor: 5 }, { esquemaAtividadeId: 'a2', valor: '3' }] },
      { esquemaUnidadeId: 'u2', atividades: [{ esquemaAtividadeId: 'b1', valor: 6 }] },
    ], [], undefined, 'M1')
    expect(r.tocado).toBe(true)
    expect(r.unidades.map((u) => u.notaCalculada)).toEqual([8, 6])
    expect(r.media).toBe(7)
    expect(r.status).toBe('APROVADO')
  })

  it('valor vazio preserva o que já estava salvo', () => {
    const r = montarLancamentoAluno(esquema, [
      { esquemaUnidadeId: 'u2', atividades: [{ esquemaAtividadeId: 'b1', valor: 2 }] },
    ], [{ esquemaUnidadeId: 'u1', notaRecuperacao: null, isDesistente: false, atividades: [{ esquemaAtividadeId: 'a1', valor: 6 }, { esquemaAtividadeId: 'a2', valor: 4 }] }], undefined, 'M1')
    expect(r.unidades[0].notaCalculada).toBe(10)
    expect(r.media).toBe(6)
  })

  it('payload sem valor nenhum não é "tocado"', () => {
    const r = montarLancamentoAluno(esquema, [{ esquemaUnidadeId: 'u1', atividades: [{ esquemaAtividadeId: 'a1', valor: '' }] }], [], undefined, 'M1')
    expect(r.tocado).toBe(false)
  })

  it('recusa nota acima do máximo da atividade ou negativa', () => {
    expect(() => montarLancamentoAluno(esquema, [{ esquemaUnidadeId: 'u1', atividades: [{ esquemaAtividadeId: 'a1', valor: 7 }] }], [], undefined, 'M1')).toThrow(ErroLancamento)
    expect(() => montarLancamentoAluno(esquema, [{ esquemaUnidadeId: 'u2', atividades: [{ esquemaAtividadeId: 'b1', valor: -1 }] }], [], undefined, 'M1')).toThrow(/entre 0 e 10/)
  })

  it('recusa recuperação de etapa fora da escala do esquema', () => {
    expect(() => montarLancamentoAluno(esquema, [{ esquemaUnidadeId: 'u1', notaRecuperacao: 11, atividades: [] }], [], undefined, 'M1')).toThrow(/recuperação/)
  })

  it('não regride status especial', () => {
    const r = montarLancamentoAluno(esquema, [
      { esquemaUnidadeId: 'u1', atividades: [{ esquemaAtividadeId: 'a1', valor: 1 }] },
      { esquemaUnidadeId: 'u2', atividades: [{ esquemaAtividadeId: 'b1', valor: 1 }] },
    ], [], 'APROVADO_CONSELHO', 'M1')
    expect(r.status).toBe('APROVADO_CONSELHO')
  })
})

describe('etapa sem atividades (professor ainda não criou as avaliações)', () => {
  it('preserva a nota já gravada e a usa na média', () => {
    const semAtividadesNaU2: EsquemaParaLancamento = { ...esquema, unidades: [esquema.unidades[0], { ...esquema.unidades[1], atividades: [] }] }
    const r = montarLancamentoAluno(semAtividadesNaU2, [
      { esquemaUnidadeId: 'u1', atividades: [{ esquemaAtividadeId: 'a1', valor: 6 }, { esquemaAtividadeId: 'a2', valor: 4 }] },
    ], [{ esquemaUnidadeId: 'u2', notaCalculada: 8, notaRecuperacao: null, isDesistente: false, atividades: [] }], undefined, 'M1')
    expect(r.unidades.map((u) => u.notaCalculada)).toEqual([10, 8])
    expect(r.media).toBe(9)
    expect(r.status).toBe('APROVADO')
  })
})
