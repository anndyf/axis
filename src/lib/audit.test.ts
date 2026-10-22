/**
 * logAudit grava UTC de verdade, mesmo com o banco em horário de Brasília
 * (o ambiente de desenvolvimento usa ALTER DATABASE ... SET timezone TO
 * 'America/Sao_Paulo'). Antes gravava a hora de Brasília como se fosse UTC.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { prisma } from '@/lib/prisma'
import { logAudit } from '@/lib/audit'

const SUFIXO = `audit-${Date.now()}`
let escola = ''
let usuario = ''

beforeAll(async () => {
  escola = (await prisma.escola.create({ data: { nome: 'Audit', slug: SUFIXO } })).id
  usuario = (await prisma.user.create({ data: { escolaId: escola, username: SUFIXO, email: `${SUFIXO}@x.test`, password: 'x', isApproved: true } })).id
})

afterAll(async () => {
  await prisma.auditLog.deleteMany({ where: { userId: usuario } })
  await prisma.user.deleteMany({ where: { escolaId: escola } })
  await prisma.escola.deleteMany({ where: { id: escola } })
  await prisma.$disconnect()
})

describe('logAudit', () => {
  it('grava o instante atual em UTC', async () => {
    await logAudit(usuario, 'USUARIO', usuario, 'UPDATE', { teste: true })
    const log = await prisma.auditLog.findFirstOrThrow({ where: { userId: usuario }, orderBy: { createdAt: 'desc' } })
    // Nos dois sentidos: a compensação antiga deixava 3h para trás
    expect(Math.abs(log.createdAt.getTime() - Date.now())).toBeLessThan(60_000)

    // Conferido também no banco, independente do fuso da sessão
    const [linha] = await prisma.$queryRaw<{ diff: number }[]>`
      SELECT EXTRACT(EPOCH FROM ((NOW() AT TIME ZONE 'UTC') - created_at))::float AS diff FROM audit_logs WHERE id = ${log.id}`
    expect(Math.abs(linha.diff)).toBeLessThan(60)
  })
})
