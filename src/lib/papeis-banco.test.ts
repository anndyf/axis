import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { prisma } from '@/lib/prisma'
import { dadosDePapeis } from '@/lib/rbac'

// A CHECK users_papeis_flags_consistentes impede que papeis e os campos is*
// divirjam durante a transição: quem gravar só um dos lados recebe erro.

const SLUG = `test-papeis-${Date.now()}`
let escolaId: string

beforeAll(async () => {
  const escola = await prisma.escola.create({ data: { nome: 'Escola Teste Papéis', slug: SLUG } })
  escolaId = escola.id
})

afterAll(async () => {
  await prisma.user.deleteMany({ where: { escolaId } })
  await prisma.escola.delete({ where: { id: escolaId } })
  await prisma.$disconnect()
})

function novo(username: string) {
  return { escolaId, username, email: `${username}@t.com`, password: 'x' }
}

describe('consistência papeis x campos no banco', () => {
  it('aceita gravação feita com dadosDePapeis', async () => {
    const u = await prisma.user.create({ data: { ...novo('coord'), ...dadosDePapeis(['COORDENACAO', 'PROFESSOR']) } })
    expect(u.papeis).toEqual(['COORDENACAO', 'PROFESSOR'])
    expect(u.isStaff).toBe(true)
    expect(u.isSuperuser).toBe(false)
  })

  it('aceita usuário sem papel nenhum (ex.: portal)', async () => {
    const u = await prisma.user.create({ data: { ...novo('portal'), isPortalUser: true } })
    expect(u.papeis).toEqual([])
  })

  it('recusa campo is* sem o papel correspondente', async () => {
    await expect(prisma.user.create({ data: { ...novo('so-flag'), isStaff: true } })).rejects.toThrow()
  })

  it('recusa papel sem o campo is* correspondente', async () => {
    await expect(prisma.user.create({ data: { ...novo('so-papel'), papeis: ['ADMIN'] } })).rejects.toThrow()
  })

  it('recusa atualização que muda só os campos', async () => {
    const u = await prisma.user.create({ data: { ...novo('prof'), ...dadosDePapeis(['PROFESSOR']) } })
    await expect(prisma.user.update({ where: { id: u.id }, data: { isSuperuser: true } })).rejects.toThrow()
    const ok = await prisma.user.update({ where: { id: u.id }, data: dadosDePapeis(['PROFESSOR', 'ADMIN']) })
    expect(ok.isSuperuser).toBe(true)
  })
})
