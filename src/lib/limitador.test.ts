import { describe, it, expect, afterAll } from 'vitest'
import { prisma } from '@/lib/prisma'
import { excedeuLimite, registrarTentativa, limparTentativas } from './limitador'

const chave = `teste:${Date.now()}`

afterAll(async () => {
  await prisma.tentativaAcesso.deleteMany({ where: { chave: { startsWith: 'teste:' } } })
})

describe('limitador de tentativas', () => {
  it('bloqueia ao atingir o máximo dentro da janela', async () => {
    expect(await excedeuLimite(chave, 3, 15)).toBe(false)
    for (let i = 0; i < 3; i++) await registrarTentativa(chave)
    expect(await excedeuLimite(chave, 3, 15)).toBe(true)
  })

  it('tentativas fora da janela não contam', async () => {
    const antiga = `${chave}:antiga`
    await prisma.tentativaAcesso.createMany({
      data: Array.from({ length: 5 }, () => ({ chave: antiga, criadoEm: new Date(Date.now() - 20 * 60_000) })),
    })
    expect(await excedeuLimite(antiga, 3, 15)).toBe(false)
  })

  it('limparTentativas libera a chave', async () => {
    await limparTentativas(chave)
    expect(await excedeuLimite(chave, 3, 15)).toBe(false)
  })

  it('chaves diferentes não se misturam', async () => {
    for (let i = 0; i < 3; i++) await registrarTentativa(`${chave}:a`)
    expect(await excedeuLimite(`${chave}:b`, 3, 15)).toBe(false)
  })
})
