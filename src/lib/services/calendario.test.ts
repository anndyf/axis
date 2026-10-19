import { describe, it, expect } from 'vitest'
import { diasLetivos, diasNoIntervalo, aulasPrevistasPorDisciplina, normalizarTurno, chaveData } from './calendario'

// Março/2026: dia 1 é domingo. Semanas úteis: 2-6, 9-13, 16-20, 23-27, 30-31.
const marco = { inicio: '2026-03-01', fim: '2026-03-31', naoLetivos: [], extras: [] }

describe('diasLetivos', () => {
  it('conta só segunda a sexta', () => {
    const dias = diasLetivos(marco)
    expect(dias).toHaveLength(22)
    expect(dias[0]).toEqual({ data: '2026-03-02', diaSemana: 1 })
    expect(dias.at(-1)).toEqual({ data: '2026-03-31', diaSemana: 2 })
  })

  it('tira feriado da escola e recesso só de uma turma', () => {
    const cal = {
      ...marco,
      naoLetivos: [
        { data: '2026-03-02', turmaId: null }, // escola toda
        { data: '2026-03-03', turmaId: 'turma-x' }, // só a turma X
      ],
    }
    expect(diasLetivos(cal, 'turma-x')).toHaveLength(20)
    expect(diasLetivos(cal, 'turma-y')).toHaveLength(21)
  })

  it('sábado letivo segue o horário do dia indicado', () => {
    const cal = { ...marco, extras: [{ data: '2026-03-07', seguirHorarioDe: 4 }] }
    const dias = diasLetivos(cal)
    expect(dias).toHaveLength(23)
    expect(dias.find((d) => d.data === '2026-03-07')).toEqual({ data: '2026-03-07', diaSemana: 4 })
  })

  it('feriado prevalece sobre dia extra na mesma data', () => {
    const cal = { ...marco, naoLetivos: [{ data: '2026-03-07' }], extras: [{ data: '2026-03-07', seguirHorarioDe: 1 }] }
    expect(diasLetivos(cal).some((d) => d.data === '2026-03-07')).toBe(false)
  })

  it('aceita Date (coluna @db.Date chega como meia-noite UTC)', () => {
    const cal = { inicio: new Date('2026-03-02T00:00:00Z'), fim: new Date('2026-03-06T00:00:00Z'), naoLetivos: [], extras: [] }
    expect(diasLetivos(cal)).toHaveLength(5)
  })
})

describe('aulasPrevistasPorDisciplina', () => {
  const horario = [
    { diaSemana: 1, disciplinaId: 'mat' },
    { diaSemana: 1, disciplinaId: 'mat' }, // 2 tempos na segunda
    { diaSemana: 3, disciplinaId: 'mat' },
    { diaSemana: 2, disciplinaId: 'por' },
    { diaSemana: 5, disciplinaId: null }, // tempo sem vínculo: ignorado
  ]

  it('multiplica os tempos semanais pelos dias letivos', () => {
    const previstas = aulasPrevistasPorDisciplina(horario, diasLetivos(marco))
    // segundas de março: 2, 9, 16, 23, 30 (5) × 2 + quartas: 4, 11, 18, 25 (4) × 1
    expect(previstas.get('mat')).toBe(14)
    // terças: 3, 10, 17, 24, 31
    expect(previstas.get('por')).toBe(5)
    expect(previstas.has('null')).toBe(false)
  })

  it('recorta por etapa com diasNoIntervalo', () => {
    const primeiraQuinzena = diasNoIntervalo(diasLetivos(marco), '2026-03-01', '2026-03-15')
    expect(aulasPrevistasPorDisciplina(horario, primeiraQuinzena).get('mat')).toBe(6) // seg 2 e 9 (×2) + qua 4 e 11
  })
})

describe('utilitários', () => {
  it('normalizarTurno', () => {
    expect(normalizarTurno('Matutino')).toBe('MATUTINO')
    expect(normalizarTurno(' noturno ')).toBe('NOTURNO')
    expect(normalizarTurno(null)).toBe('')
  })
  it('chaveData', () => {
    expect(chaveData('2026-03-02T15:00:00Z')).toBe('2026-03-02')
    expect(chaveData(new Date('2026-03-02T00:00:00Z'))).toBe('2026-03-02')
  })
})
