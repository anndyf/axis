import { describe, it, expect } from 'vitest'
import { cartoesDoProfessor, destaqueDoDia, horaNaEscola, rotuloTempos, turmasDosCartoes } from './inicio-professor'

const TEMPOS = [
  { ordem: 1, inicio: '07:00', fim: '07:50' },
  { ordem: 2, inicio: '07:50', fim: '08:40' },
  { ordem: 3, inicio: '09:00', fim: '09:50' },
  { ordem: 6, inicio: '11:30', fim: '12:20' },
]
const aula = (id: string, tempos: number[], feita = false) => ({ id, turmaId: 't', disciplinaId: id, tempos, feita })

describe('destaque do dia', () => {
  const aulas = [aula('bio', [1, 6]), aula('fis', [2], true), aula('geo', [3])]
  const turno = () => TEMPOS

  it('aula acontecendo agora', () => {
    expect(destaqueDoDia(aulas, turno, '07:10')).toMatchObject({ tipo: 'agora', aula: { id: 'bio' }, inicio: '07:00', fim: '07:50' })
    expect(destaqueDoDia(aulas, turno, '07:50')).toMatchObject({ tipo: 'agora', aula: { id: 'fis' } })
    // tempos não contíguos: a mesma aula volta no 6º
    expect(destaqueDoDia(aulas, turno, '12:00')).toMatchObject({ tipo: 'agora', aula: { id: 'bio' }, inicio: '11:30' })
  })

  it('senão, a próxima de hoje', () => {
    expect(destaqueDoDia(aulas, turno, '06:30')).toMatchObject({ tipo: 'proxima', aula: { id: 'bio' }, inicio: '07:00' })
    expect(destaqueDoDia(aulas, turno, '08:45')).toMatchObject({ tipo: 'proxima', aula: { id: 'geo' }, inicio: '09:00' })
  })

  it('depois da última aula: a primeira ainda sem chamada; tudo feito, nada', () => {
    expect(destaqueDoDia(aulas, turno, '13:00')).toMatchObject({ tipo: 'pendente', aula: { id: 'bio' } })
    expect(destaqueDoDia([aula('a', [1], true)], turno, '13:00')).toBeNull()
    expect(destaqueDoDia([], turno, '10:00')).toBeNull()
  })

  it('sem horário cadastrado para o turno, cai na pendente', () => {
    expect(destaqueDoDia([aula('x', [1])], () => [], '07:10')).toMatchObject({ tipo: 'pendente' })
  })

  it('hora no fuso da escola', () => {
    expect(horaNaEscola(new Date('2026-10-19T10:05:00Z'))).toBe('07:05')
  })
})

describe('rótulo dos tempos', () => {
  it('estilo SIGEduc', () => {
    expect(rotuloTempos([2])).toBe('2º tempo')
    expect(rotuloTempos([1, 6])).toBe('1º e 6º tempos')
    expect(rotuloTempos([1, 2, 3])).toBe('1º, 2º e 3º tempos')
    expect(rotuloTempos([])).toBe('Chamada do dia')
  })
})

describe('cartões turma × disciplina', () => {
  const disciplinas = [
    { id: 'rob-b', nome: 'Robótica', turmaId: 'tb', turmaNome: '3SB', alunos: 30, semNota: 0 },
    { id: 'rob-a', nome: 'Robótica', turmaId: 'ta', turmaNome: '3SA', alunos: 28, semNota: 4 },
    { id: 'mat-a', nome: 'Matemática', turmaId: 'ta', turmaNome: '3SA', alunos: 28, semNota: 0 },
    { id: 'his-d', nome: 'História', turmaId: 'td', turmaNome: '1D', alunos: 20, semNota: 1 },
  ]
  const pendencias = [
    { disciplinaId: 'rob-a', turmaId: 'ta', chamadasPendentes: 3, ultimaPendente: '2026-10-14' },
    { disciplinaId: 'mat-a', turmaId: 'ta', chamadasPendentes: 0, ultimaPendente: null },
    { disciplinaId: null, turmaId: 'td', chamadasPendentes: 2, ultimaPendente: '2026-10-16' },
  ]
  const cartoes = cartoesDoProfessor({ disciplinas, pendencias, turmasChamadaDiaria: new Set(['td']), aulasHoje: new Set(['tb|rob-b']), hoje: '2026-10-19' })
  const por = (id: string) => cartoes.find((c) => c.disciplinaId === id)!

  it('ordena por turma e disciplina', () => {
    expect(cartoes.map((c) => `${c.turmaNome} ${c.nome}`)).toEqual(['1D História', '3SA Matemática', '3SA Robótica', '3SB Robótica'])
  })

  it('chamada abre hoje, senão o último dia pendente, senão o diário', () => {
    expect(por('rob-b').links.chamada).toBe('/dashboard/chamada/fazer?turma=tb&disciplina=rob-b&data=2026-10-19')
    expect(por('rob-a').links.chamada).toBe('/dashboard/chamada/fazer?turma=ta&disciplina=rob-a&data=2026-10-14')
    expect(por('mat-a').links.chamada).toBe('/dashboard/chamada/diario?turma=ta&disciplina=mat-a')
    expect(por('rob-a')).toMatchObject({ chamadasPendentes: 3, semNota: 4, temAulaHoje: false })
    expect(por('rob-a').links.notas).toBe('/dashboard/notas/lancar/ta?disciplina=rob-a')
  })

  it('chamada de hoje já feita: abre o último dia pendente', () => {
    const c = cartoesDoProfessor({ disciplinas, pendencias, turmasChamadaDiaria: new Set(), aulasHoje: new Set(['ta|rob-a', 'ta|mat-a']), feitasHoje: new Set(['ta|rob-a', 'ta|mat-a']), hoje: '2026-10-19' })
    expect(c.find((x) => x.disciplinaId === 'rob-a')!.links.chamada).toContain('data=2026-10-14')
    expect(c.find((x) => x.disciplinaId === 'mat-a')!.links.chamada).toContain('data=2026-10-19')
  })

  it('chamada diária: chamada, diário e pendências da turma, sem disciplina', () => {
    expect(por('his-d')).toMatchObject({ chamadaDiaria: true, chamadasPendentes: 2 })
    expect(por('his-d').links.chamada).toBe('/dashboard/chamada/fazer?turma=td&data=2026-10-16')
    expect(por('his-d').links.diario).toBe('/dashboard/chamada/diario?turma=td')
  })

  it('fichas de turma sem repetir', () => {
    expect(turmasDosCartoes(cartoes)).toEqual([{ id: 'td', nome: '1D' }, { id: 'ta', nome: '3SA' }, { id: 'tb', nome: '3SB' }])
  })
})
