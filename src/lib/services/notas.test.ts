import { describe, it, expect } from 'vitest'
import {
  calcularNotaUnidade,
  calcularMediaFinal,
  calcularStatus,
  resolverEsquemaAvaliacaoId,
  paraEsquemaConfig,
  etapasDaNota,
  desistenteEmTodas,
  unidadesDeNotasSalvas,
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

// ---------------------------------------------------------------------------
// Regra de avaliação configurável (plano-avaliacao-frequencia.md, seção 3.1)
// ---------------------------------------------------------------------------

describe('calcularNotaUnidade - formas de cálculo da etapa', () => {
  const ativ = [{ valor: 8, peso: 1 }, { valor: 6, peso: 3 }, { valor: null, peso: 2 }]

  it('SOMA é o default e ignora peso', () => {
    expect(calcularNotaUnidade(ativ)).toBe(14)
  })
  it('MEDIA_ARITMETICA considera só as lançadas', () => {
    expect(calcularNotaUnidade(ativ, 'MEDIA_ARITMETICA')).toBe(7)
  })
  it('MEDIA_PONDERADA: (8·1 + 6·3) / 4 = 6.5', () => {
    expect(calcularNotaUnidade(ativ, 'MEDIA_PONDERADA')).toBe(6.5)
  })
  it('SOMA_COM_DIVISOR: 14 / 4 = 3.5', () => {
    expect(calcularNotaUnidade(ativ, 'SOMA_COM_DIVISOR', 4)).toBe(3.5)
  })
  it('MAIOR_NOTA', () => {
    expect(calcularNotaUnidade(ativ, 'MAIOR_NOTA')).toBe(8)
  })
  it('arredonda pelas casas decimais pedidas', () => {
    expect(calcularNotaUnidade([{ valor: 7 }, { valor: 8 }, { valor: 8 }], 'MEDIA_ARITMETICA', null, 2)).toBe(7.67)
  })
})

describe('calcularMediaFinal - forma de cálculo final', () => {
  it('MEDIA_PONDERADA das etapas (modelo IF): (2·6 + 3·8) / 5 = 7.2', () => {
    const esquema: EsquemaConfig = { ...esquemaLegado2, formaCalculoFinal: 'MEDIA_PONDERADA' }
    const r = calcularMediaFinal(
      [{ ...unidadeSimples(6), peso: 2 }, { ...unidadeSimples(8), peso: 3 }],
      esquema
    )
    expect(r.media).toBe(7.2)
  })

  it('SOMA de pontos (ano de 100 pontos): 25 + 30 + 20 = 75, aprova com 60', () => {
    const esquema: EsquemaConfig = { ...esquemaLegado3, formaCalculoFinal: 'SOMA', notaMinimaAprovacao: 60 }
    const r = calcularMediaFinal([unidadeSimples(25), unidadeSimples(30), unidadeSimples(20)], esquema)
    expect(r.media).toBe(75)
    expect(calcularStatus(r, esquema)).toBe('APROVADO')
  })

  it('etapa com forma própria: média aritmética de 3 avaliações dentro da etapa', () => {
    const r = calcularMediaFinal(
      [
        { esquemaUnidadeId: 'u1', formaCalculo: 'MEDIA_ARITMETICA', atividades: [{ valor: 9 }, { valor: 6 }, { valor: 6 }] },
        unidadeSimples(5),
      ],
      esquemaLegado2
    )
    expect(r.notasUnidades).toEqual([7, 5])
    expect(r.media).toBe(6)
  })
})

describe('recuperação - modos novos', () => {
  it('MEDIA_COM_UNIDADE: vale a maior entre a nota e (nota + rec) / 2', () => {
    const esquema: EsquemaConfig = { ...esquemaLegado2, recuperacaoUnidadeAtiva: true, modoRecuperacaoUnidade: 'MEDIA_COM_UNIDADE' }
    const r = calcularMediaFinal([unidadeSimples(4, 8), unidadeSimples(6, 2)], esquema)
    // (4+8)/2 = 6 > 4 -> 6; (6+2)/2 = 4 < 6 -> mantém 6
    expect(r.notasUnidades).toEqual([6, 6])
  })

  it('MEDIA_COM_FINAL: (média 4 + exame 6) / 2 = 5 aprova', () => {
    const esquema: EsquemaConfig = { ...esquemaLegado2, modoRecuperacaoFinal: 'MEDIA_COM_FINAL' }
    const r = calcularMediaFinal([unidadeSimples(4), unidadeSimples(4)], esquema)
    expect(calcularStatus(r, esquema, 6)).toBe('APROVADO_RECUPERACAO')
    expect(calcularStatus(r, esquema, 5)).toBe('RECUPERACAO')
  })

  it('MEDIA_COM_FINAL respeita notaMinimaExameFinal própria', () => {
    const esquema: EsquemaConfig = { ...esquemaLegado2, modoRecuperacaoFinal: 'MEDIA_COM_FINAL', notaMinimaExameFinal: 6 }
    const r = calcularMediaFinal([unidadeSimples(4), unidadeSimples(4)], esquema)
    expect(calcularStatus(r, esquema, 7)).toBe('RECUPERACAO') // (4+7)/2 = 5.5 < 6
    expect(calcularStatus(r, esquema, 8)).toBe('APROVADO_RECUPERACAO')
  })
})

describe('paraEsquemaConfig', () => {
  it('copia todos os campos relevantes da linha do banco', () => {
    const cfg = paraEsquemaConfig({
      numUnidades: 2, notaMinimaAprovacao: 6, recuperacaoUnidadeAtiva: true, modoRecuperacaoUnidade: 'SUBSTITUI_SE_MAIOR',
      recuperacaoFinalAtiva: false, modoRecuperacaoFinal: null, formaCalculoFinal: 'MEDIA_PONDERADA',
      divisorFinal: null, notaMinimaExameFinal: 5, casasDecimais: 2,
    })
    expect(cfg.formaCalculoFinal).toBe('MEDIA_PONDERADA')
    expect(cfg.casasDecimais).toBe(2)
    expect(cfg.notaMinimaExameFinal).toBe(5)
  })
})

describe('leitura de notas salvas por etapa', () => {
  const etapas = [{ id: 'u1', peso: 2 }, { id: 'u2', peso: 3 }, { id: 'u3', peso: 1 }]
  const salvas = [
    { esquemaUnidadeId: 'u2', notaCalculada: 8, notaRecuperacao: null, isDesistente: false },
    { esquemaUnidadeId: 'u1', notaCalculada: 6, notaRecuperacao: 7, isDesistente: true },
    { esquemaUnidadeId: 'outro-esquema', notaCalculada: 10, notaRecuperacao: null, isDesistente: false },
  ]

  it('etapasDaNota alinha pela ordem do esquema, preenche vazias e ignora unidade de outro esquema', () => {
    expect(etapasDaNota(etapas, salvas)).toEqual([
      { nota: 6, recuperacao: 7, desistente: true },
      { nota: 8, recuperacao: null, desistente: false },
      { nota: null, recuperacao: null, desistente: false },
    ])
  })

  it('unidadesDeNotasSalvas leva o peso da etapa para o motor', () => {
    const esquema: EsquemaConfig = { ...esquemaLegado2, formaCalculoFinal: 'MEDIA_PONDERADA' }
    const r = calcularMediaFinal(unidadesDeNotasSalvas(etapas.slice(0, 2), salvas), esquema)
    expect(r.media).toBe(7.2) // (2·6 + 3·8) / 5
  })

  it('desistenteEmTodas só quando todas as etapas são DS sem nota', () => {
    expect(desistenteEmTodas([{ nota: null, recuperacao: null, desistente: true }, { nota: null, recuperacao: null, desistente: true }])).toBe(true)
    expect(desistenteEmTodas([{ nota: 5, recuperacao: null, desistente: true }, { nota: null, recuperacao: null, desistente: true }])).toBe(false)
    expect(desistenteEmTodas([])).toBe(false)
  })
})
