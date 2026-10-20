import { describe, it, expect } from 'vitest'
import { calendarioDaDisciplina, contarEstados, mesesDoCalendario } from './calendario-disciplina'

// Março/2026: 1º é domingo. Mat na segunda (1º e 2º) e na quarta (3º); Por na terça.
const calendario = {
  inicio: '2026-03-02',
  fim: '2026-03-31',
  naoLetivos: [
    { data: '2026-03-09', turmaId: null, descricao: 'Feriado municipal' },
    { data: '2026-03-11', turmaId: 'outra', descricao: 'Recesso de outra turma' },
  ],
  extras: [{ data: '2026-03-14', seguirHorarioDe: 1, descricao: 'Sábado letivo' }],
}
const horario = [
  { diaSemana: 1, horario: 1, disciplinaId: 'mat' },
  { diaSemana: 1, horario: 2, disciplinaId: 'mat' },
  { diaSemana: 3, horario: 3, disciplinaId: 'mat' },
  { diaSemana: 2, horario: 1, disciplinaId: 'por' },
]
const aulas = [
  { data: '2026-03-02', situacao: 'REALIZADA' as const },
  { data: '2026-03-04', situacao: 'CANCELADA' as const },
  { data: '2026-03-16', situacao: 'PREVISTA' as const },
]
const dias = calendarioDaDisciplina({ calendario, turmaId: 't', disciplinaId: 'mat', horario, aulas, hoje: '2026-03-18' })
const dia = (d: string) => dias.find((x) => x.data === d)!

describe('calendário da disciplina', () => {
  it('um item por dia do período', () => {
    expect(dias).toHaveLength(30)
    expect(dias[0].data).toBe('2026-03-02')
  })

  it('chamada lançada, aula não dada e pendente (aula aberta e não salva conta como pendente)', () => {
    expect(dia('2026-03-02')).toMatchObject({ estado: 'feita', tempos: [1, 2] })
    expect(dia('2026-03-04')).toMatchObject({ estado: 'cancelada', tempos: [3] })
    expect(dia('2026-03-16').estado).toBe('pendente')
    expect(dia('2026-03-18').estado).toBe('pendente') // hoje
  })

  it('futura, sem aula e feriado (da escola; o da outra turma não vale)', () => {
    expect(dia('2026-03-23').estado).toBe('futura')
    expect(dia('2026-03-03').estado).toBe('sem-aula') // terça: só Português
    expect(dia('2026-03-07').estado).toBe('sem-aula') // sábado
    expect(dia('2026-03-09')).toMatchObject({ estado: 'nao-letivo', descricao: 'Feriado municipal' })
    expect(dia('2026-03-11').estado).toBe('pendente')
  })

  it('dia letivo extra segue o horário do dia indicado', () => {
    expect(dia('2026-03-14')).toMatchObject({ estado: 'pendente', extra: true, descricao: 'Sábado letivo', tempos: [1, 2] })
  })

  it('chamada diária: qualquer disciplina no horário conta', () => {
    const diaria = calendarioDaDisciplina({ calendario, turmaId: 't', disciplinaId: null, horario, aulas: [], hoje: '2026-03-18' })
    expect(diaria.find((x) => x.data === '2026-03-03')).toMatchObject({ estado: 'pendente', tempos: [1] })
    expect(diaria.find((x) => x.data === '2026-03-05')!.estado).toBe('sem-aula') // quinta sem horário
  })

  it('aula registrada vale mesmo em dia que deixou de ter a disciplina', () => {
    const r = calendarioDaDisciplina({ calendario, turmaId: 't', disciplinaId: 'mat', horario, aulas: [{ data: '2026-03-05', situacao: 'REALIZADA' }], hoje: '2026-03-18' })
    expect(r.find((x) => x.data === '2026-03-05')!.estado).toBe('feita')
  })

  it('conta os estados para a legenda', () => {
    expect(contarEstados(dias)).toMatchObject({ feita: 1, cancelada: 1, 'nao-letivo': 1, extra: 1 })
  })
})

describe('meses do calendário', () => {
  it('semanas de domingo a sábado, com o mês inteiro', () => {
    const [marco] = mesesDoCalendario(dias)
    expect(marco).toMatchObject({ chave: '2026-03', ano: 2026, mes: 3 })
    expect(marco.semanas[0][0]?.data).toBe('2026-03-01') // domingo, fora do período: sem aula
    expect(marco.semanas[0][0]?.estado).toBe('sem-aula')
    expect(marco.semanas.every((s) => s.length === 7)).toBe(true)
    expect(marco.semanas.flat().filter(Boolean)).toHaveLength(31)
  })
})
