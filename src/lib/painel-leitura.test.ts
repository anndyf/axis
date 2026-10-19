/**
 * Serviços do painel por perfil (/dashboard): cada consulta fica
 * na escola recebida, mesmo com dados parecidos em outra escola.
 */
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import { prisma } from '@/lib/prisma'
import {
  atividadesDoProfessor, comunicadosRecentes, estudantesAEE, estudantesEmRisco, numerosDaEscola, ocorrenciasRecentes,
  pendenciasPorDisciplina, professoresAtrasados,
} from '@/lib/services/painel-leitura'

vi.setConfig({ testTimeout: 60_000 })

const SUFIXO = `painel-${Date.now()}`
const ANO = 2026
const E: Record<string, { escola: string; professor: string; estudante: string }> = {}

beforeAll(async () => {
  for (const l of ['a', 'b']) {
    const escola = (await prisma.escola.create({ data: { nome: l, slug: `${SUFIXO}-${l}` } })).id
    const professor = (await prisma.user.create({ data: { escolaId: escola, username: `${SUFIXO}-${l}`, email: `${SUFIXO}-${l}@x.test`, password: 'x', name: `Prof ${l}`, isStaff: true, isApproved: true } })).id
    const turma = await prisma.turma.create({ data: { escolaId: escola, nome: `T ${l}`, anoLetivo: ANO } })
    const disciplina = await prisma.disciplina.create({ data: { turmaId: turma.id, nome: `Disc ${l}`, usuariosPermitidos: { connect: { id: professor } } } })
    const estudante = (await prisma.estudante.create({ data: { escolaId: escola, turmaId: turma.id, matricula: `${SUFIXO}-${l}`, nome: `Aluno ${l}` } })).id
    await prisma.aEEProfile.create({ data: { estudanteId: estudante, cids: [], condicao: `Cond ${l}`, recomendacoes: '' } })
    await prisma.ocorrencia.create({ data: { escolaId: escola, titulo: `Oc ${l}`, descricao: '', tipo: 'X', registradoPorId: professor, estudantes: { create: { estudanteId: estudante } } } })
    await prisma.message.create({ data: { escolaId: escola, senderId: professor, subject: `Com ${l}`, content: '', category: 'COMUNICADO', isGlobal: true } })
    const esquema = await prisma.esquemaAvaliacao.create({ data: { escolaId: escola, nome: `Esq ${l}`, numUnidades: 1 } })
    const unidade = await prisma.esquemaUnidade.create({ data: { esquemaId: esquema.id, ordem: 1, nome: 'U1' } })
    await prisma.avaliacaoDisciplina.create({ data: { disciplinaId: disciplina.id, esquemaUnidadeId: unidade.id, nome: `Prova ${l}`, notaMaxima: 10, ordem: 1, criadoPorId: professor } })
    E[l] = { escola, professor, estudante }
  }
})

afterAll(async () => {
  const escolas = Object.values(E).map((x) => x.escola)
  await prisma.message.deleteMany({ where: { escolaId: { in: escolas } } })
  await prisma.ocorrencia.deleteMany({ where: { escolaId: { in: escolas } } })
  await prisma.avaliacaoDisciplina.deleteMany({ where: { disciplina: { turma: { escolaId: { in: escolas } } } } })
  await prisma.esquemaAvaliacao.deleteMany({ where: { escolaId: { in: escolas } } })
  await prisma.estudante.deleteMany({ where: { escolaId: { in: escolas } } })
  await prisma.turma.deleteMany({ where: { escolaId: { in: escolas } } })
  await prisma.user.deleteMany({ where: { escolaId: { in: escolas } } })
  await prisma.escola.deleteMany({ where: { id: { in: escolas } } })
  await prisma.$disconnect()
})

describe('painéis por perfil: isolamento por escola', () => {
  it('números, AEE, ocorrências e comunicados só da escola pedida', async () => {
    expect(await numerosDaEscola(E.a.escola, ANO)).toEqual({ turmas: 1, estudantes: 1, professores: 1, disciplinas: 1 })
    const aee = await estudantesAEE(E.a.escola)
    expect(aee.total).toBe(1)
    expect(aee.lista.map((p) => p.estudante.nome)).toEqual(['Aluno a'])
    const oc = await ocorrenciasRecentes(E.a.escola)
    expect(oc.lista.map((o) => o.titulo)).toEqual(['Oc a'])
    expect(oc.lista[0].estudantes.map((e) => e.estudante.nome)).toEqual(['Aluno a'])
    expect((await comunicadosRecentes(E.a.escola, 'gestao')).map((c) => c.subject)).toEqual(['Com a'])
  })

  it('pendências, atrasados e atividades do professor só da escola pedida', async () => {
    const pend = await pendenciasPorDisciplina(E.a.escola, ANO)
    expect(pend.map((p) => p.disciplinaNome)).toEqual(['Disc a'])
    expect(pend[0].semNota).toBe(1)
    expect(professoresAtrasados(pend).map((p) => p.nome)).toEqual(['Prof a'])
    // Professor da escola B não vê nada pedindo a escola A
    expect(await pendenciasPorDisciplina(E.a.escola, ANO, E.b.professor)).toEqual([])
    expect((await atividadesDoProfessor(E.a.escola, E.a.professor, ANO)).map((a) => a.nome)).toEqual(['Prova a'])
    expect(await atividadesDoProfessor(E.a.escola, E.b.professor, ANO)).toEqual([])
  })

  it('estudantes em risco ignoram ids de outra escola', async () => {
    const r = await estudantesEmRisco(E.a.escola, ANO, [E.a.estudante, E.b.estudante])
    expect(r.lista.map((e) => e.nome)).toEqual(['Aluno a'])
    expect(r.lista[0]).toMatchObject({ frequencia: true, notas: false })
  })
})
