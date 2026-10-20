/**
 * PATCH da escola no painel da plataforma: escola e assinatura mudam juntas.
 * Se a gravação da assinatura falhar, a escola também não muda - senão o
 * painel mostraria um plano/status e os módulos (lidos da assinatura) outro.
 */
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'

const estado = vi.hoisted(() => ({ sessao: null as unknown, falharAssinatura: false }))
vi.mock('@/lib/auth', () => ({ auth: vi.fn(async () => estado.sessao) }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn(), revalidateTag: vi.fn(), unstable_cache: <T,>(fn: T) => fn }))
vi.mock('@/lib/modulos/assinatura-escrita', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/lib/modulos/assinatura-escrita')>()
  return {
    ...original,
    alterarAssinaturaEm: vi.fn(async (...args: Parameters<typeof original.alterarAssinaturaEm>) => {
      if (estado.falharAssinatura) throw new Error('falha simulada na assinatura')
      return original.alterarAssinaturaEm(...args)
    }),
  }
})
vi.setConfig({ testTimeout: 60_000 })

const SUFIXO = `plat-atom-${Date.now()}`
const D: Record<string, string> = {}

async function patchEscola(id: string, body: unknown) {
  const { PATCH } = await import('@/app/api/plataforma/escolas/[id]/route')
  const req = new NextRequest('http://localhost/x', { method: 'PATCH', body: JSON.stringify(body), headers: { 'Content-Type': 'application/json' } })
  const res = await PATCH(req, { params: Promise.resolve({ id }) })
  return res.status
}

beforeAll(async () => {
  const a = await prisma.escola.create({ data: { nome: `Escola A ${SUFIXO}`, slug: `${SUFIXO}-a`, status: 'ATIVA' } })
  const b = await prisma.escola.create({ data: { nome: `Escola B ${SUFIXO}`, slug: `${SUFIXO}-b`, status: 'ATIVA', plano: 'BASICO' } })
  D.escolaA = a.id
  D.escolaB = b.id
  D.plataforma = (await prisma.user.create({
    data: { escolaId: a.id, username: 'plataforma', email: `plataforma@${SUFIXO}.t`, password: 'x', isSuperuser: true, isDirecao: true, isStaff: true, isApproved: true, isActive: true, isPlatformAdmin: true },
  })).id
  estado.sessao = { user: { id: D.plataforma, escolaId: a.id, isSuperuser: true, isDirecao: true, isStaff: true, isPortalUser: false, isPlatformAdmin: true } }
})

afterAll(async () => {
  for (const escolaId of [D.escolaA, D.escolaB]) {
    await prisma.auditLog.deleteMany({ where: { OR: [{ user: { escolaId } }, { entityId: escolaId }] } })
    await prisma.assinatura.deleteMany({ where: { escolaId } })
    await prisma.escolaModulo.deleteMany({ where: { escolaId } })
    await prisma.user.deleteMany({ where: { escolaId } })
    await prisma.escola.delete({ where: { id: escolaId } })
  }
  await prisma.$disconnect()
})

describe('PATCH da escola na plataforma é atômico', () => {
  it('se a assinatura falha, a escola não muda', async () => {
    estado.falharAssinatura = true
    expect(await patchEscola(D.escolaB, { status: 'SUSPENSA', plano: 'PRO' })).toBe(500)
    estado.falharAssinatura = false

    const escola = await prisma.escola.findUniqueOrThrow({ where: { id: D.escolaB } })
    expect(escola.status).toBe('ATIVA')
    expect(escola.plano).toBe('BASICO')
  })

  it('quando dá certo, escola e assinatura ficam iguais', async () => {
    expect(await patchEscola(D.escolaB, { status: 'SUSPENSA', plano: 'PRO' })).toBe(200)

    const escola = await prisma.escola.findUniqueOrThrow({ where: { id: D.escolaB } })
    const assinatura = await prisma.assinatura.findFirstOrThrow({ where: { escolaId: D.escolaB }, include: { plano: true } })
    expect(escola.status).toBe('SUSPENSA')
    expect(escola.plano).toBe('PRO')
    expect(assinatura.situacao).toBe('SUSPENSA')
    expect(assinatura.plano.codigo).toBe('PRO')
  })
})
