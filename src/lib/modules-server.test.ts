import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { prisma } from '@/lib/prisma'
import { contarUsuariosStaff, podeAdicionarUsuarioStaff } from '@/lib/modules-server'

const SLUG = `test-plan-limits-${Date.now()}`
let escolaId: string

beforeAll(async () => {
  const escola = await prisma.escola.create({
    data: { nome: 'Escola Teste Limite', slug: SLUG, plano: 'BASICO', status: 'ATIVA' },
  })
  escolaId = escola.id
})

afterAll(async () => {
  await prisma.user.deleteMany({ where: { escolaId } })
  await prisma.escola.delete({ where: { id: escolaId } })
  await prisma.$disconnect()
})

describe('limites de usuário por plano', () => {
  it('conta só usuários staff, não portal', async () => {
    await prisma.user.createMany({
      data: [
        { escolaId, username: 'staff1', email: 'staff1@t.com', password: 'x', isPortalUser: false },
        { escolaId, username: 'staff2', email: 'staff2@t.com', password: 'x', isPortalUser: false },
        { escolaId, username: 'portal1', email: 'portal1@t.com', password: 'x', isPortalUser: true },
      ],
    })

    const total = await contarUsuariosStaff(escolaId)
    expect(total).toBe(2)
  })

  it('BASICO bloqueia no 16º usuário staff', async () => {
    // já tem 2 (do teste anterior), completa até 15
    await prisma.user.createMany({
      data: Array.from({ length: 13 }, (_, i) => ({
        escolaId,
        username: `staff-extra-${i}`,
        email: `staff-extra-${i}@t.com`,
        password: 'x',
        isPortalUser: false,
      })),
    })

    expect(await contarUsuariosStaff(escolaId)).toBe(15)
    expect(await podeAdicionarUsuarioStaff(escolaId, 'BASICO')).toBe(false)
    expect(await podeAdicionarUsuarioStaff(escolaId, 'PRO')).toBe(true)
    expect(await podeAdicionarUsuarioStaff(escolaId, 'ENTERPRISE')).toBe(true)
  })
})
