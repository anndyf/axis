/**
 * Server actions da chamada - chamáveis direto pelo navegador, então cada
 * uma confere papel, escola e vínculo do professor com a disciplina. Mesmo
 * esquema de isolamento-escolas.test.ts: escola A x escola B.
 */
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import { prisma } from '@/lib/prisma'
import { vincularCursosSemEsquema } from '@/lib/services/esquemas-padrao'

const sessao = vi.hoisted(() => ({ atual: null as any }))
vi.mock('@/lib/auth', () => ({ auth: vi.fn(async () => sessao.atual) }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn(), unstable_cache: (fn: any) => fn }))
vi.setConfig({ testTimeout: 60_000 })

const SUFIXO = `cham-${Date.now()}`
const A: Record<string, string> = {}
const B: Record<string, string> = {}
const SEGUNDA = '2026-03-02'

async function criarEscola(dest: Record<string, string>, letra: string) {
  const escola = await prisma.escola.create({ data: { nome: `Escola ${letra} ${SUFIXO}`, slug: `${SUFIXO}-${letra.toLowerCase()}`, status: 'ATIVA' } })
  dest.escola = escola.id
  dest.admin = (await prisma.user.create({ data: { escolaId: escola.id, username: `adm-${letra}`, email: `adm-${letra}@${SUFIXO}.t`, password: 'x', isSuperuser: true, isDirecao: true, isStaff: true, isApproved: true } })).id
  dest.prof = (await prisma.user.create({ data: { escolaId: escola.id, username: `prof-${letra}`, email: `prof-${letra}@${SUFIXO}.t`, password: 'x', isStaff: true, isApproved: true } })).id
  dest.outroProf = (await prisma.user.create({ data: { escolaId: escola.id, username: `prof2-${letra}`, email: `prof2-${letra}@${SUFIXO}.t`, password: 'x', isStaff: true, isApproved: true } })).id
  const curso = await prisma.curso.create({ data: { escolaId: escola.id, nome: `Curso ${letra}`, sigla: `C${letra}`, modalidade: 'EPI', turnos: ['MATUTINO'] } })
  await vincularCursosSemEsquema(prisma, escola.id)
  await prisma.periodoLetivo.create({ data: { escolaId: escola.id, anoLetivo: 2026, inicio: new Date('2026-02-02'), fim: new Date('2026-12-18') } })
  await prisma.diaNaoLetivo.create({ data: { escolaId: escola.id, data: new Date('2026-04-21'), tipo: 'FERIADO', descricao: 'Tiradentes' } })
  dest.turma = (await prisma.turma.create({ data: { escolaId: escola.id, nome: `T${letra}`, cursoId: curso.id, turno: 'Matutino', anoLetivo: 2026 } })).id
  dest.disciplina = (await prisma.disciplina.create({ data: { nome: `Mat ${letra}`, turmaId: dest.turma, usuariosPermitidos: { connect: { id: dest.prof } } } })).id
  dest.outraDisciplina = (await prisma.disciplina.create({ data: { nome: `Por ${letra}`, turmaId: dest.turma, usuariosPermitidos: { connect: { id: dest.outroProf } } } })).id
  // Segunda: Mat no 1º e 2º tempos, Por no 3º. Terça (21/04 feriado): Mat no 1º.
  await prisma.horarioAula.createMany({ data: [
    { turmaId: dest.turma, diaSemana: 1, horario: 1, disciplina: 'Mat', disciplinaId: dest.disciplina },
    { turmaId: dest.turma, diaSemana: 1, horario: 2, disciplina: 'Mat', disciplinaId: dest.disciplina },
    { turmaId: dest.turma, diaSemana: 1, horario: 3, disciplina: 'Por', disciplinaId: dest.outraDisciplina },
    { turmaId: dest.turma, diaSemana: 2, horario: 1, disciplina: 'Mat', disciplinaId: dest.disciplina },
  ] })
  dest.aluno1 = (await prisma.estudante.create({ data: { escolaId: escola.id, turmaId: dest.turma, matricula: `${SUFIXO}-${letra}-1`, nome: `Ana ${letra}` } })).id
  dest.aluno2 = (await prisma.estudante.create({ data: { escolaId: escola.id, turmaId: dest.turma, matricula: `${SUFIXO}-${letra}-2`, nome: `Bia ${letra}` } })).id
}

const sessaoDe = (d: Record<string, string>, quem: 'admin' | 'prof' | 'outroProf', extra: Record<string, unknown> = {}) => ({
  user: { id: d[quem], escolaId: d.escola, isSuperuser: quem === 'admin', isDirecao: quem === 'admin', isStaff: true, isPortalUser: false, ...extra },
})
const acoes = () => import('@/app/dashboard/chamada/actions')

beforeAll(async () => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date('2026-10-19T15:00:00Z'))
  await criarEscola(A, 'A')
  await criarEscola(B, 'B')
  // Aula realizada em A, para tentativas de B
  const aulaA = await prisma.aula.create({ data: { escolaId: A.escola, turmaId: A.turma, disciplinaId: A.disciplina, data: new Date('2026-03-09'), tempos: [1, 2], quantidade: 2, situacao: 'REALIZADA', chave: `${A.turma}|2026-03-09|${A.disciplina}`, conteudo: 'segredo A' } })
  A.aula = aulaA.id
  await prisma.falta.create({ data: { aulaId: aulaA.id, estudanteId: A.aluno1, quantidade: 2 } })
}, 60_000)

afterAll(async () => {
  vi.useRealTimers()
  for (const escolaId of [A.escola, B.escola]) {
    if (!escolaId) continue
    await prisma.aula.deleteMany({ where: { escolaId } })
    await prisma.justificativa.deleteMany({ where: { escolaId } })
    await prisma.periodoLetivo.deleteMany({ where: { escolaId } })
    await prisma.diaNaoLetivo.deleteMany({ where: { escolaId } })
    await prisma.turma.deleteMany({ where: { escolaId } })
    await prisma.curso.deleteMany({ where: { escolaId } })
    await prisma.esquemaAvaliacao.deleteMany({ where: { escolaId } })
    await prisma.user.deleteMany({ where: { escolaId } })
    await prisma.escola.delete({ where: { id: escolaId } })
  }
  await prisma.$disconnect()
})

describe('chamada - fluxo do professor', () => {
  it('abre a aula do dia pelo horário (2 tempos) e salva só as faltas', async () => {
    sessao.atual = sessaoDe(B, 'prof')
    const a = await acoes()
    const aberta = await a.abrirChamada(B.turma, B.disciplina, SEGUNDA)
    if ('erro' in aberta) throw new Error(aberta.erro)
    expect(aberta.aula).toMatchObject({ quantidade: 2, tempos: [1, 2], situacao: 'PREVISTA' })
    expect(aberta.alunos.map((x) => x.nome)).toEqual(['Ana B', 'Bia B'])
    expect(JSON.stringify(aberta)).not.toContain('password')

    // reabrir não duplica
    const de_novo = await a.abrirChamada(B.turma, B.disciplina, SEGUNDA)
    expect('erro' in de_novo ? null : de_novo.aula.id).toBe(aberta.aula.id)

    expect(await a.salvarChamada(aberta.aula.id, [{ estudanteId: B.aluno1, quantidade: 1 }], 'Equações')).toEqual({ ok: true })
    const aula = await prisma.aula.findUniqueOrThrow({ where: { id: aberta.aula.id }, include: { faltas: true } })
    expect(aula.situacao).toBe('REALIZADA')
    expect(aula.conteudo).toBe('Equações')
    expect(aula.faltas).toEqual([expect.objectContaining({ estudanteId: B.aluno1, quantidade: 1 })])

    // corrigir: tira a falta
    expect(await a.salvarChamada(aberta.aula.id, [], 'Equações')).toEqual({ ok: true })
    expect(await prisma.falta.count({ where: { aulaId: aberta.aula.id } })).toBe(0)
  })

  it('recusa feriado, dia sem aula da disciplina e data futura', async () => {
    const a = await acoes()
    expect(await a.abrirChamada(B.turma, B.disciplina, '2026-04-21')).toHaveProperty('erro')
    expect(await a.abrirChamada(B.turma, B.disciplina, '2026-03-04')).toHaveProperty('erro') // quarta
    expect(await a.abrirChamada(B.turma, B.disciplina, '2026-10-26')).toHaveProperty('erro')
    expect(await prisma.aula.count({ where: { turmaId: B.turma } })).toBe(1)
  })

  it('recusa falta acima dos tempos da aula e aluno de outra turma/escola', async () => {
    const a = await acoes()
    const aula = await prisma.aula.findFirstOrThrow({ where: { turmaId: B.turma } })
    expect(await a.salvarChamada(aula.id, [{ estudanteId: B.aluno1, quantidade: 3 }], '')).toHaveProperty('erro')
    expect(await a.salvarChamada(aula.id, [{ estudanteId: A.aluno1, quantidade: 1 }], '')).toHaveProperty('erro')
    expect(await prisma.falta.count({ where: { estudanteId: A.aluno1 } })).toBe(1)
  })

  it('professor não abre nem salva a chamada de disciplina que não é dele', async () => {
    const a = await acoes()
    expect(await a.abrirChamada(B.turma, B.outraDisciplina, SEGUNDA)).toHaveProperty('erro')
    sessao.atual = sessaoDe(B, 'outroProf')
    const aula = await prisma.aula.findFirstOrThrow({ where: { turmaId: B.turma, disciplinaId: B.disciplina } })
    expect(await a.salvarChamada(aula.id, [{ estudanteId: B.aluno2, quantidade: 1 }], 'x')).toHaveProperty('erro')
    expect(await a.cancelarAula(aula.id, 'x')).toHaveProperty('erro')
    expect(await prisma.falta.count({ where: { aulaId: aula.id } })).toBe(0)
  })

  it('aula não dada deixa de contar', async () => {
    sessao.atual = sessaoDe(B, 'prof')
    const a = await acoes()
    const aula = await prisma.aula.findFirstOrThrow({ where: { turmaId: B.turma, disciplinaId: B.disciplina } })
    expect(await a.cancelarAula(aula.id, 'Passeio')).toEqual({ ok: true })
    expect((await prisma.aula.findUniqueOrThrow({ where: { id: aula.id } })).situacao).toBe('CANCELADA')
  })

  it('chamada diária (POR_DIA) não tem disciplina', async () => {
    sessao.atual = sessaoDe(B, 'admin')
    const turma = await prisma.turma.findUniqueOrThrow({ where: { id: B.turma }, select: { cursoId: true } })
    const curso = await prisma.curso.findUniqueOrThrow({ where: { id: turma.cursoId! } })
    await prisma.esquemaAvaliacao.update({ where: { id: curso.esquemaAvaliacaoId! }, data: { registroFrequencia: 'POR_DIA' } })
    const a = await acoes()
    const aberta = await a.abrirChamada(B.turma, B.outraDisciplina, '2026-03-03')
    if ('erro' in aberta) throw new Error(aberta.erro)
    expect(aberta.disciplina).toBeNull()
    expect(aberta.aula.quantidade).toBe(1)
    await prisma.esquemaAvaliacao.update({ where: { id: curso.esquemaAvaliacaoId! }, data: { registroFrequencia: 'POR_AULA' } })
  })
})

describe('chamada - isolamento entre escolas', () => {
  it('gestão de B não abre, salva nem cancela aula de A', async () => {
    sessao.atual = sessaoDe(B, 'admin')
    const a = await acoes()
    expect(await a.abrirChamada(A.turma, A.disciplina, SEGUNDA)).toHaveProperty('erro')
    expect(await a.salvarChamada(A.aula, [], 'HACK')).toHaveProperty('erro')
    expect(await a.cancelarAula(A.aula, 'HACK')).toHaveProperty('erro')
    expect(await a.abrirChamada(B.turma, A.disciplina, SEGUNDA)).toHaveProperty('erro')
    const aula = await prisma.aula.findUniqueOrThrow({ where: { id: A.aula }, include: { faltas: true } })
    expect(aula).toMatchObject({ situacao: 'REALIZADA', conteudo: 'segredo A' })
    expect(aula.faltas).toHaveLength(1)
    expect(await prisma.aula.count({ where: { turmaId: A.turma } })).toBe(1)
  })

  it('aluno do portal não usa a chamada', async () => {
    sessao.atual = sessaoDe(B, 'prof', { isStaff: false, isPortalUser: true })
    const a = await acoes()
    expect(await a.abrirChamada(B.turma, B.disciplina, SEGUNDA)).toEqual({ erro: 'Não autorizado' })
  })
})
