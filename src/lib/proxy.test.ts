/**
 * src/proxy.ts: resolve a escola pelo subdomínio e injeta x-escola-id.
 * Domínio raiz mostra a página de entrada; x-escola-id vindo do cliente
 * nunca passa adiante.
 */
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'

vi.setConfig({ testTimeout: 30_000 })

const SUFIXO = `px${Date.now()}`
const E: Record<string, string> = {}

beforeAll(async () => {
  vi.stubEnv('ROOT_DOMAIN', 'axis.test')
  vi.stubEnv('DEV_ESCOLA_SLUG', '')
  E.ativa = (await prisma.escola.create({ data: { nome: 'Ativa', slug: `${SUFIXO}-ativa`, status: 'ATIVA' } })).id
  await prisma.escola.create({ data: { nome: 'Suspensa', slug: `${SUFIXO}-susp`, status: 'SUSPENSA' } })
  await prisma.escola.create({ data: { nome: 'Cancelada', slug: `${SUFIXO}-canc`, status: 'CANCELADA' } })
})
afterAll(async () => {
  vi.unstubAllEnvs()
  await prisma.escola.deleteMany({ where: { slug: { startsWith: SUFIXO } } })
  await prisma.$disconnect()
})

async function chamar(host: string, caminho = '/', extra: Record<string, string> = {}) {
  const { proxy } = await import('@/proxy')
  const res = await proxy(new NextRequest(`http://${host}${caminho}`, { headers: { host, ...extra } }))
  return {
    status: res.status,
    rewrite: res.headers.get('x-middleware-rewrite'),
    escolaId: res.headers.get('x-middleware-request-x-escola-id'),
    sobrescritos: res.headers.get('x-middleware-override-headers') ?? '',
    corpo: res.headers.get('content-type')?.includes('json') ? await res.json() : null,
  }
}

describe('proxy', () => {
  it('domínio raiz: "/" vira a página de entrada, sem escola', async () => {
    const r = await chamar('axis.test', '/')
    expect(r.rewrite).toContain('/entrada')
    expect(r.escolaId).toBeNull()
  })

  it('domínio raiz: login e outras rotas vão para escola inválida; API responde JSON 404', async () => {
    expect((await chamar('axis.test', '/login')).rewrite).toContain('/escola-invalida?motivo=nao_encontrada')
    const api = await chamar('axis.test', '/api/turmas')
    expect(api.status).toBe(404)
    expect(api.corpo).toMatchObject({ motivo: 'nao_encontrada' })
  })

  it('domínio raiz: sessão e manifest passam sem escola', async () => {
    for (const caminho of ['/api/auth/session', '/manifest']) {
      const r = await chamar('axis.test', caminho)
      expect(r.status).toBe(200)
      expect(r.rewrite).toBeNull()
      expect(r.escolaId).toBeNull()
    }
  })

  it('x-escola-id enviado pelo cliente é descartado', async () => {
    const r = await chamar('axis.test', '/', { 'x-escola-id': E.ativa })
    expect(r.escolaId).toBeNull()
    // a lista de headers que seguem para a página não inclui o x-escola-id do cliente
    expect(r.sobrescritos).toContain('host')
    expect(r.sobrescritos).not.toContain('x-escola-id')
    const entrada = await chamar(`${SUFIXO}-ativa.axis.test`, '/entrada', { 'x-escola-id': 'forjado' })
    expect(entrada.escolaId).toBeNull()
  })

  it('subdomínio válido injeta o id da escola (ignorando o do cliente)', async () => {
    const r = await chamar(`${SUFIXO}-ativa.axis.test`, '/login', { 'x-escola-id': 'forjado' })
    expect(r.rewrite).toBeNull()
    expect(r.escolaId).toBe(E.ativa)
  })

  it('subdomínio inexistente, suspensa e cancelada', async () => {
    expect((await chamar(`${SUFIXO}-nada.axis.test`, '/login')).rewrite).toContain('motivo=nao_encontrada')
    const susp = await chamar(`${SUFIXO}-susp.axis.test`, '/login')
    expect(susp.rewrite).toContain('motivo=suspensa')
    expect(susp.escolaId).toBeNull()
    expect((await chamar(`${SUFIXO}-canc.axis.test`, '/dashboard')).rewrite).toContain('motivo=cancelada')
  })

  it('DEV_ESCOLA_SLUG continua valendo sem subdomínio', async () => {
    vi.stubEnv('DEV_ESCOLA_SLUG', `${SUFIXO}-ativa`)
    const r = await chamar('axis.test', '/login')
    expect(r.escolaId).toBe(E.ativa)
    vi.stubEnv('DEV_ESCOLA_SLUG', '')
  })
})

describe('proxy - rotas sem escola em escola inválida', () => {
  it('sessão não dá erro em subdomínio inexistente ou suspenso, e não leva escola', async () => {
    for (const host of [`${SUFIXO}-nada.axis.test`, `${SUFIXO}-susp.axis.test`]) {
      const r = await chamar(host, '/api/auth/session', { 'x-escola-id': 'forjado' })
      expect(r.status).toBe(200)
      expect(r.escolaId).toBeNull()
      expect(r.sobrescritos).not.toContain('x-escola-id')
    }
  })
})
