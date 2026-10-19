import { describe, it, expect } from 'vitest'
import { aulasDoDia, planejarChamada, validarFaltas, chaveAula, hojeNaEscola, dataValida, diasComAulaAte, aulasRestantes } from './chamada'

const CAL = {
  inicio: '2026-02-02',
  fim: '2026-12-18',
  naoLetivos: [
    { data: '2026-04-21', turmaId: null }, // Tiradentes (terça)
    { data: '2026-03-10', turmaId: 'outra' }, // só outra turma
  ],
  extras: [{ data: '2026-03-07', seguirHorarioDe: 1 }], // sábado com horário de segunda
}
// Segunda: mat 1º e 2º, por 3º. Terça: por 1º.
const HOR = [
  { diaSemana: 1, horario: 2, disciplinaId: 'mat' },
  { diaSemana: 1, horario: 1, disciplinaId: 'mat' },
  { diaSemana: 1, horario: 3, disciplinaId: 'por' },
  { diaSemana: 2, horario: 1, disciplinaId: 'por' },
  { diaSemana: 2, horario: 2, disciplinaId: null },
]
const base = { registro: 'POR_AULA' as const, hoje: '2026-10-19', turmaId: 't', calendario: CAL, horario: HOR }

describe('aulasDoDia', () => {
  it('segunda normal: tempos por disciplina em ordem', () => {
    const d = aulasDoDia('2026-03-02', 't', CAL, HOR)
    expect(d.letivo).toBe(true)
    expect(d.temposPorDisciplina.get('mat')).toEqual([1, 2])
    expect(d.temposPorDisciplina.get('por')).toEqual([3])
  })
  it('feriado, fim de semana e fora do período não são letivos', () => {
    expect(aulasDoDia('2026-04-21', 't', CAL, HOR).letivo).toBe(false)
    expect(aulasDoDia('2026-03-08', 't', CAL, HOR).letivo).toBe(false)
    expect(aulasDoDia('2026-01-05', 't', CAL, HOR).letivo).toBe(false)
    expect(aulasDoDia('2026-12-21', 't', CAL, HOR).letivo).toBe(false)
  })
  it('dia não letivo de outra turma não afeta', () => {
    expect(aulasDoDia('2026-03-10', 't', CAL, HOR).letivo).toBe(true)
    expect(aulasDoDia('2026-03-10', 'outra', CAL, HOR).letivo).toBe(false)
  })
  it('sábado letivo segue o horário de segunda', () => {
    const d = aulasDoDia('2026-03-07', 't', CAL, HOR)
    expect(d.diaSemana).toBe(1)
    expect(d.temposPorDisciplina.get('mat')).toEqual([1, 2])
  })
})

describe('planejarChamada', () => {
  it('POR_AULA: quantidade = tempos da disciplina no dia', () => {
    expect(planejarChamada({ ...base, data: '2026-03-02', disciplinaId: 'mat' })).toEqual({ ok: true, disciplinaId: 'mat', tempos: [1, 2], quantidade: 2, chave: 't|2026-03-02|mat' })
  })
  it('recusa disciplina sem aula no dia, dia não letivo, data futura, data inválida e sem calendário', () => {
    expect(planejarChamada({ ...base, data: '2026-03-03', disciplinaId: 'mat' }).ok).toBe(false)
    expect(planejarChamada({ ...base, data: '2026-04-21', disciplinaId: 'por' }).ok).toBe(false)
    expect(planejarChamada({ ...base, data: '2026-10-26', disciplinaId: 'mat' }).ok).toBe(false)
    expect(planejarChamada({ ...base, data: '2026-02-30', disciplinaId: 'mat' }).ok).toBe(false)
    expect(planejarChamada({ ...base, calendario: null, data: '2026-03-02', disciplinaId: 'mat' }).ok).toBe(false)
    expect(planejarChamada({ ...base, data: '2026-03-02', disciplinaId: null }).ok).toBe(false)
  })
  it('POR_DIA: uma chamada sem disciplina', () => {
    expect(planejarChamada({ ...base, registro: 'POR_DIA', data: '2026-03-03', disciplinaId: 'qualquer' })).toEqual({ ok: true, disciplinaId: null, tempos: [], quantidade: 1, chave: 't|2026-03-03|DIA' })
    expect(planejarChamada({ ...base, registro: 'POR_DIA', data: '2026-03-04', disciplinaId: null }).ok).toBe(false) // quarta sem horário
  })
})

describe('validarFaltas', () => {
  const turma = new Set(['a', 'b'])
  it('aceita e descarta presença (0)', () => {
    expect(validarFaltas([{ estudanteId: 'a', quantidade: 2 }, { estudanteId: 'b', quantidade: 0 }], turma, 2)).toEqual({ ok: true, faltas: [{ estudanteId: 'a', quantidade: 2 }] })
    expect(validarFaltas([{ estudanteId: 'a' }], turma, 2)).toEqual({ ok: true, faltas: [{ estudanteId: 'a', quantidade: 1 }] })
  })
  it('recusa aluno de fora, repetido, quantidade fora do limite ou não inteira', () => {
    expect(validarFaltas([{ estudanteId: 'z' }], turma, 2).ok).toBe(false)
    expect(validarFaltas([{ estudanteId: 'a' }, { estudanteId: 'a' }], turma, 2).ok).toBe(false)
    expect(validarFaltas([{ estudanteId: 'a', quantidade: 3 }], turma, 2).ok).toBe(false)
    expect(validarFaltas([{ estudanteId: 'a', quantidade: 1.5 }], turma, 2).ok).toBe(false)
    expect(validarFaltas([{ estudanteId: 'a', quantidade: -1 }], turma, 2).ok).toBe(false)
    expect(validarFaltas('x', turma, 2).ok).toBe(false)
  })
})

describe('utilitários', () => {
  it('chaveAula', () => {
    expect(chaveAula('t', '2026-03-02', null)).toBe('t|2026-03-02|DIA')
  })
  it('hojeNaEscola usa o fuso de Brasília', () => {
    // 01:30 UTC de 20/10 ainda é 19/10 em Brasília
    expect(hojeNaEscola(new Date('2026-10-20T01:30:00Z'))).toBe('2026-10-19')
  })
  it('dataValida', () => {
    expect(dataValida('2026-03-02')).toBe(true)
    expect(dataValida('2026-02-30')).toBe(false)
    expect(dataValida('02/03/2026')).toBe(false)
    expect(dataValida(5)).toBe(false)
  })
  it('diasComAulaAte: dias passados com aula da disciplina', () => {
    const cal = { ...CAL, inicio: '2026-03-02', fim: '2026-03-10' }
    expect(diasComAulaAte('2026-03-09', 't', cal, HOR, 'mat')).toEqual(['2026-03-02', '2026-03-07', '2026-03-09'])
    expect(diasComAulaAte('2026-03-03', 't', cal, HOR, 'por')).toEqual(['2026-03-02', '2026-03-03'])
  })
})

describe('aulasRestantes', () => {
  const cal = { ...CAL, inicio: '2026-03-02', fim: '2026-03-10' }
  it('POR_AULA conta tempos por disciplina depois da data', () => {
    // depois de 06/03: sáb 07 (segue segunda: mat 2, por 1), seg 09 (mat 2, por 1), ter 10 (por 1)
    const r = aulasRestantes('2026-03-06', 't', cal, HOR, 'POR_AULA')
    expect(r.porDisciplina.get('mat')).toBe(4)
    expect(r.porDisciplina.get('por')).toBe(3)
    expect(r.total).toBe(7)
  })
  it('POR_DIA conta dias com aula', () => {
    expect(aulasRestantes('2026-03-06', 't', cal, HOR, 'POR_DIA').total).toBe(3)
  })
  it('antes do início conta o período todo; depois do fim, zero', () => {
    expect(aulasRestantes('2026-01-01', 't', cal, HOR, 'POR_DIA').total).toBe(aulasRestantes('2026-03-01', 't', cal, HOR, 'POR_DIA').total)
    expect(aulasRestantes('2026-03-10', 't', cal, HOR, 'POR_AULA').total).toBe(0)
  })
})
