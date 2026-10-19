import { describe, it, expect } from 'vitest'
import {
  calcularFrequenciaTurma,
  calcularFrequenciaAluno,
  regraDoEsquema,
  frequenciaConsiderada,
  situacaoFrequencia,
  calcularSituacaoFinal,
  periodoEncerrado,
  projetarFrequencia,
  formatarFrequencia,
  CHAVE_DIA,
  type AulaFreq,
} from './frequencia'

const aula = (id: string, disciplinaId: string | null, data: string, quantidade = 1, situacao: AulaFreq['situacao'] = 'REALIZADA'): AulaFreq =>
  ({ id, disciplinaId, data, quantidade, situacao })

// Matemática: 4 aulas em 2 dias (2 tempos cada). Português: 2 aulas em 2 dias.
const AULAS = [
  aula('m1', 'mat', '2026-03-02', 2),
  aula('m2', 'mat', '2026-03-03', 2),
  aula('p1', 'por', '2026-03-02', 1),
  aula('p2', 'por', '2026-03-04', 1),
]

describe('calcularFrequenciaTurma', () => {
  it('aluno sem falta = 100%, não vazio', () => {
    const f = calcularFrequenciaAluno('a', AULAS, [], [])
    expect(f.geral).toMatchObject({ aulas: 6, faltas: 0, percentual: 100 })
    expect(f.porDisciplina.mat.percentual).toBe(100)
  })

  it('sem aula realizada = null (sem dados), mesmo com faltas lançadas em aula prevista', () => {
    const f = calcularFrequenciaAluno('a', [aula('x', 'mat', '2026-03-02', 2, 'PREVISTA')], [{ aulaId: 'x', estudanteId: 'a', quantidade: 2 }], [])
    expect(f.geral.percentual).toBeNull()
    expect(f.geral.faltas).toBe(0)
  })

  it('aula cancelada não conta', () => {
    const f = calcularFrequenciaAluno('a', [...AULAS, aula('c', 'mat', '2026-03-05', 2, 'CANCELADA')], [], [])
    expect(f.geral.aulas).toBe(6)
  })

  it('percentual por disciplina e geral', () => {
    const f = calcularFrequenciaAluno('a', AULAS, [
      { aulaId: 'm1', estudanteId: 'a', quantidade: 2 },
      { aulaId: 'p2', estudanteId: 'a', quantidade: 1 },
    ], [])
    expect(f.porDisciplina.mat).toMatchObject({ aulas: 4, faltas: 2, percentual: 50 })
    expect(f.porDisciplina.por).toMatchObject({ aulas: 2, faltas: 1, percentual: 50 })
    expect(f.geral).toMatchObject({ aulas: 6, faltas: 3, faltasConsideradas: 3, percentual: 50 })
  })

  it('falta com quantidade maior que a aula é limitada aos tempos da aula', () => {
    const f = calcularFrequenciaAluno('a', AULAS, [{ aulaId: 'p1', estudanteId: 'a', quantidade: 5 }], [])
    expect(f.porDisciplina.por.faltas).toBe(1)
  })

  it('ABONA tira a falta da conta; SO_JUSTIFICA mantém', () => {
    const faltas = [{ aulaId: 'm1', estudanteId: 'a', quantidade: 2 }, { aulaId: 'm2', estudanteId: 'a', quantidade: 2 }]
    const abona = calcularFrequenciaAluno('a', AULAS, faltas, [{ estudanteId: 'a', inicio: '2026-03-02', fim: '2026-03-02', efeito: 'ABONA' }])
    expect(abona.porDisciplina.mat).toMatchObject({ faltas: 4, faltasAbonadas: 2, faltasConsideradas: 2, percentual: 50 })
    const so = calcularFrequenciaAluno('a', AULAS, faltas, [{ estudanteId: 'a', inicio: '2026-03-01', fim: '2026-03-10', efeito: 'SO_JUSTIFICA' }])
    expect(so.porDisciplina.mat).toMatchObject({ faltas: 4, faltasJustificadas: 4, faltasConsideradas: 4, percentual: 0 })
  })

  it('ABONA prevalece quando há duas justificativas no mesmo dia', () => {
    const f = calcularFrequenciaAluno('a', AULAS, [{ aulaId: 'p1', estudanteId: 'a', quantidade: 1 }], [
      { estudanteId: 'a', inicio: '2026-03-02', fim: '2026-03-02', efeito: 'SO_JUSTIFICA' },
      { estudanteId: 'a', inicio: new Date('2026-03-01T00:00:00Z'), fim: new Date('2026-03-03T00:00:00Z'), efeito: 'ABONA' },
    ])
    expect(f.porDisciplina.por.faltasAbonadas).toBe(1)
    expect(f.porDisciplina.por.faltasJustificadas).toBe(0)
  })

  it('justificativa de um aluno não vale para outro, e faltas de quem não está na lista são ignoradas', () => {
    const r = calcularFrequenciaTurma(['a', 'b'], AULAS, [
      { aulaId: 'p1', estudanteId: 'a', quantidade: 1 },
      { aulaId: 'p1', estudanteId: 'b', quantidade: 1 },
      { aulaId: 'p1', estudanteId: 'z', quantidade: 1 },
    ], [{ estudanteId: 'a', inicio: '2026-03-02', fim: '2026-03-02', efeito: 'ABONA' }])
    expect(r.get('a')!.geral.faltasConsideradas).toBe(0)
    expect(r.get('b')!.geral.faltasConsideradas).toBe(1)
    expect(r.has('z')).toBe(false)
  })

  it('não compartilha contadores entre alunos', () => {
    const r = calcularFrequenciaTurma(['a', 'b'], AULAS, [{ aulaId: 'm1', estudanteId: 'a', quantidade: 2 }], [])
    expect(r.get('b')!.porDisciplina.mat.faltas).toBe(0)
  })

  it('chamada diária (sem disciplina) entra no geral', () => {
    const f = calcularFrequenciaAluno('a', [aula('d1', null, '2026-03-02'), aula('d2', null, '2026-03-03'), aula('d3', null, '2026-03-04'), aula('d4', null, '2026-03-05')], [{ aulaId: 'd1', estudanteId: 'a', quantidade: 1 }], [])
    expect(f.geral.percentual).toBe(75)
    expect(f.porDisciplina[CHAVE_DIA].aulas).toBe(4)
  })

  it('arredonda com 1 casa', () => {
    const tres = [aula('1', 'x', '2026-03-02'), aula('2', 'x', '2026-03-03'), aula('3', 'x', '2026-03-04')]
    expect(calcularFrequenciaAluno('a', tres, [{ aulaId: '1', estudanteId: 'a', quantidade: 1 }], []).geral.percentual).toBe(66.7)
  })
})

describe('regra e frequência considerada', () => {
  const f = calcularFrequenciaAluno('a', AULAS, [{ aulaId: 'm1', estudanteId: 'a', quantidade: 2 }], [])

  it('padrão: GERAL 75%', () => {
    expect(regraDoEsquema(null)).toEqual({ apuracao: 'GERAL', minimo: 75 })
    expect(regraDoEsquema({ apuracaoFrequencia: 'POR_COMPONENTE', frequenciaMinima: 85 })).toEqual({ apuracao: 'POR_COMPONENTE', minimo: 85 })
  })

  it('chamada POR_DIA força apuração GERAL', () => {
    expect(regraDoEsquema({ apuracaoFrequencia: 'POR_COMPONENTE', registroFrequencia: 'POR_DIA', frequenciaMinima: 75 }).apuracao).toBe('GERAL')
  })

  it('GERAL usa o total; POR_COMPONENTE usa a disciplina ou a pior', () => {
    expect(frequenciaConsiderada(f, { apuracao: 'GERAL', minimo: 75 }, 'mat')).toBeCloseTo(66.7)
    expect(frequenciaConsiderada(f, { apuracao: 'POR_COMPONENTE', minimo: 75 }, 'mat')).toBe(50)
    expect(frequenciaConsiderada(f, { apuracao: 'POR_COMPONENTE', minimo: 75 }, 'por')).toBe(100)
    expect(frequenciaConsiderada(f, { apuracao: 'POR_COMPONENTE', minimo: 75 })).toBe(50)
    expect(frequenciaConsiderada(f, { apuracao: 'POR_COMPONENTE', minimo: 75 }, 'sem-aula')).toBeNull()
  })
})

describe('situação', () => {
  it('situacaoFrequencia', () => {
    expect(situacaoFrequencia(null, 75)).toBe('SEM_AULAS')
    expect(situacaoFrequencia(74.9, 75)).toBe('ABAIXO_MINIMO')
    expect(situacaoFrequencia(75, 75)).toBe('ALERTA')
    expect(situacaoFrequencia(84.9, 75)).toBe('ALERTA')
    expect(situacaoFrequencia(85, 75)).toBe('REGULAR')
  })

  const regra = { apuracao: 'GERAL' as const, minimo: 75 }
  it('REPROVADO_FALTA só com período encerrado', () => {
    expect(calcularSituacaoFinal('APROVADO', 60, regra, true)).toBe('REPROVADO_FALTA')
    expect(calcularSituacaoFinal('APROVADO_RECUPERACAO', 74.9, regra, true)).toBe('REPROVADO_FALTA')
    expect(calcularSituacaoFinal('RECUPERACAO', 60, regra, true)).toBe('REPROVADO_FALTA')
    expect(calcularSituacaoFinal('APROVADO', 60, regra, false)).toBe('APROVADO')
    expect(calcularSituacaoFinal('APROVADO', 75, regra, true)).toBe('APROVADO')
    expect(calcularSituacaoFinal('APROVADO', null, regra, true)).toBe('APROVADO')
  })

  it('decisão do conselho e desistência prevalecem', () => {
    for (const s of ['APROVADO_CONSELHO', 'DEPENDENCIA', 'CONSERVADO', 'DESISTENTE'] as const) {
      expect(calcularSituacaoFinal(s, 10, regra, true)).toBe(s)
    }
  })

  it('periodoEncerrado', () => {
    expect(periodoEncerrado({ fimPeriodo: '2026-12-18', hoje: '2026-12-19' })).toBe(true)
    expect(periodoEncerrado({ fimPeriodo: '2026-12-18', hoje: '2026-12-18' })).toBe(false)
    expect(periodoEncerrado({ fimPeriodo: null, hoje: '2027-01-01' })).toBe(false)
  })
})

describe('projetarFrequencia', () => {
  it('máxima possível e faltas ainda permitidas', () => {
    // 40 aulas dadas, 8 faltas; 40 restantes -> total 80, limite 25% = 20 faltas
    const c = { aulas: 40, faltas: 8, faltasAbonadas: 0, faltasJustificadas: 0, faltasConsideradas: 8, percentual: 80 }
    expect(projetarFrequencia(c, 40, 75)).toEqual({ maximaPossivel: 90, faltasRestantesPermitidas: 12 })
  })
  it('já estourou o limite', () => {
    const c = { aulas: 80, faltas: 30, faltasAbonadas: 0, faltasJustificadas: 0, faltasConsideradas: 30, percentual: 62.5 }
    expect(projetarFrequencia(c, 0, 75).faltasRestantesPermitidas).toBe(-10)
  })
  it('sem aulas', () => {
    expect(projetarFrequencia({ aulas: 0, faltas: 0, faltasAbonadas: 0, faltasJustificadas: 0, faltasConsideradas: 0, percentual: null }, 0, 75).maximaPossivel).toBeNull()
  })
})

it('formatarFrequencia', () => {
  expect(formatarFrequencia(87.5)).toBe('87,5%')
  expect(formatarFrequencia(100)).toBe('100,0%')
  expect(formatarFrequencia(null)).toBe('—')
})

describe('situacaoComFrequencia', () => {
  it('GERAL usa o total; POR_COMPONENTE a disciplina', async () => {
    const { situacaoComFrequencia } = await import('./frequencia')
    // mat 50%, por 100%, geral 66.7%
    const f = calcularFrequenciaAluno('a', AULAS, [{ aulaId: 'm1', estudanteId: 'a', quantidade: 2 }], [])
    expect(situacaoComFrequencia('APROVADO', f, { apuracao: 'GERAL', minimo: 75 }, 'por', true)).toBe('REPROVADO_FALTA')
    expect(situacaoComFrequencia('APROVADO', f, { apuracao: 'POR_COMPONENTE', minimo: 75 }, 'por', true)).toBe('APROVADO')
    expect(situacaoComFrequencia('APROVADO', f, { apuracao: 'POR_COMPONENTE', minimo: 75 }, 'mat', true)).toBe('REPROVADO_FALTA')
    expect(situacaoComFrequencia('APROVADO', undefined, { apuracao: 'GERAL', minimo: 75 }, 'mat', true)).toBe('APROVADO')
  })
})

describe('linhasInfrequencia', () => {
  it('lista quem está abaixo ou perto do mínimo, do pior para o melhor', async () => {
    const { linhasInfrequencia } = await import('./frequencia')
    const r = calcularFrequenciaTurma(['a', 'b', 'c'], AULAS, [
      { aulaId: 'm1', estudanteId: 'a', quantidade: 2 }, // a: 4/6 faltas? não: 2 de 6 -> 66.7
      { aulaId: 'p1', estudanteId: 'b', quantidade: 1 }, // b: 1 de 6 -> 83.3 (alerta)
    ], [{ estudanteId: 'a', inicio: '2026-03-02', fim: '2026-03-02', efeito: 'SO_JUSTIFICA' }])
    const linhas = linhasInfrequencia(['a', 'b', 'c'], r, { apuracao: 'GERAL', minimo: 75 }, { total: 0, porDisciplina: new Map() })
    expect(linhas.map((l) => l.estudanteId)).toEqual(['a', 'b'])
    expect(linhas[0]).toMatchObject({ percentual: 66.7, faltas: 2, faltasJustificadas: 2, faltasSemJustificativa: 0 })
    expect(linhas[0].risco.level).toBe('CRITICAL') // sem aulas restantes, não recupera
    expect(linhas[1].risco.level).toBe('MEDIUM')
    expect(linhasInfrequencia(['a', 'b', 'c'], r, { apuracao: 'GERAL', minimo: 75 }, { total: 0, porDisciplina: new Map() }, true)).toHaveLength(3)
  })

  it('POR_COMPONENTE usa a pior disciplina e as aulas restantes dela', async () => {
    const { linhasInfrequencia } = await import('./frequencia')
    const r = calcularFrequenciaTurma(['a'], AULAS, [{ aulaId: 'm1', estudanteId: 'a', quantidade: 2 }], [])
    const [l] = linhasInfrequencia(['a'], r, { apuracao: 'POR_COMPONENTE', minimo: 75 }, { total: 100, porDisciplina: new Map([['mat', 36]]) })
    expect(l.disciplinaId).toBe('mat')
    expect(l.percentual).toBe(50)
    // 40 aulas no total de mat, limite 10 faltas, já tem 2 -> pode 8
    expect(l.faltasRestantesPermitidas).toBe(8)
    expect(l.risco.level).toBe('HIGH')
  })
})
