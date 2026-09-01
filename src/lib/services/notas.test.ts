import { describe, it, expect } from 'vitest'
import {
  calcularNotaUnidade,
  calcularMediaFinal,
  calcularStatus,
  resolverEsquemaAvaliacaoId,
  type EsquemaConfig,
  type UnidadeInput,
} from './notas'

// Esquema "legado" (1 atividade por unidade, peso 10 = digitar a nota
// direto) - deve reproduzir exatamente o comportamento atual do sistema.
const esquemaLegado3: EsquemaConfig = {
  numUnidades: 3,
  notaMinimaAprovacao: 5,
  recuperacaoUnidadeAtiva: false,
  recuperacaoFinalAtiva: true,
  modoRecuperacaoFinal: 'SUBSTITUI_MENOR_UNIDADE',
}

const esquemaLegado2: EsquemaConfig = { ...esquemaLegado3, numUnidades: 2 }

function unidadeSimples(valor: number | null, notaRecuperacao: number | null = null): UnidadeInput {
  return { esquemaUnidadeId: 'u', atividades: [{ peso: 10, valor }], notaRecuperacao }
}

describe('calcularNotaUnidade', () => {
  it('soma atividades lançadas (escala do peso, soma direta)', () => {
    expect(calcularNotaUnidade([{ peso: 6, valor: 5 }, { peso: 2, valor: 2 }, { peso: 2, valor: 2 }])).toBe(9)
  })

  it('ignora atividades ainda não lançadas', () => {
    expect(calcularNotaUnidade([{ peso: 6, valor: 5 }, { peso: 2, valor: null }, { peso: 2, valor: 1 }])).toBe(6)
  })

  it('retorna null se nenhuma atividade foi lançada', () => {
    expect(calcularNotaUnidade([{ peso: 10, valor: null }])).toBeNull()
  })

  it('esquema legado: 1 atividade = digitar a nota direto', () => {
    expect(calcularNotaUnidade([{ peso: 10, valor: 7.5 }])).toBe(7.5)
  })
})

describe('calcularMediaFinal - comportamento legado (equivalente ao atual)', () => {
  it('3 unidades completas: média simples, igual a (n1+n2+n3)/3', () => {
    const r = calcularMediaFinal([unidadeSimples(8), unidadeSimples(6), unidadeSimples(4)], esquemaLegado3)
    expect(r.media).toBe(6)
    expect(r.completo).toBe(true)
    expect(r.notasUnidades).toEqual([8, 6, 4])
  })

  it('2 unidades (semestral): média de 2, igual a (n1+n2)/2', () => {
    const r = calcularMediaFinal([unidadeSimples(7), unidadeSimples(9)], esquemaLegado2)
    expect(r.media).toBe(8)
    expect(r.completo).toBe(true)
  })

  it('incompleto: completo=false, média parcial calculada com o que existe', () => {
    const r = calcularMediaFinal([unidadeSimples(8), unidadeSimples(null), unidadeSimples(null)], esquemaLegado3)
    expect(r.completo).toBe(false)
    expect(r.media).toBe(8)
  })

  it('nenhuma unidade lançada: média null', () => {
    const r = calcularMediaFinal([unidadeSimples(null), unidadeSimples(null), unidadeSimples(null)], esquemaLegado3)
    expect(r.completo).toBe(false)
    expect(r.media).toBeNull()
  })
})

describe('calcularMediaFinal - recuperação por unidade', () => {
  const esquemaComRecUnidade: EsquemaConfig = {
    ...esquemaLegado3,
    recuperacaoUnidadeAtiva: true,
    modoRecuperacaoUnidade: 'SUBSTITUI_SE_MAIOR',
  }

  it('substitui a nota da unidade se a recuperação for maior', () => {
    const r = calcularMediaFinal(
      [unidadeSimples(4, 7), unidadeSimples(6), unidadeSimples(8)],
      esquemaComRecUnidade
    )
    expect(r.notasUnidades[0]).toBe(7) // 7 > 4, substitui
    expect(r.media).toBe(7) // (7+6+8)/3 = 7
  })

  it('não substitui se a recuperação for menor ou igual', () => {
    const r = calcularMediaFinal(
      [unidadeSimples(8, 5), unidadeSimples(6), unidadeSimples(8)],
      esquemaComRecUnidade
    )
    expect(r.notasUnidades[0]).toBe(8) // 5 < 8, mantém
  })

  it('esquema sem recuperação por unidade ativa: ignora notaRecuperacao mesmo se presente', () => {
    const r = calcularMediaFinal([unidadeSimples(4, 9), unidadeSimples(6), unidadeSimples(8)], esquemaLegado3)
    expect(r.notasUnidades[0]).toBe(4) // recuperacaoUnidadeAtiva=false, ignora o 9
  })
})

describe('calcularStatus - comportamento legado', () => {
  it('aprovado se média >= 5 e completo', () => {
    const r = calcularMediaFinal([unidadeSimples(6), unidadeSimples(6), unidadeSimples(6)], esquemaLegado3)
    expect(calcularStatus(r, esquemaLegado3)).toBe('APROVADO')
  })

  it('recuperação se média < 5', () => {
    const r = calcularMediaFinal([unidadeSimples(3), unidadeSimples(4), unidadeSimples(4)], esquemaLegado3)
    expect(calcularStatus(r, esquemaLegado3)).toBe('RECUPERACAO')
  })

  it('incompleto fica RECUPERACAO (placeholder) até completar', () => {
    const r = calcularMediaFinal([unidadeSimples(8), unidadeSimples(null), unidadeSimples(null)], esquemaLegado3)
    expect(calcularStatus(r, esquemaLegado3)).toBe('RECUPERACAO')
  })

  it('preserva status especial (Conselho) mesmo se o recálculo desse RECUPERACAO', () => {
    const r = calcularMediaFinal([unidadeSimples(3), unidadeSimples(3), unidadeSimples(3)], esquemaLegado3)
    expect(calcularStatus(r, esquemaLegado3, null, 'APROVADO_CONSELHO')).toBe('APROVADO_CONSELHO')
  })

  it('preserva status especial mesmo incompleto', () => {
    const r = calcularMediaFinal([unidadeSimples(null), unidadeSimples(null), unidadeSimples(null)], esquemaLegado3)
    expect(calcularStatus(r, esquemaLegado3, null, 'DEPENDENCIA')).toBe('DEPENDENCIA')
  })
})

describe('calcularStatus - recuperação final: SUBSTITUI_MENOR_UNIDADE', () => {
  it('substitui a menor unidade se a recuperação final for maior e a nova média aprovar', () => {
    // médias: 2,4,4 -> média 3.33, reprovado. Substitui o 2 por 8 -> (8+4+4)/3=5.33 -> aprovado
    const r = calcularMediaFinal([unidadeSimples(2), unidadeSimples(4), unidadeSimples(4)], esquemaLegado3)
    expect(calcularStatus(r, esquemaLegado3, 8)).toBe('APROVADO_RECUPERACAO')
  })

  it('não aprova se mesmo substituindo a menor a média continua abaixo do mínimo', () => {
    const r = calcularMediaFinal([unidadeSimples(1), unidadeSimples(2), unidadeSimples(2)], esquemaLegado3)
    expect(calcularStatus(r, esquemaLegado3, 6)).toBe('RECUPERACAO') // (6+2+2)/3=3.33, ainda reprovado
  })

  it('não faz nada se a recuperação final não é maior que a menor unidade', () => {
    const r = calcularMediaFinal([unidadeSimples(4), unidadeSimples(4), unidadeSimples(4)], esquemaLegado3)
    expect(calcularStatus(r, esquemaLegado3, 3)).toBe('RECUPERACAO')
  })
})

describe('calcularStatus - recuperação final: NOTA_MINIMA_ISOLADA', () => {
  const esquemaIsolado: EsquemaConfig = { ...esquemaLegado3, modoRecuperacaoFinal: 'NOTA_MINIMA_ISOLADA' }

  it('aprova só pela nota da recuperação, ignorando a média das unidades', () => {
    const r = calcularMediaFinal([unidadeSimples(1), unidadeSimples(1), unidadeSimples(1)], esquemaIsolado)
    expect(calcularStatus(r, esquemaIsolado, 6)).toBe('APROVADO_RECUPERACAO')
  })

  it('reprova se a nota da recuperação for menor que o mínimo', () => {
    const r = calcularMediaFinal([unidadeSimples(1), unidadeSimples(1), unidadeSimples(1)], esquemaIsolado)
    expect(calcularStatus(r, esquemaIsolado, 4)).toBe('RECUPERACAO')
  })
})

describe('calcularStatus - recuperação final desativada', () => {
  const semRecFinal: EsquemaConfig = { ...esquemaLegado3, recuperacaoFinalAtiva: false }

  it('nota de recuperação é ignorada se o esquema não tem recuperação final ativa', () => {
    const r = calcularMediaFinal([unidadeSimples(1), unidadeSimples(1), unidadeSimples(1)], semRecFinal)
    expect(calcularStatus(r, semRecFinal, 9)).toBe('RECUPERACAO')
  })
})

describe('resolverEsquemaAvaliacaoId', () => {
  it('prioriza o override da turma sobre o padrão do curso', () => {
    expect(resolverEsquemaAvaliacaoId({ esquemaAvaliacaoId: 'turma-esquema' }, { esquemaAvaliacaoId: 'curso-esquema' })).toBe('turma-esquema')
  })

  it('cai pro esquema do curso se a turma não tem override', () => {
    expect(resolverEsquemaAvaliacaoId({ esquemaAvaliacaoId: null }, { esquemaAvaliacaoId: 'curso-esquema' })).toBe('curso-esquema')
  })

  it('null se nem turma nem curso têm esquema', () => {
    expect(resolverEsquemaAvaliacaoId({ esquemaAvaliacaoId: null }, null)).toBeNull()
  })
})
