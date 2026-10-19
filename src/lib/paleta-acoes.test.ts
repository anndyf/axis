/**
 * Paleta de comandos: a busca fica na escola da sessão e só a gestão vê
 * turmas e estudantes.
 */
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import { prisma } from '@/lib/prisma'

const sessao = vi.hoisted(() => ({ atual: null as any }))
vi.mock('@/lib/auth', () => ({ auth: vi.fn(async () => sessao.atual) }))
vi.setConfig({ testTimeout: 60_000 })

const SUFIXO = `paleta-${Date.now()}`
const E: Record<string, string> = {}
const usuario = (escolaId: string, extra: Record<string, unknown>) => ({ user: { id: 'u', escolaId, isSuperuser: false, isDirecao: false, isStaff: true, isPortalUser: false, ...extra } })
const acao = async () => (await import('@/app/dashboard/paleta/actions')).buscarNaPaleta

beforeAll(async () => {
  for (const l of ['a', 'b']) {
    E[l] = (await prisma.escola.create({ data: { nome: l, slug: `${SUFIXO}-${l}` } })).id
    const turma = await prisma.turma.create({ data: { escolaId: E[l], nome: `Zeta ${l}`, anoLetivo: 2026 } })
    await prisma.estudante.create({ data: { escolaId: E[l], turmaId: turma.id, matricula: `${SUFIXO}-${l}`, nome: `Zuleica ${l}` } })
  }
})
afterAll(async () => {
  await prisma.estudante.deleteMany({ where: { escolaId: { in: [E.a, E.b] } } })
  await prisma.turma.deleteMany({ where: { escolaId: { in: [E.a, E.b] } } })
  await prisma.escola.deleteMany({ where: { id: { in: [E.a, E.b] } } })
  await prisma.$disconnect()
})

describe('buscarNaPaleta', () => {
  it('gestão encontra só turmas e estudantes da própria escola', async () => {
    sessao.atual = usuario(E.a, { isDirecao: true })
    const r = await (await acao())('Z')
    expect(r).toEqual({ turmas: [], estudantes: [] }) // termo curto
    const r2 = await (await acao())('zet')
    expect(r2.turmas.map((t) => t.nome)).toEqual(['Zeta a'])
    const r3 = await (await acao())('zuleica')
    expect(r3.estudantes).toEqual([{ matricula: `${SUFIXO}-a`, nome: 'Zuleica a', turma: 'Zeta a' }])
  })

  it('professor, AEE e portal não buscam turmas nem estudantes', async () => {
    for (const extra of [{}, { isAEE: true, isDirecao: true }, { isPortalUser: true, isSuperuser: true }]) {
      sessao.atual = usuario(E.a, extra)
      expect(await (await acao())('zuleica')).toEqual({ turmas: [], estudantes: [] })
    }
  })

  it('sem sessão não busca', async () => {
    sessao.atual = null
    expect(await (await acao())('zuleica')).toEqual({ turmas: [], estudantes: [] })
  })
})
