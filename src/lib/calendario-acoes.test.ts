/**
 * Server actions do calendário letivo e do horário da turma - são chamáveis
 * direto pelo navegador, então cada uma precisa conferir papel e escola.
 * Mesmo esquema de isolamento-escolas.test.ts: sessão da escola B.
 */
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { vincularCursosSemEsquema } from '@/lib/services/esquemas-padrao'

const sessao = vi.hoisted(() => ({ atual: null as any }))
vi.mock('@/lib/auth', () => ({ auth: vi.fn(async () => sessao.atual) }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.setConfig({ testTimeout: 60_000 })

const SUFIXO = `cal-${Date.now()}`
const A: Record<string, string> = {}
const B: Record<string, string> = {}

async function criarEscola(dest: Record<string, string>, letra: string) {
  const escola = await prisma.escola.create({ data: { nome: `Escola ${letra} ${SUFIXO}`, slug: `${SUFIXO}-${letra.toLowerCase()}`, status: 'ATIVA' } })
  dest.escola = escola.id
  dest.admin = (await prisma.user.create({ data: { escolaId: escola.id, username: `adm-${letra}`, email: `adm-${letra}@${SUFIXO}.t`, password: 'x', isSuperuser: true, isDirecao: true, isStaff: true, isApproved: true } })).id
  dest.prof = (await prisma.user.create({ data: { escolaId: escola.id, username: `prof-${letra}`, email: `prof-${letra}@${SUFIXO}.t`, password: 'x', name: `Prof ${letra}`, isStaff: true, isApproved: true } })).id
  const curso = await prisma.curso.create({ data: { escolaId: escola.id, nome: `Curso ${letra}`, sigla: `C${letra}`, modalidade: 'EPI', turnos: ['MATUTINO'] } })
  await vincularCursosSemEsquema(prisma, escola.id)
  const esquema = await prisma.esquemaAvaliacao.findFirstOrThrow({ where: { escolaId: escola.id, numUnidades: 3 }, include: { unidades: { orderBy: { ordem: 'asc' } } } })
  dest.esquema = esquema.id
  dest.unidade1 = esquema.unidades[0].id
  dest.turma = (await prisma.turma.create({ data: { escolaId: escola.id, nome: `T${letra}`, cursoId: curso.id, turno: 'Matutino', anoLetivo: 2026 } })).id
  dest.disciplina = (await prisma.disciplina.create({ data: { nome: `Mat ${letra}`, turmaId: dest.turma, usuariosPermitidos: { connect: { id: dest.prof } } } })).id
  dest.feriado = (await prisma.diaNaoLetivo.create({ data: { escolaId: escola.id, data: new Date('2026-04-21'), tipo: 'FERIADO', descricao: `Feriado ${letra}` } })).id
}

const gestaoDe = (d: Record<string, string>) => ({ user: { id: d.admin, escolaId: d.escola, isSuperuser: true, isDirecao: true, isStaff: true, isPortalUser: false } })

beforeAll(async () => {
  await criarEscola(A, 'A')
  await criarEscola(B, 'B')
  sessao.atual = gestaoDe(B)
}, 60_000)

afterAll(async () => {
  for (const escolaId of [A.escola, B.escola]) {
    if (!escolaId) continue
    await prisma.periodoLetivo.deleteMany({ where: { escolaId } })
    await prisma.diaNaoLetivo.deleteMany({ where: { escolaId } })
    await prisma.diaLetivoExtra.deleteMany({ where: { escolaId } })
    await prisma.tempoAula.deleteMany({ where: { escolaId } })
    await prisma.turma.deleteMany({ where: { escolaId } })
    await prisma.curso.deleteMany({ where: { escolaId } })
    await prisma.esquemaAvaliacao.deleteMany({ where: { escolaId } })
    await prisma.user.deleteMany({ where: { escolaId } })
    await prisma.escola.delete({ where: { id: escolaId } })
  }
  await prisma.$disconnect()
})

describe('calendário letivo - ações', () => {
  it('salva período, etapas, dias e tempos da própria escola', async () => {
    const a = await import('@/app/dashboard/configuracoes/calendario/actions')
    expect(await a.salvarPeriodoLetivo(2026, '2026-02-02', '2026-12-18')).toEqual({ ok: true })
    expect(await a.salvarEtapas(2026, [{ esquemaUnidadeId: B.unidade1, inicio: '2026-02-02', fim: '2026-05-08' }])).toEqual({ ok: true })
    expect(await a.adicionarDiaLetivoExtra('2026-03-07', 4, 'Sábado letivo')).toEqual({ ok: true })
    expect(await a.salvarTemposAula('Matutino', [{ inicio: '07:00', fim: '07:50' }, { inicio: '07:50', fim: '08:40' }])).toEqual({ ok: true })

    const periodo = await prisma.periodoLetivo.findFirstOrThrow({ where: { escolaId: B.escola }, include: { etapas: true } })
    expect(periodo.etapas).toHaveLength(1)
    expect(await prisma.tempoAula.count({ where: { escolaId: B.escola, turno: 'MATUTINO' } })).toBe(2)
  })

  it('valida entradas', async () => {
    const a = await import('@/app/dashboard/configuracoes/calendario/actions')
    expect(await a.salvarPeriodoLetivo(2026, '2026-12-18', '2026-02-02')).toHaveProperty('erro') // fim antes do início
    expect(await a.salvarTemposAula('MATUTINO', [{ inicio: '08:00', fim: '07:00' }])).toHaveProperty('erro')
    expect(await a.salvarTemposAula('MADRUGADA', [])).toHaveProperty('erro')
    expect(await a.adicionarDiaNaoLetivo('2026-04-21', 'INVENTADO', 'x')).toHaveProperty('erro')
  })

  it('não mexe em dados da escola A', async () => {
    const a = await import('@/app/dashboard/configuracoes/calendario/actions')
    expect(await a.salvarEtapas(2026, [{ esquemaUnidadeId: A.unidade1, inicio: '2026-02-02', fim: '2026-05-08' }])).toHaveProperty('erro')
    await a.removerDiaNaoLetivo(A.feriado)
    expect(await prisma.diaNaoLetivo.findUnique({ where: { id: A.feriado } })).not.toBeNull()
  })

  it('professor não configura calendário', async () => {
    sessao.atual = { user: { id: B.prof, escolaId: B.escola, isSuperuser: false, isDirecao: false, isStaff: true, isPortalUser: false } }
    const a = await import('@/app/dashboard/configuracoes/calendario/actions')
    expect(await a.salvarPeriodoLetivo(2026, '2026-01-01', '2026-01-02')).toEqual({ erro: 'Não autorizado' })
    sessao.atual = gestaoDe(B)
  })
})

describe('horário da turma - saveSchedule', () => {
  it('salva com a disciplina da turma e resolve professor no servidor', async () => {
    const { saveSchedule } = await import('@/app/dashboard/turmas/schedule-actions')
    expect(await saveSchedule(B.turma, [{ diaSemana: 1, horario: 1, disciplinaId: B.disciplina }])).toEqual({ success: true })
    const h = await prisma.horarioAula.findFirstOrThrow({ where: { turmaId: B.turma } })
    expect(h.disciplinaId).toBe(B.disciplina)
    expect(h.professorId).toBe(B.prof)
    expect(h.disciplina).toBe('Mat B')
  })

  it('recusa disciplina de outra turma/escola e turma de outra escola', async () => {
    const { saveSchedule } = await import('@/app/dashboard/turmas/schedule-actions')
    expect(await saveSchedule(B.turma, [{ diaSemana: 1, horario: 2, disciplinaId: A.disciplina }])).toHaveProperty('error')
    expect(await saveSchedule(A.turma, [{ diaSemana: 1, horario: 1, disciplinaId: A.disciplina }])).toHaveProperty('error')
    expect(await prisma.horarioAula.count({ where: { turmaId: A.turma } })).toBe(0)
  })
})

describe('editar esquema preserva as datas do calendário', () => {
  it('religa as etapas pela ordem das unidades', async () => {
    // Pré-condição: o primeiro teste salvou as datas da unidade 1 da escola B
    const { PUT } = await import('@/app/api/esquemas-avaliacao/[id]/route')
    const req = new NextRequest('http://localhost/x', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome: 'Editado', unidades: [
        { nome: 'Bimestre 1', atividades: [{ nome: 'Prova', notaMaxima: 10 }] },
        { nome: 'Bimestre 2', atividades: [{ nome: 'Prova', notaMaxima: 10 }] },
      ] }),
    })
    const res = await PUT(req, { params: Promise.resolve({ id: B.esquema }) })
    expect(res.status).toBe(200)

    const etapas = await prisma.etapaCalendario.findMany({ where: { esquemaUnidade: { esquemaId: B.esquema } }, include: { esquemaUnidade: true } })
    expect(etapas).toHaveLength(1)
    expect(etapas[0].esquemaUnidade.ordem).toBe(1)
    expect(etapas[0].esquemaUnidade.nome).toBe('Bimestre 1')
    expect(etapas[0].fim.toISOString().slice(0, 10)).toBe('2026-05-08')
  })
})
