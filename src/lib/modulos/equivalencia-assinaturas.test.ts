/**
 * Fase 2 - teste de equivalência (roteiro 5.1, regra 3): depois do backfill,
 * getModulosAtivos e os estados dos módulos pelo modelo novo (assinatura)
 * são iguais aos do modelo antigo (Escola.plano + EscolaModulo) para escolas
 * em todos os planos, situações e com os overrides que existem hoje. Também
 * confere que o backfill é idempotente.
 */
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import { prisma } from '@/lib/prisma'
import { backfillFase2, conferirFase2 } from '../../../prisma/backfill/fase-2'

vi.setConfig({ testTimeout: 60_000 })

const SUFIXO = `eq-${Date.now()}`
type Cenario = { plano: 'BASICO' | 'PRO' | 'ENTERPRISE'; status: 'TRIAL' | 'ATIVA' | 'SUSPENSA' | 'CANCELADA'; overrides?: [string, boolean][] }
const CENARIOS: Cenario[] = [
  { plano: 'BASICO', status: 'TRIAL' },
  { plano: 'BASICO', status: 'ATIVA' },
  { plano: 'PRO', status: 'ATIVA' },
  { plano: 'ENTERPRISE', status: 'ATIVA' },
  { plano: 'ENTERPRISE', status: 'SUSPENSA' },
  { plano: 'PRO', status: 'CANCELADA' },
  // toggle da direção no banco de questões (api/config), ligado e desligado
  { plano: 'ENTERPRISE', status: 'ATIVA', overrides: [['banco-questoes', false]] },
  { plano: 'BASICO', status: 'ATIVA', overrides: [['banco-questoes', true]] },
  // overrides feitos à mão no banco
  { plano: 'PRO', status: 'ATIVA', overrides: [['provas', false], ['simulados', false], ['financeiro', false]] },
  { plano: 'BASICO', status: 'ATIVA', overrides: [['provas', true], ['simulados', true]] },
]
const escolaIds: string[] = []

beforeAll(async () => {
  for (const [i, c] of CENARIOS.entries()) {
    const e = await prisma.escola.create({ data: { nome: `Eq ${i} ${c.plano} ${c.status} ${SUFIXO}`, slug: `${SUFIXO}-${i}`, plano: c.plano, status: c.status } })
    escolaIds.push(e.id)
    for (const [moduloId, ativo] of c.overrides ?? []) await prisma.escolaModulo.create({ data: { escolaId: e.id, moduloId, ativo } })
  }
})

afterAll(async () => {
  await prisma.assinatura.deleteMany({ where: { escolaId: { in: escolaIds } } })
  await prisma.escolaModulo.deleteMany({ where: { escolaId: { in: escolaIds } } })
  await prisma.escola.deleteMany({ where: { id: { in: escolaIds } } })
  await prisma.$disconnect()
})

describe('fase 2 - backfill e equivalência', () => {
  it('antes do backfill: sem assinatura, o modelo novo cai no antigo', async () => {
    const r = await conferirFase2({ escolaIds })
    expect(r.every((x) => x.semAssinatura && x.diferencas.length === 0)).toBe(true)
  })

  it('backfill cria uma assinatura por escola, com a situação certa', async () => {
    const r = await backfillFase2({ escolaIds })
    expect(r.criadas).toHaveLength(CENARIOS.length)
    const assinaturas = await prisma.assinatura.findMany({ where: { escolaId: { in: escolaIds } }, include: { plano: true, escola: true } })
    expect(assinaturas).toHaveLength(CENARIOS.length)
    for (const a of assinaturas) {
      expect(a.plano.codigo).toBe(a.escola.plano)
      expect(a.situacao).toBe(a.escola.status === 'TRIAL' ? 'TESTE' : a.escola.status)
      expect(a.fimTeste).toBeNull()
    }
  })

  it('overrides viram exceções por módulo', async () => {
    const a = await prisma.assinatura.findFirstOrThrow({ where: { escolaId: escolaIds[6] }, include: { modulos: true } })
    expect(a.modulos.map((m) => [m.moduloId, m.estado, m.origem])).toEqual([['QST', 'INATIVO', 'EXCECAO']])
  })

  it('modelo novo = modelo antigo em todas as escolas', async () => {
    const r = await conferirFase2({ escolaIds })
    expect(r.filter((x) => x.semAssinatura)).toEqual([])
    expect(r.filter((x) => x.diferencas.length)).toEqual([])
  })

  it('idempotente: rodar de novo não cria nem muda nada', async () => {
    const antes = await prisma.assinatura.findMany({ where: { escolaId: { in: escolaIds } }, include: { modulos: true, historico: true }, orderBy: { id: 'asc' } })
    const planosAntes = await prisma.plano.findMany({ include: { modulos: true }, orderBy: { codigo: 'asc' } })
    const r = await backfillFase2({ escolaIds })
    expect(r.criadas).toEqual([])
    expect(r.planosCriados).toEqual([])
    expect(await prisma.assinatura.findMany({ where: { escolaId: { in: escolaIds } }, include: { modulos: true, historico: true }, orderBy: { id: 'asc' } })).toEqual(antes)
    expect(await prisma.plano.findMany({ include: { modulos: true }, orderBy: { codigo: 'asc' } })).toEqual(planosAntes)
  })

  it('planos iniciais: Básico sem QST/PRV/FIN; Pro e Enterprise com tudo', async () => {
    const planos = await prisma.plano.findMany({ include: { modulos: true } })
    const mods = (codigo: string) => planos.find((p) => p.codigo === codigo)!.modulos.map((m) => m.moduloId).sort()
    expect(mods('BASICO')).not.toContain('QST')
    expect(mods('BASICO')).not.toContain('PRV')
    expect(mods('BASICO')).not.toContain('FIN')
    expect(mods('BASICO')).toContain('DIA')
    expect(mods('PRO')).toHaveLength(14)
    expect(mods('ENTERPRISE')).toHaveLength(14)
  })
})
