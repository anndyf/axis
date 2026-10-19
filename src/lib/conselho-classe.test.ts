/**
 * api/conselho-classe: nota de recuperação validada na escala do esquema da
 * turma (notaMaxima), não contra 10 fixo; lote atômico.
 */
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { vincularCursosSemEsquema } from '@/lib/services/esquemas-padrao'

const sessao = vi.hoisted(() => ({ atual: null as any }))
vi.mock('@/lib/auth', () => ({ auth: vi.fn(async () => sessao.atual) }))
vi.setConfig({ testTimeout: 60_000 })

const SUFIXO = `cons-${Date.now()}`
const D: Record<string, string> = {}

beforeAll(async () => {
  const escola = await prisma.escola.create({ data: { nome: `Escola ${SUFIXO}`, slug: SUFIXO, status: 'ATIVA' } })
  D.escola = escola.id
  D.admin = (await prisma.user.create({ data: { escolaId: escola.id, username: 'adm', email: `adm@${SUFIXO}.t`, password: 'x', isSuperuser: true, isDirecao: true, isStaff: true, isApproved: true } })).id
  const curso = await prisma.curso.create({ data: { escolaId: escola.id, nome: 'Curso', sigla: 'C', modalidade: 'EPI', turnos: ['MATUTINO'] } })
  await vincularCursosSemEsquema(prisma, escola.id)
  const esquemaCem = await prisma.esquemaAvaliacao.create({ data: { escolaId: escola.id, nome: 'Escala 100', numUnidades: 1, notaMinimaAprovacao: 60, notaMaxima: 100, unidades: { create: { ordem: 1, nome: 'U1' } } } })
  const turmaDez = await prisma.turma.create({ data: { escolaId: escola.id, nome: 'T10', cursoId: curso.id, anoLetivo: 2026 } })
  const turmaCem = await prisma.turma.create({ data: { escolaId: escola.id, nome: 'T100', cursoId: curso.id, anoLetivo: 2026, esquemaAvaliacaoId: esquemaCem.id } })
  D.turmaDez = turmaDez.id
  for (const [chave, turma] of [['dez', turmaDez], ['cem', turmaCem]] as const) {
    const disc = await prisma.disciplina.create({ data: { nome: `D ${chave}`, turmaId: turma.id } })
    const est = await prisma.estudante.create({ data: { escolaId: escola.id, turmaId: turma.id, matricula: `${SUFIXO}-${chave}`, nome: `Aluno ${chave}` } })
    D[chave] = (await prisma.notaFinal.create({ data: { estudanteId: est.id, disciplinaId: disc.id, nota: 3, status: 'RECUPERACAO' } })).id
  }
  sessao.atual = { user: { id: D.admin, email: `adm@${SUFIXO}.t`, name: 'adm', escolaId: escola.id, isSuperuser: true, isDirecao: true, isStaff: true, isPortalUser: false } }
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

async function salvar(decisoes: unknown[]) {
  const { POST } = await import('@/app/api/conselho-classe/route')
  const res = await POST(new NextRequest('http://localhost/api/conselho-classe', { method: 'POST', body: JSON.stringify({ decisoes }), headers: { 'Content-Type': 'application/json' } }))
  return { status: res.status, corpo: await res.json() }
}

describe('api/conselho-classe - escala da recuperação', () => {
  it('aceita 85 numa turma de escala 100', async () => {
    const r = await salvar([{ notaId: D.cem, novoStatus: 'APROVADO_RECUPERACAO', novaNotaRec: 85 }])
    expect(r.status).toBe(200)
    expect((await prisma.notaFinal.findUnique({ where: { id: D.cem } }))?.notaRecuperacao).toBe(85)
  })

  it('recusa 101 na escala 100 e 11 na escala 10', async () => {
    expect((await salvar([{ notaId: D.cem, novoStatus: 'APROVADO_RECUPERACAO', novaNotaRec: 101 }])).status).toBe(400)
    const r = await salvar([{ notaId: D.dez, novoStatus: 'APROVADO_RECUPERACAO', novaNotaRec: 11 }])
    expect(r.status).toBe(400)
    expect(r.corpo.message).toMatch(/entre 0 e 10/)
  })

  it('aceita "não realizou" (-1)', async () => {
    expect((await salvar([{ notaId: D.dez, novoStatus: 'DEPENDENCIA', novaNotaRec: -1 }])).status).toBe(200)
  })

  it('lote com uma decisão inválida não grava nenhuma', async () => {
    await prisma.notaFinal.update({ where: { id: D.dez }, data: { status: 'RECUPERACAO', notaRecuperacao: null } })
    const r = await salvar([
      { notaId: D.dez, novoStatus: 'APROVADO_CONSELHO', novaNotaRec: 7 },
      { notaId: D.cem, novoStatus: 'APROVADO_CONSELHO', novaNotaRec: 500 },
    ])
    expect(r.status).toBe(400)
    const dez = await prisma.notaFinal.findUnique({ where: { id: D.dez } })
    expect(dez?.status).toBe('RECUPERACAO')
    expect(dez?.notaRecuperacao).toBeNull()
  })
})
