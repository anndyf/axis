import { describe, it, expect } from 'vitest'
import { analyzeRisk, analyzeAttendanceRisk } from './risk-analysis'

describe('analyzeRisk (notas)', () => {
  it('sem notas = sem dados; meta atingida = aprovado', () => {
    expect(analyzeRisk([null, null, null]).level).toBe('NONE')
    expect(analyzeRisk([5, 5, 5]).level).toBe('LOW')
    expect(analyzeRisk([1, 1, 1]).level).toBe('CRITICAL')
  })
})

describe('analyzeAttendanceRisk', () => {
  it('sem chamada', () => {
    expect(analyzeAttendanceRisk({ percentual: null, minimo: 75 }).level).toBe('NONE')
  })
  it('não alcança mais o mínimo = crítico', () => {
    expect(analyzeAttendanceRisk({ percentual: 60, minimo: 75, maximaPossivel: 70, faltasRestantesPermitidas: -5 }).level).toBe('CRITICAL')
  })
  it('abaixo do mínimo mas ainda recuperável = alto', () => {
    const r = analyzeAttendanceRisk({ percentual: 70, minimo: 75, maximaPossivel: 85, faltasRestantesPermitidas: 4 })
    expect(r.level).toBe('HIGH')
    expect(r.pointsNeeded).toBe(4)
  })
  it('perto do mínimo ou com poucas faltas sobrando = atenção', () => {
    expect(analyzeAttendanceRisk({ percentual: 80, minimo: 75 }).level).toBe('MEDIUM')
    const r = analyzeAttendanceRisk({ percentual: 95, minimo: 75, maximaPossivel: 97, faltasRestantesPermitidas: 2 })
    expect(r.level).toBe('MEDIUM')
    expect(r.message).toBe('Atenção (pode faltar mais 2 aulas)')
  })
  it('sem nenhuma falta não entra em atenção só por restarem poucas aulas', () => {
    expect(analyzeAttendanceRisk({ percentual: 100, minimo: 75, maximaPossivel: 100, faltasRestantesPermitidas: 1 }).level).toBe('LOW')
  })
  it('regular', () => {
    expect(analyzeAttendanceRisk({ percentual: 95, minimo: 75, maximaPossivel: 98, faltasRestantesPermitidas: 20 }).level).toBe('LOW')
  })
})
