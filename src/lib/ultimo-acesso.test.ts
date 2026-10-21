/**
 * Último acesso: o login guarda o acesso anterior e grava o atual; o aviso
 * mostra o ANTERIOR (no horário de Brasília, sem IP).
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { prisma } from '@/lib/prisma'
import { registrarAcesso, textoUltimoAcesso } from '@/lib/ultimo-acesso'

const SUFIXO = `acesso-${Date.now()}`
let escola = ''
let usuario = ''

beforeAll(async () => {
  escola = (await prisma.escola.create({ data: { nome: 'Acesso', slug: SUFIXO } })).id
  usuario = (await prisma.user.create({ data: { escolaId: escola, username: SUFIXO, email: `${SUFIXO}@x.test`, password: 'x', isApproved: true, lastLogin: new Date('2026-10-20T00:14:00Z') } })).id
})

afterAll(async () => {
  await prisma.user.deleteMany({ where: { escolaId: escola } })
  await prisma.escola.deleteMany({ where: { id: escola } })
  await prisma.$disconnect()
})

describe('último acesso', () => {
  it('o login move o acesso atual para o anterior e grava agora', async () => {
    const antes = Date.now()
    await registrarAcesso(usuario)
    const u = await prisma.user.findUniqueOrThrow({ where: { id: usuario }, select: { lastLogin: true, acessoAnterior: true } })
    expect(u.acessoAnterior?.toISOString()).toBe('2026-10-20T00:14:00.000Z')
    // Nos dois sentidos: banco fora de UTC deslocaria a hora em horas
    expect(u.lastLogin!.getTime()).toBeGreaterThanOrEqual(antes - 60_000)
    expect(u.lastLogin!.getTime()).toBeLessThanOrEqual(Date.now() + 60_000)

    // Segundo login: o anterior passa a ser o login de agora há pouco
    const primeiro = u.lastLogin!.toISOString()
    await registrarAcesso(usuario)
    const u2 = await prisma.user.findUniqueOrThrow({ where: { id: usuario }, select: { acessoAnterior: true } })
    expect(u2.acessoAnterior?.toISOString()).toBe(primeiro)
  })

  it('texto no horário de Brasília', () => {
    expect(textoUltimoAcesso(new Date('2026-10-20T00:14:00Z'))).toBe('Seu último acesso foi em 19/10/2026 às 21:14')
  })
})
