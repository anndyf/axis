/**
 * Cadeado de unidade encerrada - integração (banco de teste, sessão falsa).
 *
 * "Hoje" fixo em 21/10/2026 (fuso da escola). Esquema anual (3 unidades):
 * - 1ª Unidade: 09/02 a 29/05, prazo 05/06 → encerrada pelo prazo desde 06/06;
 * - 2ª Unidade: 01/06 a 30/09, prazo 30/10 → aberta (encerramento manual);
 * - 3ª Unidade: 01/10 a 18/12, prazo 20/12 → aberta (a última: recuperação e conselho).
 * 02/02 é dia letivo fora de qualquer unidade.
 * Escola A × escola B: o que acontece numa não afeta a outra.
 */
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { vincularCursosSemEsquema } from '@/lib/services/esquemas-padrao'
import { permissoesDosPapeis } from '@/lib/permissoes'

const sessao = vi.hoisted(() => ({ atual: null as any }))
vi.mock('@/lib/auth', () => ({ auth: vi.fn(async () => sessao.atual) }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn(), revalidateTag: vi.fn(), unstable_cache: (fn: any) => fn }))
vi.setConfig({ testTimeout: 60_000 })

const SUFIXO = `cad-${Date.now()}`
const A: Record<string, any> = {}
const B: Record<string, any> = {}
const HOJE = new Date('2026-10-21T15:00:00Z') // 12h em Brasília

const MSG_U1 = 'A 1ª Unidade foi encerrada em 06/06/2026. Para alterar, solicite a reabertura à coordenação.'
const MSG_U2_HOJE = 'A 2ª Unidade foi encerrada em 21/10/2026. Para alterar, solicite a reabertura à coordenação.'

async function criarEscola(d: Record<string, any>, letra: string) {
  const escola = await prisma.escola.create({ data: { nome: `Escola ${letra} ${SUFIXO}`, slug: `${SUFIXO}-${letra.toLowerCase()}`, status: 'ATIVA' } })
  d.escola = escola.id
  const conta = async (nome: string, extra: Record<string, unknown> = {}) =>
    (await prisma.user.create({ data: { escolaId: escola.id, username: `${nome}-${letra}`, email: `${nome}-${letra}@${SUFIXO}.t`, password: 'x', isApproved: true, ...extra } })).id
  d.prof = await conta('prof', { isStaff: true })
  d.outroProf = await conta('prof2', { isStaff: true })
  d.direcao = await conta('dir', { isDirecao: true })
  d.coord = await conta('coord')
  d.secretaria = await conta('sec')
  d.aee = await conta('aee', { isAEE: true })
  d.admin = await conta('adm', { isSuperuser: true })

  const curso = await prisma.curso.create({ data: { escolaId: escola.id, nome: `Curso ${letra}`, sigla: `C${letra}`, modalidade: 'EPI', turnos: ['MATUTINO'] } })
  await vincularCursosSemEsquema(prisma, escola.id)
  const esquema = await prisma.esquemaAvaliacao.findFirstOrThrow({
    where: { escolaId: escola.id, numUnidades: 3 },
    include: { unidades: { orderBy: { ordem: 'asc' }, include: { atividades: true } } },
  })
  d.unidades = esquema.unidades
  const periodo = await prisma.periodoLetivo.create({ data: { escolaId: escola.id, anoLetivo: 2026, inicio: new Date('2026-02-02'), fim: new Date('2026-12-18') } })
  const datas = [['2026-02-09', '2026-05-29', '2026-06-05'], ['2026-06-01', '2026-09-30', '2026-10-30'], ['2026-10-01', '2026-12-18', '2026-12-20']]
  d.etapas = []
  for (const [i, [inicio, fim, prazo]] of datas.entries()) {
    d.etapas.push((await prisma.etapaCalendario.create({
      data: { periodoLetivoId: periodo.id, esquemaUnidadeId: esquema.unidades[i].id, inicio: new Date(inicio), fim: new Date(fim), prazoLancamento: new Date(prazo) },
    })).id)
  }

  d.turma = (await prisma.turma.create({ data: { escolaId: escola.id, nome: `T${letra}`, cursoId: curso.id, turno: 'Matutino', anoLetivo: 2026 } })).id
  d.mat = (await prisma.disciplina.create({ data: { nome: `Mat ${letra}`, turmaId: d.turma, usuariosPermitidos: { connect: { id: d.prof } } } })).id
  d.por = (await prisma.disciplina.create({ data: { nome: `Por ${letra}`, turmaId: d.turma, usuariosPermitidos: { connect: { id: d.outroProf } } } })).id
  // Segunda: Mat no 1º e 2º tempos, Por no 3º
  await prisma.horarioAula.createMany({ data: [
    { turmaId: d.turma, diaSemana: 1, horario: 1, disciplina: 'Mat', disciplinaId: d.mat },
    { turmaId: d.turma, diaSemana: 1, horario: 2, disciplina: 'Mat', disciplinaId: d.mat },
    { turmaId: d.turma, diaSemana: 1, horario: 3, disciplina: 'Por', disciplinaId: d.por },
  ] })
  d.aluno = await prisma.estudante.create({ data: { escolaId: escola.id, turmaId: d.turma, matricula: `${SUFIXO}-${letra}-1`, nome: `Ana ${letra}` } })
  // Aula já registrada numa segunda da 1ª Unidade (16/03)
  d.aulaU1 = (await prisma.aula.create({ data: { escolaId: escola.id, turmaId: d.turma, disciplinaId: d.mat, professorId: d.prof, data: new Date('2026-03-16'), tempos: [1, 2], quantidade: 2, situacao: 'REALIZADA', chave: `${d.turma}|2026-03-16|${d.mat}` } })).id
}

const PAPEIS: Record<string, string[]> = {
  prof: ['PROFESSOR'], outroProf: ['PROFESSOR'], direcao: ['DIRECAO'], coord: ['COORDENACAO'],
  secretaria: ['SECRETARIA'], aee: ['AEE'], admin: ['ADMINISTRADOR'],
}
function como(d: Record<string, any>, quem: keyof typeof PAPEIS) {
  sessao.atual = { user: { id: d[quem], escolaId: d.escola, username: `${quem}`, papeis: PAPEIS[quem], permissoes: [...permissoesDosPapeis(PAPEIS[quem])] } }
}

const gestao = () => import('@/app/dashboard/configuracoes/encerramento/actions')
const chamada = () => import('@/app/dashboard/chamada/actions')

async function post(caminho: string, corpo: unknown) {
  const mod = await import(`@/app/api/${caminho}/route`)
  const res: Response = await mod.POST(new NextRequest(`http://localhost/api/${caminho}`, { method: 'POST', body: JSON.stringify(corpo), headers: { 'Content-Type': 'application/json' } }))
  return { status: res.status, corpo: await res.json() }
}

/** Lança a nota da unidade `u` (0, 1, 2) da disciplina para o aluno. */
function lancar(d: Record<string, any>, disciplina: string, u: number, valor: number) {
  const unidade = d.unidades[u]
  return post('notas/lancar', { notas: [{ estudanteId: d.aluno.matricula, disciplinaId: disciplina, unidades: [{ esquemaUnidadeId: unidade.id, atividades: [{ esquemaAtividadeId: unidade.atividades[0].id, valor }] }] }] })
}

beforeAll(async () => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(HOJE)
  await criarEscola(A, 'A')
  await criarEscola(B, 'B')
}, 60_000)

afterAll(async () => {
  vi.useRealTimers()
  for (const escolaId of [A.escola, B.escola]) {
    if (!escolaId) continue
    await prisma.reaberturaUnidade.deleteMany({ where: { escolaId } })
    await prisma.auditLog.deleteMany({ where: { user: { escolaId } } })
    await prisma.aula.deleteMany({ where: { escolaId } })
    await prisma.periodoLetivo.deleteMany({ where: { escolaId } })
    await prisma.turma.deleteMany({ where: { escolaId } })
    await prisma.curso.deleteMany({ where: { escolaId } })
    await prisma.esquemaAvaliacao.deleteMany({ where: { escolaId } })
    await prisma.user.deleteMany({ where: { escolaId } })
    await prisma.escola.delete({ where: { id: escolaId } })
  }
  await prisma.$disconnect()
})

describe('encerramento pelo prazo', () => {
  it('bloqueia a nota da unidade encerrada (423, mensagem formal) e libera a aberta', async () => {
    como(A, 'prof')
    const r = await lancar(A, A.mat, 0, 7)
    expect(r).toEqual({ status: 423, corpo: { message: MSG_U1 } })
    expect(await prisma.notaUnidade.count({ where: { notaFinal: { disciplinaId: A.mat } } })).toBe(0)
    expect((await lancar(A, A.mat, 1, 6)).status).toBe(200)
    // Reenviar a 1ª Unidade sem mudar nada (vazia) não é bloqueado
    expect((await lancar(A, A.mat, 1, 6.5)).status).toBe(200)
  })

  it('sem prazo cadastrado, a unidade não encerra sozinha', async () => {
    await prisma.etapaCalendario.update({ where: { id: A.etapas[0] }, data: { prazoLancamento: null } })
    como(A, 'prof')
    expect((await lancar(A, A.mat, 0, 7)).status).toBe(200)
    await prisma.etapaCalendario.update({ where: { id: A.etapas[0] }, data: { prazoLancamento: new Date('2026-06-05') } })
    // Agora encerrada: mudar a nota já gravada é recusado, reenviar igual passa
    expect((await lancar(A, A.mat, 0, 8)).status).toBe(423)
    expect((await lancar(A, A.mat, 0, 7)).status).toBe(200)
    const nu = await prisma.notaUnidade.findFirstOrThrow({ where: { notaFinal: { disciplinaId: A.mat }, esquemaUnidadeId: A.unidades[0].id } })
    expect(nu.notaCalculada).toBe(7)
  })

  it('infrequente (não realizou) também tranca', async () => {
    como(A, 'prof')
    const u = A.unidades[0]
    const r = await post('notas/lancar', { notas: [{ estudanteId: A.aluno.matricula, disciplinaId: A.mat, unidades: [{ esquemaUnidadeId: u.id, isDesistente: true, atividades: [] }] }] })
    expect(r.status).toBe(423)
  })
})

describe('encerramento manual e desfazer', () => {
  it('só quem tem unidade.encerrar encerra, desfaz, reabre e revoga (professor, secretaria, AEE e Administrador não)', async () => {
    const g = await gestao()
    for (const quem of ['prof', 'secretaria', 'aee', 'admin'] as const) {
      como(A, quem)
      expect(await g.encerrarUnidade(A.etapas[1]), quem).toEqual({ erro: 'Não autorizado' })
      expect(await g.desfazerEncerramento(A.etapas[1], 'engano no lançamento'), quem).toEqual({ erro: 'Não autorizado' })
      expect(await g.reabrirUnidade({ etapaId: A.etapas[0], turmaId: A.turma, disciplinaId: A.mat, ate: '2026-10-25', motivo: 'atestado médico' }), quem).toEqual({ erro: 'Não autorizado' })
      expect(await g.revogarReabertura('qualquer'), quem).toEqual({ erro: 'Não autorizado' })
    }
    expect(await prisma.etapaCalendario.findUniqueOrThrow({ where: { id: A.etapas[1] } })).toMatchObject({ encerradaEm: null })
    expect(await prisma.reaberturaUnidade.count({ where: { escolaId: A.escola } })).toBe(0)
  })

  it('encerrar antes do prazo bloqueia, com auditoria', async () => {
    const g = await gestao()
    como(A, 'coord')
    expect(await g.encerrarUnidade(A.etapas[1])).toEqual({ ok: true })
    expect(await g.encerrarUnidade(A.etapas[1])).toHaveProperty('erro') // já encerrada
    const etapa = await prisma.etapaCalendario.findUniqueOrThrow({ where: { id: A.etapas[1] } })
    expect(etapa.encerradaPorId).toBe(A.coord)
    expect(Math.abs(etapa.encerradaEm!.getTime() - HOJE.getTime())).toBeLessThan(60_000)
    const log = await prisma.auditLog.findFirstOrThrow({ where: { entityType: 'UNIDADE', entityId: A.etapas[1], userId: A.coord } })
    expect(JSON.parse(log.details!)).toMatchObject({ operacao: 'Encerrou a unidade', alvo: '2ª Unidade' })

    como(A, 'prof')
    expect(await lancar(A, A.mat, 1, 9)).toEqual({ status: 423, corpo: { message: MSG_U2_HOJE } })
  })

  it('outra escola não é afetada (A × B)', async () => {
    como(B, 'prof')
    expect((await lancar(B, B.mat, 1, 9)).status).toBe(200)
    // Gestão de B não enxerga a unidade de A
    const g = await gestao()
    como(B, 'coord')
    expect(await g.desfazerEncerramento(A.etapas[1], 'tentativa de outra escola')).toEqual({ erro: 'Unidade não encontrada' })
    expect(await g.reabrirUnidade({ etapaId: A.etapas[1], turmaId: A.turma, disciplinaId: A.mat, ate: '2026-10-25', motivo: 'outra escola' })).toEqual({ erro: 'Unidade não encontrada' })
    expect(await g.reabrirUnidade({ etapaId: B.etapas[0], turmaId: A.turma, disciplinaId: A.mat, ate: '2026-10-25', motivo: 'turma de outra escola' })).toEqual({ erro: 'Turma não encontrada' })
  })

  it('desfazer o encerramento antecipado exige motivo e libera; depois do prazo não dá', async () => {
    const g = await gestao()
    como(A, 'direcao')
    expect(await g.desfazerEncerramento(A.etapas[1], '')).toHaveProperty('erro')
    expect(await g.desfazerEncerramento(A.etapas[1], 'encerrada por engano')).toEqual({ ok: true })
    const log = await prisma.auditLog.findFirstOrThrow({ where: { entityType: 'UNIDADE', entityId: A.etapas[1], userId: A.direcao } })
    expect(JSON.parse(log.details!)).toMatchObject({ operacao: 'Desfez o encerramento', motivo: 'encerrada por engano' })
    como(A, 'prof')
    expect((await lancar(A, A.mat, 1, 9)).status).toBe(200)
    // 1ª Unidade: encerrada pelo prazo (não manual) - só reabertura pontual
    como(A, 'direcao')
    expect(await g.desfazerEncerramento(A.etapas[0], 'quero liberar tudo')).toHaveProperty('erro')
    // Manual, mas o prazo já passou: também não
    await prisma.etapaCalendario.update({ where: { id: A.etapas[0] }, data: { encerradaEm: new Date('2026-06-01T12:00:00Z'), encerradaPorId: A.direcao } })
    expect(await g.desfazerEncerramento(A.etapas[0], 'quero liberar tudo')).toEqual({ erro: 'O prazo de lançamento desta unidade já passou. Use a reabertura por turma e disciplina.' })
    await prisma.etapaCalendario.update({ where: { id: A.etapas[0] }, data: { encerradaEm: null, encerradaPorId: null } })
  })
})

describe('reabertura por turma e disciplina', () => {
  it('libera só a turma + disciplina dela e só até a data', async () => {
    const g = await gestao()
    como(A, 'coord')
    expect(await g.reabrirUnidade({ etapaId: A.etapas[1], turmaId: A.turma, disciplinaId: A.mat, ate: '2026-10-25', motivo: 'unidade aberta' })).toHaveProperty('erro') // 2ª está aberta
    expect(await g.reabrirUnidade({ etapaId: A.etapas[0], turmaId: A.turma, disciplinaId: A.mat, ate: '2026-11-21', motivo: 'longa demais' })).toHaveProperty('erro') // > 30 dias
    expect(await g.reabrirUnidade({ etapaId: A.etapas[0], turmaId: A.turma, disciplinaId: A.mat, ate: '2026-10-20', motivo: 'no passado' })).toHaveProperty('erro')
    expect(await g.reabrirUnidade({ etapaId: A.etapas[0], turmaId: A.turma, disciplinaId: A.mat, ate: '2026-10-25', motivo: '' })).toHaveProperty('erro')
    expect(await g.reabrirUnidade({ etapaId: A.etapas[0], turmaId: A.turma, disciplinaId: null, ate: '2026-10-25', motivo: 'sem disciplina' })).toEqual({ erro: 'Escolha a disciplina.' }) // turma POR_AULA
    expect(await g.reabrirUnidade({ etapaId: A.etapas[0], turmaId: A.turma, disciplinaId: A.mat, ate: '2026-10-25', motivo: 'atestado do professor' })).toEqual({ ok: true })
    expect(await g.reabrirUnidade({ etapaId: A.etapas[0], turmaId: A.turma, disciplinaId: A.mat, ate: '2026-10-28', motivo: 'de novo' })).toHaveProperty('erro') // já há uma ativa

    como(A, 'prof')
    expect((await lancar(A, A.mat, 0, 8)).status).toBe(200)
    como(A, 'outroProf')
    expect(await lancar(A, A.por, 0, 8)).toEqual({ status: 423, corpo: { message: MSG_U1 } })
    como(B, 'prof')
    expect((await lancar(B, B.mat, 0, 8)).status).toBe(423) // B continua trancada

    // Passada a data, tranca de novo sozinha
    vi.setSystemTime(new Date('2026-10-26T15:00:00Z'))
    como(A, 'prof')
    expect((await lancar(A, A.mat, 0, 9)).status).toBe(423)
    vi.setSystemTime(HOJE)
    expect((await lancar(A, A.mat, 0, 9)).status).toBe(200)
  })

  it('professor sem docência continua bloqueado pela regra antiga mesmo com reabertura', async () => {
    como(A, 'outroProf')
    expect((await lancar(A, A.mat, 0, 5)).status).toBe(403)
    como(A, 'direcao')
    expect((await lancar(A, A.mat, 0, 5)).status).toBe(403) // Direção sem docência só visualiza
  })

  it('revogada volta a bloquear', async () => {
    const g = await gestao()
    const r = await prisma.reaberturaUnidade.findFirstOrThrow({ where: { escolaId: A.escola, disciplinaId: A.mat, revogadaEm: null } })
    como(B, 'coord')
    expect(await g.revogarReabertura(r.id)).toEqual({ erro: 'Reabertura não encontrada' }) // outra escola
    como(A, 'coord')
    expect(await g.revogarReabertura(r.id)).toEqual({ ok: true })
    expect(await g.revogarReabertura(r.id)).toHaveProperty('erro')
    expect(await prisma.reaberturaUnidade.findUniqueOrThrow({ where: { id: r.id } })).toMatchObject({ revogadaPorId: A.coord })
    como(A, 'prof')
    expect((await lancar(A, A.mat, 0, 10)).status).toBe(423)
  })
})

describe('chamada e diário', () => {
  it('data dentro da unidade encerrada bloqueia; fora de qualquer unidade não', async () => {
    const c = await chamada()
    como(A, 'prof')
    expect(await c.abrirChamada(A.turma, A.mat, '2026-03-09')).toEqual({ erro: MSG_U1 }) // não cria aula
    expect(await prisma.aula.count({ where: { turmaId: A.turma, data: new Date('2026-03-09') } })).toBe(0)
    const fora = await c.abrirChamada(A.turma, A.mat, '2026-02-02')
    if ('erro' in fora) throw new Error(fora.erro)
    expect(fora.trancada).toBeNull()
    expect(await c.salvarChamada(fora.aula.id, [{ estudanteId: A.aluno.id, quantidade: 1 }], 'Apresentação')).toEqual({ ok: true })

    // Aula já registrada na 1ª Unidade: abre só para leitura; gravar é recusado
    const dentro = await c.abrirChamada(A.turma, A.mat, '2026-03-16')
    if ('erro' in dentro) throw new Error(dentro.erro)
    expect(dentro.trancada).toBe(MSG_U1)
    expect(await c.salvarChamada(A.aulaU1, [], 'mudou')).toEqual({ erro: MSG_U1 })
    expect(await c.cancelarAula(A.aulaU1, 'não houve')).toEqual({ erro: MSG_U1 })
    expect(await c.salvarObservacao(A.aulaU1, A.aluno.id, 'chegou atrasada')).toEqual({ erro: MSG_U1 })
    expect(await prisma.aula.findUniqueOrThrow({ where: { id: A.aulaU1 } })).toMatchObject({ situacao: 'REALIZADA', conteudo: null })
  })

  it('reabertura da disciplina libera a chamada do período; outra disciplina continua trancada', async () => {
    const g = await gestao()
    como(A, 'direcao')
    expect(await g.reabrirUnidade({ etapaId: A.etapas[0], turmaId: A.turma, disciplinaId: A.mat, ate: '2026-10-22', motivo: 'corrigir chamada de março' })).toEqual({ ok: true })
    const c = await chamada()
    como(A, 'prof')
    expect(await c.salvarChamada(A.aulaU1, [], 'Frações')).toEqual({ ok: true })
    como(A, 'outroProf')
    expect(await c.abrirChamada(A.turma, A.por, '2026-03-16')).toEqual({ erro: MSG_U1 })
    const r = await prisma.reaberturaUnidade.findFirstOrThrow({ where: { escolaId: A.escola, revogadaEm: null } })
    como(A, 'direcao')
    expect(await g.revogarReabertura(r.id)).toEqual({ ok: true })
  })
})

describe('recuperação final e conselho seguem a última unidade', () => {
  it('última unidade aberta libera; encerrada bloqueia; reaberta para a turma + disciplina libera só ela', async () => {
    // Notas finais de Mat e Por para a aluna
    como(A, 'prof')
    expect((await lancar(A, A.mat, 2, 3)).status).toBe(200)
    como(A, 'outroProf')
    expect((await lancar(A, A.por, 2, 3)).status).toBe(200)
    const notaMat = await prisma.notaFinal.findFirstOrThrow({ where: { disciplinaId: A.mat } })
    const notaPor = await prisma.notaFinal.findFirstOrThrow({ where: { disciplinaId: A.por } })
    const recuperar = (notaId: string) => post('notas/recuperacao', { notas: [{ notaId, notaRecuperacao: 6 }] })
    const conselho = (notaId: string) => post('conselho-classe', { decisoes: [{ notaId, novoStatus: 'APROVADO_CONSELHO' }] })

    como(A, 'prof')
    expect((await recuperar(notaMat.id)).status).toBe(200)

    const g = await gestao()
    como(A, 'coord')
    expect(await g.encerrarUnidade(A.etapas[2])).toEqual({ ok: true })
    const msg = 'A 3ª Unidade foi encerrada em 21/10/2026. Para alterar, solicite a reabertura à coordenação.'
    como(A, 'prof')
    expect(await recuperar(notaMat.id)).toEqual({ status: 423, corpo: { message: msg } })
    como(A, 'coord')
    expect(await conselho(notaMat.id)).toEqual({ status: 423, corpo: { message: msg } })

    // Encerrar a 2ª (não a última) não mexe na recuperação de B
    como(B, 'prof')
    const notaB = await prisma.notaFinal.findFirstOrThrow({ where: { disciplinaId: B.mat } })
    expect((await recuperar(notaB.id)).status).toBe(200)

    como(A, 'coord')
    expect(await g.reabrirUnidade({ etapaId: A.etapas[2], turmaId: A.turma, disciplinaId: A.mat, ate: '2026-10-28', motivo: 'conselho extraordinário' })).toEqual({ ok: true })
    como(A, 'prof')
    expect((await recuperar(notaMat.id)).status).toBe(200)
    como(A, 'coord')
    expect((await conselho(notaMat.id)).status).toBe(200)
    expect((await conselho(notaPor.id)).status).toBe(423)
    como(A, 'outroProf')
    expect((await recuperar(notaPor.id)).status).toBe(423)
  })
})

describe('avaliações do professor (esquema com atividades definidas pelo professor)', () => {
  it('etapa encerrada não recebe, não edita e não perde avaliações', async () => {
    // Turma com esquema próprio no modo PROFESSOR, com as mesmas datas no calendário
    const esquema = await prisma.esquemaAvaliacao.create({
      data: {
        escolaId: A.escola, nome: `Prof ${SUFIXO}`, numUnidades: 2, definicaoAtividades: 'PROFESSOR',
        unidades: { create: [1, 2].map((ordem) => ({ ordem, nome: `${ordem}ª Unidade`, atividades: { create: [{ nome: 'Teto', notaMaxima: 10, ordem: 1 }] } })) },
      },
      include: { unidades: { orderBy: { ordem: 'asc' } } },
    })
    const periodo = await prisma.periodoLetivo.findFirstOrThrow({ where: { escolaId: A.escola, anoLetivo: 2026 } })
    await prisma.etapaCalendario.create({ data: { periodoLetivoId: periodo.id, esquemaUnidadeId: esquema.unidades[0].id, inicio: new Date('2026-02-09'), fim: new Date('2026-05-29'), prazoLancamento: new Date('2026-06-05') } })
    await prisma.etapaCalendario.create({ data: { periodoLetivoId: periodo.id, esquemaUnidadeId: esquema.unidades[1].id, inicio: new Date('2026-06-01'), fim: new Date('2026-12-18'), prazoLancamento: new Date('2026-12-20') } })
    const turma = await prisma.turma.create({ data: { escolaId: A.escola, nome: 'TP', esquemaAvaliacaoId: esquema.id, anoLetivo: 2026 } })
    const disc = await prisma.disciplina.create({ data: { nome: 'Fís', turmaId: turma.id, usuariosPermitidos: { connect: { id: A.prof } } } })
    // Avaliação já existente na 1ª etapa (antes do encerramento)
    const antiga = await prisma.avaliacaoDisciplina.create({ data: { disciplinaId: disc.id, esquemaUnidadeId: esquema.unidades[0].id, nome: 'Prova 1', notaMaxima: 5, ordem: 1 } })

    const av = await import('@/app/dashboard/notas/avaliacoes/actions')
    como(A, 'prof')
    const dados = { nome: 'Trabalho', data: '', notaMaxima: 3, peso: 1 }
    expect(await av.criarAvaliacao(disc.id, esquema.unidades[0].id, dados)).toEqual({ erro: MSG_U1 })
    expect(await av.editarAvaliacao(antiga.id, { ...dados, notaMaxima: 5 })).toEqual({ erro: MSG_U1 })
    expect(await av.removerAvaliacao(antiga.id)).toEqual({ erro: MSG_U1 })
    expect(await av.criarAvaliacao(disc.id, esquema.unidades[1].id, dados)).toEqual({ ok: true })
    expect(await prisma.avaliacaoDisciplina.count({ where: { disciplinaId: disc.id } })).toBe(2)

    await prisma.turma.delete({ where: { id: turma.id } }) // leva disciplina e avaliações
    await prisma.etapaCalendario.deleteMany({ where: { esquemaUnidade: { esquemaId: esquema.id } } })
  })
})

describe('painel da gestão', () => {
  it('lista as unidades que encerram em até 7 dias e as reaberturas ativas, só da escola', async () => {
    const { avisosDoCadeado } = await import('@/lib/services/painel-leitura')
    await prisma.etapaCalendario.update({ where: { id: B.etapas[1] }, data: { prazoLancamento: new Date('2026-10-25') } })
    const g = await gestao()
    como(B, 'coord')
    expect(await g.reabrirUnidade({ etapaId: B.etapas[0], turmaId: B.turma, disciplinaId: B.mat, ate: '2026-10-23', motivo: 'ajuste de notas' })).toEqual({ ok: true })
    const avisos = await avisosDoCadeado(B.escola, 2026)
    expect(avisos.map((a) => [a.tipo, a.titulo, a.data])).toEqual([
      ['reaberta', 'TB · Mat B', '2026-10-23'],
      ['encerra', '2ª Unidade encerra (3 Unidades (Legado))', '2026-10-26'],
    ])
    // A 3ª de B encerra em 21/12: fora da janela; nada de A aparece
    expect(avisos.some((a) => a.titulo.includes(' A'))).toBe(false)
    await prisma.etapaCalendario.update({ where: { id: B.etapas[1] }, data: { prazoLancamento: new Date('2026-10-30') } })
  })
})
