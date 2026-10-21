/**
 * Fase 3b - rotas de verdade chamadas por sessões que só têm PAPÉIS (sem os
 * booleanos), como a sessão aberta depois do backfill. Confere, por grupo de
 * telas migrado, quem entra e quem é recusado - inclusive Secretaria e
 * Coordenação, que não existiam antes. E a sessão antiga (só booleanos)
 * continua com o mesmo acesso.
 */
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { permissoesDosPapeis } from '@/lib/permissoes'

const sessao = vi.hoisted(() => ({ atual: null as any }))
vi.mock('@/lib/auth', () => ({ auth: vi.fn(async () => sessao.atual) }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn(), revalidateTag: vi.fn(), unstable_cache: (fn: any) => fn }))
vi.mock('@/lib/mail', () => ({ enviarSenhaPorEmail: vi.fn(async () => true), enviarLinkRedefinicaoSenha: vi.fn(async () => true) }))
vi.setConfig({ testTimeout: 60_000 })

const SUFIXO = `papr-${Date.now()}`
const D: Record<string, string> = {}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Handler = (req: NextRequest, ctx: any) => Promise<Response>
async function chamar(handler: Handler, metodo: string, url = '/x', params: Record<string, string> = {}, body?: unknown) {
  const req = new NextRequest(`http://localhost${url}`, {
    method: metodo,
    ...(body !== undefined ? { body: JSON.stringify(body), headers: { 'Content-Type': 'application/json' } } : {}),
  })
  const res = await handler(req, { params: Promise.resolve(params) })
  return res.status
}

/** Sessão nova: só papéis e permissões (sem booleanos). */
function comPapeis(...papeis: string[]) {
  return { user: { id: D.usuario, escolaId: D.escola, username: 'x', papeis, permissoes: [...permissoesDosPapeis(papeis)] } }
}

const OK = [200, 201]
const NEGADO = [401, 403]

beforeAll(async () => {
  const escola = await prisma.escola.create({ data: { nome: `Papéis rotas ${SUFIXO}`, slug: SUFIXO, plano: 'ENTERPRISE', status: 'ATIVA' } })
  D.escola = escola.id
  D.usuario = (await prisma.user.create({ data: { escolaId: escola.id, username: `u-${SUFIXO}`, email: `u@${SUFIXO}.t`, password: 'x', isApproved: true } })).id
  const curso = await prisma.curso.create({ data: { escolaId: escola.id, nome: 'Curso', sigla: 'C', modalidade: 'EPI', turnos: ['MATUTINO'] } })
  const turma = await prisma.turma.create({ data: { escolaId: escola.id, nome: 'T1', cursoId: curso.id, serie: '1', anoLetivo: 2026 } })
  D.turma = turma.id
  const est = await prisma.estudante.create({ data: { escolaId: escola.id, turmaId: turma.id, matricula: `${SUFIXO}-1`, nome: 'Aluno Um' } })
  D.matricula = est.matricula
})

afterAll(async () => {
  await prisma.ocorrencia.deleteMany({ where: { escolaId: D.escola } })
  await prisma.auditLog.deleteMany({ where: { user: { escolaId: D.escola } } })
  await prisma.user.deleteMany({ where: { escolaId: D.escola } })
  await prisma.turma.deleteMany({ where: { escolaId: D.escola } })
  await prisma.curso.deleteMany({ where: { escolaId: D.escola } })
  await prisma.escola.delete({ where: { id: D.escola } })
  await prisma.$disconnect()
})

describe('rotas por papel (sessão só com papéis)', () => {
  const casos: [string, () => Promise<Handler>, string, string, string[], string[]][] = [
    // [grupo, rota, método, url, papéis que entram, papéis recusados]
    ['ocorrências', async () => (await import('@/app/api/ocorrencias/route')).GET as Handler, 'GET', '/api/ocorrencias', ['DIRECAO', 'COORDENACAO', 'ADMINISTRADOR'], ['SECRETARIA', 'PROFESSOR', 'AEE']],
    ['professores pendentes', async () => (await import('@/app/api/relatorios/professores-pendentes/route')).GET as Handler, 'GET', '/api/relatorios/professores-pendentes', ['DIRECAO', 'COORDENACAO'], ['SECRETARIA', 'PROFESSOR', 'AEE']],
    ['busca de estudantes', async () => (await import('@/app/api/estudantes/route')).GET as Handler, 'GET', '/api/estudantes?search=Aluno', ['PROFESSOR', 'SECRETARIA', 'COORDENACAO', 'DIRECAO'], ['AEE', 'ESTUDANTE']],
    ['professores para filtro de planos', async () => (await import('@/app/api/usuarios/route')).GET as Handler, 'GET', '/api/usuarios?role=professor', ['DIRECAO', 'COORDENACAO'], ['SECRETARIA', 'PROFESSOR']],
  ]
  for (const [grupo, carregar, metodo, url, entram, recusados] of casos) {
    it(grupo, async () => {
      const h = await carregar()
      for (const p of entram) { sessao.atual = comPapeis(p); expect(OK, `${p} em ${grupo}`).toContain(await chamar(h, metodo, url)) }
      for (const p of recusados) { sessao.atual = comPapeis(p); expect(NEGADO, `${p} em ${grupo}`).toContain(await chamar(h, metodo, url)) }
    })
  }

  it('cadastro de usuário: só o Administrador da escola', async () => {
    const { POST } = await import('@/app/api/usuarios/route')
    for (const p of ['DIRECAO', 'SECRETARIA', 'COORDENACAO', 'PROFESSOR']) {
      sessao.atual = comPapeis(p)
      expect(await chamar(POST as Handler, 'POST', '/x', {}, { name: 'x', email: `x-${p}@${SUFIXO}.t`, papeis: ['PROFESSOR'] })).toBe(403)
    }
    sessao.atual = comPapeis('ADMINISTRADOR')
    expect(await chamar(POST as Handler, 'POST', '/x', {}, { name: 'Coord', email: `coord@${SUFIXO}.t`, papeis: ['COORDENACAO', 'PROFESSOR'] })).toBe(201)
    const novo = await prisma.user.findFirstOrThrow({ where: { email: `coord@${SUFIXO}.t` }, include: { vinculosPapel: { include: { papel: true } } } })
    expect(novo.vinculosPapel.map((v) => v.papel.codigo).sort()).toEqual(['COORDENACAO', 'PROFESSOR'])
    expect([novo.isSuperuser, novo.isDirecao, novo.isStaff, novo.isAEE]).toEqual([false, false, true, false])
    // papel fora da lista atribuível é recusado
    expect(await chamar(POST as Handler, 'POST', '/x', {}, { name: 'x', email: `y@${SUFIXO}.t`, papeis: ['ESTUDANTE'] })).toBe(400)
  })

  it('editor de papéis: troca papéis e mantém os booleanos coerentes', async () => {
    const { PUT } = await import('@/app/api/usuarios/[id]/route')
    const alvo = await prisma.user.findFirstOrThrow({ where: { email: `coord@${SUFIXO}.t` } })
    sessao.atual = comPapeis('ADMINISTRADOR')
    expect(await chamar(PUT as Handler, 'PUT', '/x', { id: alvo.id }, { papeis: ['DIRECAO', 'AEE'] })).toBe(200)
    const depois = await prisma.user.findUniqueOrThrow({ where: { id: alvo.id }, include: { vinculosPapel: { include: { papel: true } } } })
    expect(depois.vinculosPapel.map((v) => v.papel.codigo).sort()).toEqual(['AEE', 'DIRECAO'])
    expect([depois.isSuperuser, depois.isDirecao, depois.isStaff, depois.isAEE]).toEqual([false, true, false, true])
    // cliente antigo (booleanos): liga professor, mantém o resto
    expect(await chamar(PUT as Handler, 'PUT', '/x', { id: alvo.id }, { isStaff: true })).toBe(200)
    const v = await prisma.vinculoPapel.findMany({ where: { usuarioId: alvo.id }, include: { papel: true } })
    expect(v.map((x) => x.papel.codigo).sort()).toEqual(['AEE', 'DIRECAO', 'PROFESSOR'])
    expect(await chamar(PUT as Handler, 'PUT', '/x', { id: alvo.id }, { papeis: ['XPTO'] })).toBe(400)
  })

  it('sessão antiga (só booleanos) continua com o mesmo acesso', async () => {
    const { GET } = await import('@/app/api/ocorrencias/route')
    sessao.atual = { user: { id: D.usuario, escolaId: D.escola, isSuperuser: false, isDirecao: true, isStaff: true } }
    expect(OK).toContain(await chamar(GET as Handler, 'GET', '/api/ocorrencias'))
    sessao.atual = { user: { id: D.usuario, escolaId: D.escola, isSuperuser: false, isDirecao: false, isStaff: true } }
    expect(NEGADO).toContain(await chamar(GET as Handler, 'GET', '/api/ocorrencias'))
  })
})
