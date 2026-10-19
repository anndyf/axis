/**
 * Identidade visual: só a gestão altera, e sempre a escola da sessão.
 */
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import { prisma } from '@/lib/prisma'

const sessao = vi.hoisted(() => ({ atual: null as any }))
vi.mock('@/lib/auth', () => ({ auth: vi.fn(async () => sessao.atual) }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.setConfig({ testTimeout: 60_000 })

const SUFIXO = `ident-${Date.now()}`
const E: Record<string, string> = {}
const usuario = (escolaId: string, extra: Record<string, unknown>) => ({ user: { id: 'u', escolaId, isSuperuser: false, isDirecao: false, isStaff: true, isPortalUser: false, ...extra } })
const acao = () => import('@/app/dashboard/configuracoes/identidade/actions')

beforeAll(async () => {
  E.a = (await prisma.escola.create({ data: { nome: 'A', slug: `${SUFIXO}-a`, corPrimaria: '#111111' } })).id
  E.b = (await prisma.escola.create({ data: { nome: 'B', slug: `${SUFIXO}-b` } })).id
})
afterAll(async () => {
  await prisma.escola.deleteMany({ where: { id: { in: [E.a, E.b] } } })
  await prisma.$disconnect()
})

describe('salvarIdentidade', () => {
  it('gestão salva cor e logo da própria escola', async () => {
    sessao.atual = usuario(E.b, { isDirecao: true })
    const { salvarIdentidade } = await acao()
    expect(await salvarIdentidade({ corPrimaria: '#0F766E', logoUrl: 'https://escola.b/logo.png' })).toEqual({ ok: true })
    expect(await prisma.escola.findUnique({ where: { id: E.b }, select: { corPrimaria: true, logoUrl: true } })).toEqual({ corPrimaria: '#0f766e', logoUrl: 'https://escola.b/logo.png' })
    expect((await prisma.escola.findUnique({ where: { id: E.a } }))?.corPrimaria).toBe('#111111')
  })

  it('valida cor e logo', async () => {
    const { salvarIdentidade } = await acao()
    expect(await salvarIdentidade({ corPrimaria: 'azul' })).toHaveProperty('erro')
    expect(await salvarIdentidade({ corPrimaria: '#000000', logoUrl: 'http://inseguro/logo.png' })).toHaveProperty('erro')
    expect(await salvarIdentidade({ corPrimaria: '#000000', logoUrl: 'javascript:alert(1)' })).toHaveProperty('erro')
  })

  it('vazio volta ao padrão', async () => {
    const { salvarIdentidade } = await acao()
    expect(await salvarIdentidade({ corPrimaria: '', logoUrl: '' })).toEqual({ ok: true })
    expect(await prisma.escola.findUnique({ where: { id: E.b }, select: { corPrimaria: true, logoUrl: true } })).toEqual({ corPrimaria: null, logoUrl: null })
  })

  it('professor e aluno do portal não alteram', async () => {
    const { salvarIdentidade } = await acao()
    sessao.atual = usuario(E.a, {})
    expect(await salvarIdentidade({ corPrimaria: '#ff0000' })).toEqual({ erro: 'Não autorizado' })
    sessao.atual = usuario(E.a, { isDirecao: true, isPortalUser: true })
    expect(await salvarIdentidade({ corPrimaria: '#ff0000' })).toEqual({ erro: 'Não autorizado' })
    expect((await prisma.escola.findUnique({ where: { id: E.a } }))?.corPrimaria).toBe('#111111')
  })
})
