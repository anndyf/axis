/**
 * api/notas/lancar é atômico: um item inválido no lote não salva nada.
 * Também confere papel (aluno do portal não lança) e professor só lança
 * na própria disciplina. Banco de teste, sessão falsa.
 */
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { vincularCursosSemEsquema } from '@/lib/services/esquemas-padrao'

const sessao = vi.hoisted(() => ({ atual: null as any }))
vi.mock('@/lib/auth', () => ({ auth: vi.fn(async () => sessao.atual) }))
vi.setConfig({ testTimeout: 60_000 })

const SUFIXO = `lanc-${Date.now()}`
const D: Record<string, any> = {}

beforeAll(async () => {
  const escola = await prisma.escola.create({ data: { nome: `Escola ${SUFIXO}`, slug: SUFIXO, status: 'ATIVA' } })
  D.escola = escola.id
  D.admin = (await prisma.user.create({ data: { escolaId: escola.id, username: 'adm', email: `adm@${SUFIXO}.t`, password: 'x', isSuperuser: true, isDirecao: true, isStaff: true, isApproved: true } })).id
  D.prof = (await prisma.user.create({ data: { escolaId: escola.id, username: 'prof', email: `prof@${SUFIXO}.t`, password: 'x', isStaff: true, isApproved: true } })).id
  D.outroProf = (await prisma.user.create({ data: { escolaId: escola.id, username: 'prof2', email: `prof2@${SUFIXO}.t`, password: 'x', isStaff: true, isApproved: true } })).id
  const curso = await prisma.curso.create({ data: { escolaId: escola.id, nome: 'Curso', sigla: 'C', modalidade: 'EPI', turnos: ['MATUTINO'] } })
  await vincularCursosSemEsquema(prisma, escola.id)
  const esquema = await prisma.esquemaAvaliacao.findFirstOrThrow({
    where: { escolaId: escola.id, numUnidades: 3 },
    include: { unidades: { orderBy: { ordem: 'asc' }, include: { atividades: { orderBy: { ordem: 'asc' } } } } },
  })
  D.unidade = esquema.unidades[0]
  D.turma = (await prisma.turma.create({ data: { escolaId: escola.id, nome: 'T', cursoId: curso.id, anoLetivo: 2026 } })).id
  D.outraTurma = (await prisma.turma.create({ data: { escolaId: escola.id, nome: 'T2', cursoId: curso.id, anoLetivo: 2026 } })).id
  D.disciplina = (await prisma.disciplina.create({ data: { nome: 'Mat', turmaId: D.turma, usuariosPermitidos: { connect: { id: D.prof } } } })).id
  for (const [i, turmaId] of [D.turma, D.turma, D.outraTurma].entries()) {
    await prisma.estudante.create({ data: { escolaId: escola.id, turmaId, matricula: `${SUFIXO}-${i}`, nome: `Aluno ${i}` } })
  }
})

afterAll(async () => {
  await prisma.auditLog.deleteMany({ where: { user: { escolaId: D.escola } } })
  await prisma.turma.deleteMany({ where: { escolaId: D.escola } })
  await prisma.curso.deleteMany({ where: { escolaId: D.escola } })
  await prisma.esquemaAvaliacao.deleteMany({ where: { escolaId: D.escola } })
  await prisma.user.deleteMany({ where: { escolaId: D.escola } })
  await prisma.escola.delete({ where: { id: D.escola } })
  await prisma.$disconnect()
})

const usuario = (id: string, gestao: boolean, extra: Record<string, unknown> = {}) => ({
  user: { id, escolaId: D.escola, isSuperuser: gestao, isDirecao: gestao, isStaff: true, isPortalUser: false, ...extra },
})

function item(matricula: string, valor: number) {
  const ativ = D.unidade.atividades[0]
  return { estudanteId: matricula, disciplinaId: D.disciplina, unidades: [{ esquemaUnidadeId: D.unidade.id, atividades: [{ esquemaAtividadeId: ativ.id, valor }] }] }
}

async function lancar(notas: unknown[]) {
  const { POST } = await import('@/app/api/notas/lancar/route')
  const res = await POST(new NextRequest('http://localhost/api/notas/lancar', { method: 'POST', body: JSON.stringify({ notas }), headers: { 'Content-Type': 'application/json' } }))
  return { status: res.status, corpo: await res.json() }
}

const contarNotas = () => prisma.notaFinal.count({ where: { disciplinaId: D.disciplina } })

describe('api/notas/lancar', () => {
  it('lote com 1 nota inválida no meio não salva nada', async () => {
    // Quem lança é o professor da disciplina (gestão só visualiza)
    sessao.atual = usuario(D.prof, false)
    const max = D.unidade.atividades[0].notaMaxima
    const r = await lancar([item(`${SUFIXO}-0`, 1), item(`${SUFIXO}-1`, max + 1)])
    expect(r.status).toBe(400)
    expect(await contarNotas()).toBe(0)
  })

  it('aluno de outra turma no lote recusa o lote inteiro', async () => {
    const r = await lancar([item(`${SUFIXO}-0`, 1), item(`${SUFIXO}-2`, 1)])
    expect(r.status).toBe(400)
    expect(await contarNotas()).toBe(0)
  })

  it('disciplinas misturadas no lote são recusadas', async () => {
    const r = await lancar([item(`${SUFIXO}-0`, 1), { ...item(`${SUFIXO}-1`, 1), disciplinaId: 'outra' }])
    expect(r.status).toBe(400)
    expect(await contarNotas()).toBe(0)
  })

  it('lote válido salva todos', async () => {
    const r = await lancar([item(`${SUFIXO}-0`, 1), item(`${SUFIXO}-1`, 2)])
    expect(r.status).toBe(200)
    expect(r.corpo.count).toBe(2)
    expect(await contarNotas()).toBe(2)
    expect(await prisma.notaUnidade.count({ where: { notaFinal: { disciplinaId: D.disciplina } } })).toBeGreaterThanOrEqual(2)
  })

  it('professor da disciplina lança; outro professor não', async () => {
    sessao.atual = usuario(D.prof, false)
    expect((await lancar([item(`${SUFIXO}-0`, 3)])).status).toBe(200)
    sessao.atual = usuario(D.outroProf, false)
    expect((await lancar([item(`${SUFIXO}-0`, 0)])).status).toBe(403)
  })

  it('direção/administrador não lança em disciplina que não leciona (só visualiza)', async () => {
    sessao.atual = usuario(D.admin, true)
    const r = await lancar([item(`${SUFIXO}-0`, 0)])
    expect(r.status).toBe(403)
    const nota = await prisma.notaFinal.findFirst({ where: { disciplinaId: D.disciplina, estudante: { matricula: `${SUFIXO}-0` } }, include: { unidades: true } })
    expect(nota?.unidades.find((u) => u.esquemaUnidadeId === D.unidade.id)?.notaCalculada).toBe(3)
  })

  it('direção que também leciona a disciplina lança nela', async () => {
    await prisma.disciplina.update({ where: { id: D.disciplina }, data: { usuariosPermitidos: { connect: { id: D.admin } } } })
    sessao.atual = usuario(D.admin, true)
    expect((await lancar([item(`${SUFIXO}-0`, 3)])).status).toBe(200)
    await prisma.disciplina.update({ where: { id: D.disciplina }, data: { usuariosPermitidos: { disconnect: { id: D.admin } } } })
  })

  it('aluno do portal não lança', async () => {
    sessao.atual = usuario(D.prof, false, { isStaff: false, isPortalUser: true })
    expect((await lancar([item(`${SUFIXO}-0`, 0)])).status).toBe(401)
    const nota = await prisma.notaFinal.findFirst({ where: { disciplinaId: D.disciplina, estudante: { matricula: `${SUFIXO}-0` } }, include: { unidades: true } })
    expect(nota?.unidades.find((u) => u.esquemaUnidadeId === D.unidade.id)?.notaCalculada).toBe(3)
  })

  it('recuperação final: só o professor da disciplina grava (gestão e outro professor não)', async () => {
    const { POST } = await import('@/app/api/notas/recuperacao/route')
    const nota = await prisma.notaFinal.findFirstOrThrow({ where: { disciplinaId: D.disciplina, estudante: { matricula: `${SUFIXO}-0` } } })
    const gravar = async (valor: number) => (await POST(new NextRequest('http://localhost/api/notas/recuperacao', { method: 'POST', body: JSON.stringify({ notas: [{ notaId: nota.id, notaRecuperacao: valor }] }), headers: { 'Content-Type': 'application/json' } }))).status
    for (const [quem, gestao] of [[D.outroProf, false], [D.admin, true]] as const) {
      sessao.atual = usuario(quem, gestao)
      expect(await gravar(9)).not.toBe(200)
      expect((await prisma.notaFinal.findUniqueOrThrow({ where: { id: nota.id } })).notaRecuperacao).toBe(nota.notaRecuperacao)
    }
    sessao.atual = usuario(D.prof, false)
    expect(await gravar(7)).toBe(200)
    expect((await prisma.notaFinal.findUniqueOrThrow({ where: { id: nota.id } })).notaRecuperacao).toBe(7)
  })
})
