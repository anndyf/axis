/**
 * Aba "Histórico" das fichas: só a escola da sessão (mesma matrícula e
 * mesmo id em outra escola não vazam) e só quem pode ver a auditoria
 * (aluno do portal e professor não).
 */
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import { prisma } from '@/lib/prisma'
import { historicoDoEstudante, historicoDoUsuario, podeVerHistorico, ultimaAlteracao } from '@/lib/services/historico-leitura'

vi.setConfig({ testTimeout: 60_000 })

const SUFIXO = `hist-${Date.now()}`
const MATRICULA = `${SUFIXO}-001`
const E: Record<string, { escola: string; gestor: string; estudante: string; nota: string }> = {}

beforeAll(async () => {
  for (const l of ['a', 'b']) {
    const escola = (await prisma.escola.create({ data: { nome: l, slug: `${SUFIXO}-${l}` } })).id
    const gestor = (await prisma.user.create({ data: { escolaId: escola, username: `${SUFIXO}-${l}`, email: `${SUFIXO}-${l}@x.test`, password: 'x', name: `Gestor ${l}`, isDirecao: true, isApproved: true } })).id
    const turma = await prisma.turma.create({ data: { escolaId: escola, nome: `T ${l}`, anoLetivo: 2026 } })
    const disciplina = await prisma.disciplina.create({ data: { turmaId: turma.id, nome: `Disc ${l}` } })
    // Mesma matrícula nas duas escolas (a matrícula é única só dentro da escola)
    const estudante = (await prisma.estudante.create({ data: { escolaId: escola, turmaId: turma.id, matricula: MATRICULA, nome: `Aluno ${l}` } })).id
    const nota = (await prisma.notaFinal.create({ data: { estudanteId: estudante, disciplinaId: disciplina.id, nota: 5, status: 'RECUPERACAO' } })).id
    await prisma.auditLog.create({ data: { userId: gestor, entityType: 'ESTUDANTE', entityId: MATRICULA, action: 'UPDATE', details: JSON.stringify({ nome: `Aluno ${l}` }) } })
    await prisma.auditLog.create({ data: { userId: gestor, entityType: 'NOTA', entityId: nota, action: 'UPDATE', details: JSON.stringify({ disciplina: `Disc ${l}` }) } })
    await prisma.auditLog.create({ data: { userId: gestor, entityType: 'USUARIO', entityId: gestor, action: 'UPDATE', details: JSON.stringify({ fields: [`campo-${l}`] }) } })
    await prisma.notaFinalAudit.create({ data: { notaFinalId: nota, notaAnterior: 4, notaAtual: 5, status: 'RECUPERACAO', modifiedById: gestor } })
    E[l] = { escola, gestor, estudante, nota }
  }
  // Registro de auditoria da escola B que aponta (por engano ou ataque) para a nota da escola A
  await prisma.auditLog.create({ data: { userId: E.b.gestor, entityType: 'NOTA', entityId: E.a.nota, action: 'UPDATE', details: JSON.stringify({ disciplina: 'intruso' }) } })
})

afterAll(async () => {
  const escolas = Object.values(E).map((x) => x.escola)
  const usuarios = Object.values(E).map((x) => x.gestor)
  await prisma.auditLog.deleteMany({ where: { userId: { in: usuarios } } })
  await prisma.estudante.deleteMany({ where: { escolaId: { in: escolas } } })
  await prisma.turma.deleteMany({ where: { escolaId: { in: escolas } } })
  await prisma.user.deleteMany({ where: { escolaId: { in: escolas } } })
  await prisma.escola.deleteMany({ where: { id: { in: escolas } } })
  await prisma.$disconnect()
})

describe('histórico das fichas: isolamento por escola', () => {
  it('estudante: só cadastro e notas da escola da sessão, mesmo com a mesma matrícula na outra escola', async () => {
    const h = await historicoDoEstudante(E.a.escola, MATRICULA)
    expect(h).not.toBeNull()
    expect(h!.map((e) => e.autor).every((a) => a === 'Gestor a')).toBe(true)
    expect(h!.some((e) => e.detalhe?.includes('intruso'))).toBe(false)
    expect(h!.some((e) => e.detalhe?.includes('Aluno b') || e.assunto === 'Disc b')).toBe(false)
    expect(h!.map((e) => e.acao).sort()).toEqual(['Alteração', 'Alteração', 'Alteração de nota final'])
  })

  it('usuário: a escola A não lê o histórico de uma conta da escola B', async () => {
    expect(await historicoDoUsuario(E.a.escola, E.b.gestor)).toBeNull()
    const h = await historicoDoUsuario(E.a.escola, E.a.gestor)
    expect(h!.map((e) => e.detalhe)).toEqual(['Campos: campo-a'])
  })

  it('rodapé de rastreio: última alteração só com autor da mesma escola', async () => {
    expect((await ultimaAlteracao(E.a.escola, 'ESTUDANTE', MATRICULA))?.autor).toBe('Gestor a')
    expect(await ultimaAlteracao(E.a.escola, 'USUARIO', E.b.gestor)).toBeNull()
  })

  it('quem vê a aba: mesma regra da auditoria; aluno do portal e professor não', () => {
    expect(podeVerHistorico({ isSuperuser: true, isDirecao: false, isStaff: false, isAEE: false })).toBe(true)
    expect(podeVerHistorico({ isSuperuser: false, isDirecao: false, isStaff: false, isAEE: false, isPortalUser: true } as never)).toBe(false)
    expect(podeVerHistorico({ isSuperuser: false, isDirecao: false, isStaff: true, isAEE: false })).toBe(false)
    expect(podeVerHistorico(null)).toBe(false)
  })
})
