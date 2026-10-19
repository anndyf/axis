/**
 * Server actions da chamada - chamáveis direto pelo navegador, então cada
 * uma confere papel, escola e vínculo do professor com a disciplina. Mesmo
 * esquema de isolamento-escolas.test.ts: escola A x escola B.
 */
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import { prisma } from '@/lib/prisma'
import { vincularCursosSemEsquema } from '@/lib/services/esquemas-padrao'

const sessao = vi.hoisted(() => ({ atual: null as any }))
vi.mock('@/lib/auth', () => ({ auth: vi.fn(async () => sessao.atual) }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn(), unstable_cache: (fn: any) => fn }))
vi.setConfig({ testTimeout: 60_000 })

const SUFIXO = `cham-${Date.now()}`
const A: Record<string, string> = {}
const B: Record<string, string> = {}
const SEGUNDA = '2026-03-02'

async function criarEscola(dest: Record<string, string>, letra: string) {
  const escola = await prisma.escola.create({ data: { nome: `Escola ${letra} ${SUFIXO}`, slug: `${SUFIXO}-${letra.toLowerCase()}`, status: 'ATIVA' } })
  dest.escola = escola.id
  dest.admin = (await prisma.user.create({ data: { escolaId: escola.id, username: `adm-${letra}`, email: `adm-${letra}@${SUFIXO}.t`, password: 'x', isSuperuser: true, isDirecao: true, isStaff: true, isApproved: true } })).id
  dest.prof = (await prisma.user.create({ data: { escolaId: escola.id, username: `prof-${letra}`, email: `prof-${letra}@${SUFIXO}.t`, password: 'x', isStaff: true, isApproved: true } })).id
  dest.outroProf = (await prisma.user.create({ data: { escolaId: escola.id, username: `prof2-${letra}`, email: `prof2-${letra}@${SUFIXO}.t`, password: 'x', isStaff: true, isApproved: true } })).id
  const curso = await prisma.curso.create({ data: { escolaId: escola.id, nome: `Curso ${letra}`, sigla: `C${letra}`, modalidade: 'EPI', turnos: ['MATUTINO'] } })
  await vincularCursosSemEsquema(prisma, escola.id)
  await prisma.periodoLetivo.create({ data: { escolaId: escola.id, anoLetivo: 2026, inicio: new Date('2026-02-02'), fim: new Date('2026-12-18') } })
  await prisma.diaNaoLetivo.create({ data: { escolaId: escola.id, data: new Date('2026-04-21'), tipo: 'FERIADO', descricao: 'Tiradentes' } })
  dest.turma = (await prisma.turma.create({ data: { escolaId: escola.id, nome: `T${letra}`, cursoId: curso.id, turno: 'Matutino', anoLetivo: 2026 } })).id
  dest.disciplina = (await prisma.disciplina.create({ data: { nome: `Mat ${letra}`, turmaId: dest.turma, usuariosPermitidos: { connect: { id: dest.prof } } } })).id
  dest.outraDisciplina = (await prisma.disciplina.create({ data: { nome: `Por ${letra}`, turmaId: dest.turma, usuariosPermitidos: { connect: { id: dest.outroProf } } } })).id
  // Segunda: Mat no 1º e 2º tempos, Por no 3º. Terça (21/04 feriado): Mat no 1º.
  await prisma.horarioAula.createMany({ data: [
    { turmaId: dest.turma, diaSemana: 1, horario: 1, disciplina: 'Mat', disciplinaId: dest.disciplina },
    { turmaId: dest.turma, diaSemana: 1, horario: 2, disciplina: 'Mat', disciplinaId: dest.disciplina },
    { turmaId: dest.turma, diaSemana: 1, horario: 3, disciplina: 'Por', disciplinaId: dest.outraDisciplina },
    { turmaId: dest.turma, diaSemana: 2, horario: 1, disciplina: 'Mat', disciplinaId: dest.disciplina },
  ] })
  dest.aluno1 = (await prisma.estudante.create({ data: { escolaId: escola.id, turmaId: dest.turma, matricula: `${SUFIXO}-${letra}-1`, nome: `Ana ${letra}` } })).id
  dest.aluno2 = (await prisma.estudante.create({ data: { escolaId: escola.id, turmaId: dest.turma, matricula: `${SUFIXO}-${letra}-2`, nome: `Bia ${letra}` } })).id
}

const sessaoDe = (d: Record<string, string>, quem: 'admin' | 'prof' | 'outroProf', extra: Record<string, unknown> = {}) => ({
  user: { id: d[quem], escolaId: d.escola, isSuperuser: quem === 'admin', isDirecao: quem === 'admin', isStaff: true, isPortalUser: false, ...extra },
})
const acoes = () => import('@/app/dashboard/chamada/actions')

beforeAll(async () => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date('2026-10-19T15:00:00Z'))
  await criarEscola(A, 'A')
  await criarEscola(B, 'B')
  // Aula realizada em A, para tentativas de B
  const aulaA = await prisma.aula.create({ data: { escolaId: A.escola, turmaId: A.turma, disciplinaId: A.disciplina, data: new Date('2026-03-09'), tempos: [1, 2], quantidade: 2, situacao: 'REALIZADA', chave: `${A.turma}|2026-03-09|${A.disciplina}`, conteudo: 'segredo A' } })
  A.aula = aulaA.id
  await prisma.falta.create({ data: { aulaId: aulaA.id, estudanteId: A.aluno1, quantidade: 2 } })
}, 60_000)

afterAll(async () => {
  vi.useRealTimers()
  for (const escolaId of [A.escola, B.escola]) {
    if (!escolaId) continue
    await prisma.aula.deleteMany({ where: { escolaId } }) // leva faltas e observações
    await prisma.justificativa.deleteMany({ where: { escolaId } })
    await prisma.periodoLetivo.deleteMany({ where: { escolaId } })
    await prisma.diaNaoLetivo.deleteMany({ where: { escolaId } })
    await prisma.turma.deleteMany({ where: { escolaId } })
    await prisma.curso.deleteMany({ where: { escolaId } })
    await prisma.esquemaAvaliacao.deleteMany({ where: { escolaId } })
    await prisma.user.deleteMany({ where: { escolaId } })
    await prisma.escola.delete({ where: { id: escolaId } })
  }
  await prisma.$disconnect()
})

describe('chamada - fluxo do professor', () => {
  it('abre a aula do dia pelo horário (2 tempos) e salva só as faltas', async () => {
    sessao.atual = sessaoDe(B, 'prof')
    const a = await acoes()
    const aberta = await a.abrirChamada(B.turma, B.disciplina, SEGUNDA)
    if ('erro' in aberta) throw new Error(aberta.erro)
    expect(aberta.aula).toMatchObject({ quantidade: 2, tempos: [1, 2], situacao: 'PREVISTA' })
    expect(aberta.alunos.map((x) => x.nome)).toEqual(['Ana B', 'Bia B'])
    expect(JSON.stringify(aberta)).not.toContain('password')

    // reabrir não duplica
    const de_novo = await a.abrirChamada(B.turma, B.disciplina, SEGUNDA)
    expect('erro' in de_novo ? null : de_novo.aula.id).toBe(aberta.aula.id)

    expect(await a.salvarChamada(aberta.aula.id, [{ estudanteId: B.aluno1, quantidade: 1 }], 'Equações')).toEqual({ ok: true })
    const aula = await prisma.aula.findUniqueOrThrow({ where: { id: aberta.aula.id }, include: { faltas: true } })
    expect(aula.situacao).toBe('REALIZADA')
    expect(aula.conteudo).toBe('Equações')
    expect(aula.faltas).toEqual([expect.objectContaining({ estudanteId: B.aluno1, quantidade: 1 })])

    // corrigir: tira a falta
    expect(await a.salvarChamada(aberta.aula.id, [], 'Equações')).toEqual({ ok: true })
    expect(await prisma.falta.count({ where: { aulaId: aberta.aula.id } })).toBe(0)
  })

  it('recusa feriado, dia sem aula da disciplina e data futura', async () => {
    const a = await acoes()
    expect(await a.abrirChamada(B.turma, B.disciplina, '2026-04-21')).toHaveProperty('erro')
    expect(await a.abrirChamada(B.turma, B.disciplina, '2026-03-04')).toHaveProperty('erro') // quarta
    expect(await a.abrirChamada(B.turma, B.disciplina, '2026-10-26')).toHaveProperty('erro')
    expect(await prisma.aula.count({ where: { turmaId: B.turma } })).toBe(1)
  })

  it('recusa falta acima dos tempos da aula e aluno de outra turma/escola', async () => {
    const a = await acoes()
    const aula = await prisma.aula.findFirstOrThrow({ where: { turmaId: B.turma } })
    expect(await a.salvarChamada(aula.id, [{ estudanteId: B.aluno1, quantidade: 3 }], '')).toHaveProperty('erro')
    expect(await a.salvarChamada(aula.id, [{ estudanteId: A.aluno1, quantidade: 1 }], '')).toHaveProperty('erro')
    expect(await prisma.falta.count({ where: { estudanteId: A.aluno1 } })).toBe(1)
  })

  it('professor não abre nem salva a chamada de disciplina que não é dele', async () => {
    const a = await acoes()
    expect(await a.abrirChamada(B.turma, B.outraDisciplina, SEGUNDA)).toHaveProperty('erro')
    sessao.atual = sessaoDe(B, 'outroProf')
    const aula = await prisma.aula.findFirstOrThrow({ where: { turmaId: B.turma, disciplinaId: B.disciplina } })
    expect(await a.salvarChamada(aula.id, [{ estudanteId: B.aluno2, quantidade: 1 }], 'x')).toHaveProperty('erro')
    expect(await a.cancelarAula(aula.id, 'x')).toHaveProperty('erro')
    expect(await prisma.falta.count({ where: { aulaId: aula.id } })).toBe(0)
  })

  it('aula não dada deixa de contar', async () => {
    sessao.atual = sessaoDe(B, 'prof')
    const a = await acoes()
    const aula = await prisma.aula.findFirstOrThrow({ where: { turmaId: B.turma, disciplinaId: B.disciplina } })
    expect(await a.cancelarAula(aula.id, 'Passeio')).toEqual({ ok: true })
    expect((await prisma.aula.findUniqueOrThrow({ where: { id: aula.id } })).situacao).toBe('CANCELADA')
  })

  it('chamada diária (POR_DIA) não tem disciplina', async () => {
    sessao.atual = sessaoDe(B, 'admin')
    const turma = await prisma.turma.findUniqueOrThrow({ where: { id: B.turma }, select: { cursoId: true } })
    const curso = await prisma.curso.findUniqueOrThrow({ where: { id: turma.cursoId! } })
    await prisma.esquemaAvaliacao.update({ where: { id: curso.esquemaAvaliacaoId! }, data: { registroFrequencia: 'POR_DIA' } })
    const a = await acoes()
    const aberta = await a.abrirChamada(B.turma, B.outraDisciplina, '2026-03-03')
    if ('erro' in aberta) throw new Error(aberta.erro)
    expect(aberta.disciplina).toBeNull()
    expect(aberta.aula.quantidade).toBe(1)
    await prisma.esquemaAvaliacao.update({ where: { id: curso.esquemaAvaliacaoId! }, data: { registroFrequencia: 'POR_AULA' } })
  })
})

describe('chamada - isolamento entre escolas', () => {
  it('gestão de B não abre, salva nem cancela aula de A', async () => {
    sessao.atual = sessaoDe(B, 'admin')
    const a = await acoes()
    expect(await a.abrirChamada(A.turma, A.disciplina, SEGUNDA)).toHaveProperty('erro')
    expect(await a.salvarChamada(A.aula, [], 'HACK')).toHaveProperty('erro')
    expect(await a.cancelarAula(A.aula, 'HACK')).toHaveProperty('erro')
    expect(await a.abrirChamada(B.turma, A.disciplina, SEGUNDA)).toHaveProperty('erro')
    const aula = await prisma.aula.findUniqueOrThrow({ where: { id: A.aula }, include: { faltas: true } })
    expect(aula).toMatchObject({ situacao: 'REALIZADA', conteudo: 'segredo A' })
    expect(aula.faltas).toHaveLength(1)
    expect(await prisma.aula.count({ where: { turmaId: A.turma } })).toBe(1)
  })

  it('aluno do portal não usa a chamada', async () => {
    sessao.atual = sessaoDe(B, 'prof', { isStaff: false, isPortalUser: true })
    const a = await acoes()
    expect(await a.abrirChamada(B.turma, B.disciplina, SEGUNDA)).toEqual({ erro: 'Não autorizado' })
  })
})

describe('chamada - falta por tempo e observação', () => {
  const DIA = '2026-03-16' // segunda: Mat no 1º e 2º tempos
  let aulaId = ''

  it('grava os tempos de cada falta; quantidade = nº de tempos', async () => {
    sessao.atual = sessaoDe(B, 'prof')
    const a = await acoes()
    const aberta = await a.abrirChamada(B.turma, B.disciplina, DIA)
    if ('erro' in aberta) throw new Error(aberta.erro)
    aulaId = aberta.aula.id
    expect(await a.salvarChamada(aulaId, [{ estudanteId: B.aluno1, tempos: [2] }, { estudanteId: B.aluno2, tempos: [1, 2] }], '')).toEqual({ ok: true })
    const faltas = await prisma.falta.findMany({ where: { aulaId }, orderBy: { quantidade: 'asc' } })
    expect(faltas.map((f) => [f.estudanteId, f.quantidade, f.tempos])).toEqual([[B.aluno1, 1, [2]], [B.aluno2, 2, [1, 2]]])
    const reaberta = await a.abrirChamada(B.turma, B.disciplina, DIA)
    if ('erro' in reaberta) throw new Error(reaberta.erro)
    expect(reaberta.faltas[B.aluno1]).toEqual({ quantidade: 1, tempos: [2] })
    // formato antigo (só quantidade) continua valendo: primeiros tempos da aula
    expect(await a.salvarChamada(aulaId, [{ estudanteId: B.aluno1, quantidade: 1 }], '')).toEqual({ ok: true })
    expect((await prisma.falta.findFirstOrThrow({ where: { aulaId } })).tempos).toEqual([1])
  })

  it('recusa tempo que não é da aula (e não apaga a chamada anterior)', async () => {
    const a = await acoes()
    expect(await a.salvarChamada(aulaId, [{ estudanteId: B.aluno1, tempos: [3] }], '')).toEqual({ erro: 'Tempo não pertence a esta aula.' })
    expect(await a.salvarChamada(aulaId, [{ estudanteId: B.aluno1, tempos: [1, 1] }], '')).toHaveProperty('erro')
    expect(await prisma.falta.count({ where: { aulaId } })).toBe(1)
  })

  it('observação por aluno: grava, mostra na chamada, apaga com texto vazio', async () => {
    const a = await acoes()
    expect(await a.salvarObservacao(aulaId, B.aluno2, '  chegou no 2º tempo  ')).toEqual({ ok: true })
    const obs = await prisma.observacaoChamada.findFirstOrThrow({ where: { aulaId } })
    expect(obs).toMatchObject({ estudanteId: B.aluno2, texto: 'chegou no 2º tempo', autorId: B.prof })
    const aberta = await a.abrirChamada(B.turma, B.disciplina, DIA)
    if ('erro' in aberta) throw new Error(aberta.erro)
    expect(aberta.observacoes).toEqual({ [B.aluno2]: 'chegou no 2º tempo' })
    // a gestão vê e edita
    sessao.atual = sessaoDe(B, 'admin')
    expect(await a.salvarObservacao(aulaId, B.aluno2, 'OBS SECRETA B')).toEqual({ ok: true })
    sessao.atual = sessaoDe(B, 'prof')
    expect(await a.salvarObservacao(aulaId, B.aluno1, 'temporária')).toEqual({ ok: true })
    expect(await a.salvarObservacao(aulaId, B.aluno1, '   ')).toEqual({ ok: true })
    expect(await prisma.observacaoChamada.count({ where: { aulaId } })).toBe(1)
  })

  it('outro professor não lê nem grava observação da disciplina que não é dele', async () => {
    sessao.atual = sessaoDe(B, 'outroProf')
    const a = await acoes()
    expect(await a.salvarObservacao(aulaId, B.aluno1, 'intruso')).toEqual({ erro: 'Aula não encontrada' })
    expect(await a.abrirChamada(B.turma, B.disciplina, DIA)).toHaveProperty('erro')
    expect(await prisma.observacaoChamada.count({ where: { aulaId, texto: 'intruso' } })).toBe(0)
  })

  it('escola B não grava observação em aula de A, nem para aluno de A numa aula de B', async () => {
    sessao.atual = sessaoDe(B, 'admin')
    const a = await acoes()
    expect(await a.salvarObservacao(A.aula, A.aluno1, 'HACK')).toEqual({ erro: 'Aula não encontrada' })
    expect(await a.salvarObservacao(aulaId, A.aluno1, 'HACK')).toEqual({ erro: 'Aluno não pertence a esta turma.' })
    sessao.atual = sessaoDe(A, 'admin')
    expect(await a.salvarObservacao(aulaId, B.aluno1, 'HACK')).toEqual({ erro: 'Aula não encontrada' })
    expect(await prisma.observacaoChamada.count({ where: { texto: 'HACK' } })).toBe(0)
  })

  it('observação não vai para o portal do aluno', async () => {
    sessao.atual = { user: { id: 'portal', escolaId: B.escola, estudanteId: B.aluno2, isPortalUser: true, isStaff: false, isSuperuser: false, isDirecao: false } }
    const portal = await import('@/app/portal/actions')
    const dados = await portal.getStudentPortalData()
    expect(dados).not.toHaveProperty('error')
    expect(JSON.stringify(dados)).not.toContain('OBS SECRETA')
    const a = await acoes()
    expect(await a.salvarObservacao(aulaId, B.aluno2, 'aluno escrevendo')).toEqual({ erro: 'Aula não encontrada' })
  })
})

describe('justificativas - permissões e isolamento', () => {
  const j = () => import('@/app/dashboard/frequencia/actions')

  it('gestão registra e remove justificativa de aluno da própria escola', async () => {
    sessao.atual = sessaoDe(B, 'admin')
    const a = await j()
    expect(await a.criarJustificativa({ estudanteId: B.aluno1, inicio: '2026-03-02', fim: '2026-03-04', tipo: 'ATESTADO', efeito: 'ABONA', descricao: 'gripe' })).toEqual({ ok: true })
    const criada = await prisma.justificativa.findFirstOrThrow({ where: { estudanteId: B.aluno1 } })
    expect(criada).toMatchObject({ escolaId: B.escola, registradoPorId: B.admin, efeito: 'ABONA' })
    expect(await a.removerJustificativa(criada.id)).toEqual({ ok: true })
    expect(await prisma.justificativa.count({ where: { estudanteId: B.aluno1 } })).toBe(0)
  })

  it('valida datas, tipo e efeito', async () => {
    const a = await j()
    expect(await a.criarJustificativa({ estudanteId: B.aluno1, inicio: '2026-03-05', fim: '2026-03-04', tipo: 'ATESTADO', efeito: 'ABONA' })).toHaveProperty('erro')
    expect(await a.criarJustificativa({ estudanteId: B.aluno1, inicio: '2026-03-05', fim: '2026-03-05', tipo: 'INVENTADO', efeito: 'ABONA' })).toHaveProperty('erro')
    expect(await a.criarJustificativa({ estudanteId: B.aluno1, inicio: '2026-03-05', fim: '2026-03-05', tipo: 'ATESTADO', efeito: 'APAGA' })).toHaveProperty('erro')
  })

  it('gestão de B não registra para aluno de A nem remove justificativa de A', async () => {
    const jA = await prisma.justificativa.create({ data: { escolaId: A.escola, estudanteId: A.aluno1, inicio: new Date('2026-03-02'), fim: new Date('2026-03-02'), tipo: 'ATESTADO', efeito: 'ABONA' } })
    const a = await j()
    expect(await a.criarJustificativa({ estudanteId: A.aluno2, inicio: '2026-03-02', fim: '2026-03-02', tipo: 'ATESTADO', efeito: 'ABONA' })).toHaveProperty('erro')
    expect(await a.removerJustificativa(jA.id)).toHaveProperty('erro')
    expect(await prisma.justificativa.count({ where: { escolaId: A.escola } })).toBe(1)
    expect(await prisma.justificativa.count({ where: { estudanteId: A.aluno2 } })).toBe(0)
  })

  it('professor e aluno do portal não registram', async () => {
    const a = await j()
    sessao.atual = sessaoDe(B, 'prof')
    expect(await a.criarJustificativa({ estudanteId: B.aluno1, inicio: '2026-03-02', fim: '2026-03-02', tipo: 'ATESTADO', efeito: 'ABONA' })).toEqual({ erro: 'Não autorizado' })
    sessao.atual = sessaoDe(B, 'admin', { isPortalUser: true })
    expect(await a.criarJustificativa({ estudanteId: B.aluno1, inicio: '2026-03-02', fim: '2026-03-02', tipo: 'ATESTADO', efeito: 'ABONA' })).toEqual({ erro: 'Não autorizado' })
    expect(await prisma.justificativa.count({ where: { estudanteId: B.aluno1 } })).toBe(0)
  })
})
