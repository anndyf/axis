/**
 * Leitura de frequência contra o banco (carregarFrequenciaDaTurma) e as
 * telas/PDFs que a usam: escopo por escola, justificativa aplicada no
 * cálculo, e aluno do portal só baixa o próprio boletim.
 */
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { vincularCursosSemEsquema } from '@/lib/services/esquemas-padrao'

const sessao = vi.hoisted(() => ({ atual: null as any }))
vi.mock('@/lib/auth', () => ({ auth: vi.fn(async () => sessao.atual) }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn(), unstable_cache: (fn: any) => fn }))
vi.setConfig({ testTimeout: 60_000 })

const SUFIXO = `freq-${Date.now()}`
const A: Record<string, string> = {}
const B: Record<string, string> = {}

async function criarEscola(dest: Record<string, string>, letra: string) {
  const escola = await prisma.escola.create({ data: { nome: `Escola ${letra} ${SUFIXO}`, slug: `${SUFIXO}-${letra.toLowerCase()}`, status: 'ATIVA' } })
  dest.escola = escola.id
  const curso = await prisma.curso.create({ data: { escolaId: escola.id, nome: `Curso ${letra}`, sigla: `C${letra}`, modalidade: 'EPI', turnos: ['MATUTINO'] } })
  await vincularCursosSemEsquema(prisma, escola.id)
  dest.turma = (await prisma.turma.create({ data: { escolaId: escola.id, nome: `T${letra}`, cursoId: curso.id, anoLetivo: 2026 } })).id
  dest.mat = (await prisma.disciplina.create({ data: { nome: 'Mat', turmaId: dest.turma } })).id
  dest.por = (await prisma.disciplina.create({ data: { nome: 'Por', turmaId: dest.turma } })).id
  dest.ana = (await prisma.estudante.create({ data: { escolaId: escola.id, turmaId: dest.turma, matricula: `${SUFIXO}-${letra}-1`, nome: 'Ana' } })).id
  dest.bia = (await prisma.estudante.create({ data: { escolaId: escola.id, turmaId: dest.turma, matricula: `${SUFIXO}-${letra}-2`, nome: 'Bia' } })).id
  for (const disc of [dest.mat, dest.por]) {
    await prisma.notaFinal.create({ data: { estudanteId: dest.ana, disciplinaId: disc, nota: 8, status: 'APROVADO' } })
  }
  // 4 aulas de Mat (2 dias x 2 tempos) e 2 de Por, todas realizadas
  const aula = (disc: string, data: string, q: number) => prisma.aula.create({ data: { escolaId: escola.id, turmaId: dest.turma, disciplinaId: disc, data: new Date(data), tempos: [], quantidade: q, situacao: 'REALIZADA', chave: `${dest.turma}|${data}|${disc}` } })
  const m1 = await aula(dest.mat, '2026-03-02', 2)
  await aula(dest.mat, '2026-03-03', 2)
  const p1 = await aula(dest.por, '2026-03-02', 1)
  await aula(dest.por, '2026-03-04', 1)
  await prisma.falta.create({ data: { aulaId: m1.id, estudanteId: dest.ana, quantidade: 2 } })
  await prisma.falta.create({ data: { aulaId: p1.id, estudanteId: dest.ana, quantidade: 1 } })
}

beforeAll(async () => {
  await criarEscola(A, 'A')
  await criarEscola(B, 'B')
  // atestado de Ana (B) em 02/03 abona as faltas desse dia
  await prisma.justificativa.create({ data: { escolaId: B.escola, estudanteId: B.ana, inicio: new Date('2026-03-02'), fim: new Date('2026-03-02'), tipo: 'ATESTADO', efeito: 'ABONA' } })
}, 60_000)

afterAll(async () => {
  for (const escolaId of [A.escola, B.escola]) {
    if (!escolaId) continue
    await prisma.aula.deleteMany({ where: { escolaId } })
    await prisma.justificativa.deleteMany({ where: { escolaId } })
    await prisma.turma.deleteMany({ where: { escolaId } })
    await prisma.curso.deleteMany({ where: { escolaId } })
    await prisma.esquemaAvaliacao.deleteMany({ where: { escolaId } })
    await prisma.user.deleteMany({ where: { escolaId } })
    await prisma.escola.delete({ where: { id: escolaId } })
  }
  await prisma.$disconnect()
})

describe('carregarFrequenciaDaTurma', () => {
  it('calcula por disciplina e geral; sem falta = 100%', async () => {
    const { carregarFrequenciaDaTurma } = await import('@/lib/services/frequencia-leitura')
    const f = await carregarFrequenciaDaTurma(A.escola, A.turma)
    expect(f?.temChamada).toBe(true)
    expect(f?.regra).toEqual({ apuracao: 'GERAL', minimo: 75 })
    const ana = f!.porAluno.get(A.ana)!
    expect(ana.porDisciplina[A.mat].percentual).toBe(50)
    expect(ana.porDisciplina[A.por].percentual).toBe(50)
    expect(ana.geral).toMatchObject({ aulas: 6, faltasConsideradas: 3, percentual: 50 })
    expect(f!.porAluno.get(A.bia)!.geral.percentual).toBe(100)
  })

  it('justificativa que abona entra no cálculo', async () => {
    const { carregarFrequenciaDaTurma } = await import('@/lib/services/frequencia-leitura')
    const ana = (await carregarFrequenciaDaTurma(B.escola, B.turma))!.porAluno.get(B.ana)!
    expect(ana.geral).toMatchObject({ faltas: 3, faltasAbonadas: 3, percentual: 100 })
  })

  it('turma de outra escola não é lida', async () => {
    const { carregarFrequenciaDaTurma } = await import('@/lib/services/frequencia-leitura')
    expect(await carregarFrequenciaDaTurma(B.escola, A.turma)).toBeNull()
  })

  it('filtrar por aluno não traz os outros', async () => {
    const { carregarFrequenciaDaTurma } = await import('@/lib/services/frequencia-leitura')
    const f = await carregarFrequenciaDaTurma(A.escola, A.turma, [A.bia])
    expect([...f!.porAluno.keys()]).toEqual([A.bia])
  })
})

describe('PDF do boletim', () => {
  async function baixar(matricula: string) {
    const { GET } = await import('@/app/api/boletim/[id]/pdf/route')
    const res = await GET(new NextRequest('http://localhost/x'), { params: Promise.resolve({ id: matricula }) })
    return res.status
  }

  it('aluno do portal baixa o próprio, não o de colega', async () => {
    sessao.atual = { user: { id: 'portal', escolaId: A.escola, isPortalUser: true, isStaff: false, isSuperuser: false, isDirecao: false, estudanteId: A.ana } }
    expect(await baixar(`${SUFIXO}-A-1`)).toBe(200)
    expect(await baixar(`${SUFIXO}-A-2`)).toBe(404)
  })

  it('equipe baixa com frequência; escola B não baixa o de A', async () => {
    sessao.atual = { user: { id: 'adm', escolaId: A.escola, isPortalUser: false, isStaff: true, isSuperuser: true, isDirecao: true, estudanteId: null } }
    expect(await baixar(`${SUFIXO}-A-1`)).toBe(200)
    sessao.atual = { user: { id: 'adm', escolaId: B.escola, isPortalUser: false, isStaff: true, isSuperuser: true, isDirecao: true, estudanteId: null } }
    expect(await baixar(`${SUFIXO}-A-1`)).toBe(404)
  })
})

describe('PDF geral da turma', () => {
  it('gera com a coluna de frequência', async () => {
    sessao.atual = { user: { id: 'adm', escolaId: A.escola, isPortalUser: false, isStaff: true, isSuperuser: true, isDirecao: true, estudanteId: null } }
    const { GET } = await import('@/app/api/relatorio/turma/[id]/pdf/route')
    const res = await GET(new NextRequest('http://localhost/x'), { params: Promise.resolve({ id: A.turma }) })
    expect(res.status).toBe(200)
  })
})
