/**
 * Fase 3a - teste de equivalência (roteiro 5.1, regra 3): depois do
 * backfill, can() lendo os papéis do banco (como a sessão faz no login) dá
 * o mesmo resultado que a regra antiga com os booleanos, para contas com
 * TODAS as combinações de booleanos e para todas as ações antigas. Também
 * confere que o backfill é idempotente e não toca em Secretaria/Coordenação.
 */
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import { prisma } from '@/lib/prisma'
import { backfillFase3a, conferirFase3a, conferirPapeisSistema } from '../../prisma/backfill/fase-3a'
import { papeisParaSessao, gravarPapeis, sincronizarVinculosDosBooleanos } from '@/lib/papeis'
import { ACOES_ANTIGAS, can, canLegado } from '@/lib/rbac'
import { PERMISSOES, permissoesDosPapeis, papeisDosBooleanos, type Booleanos } from '@/lib/permissoes'

vi.setConfig({ testTimeout: 60_000 })

const SUFIXO = `eqp-${Date.now()}`
const CHAVES = ['isSuperuser', 'isDirecao', 'isStaff', 'isAEE', 'isPortalUser'] as const
let escolaId = ''
let estudanteId = ''
const contas: { id: string; b: Required<Booleanos> }[] = []

beforeAll(async () => {
  const escola = await prisma.escola.create({ data: { nome: `Eq papéis ${SUFIXO}`, slug: SUFIXO, plano: 'ENTERPRISE', status: 'ATIVA' } })
  escolaId = escola.id
  const curso = await prisma.curso.create({ data: { escolaId, nome: 'Curso', sigla: 'C', modalidade: 'EPI', turnos: ['MATUTINO'] } })
  const turma = await prisma.turma.create({ data: { escolaId, nome: 'T', cursoId: curso.id, serie: '1', anoLetivo: 2026 } })
  estudanteId = (await prisma.estudante.create({ data: { escolaId, turmaId: turma.id, matricula: `${SUFIXO}-1`, nome: 'Aluno' } })).id
  for (let m = 0; m < 1 << CHAVES.length; m++) {
    const b = {} as Required<Booleanos>
    CHAVES.forEach((k, i) => { b[k] = !!(m & (1 << i)) })
    const u = await prisma.user.create({
      data: { escolaId, username: `u${m}-${SUFIXO}`, email: `u${m}@${SUFIXO}.t`, password: 'x', isApproved: true, ...b, estudanteId: b.isPortalUser ? estudanteId : null },
    })
    contas.push({ id: u.id, b })
  }
})

afterAll(async () => {
  await prisma.user.deleteMany({ where: { escolaId } }) // cascata: vínculos
  await prisma.turma.deleteMany({ where: { escolaId } })
  await prisma.curso.deleteMany({ where: { escolaId } })
  await prisma.escola.delete({ where: { id: escolaId } })
  await prisma.$disconnect()
})

describe('fase 3a - backfill e equivalência', () => {
  it('antes do backfill: conta sem vínculo fica sem papéis na sessão (can usa os booleanos)', async () => {
    expect(await papeisParaSessao(contas[31].id, escolaId)).toBeNull()
    const r = await conferirFase3a({ escolaIds: [escolaId] })
    expect(r.filter((x) => !x.semVinculo)).toEqual([])
  })

  it('backfill cria os papéis de sistema e um vínculo por booleano', async () => {
    const r = await backfillFase3a({ escolaIds: [escolaId] })
    expect(await conferirPapeisSistema()).toEqual([])
    const esperado = contas.reduce((n, c) => n + papeisDosBooleanos(c.b).length, 0)
    expect(r.vinculosCriados).toBe(esperado)
    const prof = await prisma.vinculoPapel.findFirstOrThrow({ where: { usuarioId: contas[4].id }, include: { papel: true } })
    expect([prof.papel.codigo, prof.escopo]).toEqual(['PROFESSOR', 'DOCENCIA'])
    const est = await prisma.vinculoPapel.findFirstOrThrow({ where: { usuarioId: contas[16].id }, include: { papel: true } })
    expect([est.papel.codigo, est.escopo, est.escopoId]).toEqual(['ESTUDANTE', 'PROPRIO', estudanteId])
  })

  it('EQUIVALÊNCIA: 32 combinações × 5 ações antigas, can novo (sessão do banco) = can antigo', async () => {
    let comparacoes = 0
    for (const c of contas) {
      const sessao = await papeisParaSessao(c.id, escolaId)
      const usuarioDaSessao = sessao ?? {} // conta sem booleano nenhum: sem vínculo, sem papéis
      for (const acao of ACOES_ANTIGAS) {
        expect(can(usuarioDaSessao, acao), `${acao} ${JSON.stringify(c.b)}`).toBe(canLegado(c.b, acao))
        comparacoes++
      }
      // e todas as permissões novas iguais às derivadas dos booleanos
      const doBanco = new Set(sessao?.permissoes ?? [])
      for (const p of PERMISSOES) expect(doBanco.has(p), `${p} ${JSON.stringify(c.b)}`).toBe(permissoesDosPapeis(papeisDosBooleanos(c.b)).has(p))
    }
    expect(comparacoes).toBe(32 * 5)
    const r = await conferirFase3a({ escolaIds: [escolaId] })
    expect(r.filter((x) => x.diferencas.length)).toEqual([])
  })

  it('idempotente: rodar de novo não cria nem remove nada', async () => {
    const antes = await prisma.vinculoPapel.findMany({ where: { escolaId }, orderBy: { id: 'asc' } })
    const r = await backfillFase3a({ escolaIds: [escolaId] })
    expect([r.papeis, r.vinculosCriados, r.vinculosRemovidos]).toEqual([[], 0, 0])
    expect(await prisma.vinculoPapel.findMany({ where: { escolaId }, orderBy: { id: 'asc' } })).toEqual(antes)
  })

  it('permissão nova unidade.encerrar: o backfill grava em Direção e Coordenação e a 2ª execução não altera nada', async () => {
    // Estado de um banco anterior ao cadeado: sem a permissão nos papéis
    const papeis = await prisma.papel.findMany({ where: { escolaId: null, codigo: { in: ['DIRECAO', 'COORDENACAO'] } }, select: { id: true } })
    await prisma.papelPermissao.deleteMany({ where: { permissao: 'unidade.encerrar', papelId: { in: papeis.map((p) => p.id) } } })
    const r1 = await backfillFase3a({ escolaIds: [escolaId] })
    expect(r1.papeis.sort()).toEqual(['papel COORDENACAO: +unidade.encerrar', 'papel DIRECAO: +unidade.encerrar'])
    const comPermissao = await prisma.papelPermissao.findMany({ where: { permissao: 'unidade.encerrar', papel: { escolaId: null } }, select: { papel: { select: { codigo: true } } } })
    expect(comPermissao.map((p) => p.papel.codigo).sort()).toEqual(['COORDENACAO', 'DIRECAO'])
    const antes = await prisma.papelPermissao.findMany({ where: { papel: { escolaId: null } }, orderBy: [{ papelId: 'asc' }, { permissao: 'asc' }] })
    const r2 = await backfillFase3a({ escolaIds: [escolaId] })
    expect([r2.papeis, r2.vinculosCriados, r2.vinculosRemovidos]).toEqual([[], 0, 0])
    expect(await prisma.papelPermissao.findMany({ where: { papel: { escolaId: null } }, orderBy: [{ papelId: 'asc' }, { permissao: 'asc' }] })).toEqual(antes)
    expect(await conferirPapeisSistema()).toEqual([])
  })

  it('backfill não mexe em Secretaria/Coordenação dadas pela tela e acompanha booleano alterado', async () => {
    const c = contas[4] // só professor
    await prisma.$transaction((tx) => gravarPapeis(tx, { id: c.id, escolaId }, ['PROFESSOR', 'SECRETARIA']))
    await prisma.user.update({ where: { id: c.id }, data: { isDirecao: true } }) // caminho que ainda grava só o booleano
    const r = await backfillFase3a({ escolaIds: [escolaId] })
    expect(r.vinculosCriados).toBe(1)
    expect((await papeisParaSessao(c.id, escolaId))?.papeis).toEqual(['DIRECAO', 'SECRETARIA', 'PROFESSOR'])
    const conf = await conferirFase3a({ escolaIds: [escolaId] })
    expect(conf.filter((x) => x.diferencas.length)).toEqual([])
    // volta ao estado anterior
    await prisma.$transaction((tx) => gravarPapeis(tx, { id: c.id, escolaId }, ['PROFESSOR']))
    expect((await prisma.user.findUniqueOrThrow({ where: { id: c.id } })).isDirecao).toBe(false)
  })

  it('escrita dupla: gravarPapeis deixa vínculos e booleanos coerentes', async () => {
    const c = contas[0]
    await prisma.$transaction((tx) => gravarPapeis(tx, { id: c.id, escolaId }, ['COORDENACAO', 'AEE']))
    const u = await prisma.user.findUniqueOrThrow({ where: { id: c.id } })
    expect([u.isSuperuser, u.isDirecao, u.isStaff, u.isAEE, u.isPortalUser]).toEqual([false, false, false, true, false])
    expect((await papeisParaSessao(c.id, escolaId))?.papeis).toEqual(['COORDENACAO', 'AEE'])
    // sincronizar a partir dos booleanos mantém a Coordenação
    await prisma.$transaction((tx) => sincronizarVinculosDosBooleanos(tx, c.id))
    expect((await papeisParaSessao(c.id, escolaId))?.papeis).toEqual(['COORDENACAO', 'AEE'])
    await prisma.$transaction((tx) => gravarPapeis(tx, { id: c.id, escolaId }, []))
    expect(await papeisParaSessao(c.id, escolaId)).toBeNull()
  })

  it('vínculo vencido ou de papel de outra escola não vale', async () => {
    const c = contas[0]
    const outra = await prisma.escola.create({ data: { nome: `Outra ${SUFIXO}`, slug: `${SUFIXO}-o`, plano: 'ENTERPRISE', status: 'ATIVA' } })
    try {
      const papelDeOutra = await prisma.papel.create({ data: { escolaId: outra.id, codigo: 'DIRECAO', nome: 'Direção (outra)', permissoes: { create: [{ permissao: 'escola.gerir' }] } } })
      await prisma.vinculoPapel.create({ data: { usuarioId: c.id, escolaId, papelId: papelDeOutra.id } })
      const diretor = await prisma.papel.findFirstOrThrow({ where: { escolaId: null, codigo: 'DIRECAO' } })
      await prisma.vinculoPapel.create({ data: { usuarioId: c.id, escolaId, papelId: diretor.id, fim: new Date(Date.now() - 1000) } })
      expect(await papeisParaSessao(c.id, escolaId)).toBeNull()
    } finally {
      await prisma.vinculoPapel.deleteMany({ where: { usuarioId: c.id } })
      await prisma.papel.deleteMany({ where: { escolaId: outra.id } })
      await prisma.escola.delete({ where: { id: outra.id } })
    }
  })
})
