/**
 * Atividades criadas pelo professor (definicaoAtividades = PROFESSOR):
 * ações de criar/editar/remover, teto da etapa, lançamento de notas usando
 * as avaliações do professor, e isolamento entre escolas/professores.
 */
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { vincularCursosSemEsquema } from '@/lib/services/esquemas-padrao'

const sessao = vi.hoisted(() => ({ atual: null as any }))
vi.mock('@/lib/auth', () => ({ auth: vi.fn(async () => sessao.atual) }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn(), unstable_cache: (fn: any) => fn }))
vi.setConfig({ testTimeout: 60_000 })

const SUFIXO = `avp-${Date.now()}`
const A: Record<string, string> = {}
const B: Record<string, string> = {}

async function criarEscola(dest: Record<string, string>, letra: string) {
  const escola = await prisma.escola.create({ data: { nome: `Escola ${letra} ${SUFIXO}`, slug: `${SUFIXO}-${letra.toLowerCase()}`, status: 'ATIVA' } })
  dest.escola = escola.id
  dest.admin = (await prisma.user.create({ data: { escolaId: escola.id, username: `adm-${letra}`, email: `adm-${letra}@${SUFIXO}.t`, password: 'x', isSuperuser: true, isDirecao: true, isStaff: true, isApproved: true } })).id
  dest.prof = (await prisma.user.create({ data: { escolaId: escola.id, username: `prof-${letra}`, email: `prof-${letra}@${SUFIXO}.t`, password: 'x', isStaff: true, isApproved: true } })).id
  dest.outroProf = (await prisma.user.create({ data: { escolaId: escola.id, username: `prof2-${letra}`, email: `prof2-${letra}@${SUFIXO}.t`, password: 'x', isStaff: true, isApproved: true } })).id
  const curso = await prisma.curso.create({ data: { escolaId: escola.id, nome: `Curso ${letra}`, sigla: `C${letra}`, modalidade: 'EPI', turnos: ['MATUTINO'] } })
  await vincularCursosSemEsquema(prisma, escola.id)
  const esquema = await prisma.esquemaAvaliacao.create({
    data: {
      escolaId: escola.id, nome: 'Professor define', numUnidades: 2, definicaoAtividades: 'PROFESSOR',
      unidades: { create: [
        { ordem: 1, nome: 'U1', atividades: { create: [{ ordem: 1, nome: 'Total', notaMaxima: 10 }] } },
        { ordem: 2, nome: 'U2', atividades: { create: [{ ordem: 1, nome: 'Total', notaMaxima: 10 }] } },
      ] },
    },
    include: { unidades: { orderBy: { ordem: 'asc' } } },
  })
  dest.esquema = esquema.id
  dest.u1 = esquema.unidades[0].id
  dest.u2 = esquema.unidades[1].id
  dest.turma = (await prisma.turma.create({ data: { escolaId: escola.id, nome: `T${letra}`, cursoId: curso.id, anoLetivo: 2026, esquemaAvaliacaoId: esquema.id } })).id
  dest.turmaEscola = (await prisma.turma.create({ data: { escolaId: escola.id, nome: `TE${letra}`, cursoId: curso.id, anoLetivo: 2026 } })).id
  dest.disciplina = (await prisma.disciplina.create({ data: { nome: `Mat ${letra}`, turmaId: dest.turma, usuariosPermitidos: { connect: { id: dest.prof } } } })).id
  dest.discEscola = (await prisma.disciplina.create({ data: { nome: `Por ${letra}`, turmaId: dest.turmaEscola, usuariosPermitidos: { connect: { id: dest.prof } } } })).id
  dest.aluno = (await prisma.estudante.create({ data: { escolaId: escola.id, turmaId: dest.turma, matricula: `${SUFIXO}-${letra}-1`, nome: `Ana ${letra}` } })).id
  dest.matricula = `${SUFIXO}-${letra}-1`
}

const sessaoDe = (d: Record<string, string>, quem: 'admin' | 'prof' | 'outroProf', extra: Record<string, unknown> = {}) => ({
  user: { id: d[quem], escolaId: d.escola, isSuperuser: quem === 'admin', isDirecao: quem === 'admin', isStaff: true, isPortalUser: false, ...extra },
})
const acoes = () => import('@/app/dashboard/notas/avaliacoes/actions')
const avaliacoes = (d: Record<string, string>) => prisma.avaliacaoDisciplina.findMany({ where: { disciplinaId: d.disciplina }, orderBy: { ordem: 'asc' } })

async function chamar(caminho: string, metodo: 'GET' | 'POST' | 'PUT', params: Record<string, string>, body?: unknown) {
  const mod = await import(`@/app/api/${caminho}/route`)
  const req = new NextRequest('http://localhost/x', { method: metodo, ...(body ? { body: JSON.stringify(body), headers: { 'Content-Type': 'application/json' } } : {}) })
  const res = await mod[metodo](req, { params: Promise.resolve(params) })
  return { status: res.status, corpo: await res.json().catch(() => null) }
}

beforeAll(async () => {
  await criarEscola(A, 'A')
  await criarEscola(B, 'B')
  sessao.atual = sessaoDe(A, 'prof')
  const a = await acoes()
  await a.criarAvaliacao(A.disciplina, A.u1, { nome: 'Prova A', notaMaxima: 10 })
  A.avaliacao = (await avaliacoes(A))[0].id
}, 60_000)

afterAll(async () => {
  for (const escolaId of [A.escola, B.escola]) {
    if (!escolaId) continue
    await prisma.auditLog.deleteMany({ where: { user: { escolaId } } })
    await prisma.turma.deleteMany({ where: { escolaId } })
    await prisma.curso.deleteMany({ where: { escolaId } })
    await prisma.esquemaAvaliacao.deleteMany({ where: { escolaId } })
    await prisma.user.deleteMany({ where: { escolaId } })
    await prisma.escola.delete({ where: { id: escolaId } })
  }
  await prisma.$disconnect()
})

describe('avaliações do professor', () => {
  it('cria dentro do teto da etapa e recusa o que passa', async () => {
    sessao.atual = sessaoDe(B, 'prof')
    const a = await acoes()
    expect(await a.criarAvaliacao(B.disciplina, B.u1, { nome: 'Prova 1', notaMaxima: '6', data: '2026-03-10' })).toEqual({ ok: true })
    expect(await a.criarAvaliacao(B.disciplina, B.u1, { nome: 'Trabalho', notaMaxima: 4 })).toEqual({ ok: true })
    expect(await a.criarAvaliacao(B.disciplina, B.u1, { nome: 'Extra', notaMaxima: 1 })).toMatchObject({ erro: expect.stringMatching(/somam 11/) })
    const lista = await avaliacoes(B)
    expect(lista.map((x) => [x.nome, x.notaMaxima, x.ordem])).toEqual([['Prova 1', 6, 1], ['Trabalho', 4, 2]])
    expect(lista[0].criadoPorId).toBe(B.prof)
  })

  it('recusa etapa de outro esquema e esquema definido pela escola', async () => {
    const a = await acoes()
    expect(await a.criarAvaliacao(B.disciplina, A.u1, { nome: 'X', notaMaxima: 1 })).toHaveProperty('erro')
    expect(await a.criarAvaliacao(B.discEscola, B.u1, { nome: 'X', notaMaxima: 1 })).toHaveProperty('erro')
  })

  it('a tela de lançamento recebe as avaliações como atividades e o lançamento grava nelas', async () => {
    const r = await chamar('notas/turma/[turmaId]/disciplina/[disciplinaId]', 'GET', { turmaId: B.turma, disciplinaId: B.disciplina })
    expect(r.status).toBe(200)
    expect(r.corpo.esquema.definicaoAtividades).toBe('PROFESSOR')
    const u1 = r.corpo.esquema.unidades[0]
    expect(u1.atividades.map((x: any) => x.nome)).toEqual(['Prova 1', 'Trabalho'])
    expect(r.corpo.esquema.unidades[1].atividades).toEqual([])

    const [prova, trabalho] = u1.atividades
    const item = (valores: [string, number][]) => ({ estudanteId: B.matricula, disciplinaId: B.disciplina, unidades: [{ esquemaUnidadeId: B.u1, atividades: valores.map(([id, valor]) => ({ esquemaAtividadeId: id, valor })) }] })
    expect((await chamar('notas/lancar', 'POST', {}, { notas: [item([[prova.id, 7]])] })).status).toBe(400) // prova vale 6
    expect((await chamar('notas/lancar', 'POST', {}, { notas: [item([[prova.id, 5], [trabalho.id, 3.5]])] })).status).toBe(200)

    const nu = await prisma.notaUnidade.findFirstOrThrow({ where: { esquemaUnidadeId: B.u1, notaFinal: { estudanteId: B.aluno } }, include: { avaliacoes: true, atividades: true } })
    expect(nu.notaCalculada).toBe(8.5)
    expect(nu.avaliacoes.map((x) => x.valor).sort()).toEqual([3.5, 5])
    expect(nu.atividades).toEqual([])

    // relê o que foi lançado
    const de_novo = await chamar('notas/turma/[turmaId]/disciplina/[disciplinaId]', 'GET', { turmaId: B.turma, disciplinaId: B.disciplina })
    expect(de_novo.corpo.notas[0].unidades.find((u: any) => u.esquemaUnidadeId === B.u1).atividades).toHaveLength(2)

    // lançar de novo só o trabalho preserva a prova
    expect((await chamar('notas/lancar', 'POST', {}, { notas: [item([[trabalho.id, 4]])] })).status).toBe(200)
    expect((await prisma.notaUnidade.findUniqueOrThrow({ where: { id: nu.id } })).notaCalculada).toBe(9)
  })

  it('com notas lançadas: renomeia, mas não muda o valor nem remove', async () => {
    const a = await acoes()
    const [prova] = await avaliacoes(B)
    expect(await a.editarAvaliacao(prova.id, { nome: 'Prova bimestral', notaMaxima: 6, data: '2026-03-11' })).toEqual({ ok: true })
    expect(await a.editarAvaliacao(prova.id, { nome: 'Prova bimestral', notaMaxima: 5 })).toHaveProperty('erro')
    expect(await a.removerAvaliacao(prova.id)).toHaveProperty('erro')
    expect((await prisma.avaliacaoDisciplina.findUniqueOrThrow({ where: { id: prova.id } }))).toMatchObject({ nome: 'Prova bimestral', notaMaxima: 6 })
  })

  it('sem notas: edita o valor dentro do teto e remove', async () => {
    const a = await acoes()
    expect(await a.criarAvaliacao(B.disciplina, B.u2, { nome: 'Seminário', notaMaxima: 3 })).toEqual({ ok: true })
    const sem = (await avaliacoes(B)).find((x) => x.nome === 'Seminário')!
    expect(await a.editarAvaliacao(sem.id, { nome: 'Seminário', notaMaxima: 11 })).toHaveProperty('erro')
    expect(await a.editarAvaliacao(sem.id, { nome: 'Seminário', notaMaxima: 10 })).toEqual({ ok: true })
    expect(await a.removerAvaliacao(sem.id)).toEqual({ ok: true })
  })

  it('editar o esquema não apaga as avaliações dos professores', async () => {
    sessao.atual = sessaoDe(B, 'admin')
    const r = await chamar('esquemas-avaliacao/[id]', 'PUT', { id: B.esquema }, { nome: 'Novo', definicaoAtividades: 'PROFESSOR', unidades: [{ nome: 'U', atividades: [{ nome: 'T', notaMaxima: 10 }] }] })
    expect(r.status).toBe(409)
    expect(await prisma.avaliacaoDisciplina.count({ where: { disciplinaId: B.disciplina } })).toBe(2)
  })
})

describe('avaliações do professor - permissões e isolamento', () => {
  it('outro professor não cria, edita nem remove', async () => {
    sessao.atual = sessaoDe(B, 'outroProf')
    const a = await acoes()
    const [prova] = await avaliacoes(B)
    expect(await a.criarAvaliacao(B.disciplina, B.u2, { nome: 'X', notaMaxima: 1 })).toHaveProperty('erro')
    expect(await a.editarAvaliacao(prova.id, { nome: 'HACK', notaMaxima: 6 })).toHaveProperty('erro')
    expect(await a.removerAvaliacao(prova.id)).toHaveProperty('erro')
    expect((await chamar('notas/turma/[turmaId]/disciplina/[disciplinaId]', 'GET', { turmaId: B.turma, disciplinaId: B.disciplina })).status).toBe(404)
  })

  it('gestão de B não mexe na disciplina/avaliação de A', async () => {
    sessao.atual = sessaoDe(B, 'admin')
    const a = await acoes()
    expect(await a.criarAvaliacao(A.disciplina, A.u1, { nome: 'HACK', notaMaxima: 1 })).toHaveProperty('erro')
    expect(await a.editarAvaliacao(A.avaliacao, { nome: 'HACK', notaMaxima: 10 })).toHaveProperty('erro')
    expect(await a.removerAvaliacao(A.avaliacao)).toHaveProperty('erro')
    expect((await chamar('notas/turma/[turmaId]/disciplina/[disciplinaId]', 'GET', { turmaId: A.turma, disciplinaId: A.disciplina })).status).toBe(404)
    // disciplina de B com turma de A no caminho
    expect((await chamar('notas/turma/[turmaId]/disciplina/[disciplinaId]', 'GET', { turmaId: A.turma, disciplinaId: B.disciplina })).status).toBe(404)
    expect((await prisma.avaliacaoDisciplina.findUniqueOrThrow({ where: { id: A.avaliacao } })).nome).toBe('Prova A')
  })

  it('aluno do portal não lê as notas da turma', async () => {
    sessao.atual = sessaoDe(B, 'prof', { isStaff: false, isPortalUser: true })
    expect((await chamar('notas/turma/[turmaId]/disciplina/[disciplinaId]', 'GET', { turmaId: B.turma, disciplinaId: B.disciplina })).status).toBe(401)
    const a = await acoes()
    expect(await a.criarAvaliacao(B.disciplina, B.u2, { nome: 'X', notaMaxima: 1 })).toHaveProperty('erro')
  })
})
