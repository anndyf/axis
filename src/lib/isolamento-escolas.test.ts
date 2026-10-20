/**
 * Teste de isolamento entre escolas (plano-roteiro-ferramentas.md, P0).
 *
 * Chama os route handlers de verdade, contra o banco de teste, com uma
 * sessão de DIREÇÃO + SUPERUSER da escola B pedindo/alterando dados da
 * escola A pelos ids. Toda tentativa precisa ser recusada (401/403/404/400
 * ou lista sem os dados de A) e, no fim, nada da escola A pode ter mudado.
 *
 * Rota nova que recebe id (path, query ou corpo) deve entrar aqui.
 */
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { vincularCursosSemEsquema } from '@/lib/services/esquemas-padrao'

// --- sessão falsa: sempre a escola B -----------------------------------
const sessao = vi.hoisted(() => ({ atual: null as any }))
vi.mock('@/lib/auth', () => ({ auth: vi.fn(async () => sessao.atual) }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn(), revalidateTag: vi.fn(), unstable_cache: (fn: any) => fn }))
vi.mock('next/headers', () => ({ headers: vi.fn(async () => new Headers({ 'x-escola-id': sessao.atual?.user?.escolaId ?? '' })) }))
vi.mock('@/lib/mail', () => ({ enviarSenhaPorEmail: vi.fn(async () => true), enviarLinkRedefinicaoSenha: vi.fn(async () => true) }))

// Cada rota é compilada na 1ª importação - pode passar dos 5s padrão
vi.setConfig({ testTimeout: 60_000 })

const SUFIXO = `iso-${Date.now()}`
const A: Record<string, string> = {}
const B: Record<string, string> = {}

async function criarEscola(dest: Record<string, string>, letra: string) {
  const escola = await prisma.escola.create({ data: { nome: `Escola ${letra} ${SUFIXO}`, slug: `${SUFIXO}-${letra.toLowerCase()}`, plano: 'ENTERPRISE', status: 'ATIVA' } })
  dest.escola = escola.id
  const admin = await prisma.user.create({ data: { escolaId: escola.id, username: `admin-${letra}`, email: `admin-${letra}@${SUFIXO}.t`, password: 'x', name: `Admin ${letra}`, isSuperuser: true, isDirecao: true, isStaff: true, isApproved: true } })
  dest.admin = admin.id
  const prof = await prisma.user.create({ data: { escolaId: escola.id, username: `prof-${letra}`, email: `prof-${letra}@${SUFIXO}.t`, password: 'x', name: `Prof ${letra}`, isStaff: true, isApproved: true } })
  dest.prof = prof.id
  const curso = await prisma.curso.create({ data: { escolaId: escola.id, nome: `Curso ${letra}`, sigla: `C${letra}`, modalidade: 'EPI', turnos: ['MATUTINO'] } })
  dest.curso = curso.id
  await vincularCursosSemEsquema(prisma, escola.id)
  dest.esquema = (await prisma.curso.findUniqueOrThrow({ where: { id: curso.id } })).esquemaAvaliacaoId!
  const turma = await prisma.turma.create({ data: { escolaId: escola.id, nome: `Turma ${letra}`, cursoId: curso.id, serie: '1', anoLetivo: 2026 } })
  dest.turma = turma.id
  const area = await prisma.areaConhecimento.create({ data: { escolaId: escola.id, nome: `Area ${letra}` } })
  dest.area = area.id
  const disc = await prisma.disciplina.create({ data: { nome: `Disciplina ${letra}`, turmaId: turma.id, areaId: area.id, usuariosPermitidos: { connect: { id: prof.id } } } })
  dest.disciplina = disc.id
  const est = await prisma.estudante.create({ data: { escolaId: escola.id, turmaId: turma.id, matricula: `${SUFIXO}-${letra}-001`, nome: `Aluno ${letra}` } })
  dest.estudante = est.id
  dest.matricula = est.matricula
  const nota = await prisma.notaFinal.create({ data: { estudanteId: est.id, disciplinaId: disc.id, nota: 4, status: 'RECUPERACAO' } })
  dest.nota = nota.id
  const aee = await prisma.aEEProfile.create({ data: { estudanteId: est.id, cids: ['F00'], condicao: `segredo ${letra}`, recomendacoes: 'x' } })
  dest.aee = aee.id
  const lab = await prisma.laboratorio.create({ data: { escolaId: escola.id, nome: `Lab ${letra}` } })
  dest.lab = lab.id
  const reserva = await prisma.reservaLaboratorio.create({ data: { laboratorioId: lab.id, userId: prof.id, data: new Date('2026-05-04'), turno: 'MATUTINO', horario: 1 } })
  dest.reserva = reserva.id
  const plano = await prisma.planoEnsino.create({ data: { disciplinaNome: `Plano ${letra}`, periodoInicio: new Date('2026-03-01'), periodoFim: new Date('2026-03-15'), indicadores: 'i', conteudos: 'c', metodologias: 'm', recursos: 'r', avaliacao: 'a', professorId: prof.id, turmas: { connect: { id: turma.id } } } })
  dest.plano = plano.id
  const questao = await prisma.questao.create({ data: { enunciado: `Questao ${letra}`, alternativaA: 'a', alternativaB: 'b', alternativaC: 'c', alternativaD: 'd', alternativaE: 'e', correta: 'A', professorId: prof.id, status: 'APROVADA', turmas: { connect: { id: turma.id } }, disciplinas: { connect: { id: disc.id } } } })
  dest.questao = questao.id
  const prova = await prisma.prova.create({ data: { titulo: `Prova ${letra} ${SUFIXO}`, turmaId: turma.id, professorCriadorId: prof.id, questoes: { connect: { id: questao.id } } } })
  dest.prova = prova.id
  const msg = await prisma.message.create({ data: { escolaId: escola.id, subject: `[Cadastro Pendente] ${letra}`, content: `conteudo ${letra}`, senderId: prof.id, category: 'SUPORTE' } })
  dest.mensagem = msg.id
  const oc = await prisma.ocorrencia.create({ data: { escolaId: escola.id, titulo: `Ocorrencia ${letra}`, descricao: 'd', tipo: 'OUTRO', registradoPorId: admin.id, estudantes: { create: { estudanteId: est.id } } } })
  dest.ocorrencia = oc.id
}

function sessaoDaEscolaB() {
  return {
    user: {
      id: B.admin, escolaId: B.escola, username: 'admin-B', name: 'Admin B', email: `admin-B@${SUFIXO}.t`,
      isSuperuser: true, isDirecao: true, isStaff: true, isAEE: true, isPortalUser: false, estudanteId: null,
    },
  }
}

type Handler = (req: NextRequest, ctx: { params: Promise<any> }) => Promise<Response>

async function chamar(handler: Handler, metodo: string, url: string, params: Record<string, string> = {}, body?: unknown) {
  const req = new NextRequest(`http://localhost${url}`, {
    method: metodo,
    ...(body !== undefined ? { body: JSON.stringify(body), headers: { 'Content-Type': 'application/json' } } : {}),
  })
  const res = await handler(req, { params: Promise.resolve(params) })
  const texto = res.headers.get('content-type')?.includes('json') ? await res.text() : ''
  return { status: res.status, texto }
}

const RECUSADO = [400, 401, 403, 404, 409]

/** Nenhum id/texto da escola A pode aparecer na resposta. */
function semDadosDeA(texto: string) {
  const vazados = Object.entries(A).filter(([k, v]) => k !== 'escola' && v && texto.includes(v)).map(([k]) => k)
  for (const marca of ['segredo A', 'Disciplina A', 'Questao A', 'Plano A', 'Lab A', 'Ocorrencia A', 'Aluno A', 'Area A', 'conteudo A']) {
    if (texto.includes(marca)) vazados.push(marca)
  }
  return vazados
}

beforeAll(async () => {
  await criarEscola(A, 'A')
  await criarEscola(B, 'B')
  sessao.atual = sessaoDaEscolaB()
}, 60_000)

afterAll(async () => {
  for (const escolaId of [A.escola, B.escola]) {
    if (!escolaId) continue
    await prisma.ocorrencia.deleteMany({ where: { escolaId } })
    await prisma.message.deleteMany({ where: { escolaId } })
    await prisma.prova.deleteMany({ where: { turma: { escolaId } } })
    await prisma.questao.deleteMany({ where: { professor: { escolaId } } })
    await prisma.planoEnsino.deleteMany({ where: { professor: { escolaId } } })
    await prisma.laboratorio.deleteMany({ where: { escolaId } })
    await prisma.turma.deleteMany({ where: { escolaId } }) // cascata: estudantes, disciplinas, notas, AEE
    await prisma.curso.deleteMany({ where: { escolaId } })
    await prisma.esquemaAvaliacao.deleteMany({ where: { escolaId } })
    await prisma.areaConhecimento.deleteMany({ where: { escolaId } })
    await prisma.auditLog.deleteMany({ where: { user: { escolaId } } })
    await prisma.messageRead.deleteMany({ where: { user: { escolaId } } })
    await prisma.globalConfig.deleteMany({ where: { escolaId } })
    await prisma.escolaModulo.deleteMany({ where: { escolaId } })
    await prisma.assinatura.deleteMany({ where: { escolaId } })
    await prisma.user.deleteMany({ where: { escolaId } })
    await prisma.escola.delete({ where: { id: escolaId } })
  }
  await prisma.$disconnect()
})

// Import tardio: os módulos de rota só podem carregar depois dos vi.mock
const rota = (caminho: string) => import(`@/app/api/${caminho}/route`)

describe('isolamento entre escolas - leitura por id', () => {
  const casos: [string, string, () => Record<string, string>, string?][] = [
    ['turmas/[id] GET', 'turmas/[id]', () => ({ id: A.turma })],
    ['notas da turma/disciplina', 'notas/turma/[turmaId]/disciplina/[disciplinaId]', () => ({ turmaId: A.turma, disciplinaId: A.disciplina })],
    ['plano de ensino', 'planos/[id]', () => ({ id: A.plano })],
    ['PDF do plano', 'planos/[id]/pdf', () => ({ id: A.plano })],
    ['prova (com gabarito)', 'provas/[id]', () => ({ id: A.prova })],
    ['PDF geral da turma', 'relatorio/turma/[id]/pdf', () => ({ id: A.turma })],
    ['PDF de resultados', 'relatorio/resultados/[id]/pdf', () => ({ id: A.turma })],
    ['PDF de status', 'relatorio/status/[id]/pdf', () => ({ id: A.turma })],
    ['PDF por disciplina', 'relatorio/turma/[id]/disciplina/[disciplinaId]/pdf', () => ({ id: A.turma, disciplinaId: A.disciplina })],
    ['PDF do boletim', 'boletim/[id]/pdf', () => ({ id: A.matricula })],
  ]
  for (const [nome, caminho, params] of casos) {
    it(nome, async () => {
      const { GET } = await rota(caminho)
      const r = await chamar(GET, 'GET', '/x', params())
      expect(RECUSADO, `${nome} respondeu ${r.status}`).toContain(r.status)
    })
  }

  it('simulados por turma/área', async () => {
    const { GET } = await rota('simulados')
    const r = await chamar(GET, 'GET', `/api/simulados?turmaId=${A.turma}&areaId=${A.area}&unidade=1`)
    expect(RECUSADO).toContain(r.status)
  })

  it('reservas de laboratório', async () => {
    const { GET } = await rota('laboratorios/reservas')
    const r = await chamar(GET, 'GET', `/api/laboratorios/reservas?labId=${A.lab}&date=2026-05-04`)
    expect(RECUSADO).toContain(r.status)
  })
})

describe('isolamento entre escolas - listas não trazem dados de A', () => {
  const listas: [string, string, string][] = [
    ['áreas', 'areas', '/api/areas'],
    ['disciplinas', 'disciplinas', '/api/disciplinas'],
    ['questões aprovadas', 'questoes', '/api/questoes?status=APROVADA'],
    ['provas', 'provas', '/api/provas'],
    ['filtros de provas', 'provas/filtros', '/api/provas/filtros'],
    ['planos', 'planos', '/api/planos'],
    ['laboratórios', 'laboratorios', '/api/laboratorios'],
    ['turmas', 'turmas', '/api/turmas'],
    ['esquemas de avaliação', 'esquemas-avaliacao', '/api/esquemas-avaliacao'],
    ['estudantes', 'estudantes', '/api/estudantes?search=Aluno'],
    ['ocorrências', 'ocorrencias', '/api/ocorrencias'],
    ['usuários', 'usuarios', '/api/usuarios'],
    ['professores pendentes', 'relatorios/professores-pendentes', '/api/relatorios/professores-pendentes?unidade=I'],
    ['matriz curricular', 'matriz', '/api/matriz'],
    ['responsáveis por simulado', 'simulados/responsaveis', '/api/simulados/responsaveis'],
    ['mesclar turmas (lista)', 'admin/merge-turmas', '/api/admin/merge-turmas'],
  ]
  for (const [nome, caminho, url] of listas) {
    it(nome, async () => {
      const { GET } = await rota(caminho)
      const r = await chamar(GET, 'GET', url)
      expect(semDadosDeA(r.texto), `${nome} vazou`).toEqual([])
    })
  }
})

describe('isolamento entre escolas - escrita', () => {
  const casos: [string, string, string, () => Record<string, string>, () => unknown][] = [
    ['renomear turma', 'turmas/[id]', 'PUT', () => ({ id: A.turma }), () => ({ nome: 'HACK' })],
    ['excluir turma', 'turmas/[id]', 'DELETE', () => ({ id: A.turma }), () => undefined],
    ['clonar turma', 'turmas/[id]/clonar', 'POST', () => ({ id: A.turma }), () => ({ nome: 'HACK', turno: 'M', numero: 9, anoLetivo: 2027 })],
    ['promover turma', 'turmas/[id]/promover', 'POST', () => ({ id: A.turma }), () => ({ nome: 'HACK', serie: '2', anoLetivo: 2027 })],
    ['editar curso', 'cursos/[id]', 'PUT', () => ({ id: A.curso }), () => ({ nome: 'HACK', sigla: 'HK' })],
    ['excluir curso', 'cursos/[id]', 'DELETE', () => ({ id: A.curso }), () => undefined],
    ['editar disciplina', 'disciplinas/[id]', 'PUT', () => ({ id: A.disciplina }), () => ({ nome: 'HACK', turmaId: A.turma })],
    ['excluir disciplina', 'disciplinas/[id]', 'DELETE', () => ({ id: A.disciplina }), () => undefined],
    ['editar plano', 'planos/[id]', 'PUT', () => ({ id: A.plano }), () => ({ disciplinaNome: 'HACK', periodoInicio: '2026-01-01', periodoFim: '2026-01-02', turmasIds: [B.turma] })],
    ['excluir plano', 'planos/[id]', 'DELETE', () => ({ id: A.plano }), () => undefined],
    ['excluir prova', 'provas/[id]', 'DELETE', () => ({ id: A.prova }), () => undefined],
    ['editar questão', 'questoes/[id]', 'PUT', () => ({ id: A.questao }), () => ({ enunciado: 'HACK' })],
    ['excluir questão', 'questoes/[id]', 'DELETE', () => ({ id: A.questao }), () => undefined],
    ['editar esquema', 'esquemas-avaliacao/[id]', 'PUT', () => ({ id: A.esquema }), () => ({ nome: 'HACK', unidades: [{ nome: 'U', atividades: [{ nome: 'a', notaMaxima: 10 }] }] })],
    ['excluir esquema', 'esquemas-avaliacao/[id]', 'DELETE', () => ({ id: A.esquema }), () => undefined],
    ['salvar ficha AEE', 'estudantes/[id]/aee', 'POST', () => ({ id: A.matricula }), () => ({ cids: [], condicao: 'HACK', recomendacoes: 'HACK' })],
    ['excluir ficha AEE', 'estudantes/[id]/aee', 'DELETE', () => ({ id: A.matricula }), () => undefined],
    ['editar estudante', 'estudantes/[id]', 'PUT', () => ({ id: A.matricula }), () => ({ nome: 'HACK', turmaId: B.turma })],
    ['excluir estudante', 'estudantes/[id]', 'DELETE', () => ({ id: A.matricula }), () => undefined],
    ['mover aluno de B para turma de A', 'estudantes/[id]', 'PUT', () => ({ id: B.matricula }), () => ({ nome: 'Aluno B', turmaId: A.turma })],
    ['cancelar reserva', 'laboratorios/reservas/[id]', 'DELETE', () => ({ id: A.reserva }), () => undefined],
    ['editar ocorrência', 'ocorrencias/[id]', 'PUT', () => ({ id: A.ocorrencia }), () => ({ titulo: 'HACK', descricao: 'x', tipo: 'OUTRO', estudantesIds: [] })],
    ['excluir ocorrência', 'ocorrencias/[id]', 'DELETE', () => ({ id: A.ocorrencia }), () => undefined],
    ['editar usuário', 'usuarios/[id]', 'PUT', () => ({ id: A.prof }), () => ({ name: 'HACK' })],
    ['dar papel a usuário de A (editor de papéis)', 'usuarios/[id]', 'PUT', () => ({ id: A.prof }), () => ({ papeis: ['ADMINISTRADOR', 'DIRECAO'] })],
    ['excluir usuário', 'usuarios/[id]', 'DELETE', () => ({ id: A.prof }), () => undefined],
    ['pausar usuário', 'usuarios/[id]/toggle-status', 'PUT', () => ({ id: A.prof }), () => ({ isActive: false })],
  ]
  for (const [nome, caminho, metodo, params, body] of casos) {
    it(nome, async () => {
      const mod = await rota(caminho)
      const r = await chamar(mod[metodo], metodo, '/x', params(), body())
      expect(RECUSADO, `${nome} respondeu ${r.status}: ${r.texto.slice(0, 120)}`).toContain(r.status)
    })
  }

  const viaCorpo: [string, string, () => unknown][] = [
    ['lançar nota em disciplina de A', 'notas/lancar', () => ({ notas: [{ estudanteId: A.matricula, disciplinaId: A.disciplina, unidades: [] }] })],
    ['recuperação em nota de A', 'notas/recuperacao', () => ({ notas: [{ notaId: A.nota, notaRecuperacao: 10 }] })],
    ['conselho em nota de A', 'conselho-classe', () => ({ decisoes: [{ notaId: A.nota, novoStatus: 'APROVADO_CONSELHO' }] })],
    ['criar disciplina em turma de A', 'disciplinas', () => ({ nome: 'HACK', turmaId: A.turma })],
    ['criar plano com turma de A', 'planos', () => ({ disciplinaNome: 'HACK', periodoInicio: '2026-01-01', periodoFim: '2026-01-02', indicadores: 'x', conteudos: 'x', metodologias: 'x', recursos: 'x', avaliacao: 'x', turmasIds: [A.turma] })],
    ['criar prova em turma de A', 'provas', () => ({ titulo: `HACK ${SUFIXO}`, turmaId: A.turma, questoesIds: [A.questao], tipo: 'OUTRO' })],
    ['lançar simulado em turma de A', 'simulados', () => ({ areaId: A.area, unidade: '1', turmaId: A.turma, notas: [{ estudanteId: A.matricula, nota: 10 }] })],
    ['importar matriz para turma de A', 'matriz/importar', () => ({ turmaId: A.turma, cursoId: A.curso, serie: '1' })],
    ['criar estudante em turma de A', 'estudantes', () => ({ nome: 'HACK', turmaId: A.turma, matricula: `${SUFIXO}-hack` })],
    ['criar turma com curso de A', 'turmas', () => ({ nome: 'HACK', cursoId: A.curso, serie: '1' })],
    ['criar reserva em laboratório de A', 'laboratorios/reservas', () => ({ laboratorioId: A.lab, data: '2026-05-05', turno: 'MATUTINO', horario: 2 })],
    ['mesclar turma de A', 'admin/merge-turmas', () => ({ fromId: A.turma, toId: B.turma })],
    ['transferir usuário de A', 'usuarios/transferir', () => ({ fromUserId: A.prof, toUserId: B.prof })],
  ]
  for (const [nome, caminho, body] of viaCorpo) {
    it(nome, async () => {
      const { POST } = await rota(caminho)
      const r = await chamar(POST, 'POST', '/x', {}, body())
      expect(RECUSADO, `${nome} respondeu ${r.status}: ${r.texto.slice(0, 120)}`).toContain(r.status)
    })
  }

  it('turmas para selecionar em mensagens (action)', async () => {
    const { getTurmasForSelect } = await import('@/app/dashboard/mensagens/actions')
    const turmas = await getTurmasForSelect()
    expect(semDadosDeA(JSON.stringify(turmas))).toEqual([])
    expect(turmas.map((t: { id: string }) => t.id)).not.toContain(A.turma)
  })

  // Fase 2: Assinatura (tabela nova com escolaId) só pelo painel da plataforma
  it('assinatura de A: direção de B não lê nem altera', async () => {
    const a = await rota('plataforma/escolas/[id]/assinatura')
    const m = await rota('plataforma/escolas/[id]/assinatura/modulos')
    expect(RECUSADO).toContain((await chamar(a.GET, 'GET', '/x', { id: A.escola })).status)
    expect(RECUSADO).toContain((await chamar(a.PATCH, 'PATCH', '/x', { id: A.escola }, { situacao: 'CANCELADA' })).status)
    expect(RECUSADO).toContain((await chamar(m.PUT, 'PUT', '/x', { id: A.escola }, { moduloId: 'DIA', estado: 'INATIVO' })).status)
    expect(await prisma.assinatura.count({ where: { escolaId: A.escola } })).toBe(0)
  })

  // Fase 3: VinculoPapel (tabela nova com escolaId) - nada de A muda pelas rotas de B
  it('vínculos de papel de A intactos depois das tentativas de B', async () => {
    const vinculos = await prisma.vinculoPapel.findMany({ where: { usuarioId: A.prof } })
    expect(vinculos.filter((v) => v.escolaId !== A.escola)).toEqual([])
    const prof = await prisma.user.findUniqueOrThrow({ where: { id: A.prof } })
    expect([prof.isSuperuser, prof.isDirecao, prof.isStaff]).toEqual([false, false, true])
    expect(await prisma.vinculoPapel.count({ where: { escolaId: A.escola, usuario: { escolaId: B.escola } } })).toBe(0)
  })

  it('criar usuário em B não gera vínculo em A', async () => {
    const { POST } = await rota('usuarios')
    const r = await chamar(POST, 'POST', '/x', {}, { name: 'Novo B', email: `novo-b@${SUFIXO}.t`, papeis: ['SECRETARIA'] })
    expect(r.status).toBe(201)
    const novo = await prisma.user.findFirstOrThrow({ where: { email: `novo-b@${SUFIXO}.t` }, include: { vinculosPapel: { include: { papel: true } } } })
    expect(novo.escolaId).toBe(B.escola)
    expect(novo.vinculosPapel.map((v) => [v.escolaId, v.papel.codigo])).toEqual([[B.escola, 'SECRETARIA']])
  })

  it('renomear laboratório de A (id no corpo)', async () => {
    const { PATCH } = await rota('laboratorios')
    const r = await chamar(PATCH, 'PATCH', '/x', {}, { id: A.lab, nome: 'HACK' })
    expect(r.status).not.toBe(200)
  })
})

// Mesmas rotas, agora com um ALUNO DO PORTAL da própria escola B: rotas
// de gestão/equipe precisam recusar mesmo dentro da escola certa.
describe('permissões - aluno do portal', () => {
  beforeAll(async () => {
    const portal = await prisma.user.create({ data: { escolaId: B.escola, username: `portal-${SUFIXO}`, email: `portal-B@${SUFIXO}.t`, password: 'x', name: 'Aluno B (portal)', isPortalUser: true, estudanteId: B.estudante, isApproved: true } })
    sessao.atual = { user: { ...sessaoDaEscolaB().user, id: portal.id, username: B.matricula, isSuperuser: false, isDirecao: false, isStaff: false, isAEE: false, isPortalUser: true, estudanteId: B.estudante } }
  })
  afterAll(() => { sessao.atual = sessaoDaEscolaB() })

  const casos: [string, string, string, () => Record<string, string>, () => unknown][] = [
    ['criar disciplina', 'disciplinas', 'POST', () => ({}), () => ({ nome: 'HACK', turmaId: B.turma })],
    ['editar disciplina', 'disciplinas/[id]', 'PUT', () => ({ id: B.disciplina }), () => ({ nome: 'HACK', turmaId: B.turma })],
    ['criar curso', 'cursos', 'POST', () => ({}), () => ({ nome: 'HACK', sigla: 'HK' })],
    ['editar curso', 'cursos/[id]', 'PUT', () => ({ id: B.curso }), () => ({ nome: 'HACK', sigla: 'HK' })],
    ['criar estudante', 'estudantes', 'POST', () => ({}), () => ({ nome: 'HACK', turmaId: B.turma, matricula: `${SUFIXO}-hack-portal` })],
    ['editar estudante', 'estudantes/[id]', 'PUT', () => ({ id: B.matricula }), () => ({ nome: 'HACK', turmaId: B.turma })],
    ['excluir estudante', 'estudantes/[id]', 'DELETE', () => ({ id: B.matricula }), () => undefined],
    ['importar matriz', 'matriz/importar', 'POST', () => ({}), () => ({ turmaId: B.turma, cursoId: B.curso, serie: '1' })],
    ['salvar ficha AEE', 'estudantes/[id]/aee', 'POST', () => ({ id: B.matricula }), () => ({ cids: [], condicao: 'HACK', recomendacoes: 'HACK' })],
  ]
  for (const [nome, caminho, metodo, params, body] of casos) {
    it(nome, async () => {
      const mod = await rota(caminho)
      const r = await chamar(mod[metodo], metodo, '/x', params(), body())
      expect(RECUSADO, `${nome} respondeu ${r.status}`).toContain(r.status)
    })
  }

  it('listar todos os estudantes da escola', async () => {
    const { GET } = await rota('estudantes')
    const r = await chamar(GET, 'GET', '/api/estudantes?search=Aluno')
    expect(RECUSADO).toContain(r.status)
  })

  it('relatório de professores pendentes', async () => {
    const { GET } = await rota('relatorios/professores-pendentes')
    const r = await chamar(GET, 'GET', '/api/relatorios/professores-pendentes')
    expect(RECUSADO).toContain(r.status)
  })

  // Fase 0 (roteiro 5.2): PDFs que conferiam só login + escola
  const pdfsDaTurma: [string, string, () => Record<string, string>][] = [
    ['PDF de resultados da turma', 'relatorio/resultados/[id]/pdf', () => ({ id: B.turma })],
    ['PDF de status da turma', 'relatorio/status/[id]/pdf', () => ({ id: B.turma })],
    ['PDF da turma por disciplina', 'relatorio/turma/[id]/disciplina/[disciplinaId]/pdf', () => ({ id: B.turma, disciplinaId: B.disciplina })],
  ]
  for (const [nome, caminho, params] of pdfsDaTurma) {
    it(nome, async () => {
      const { GET } = await rota(caminho)
      const r = await chamar(GET, 'GET', '/x', params())
      expect(RECUSADO, `${nome} respondeu ${r.status}`).toContain(r.status)
    })
  }

  it('action reportarEstudanteFaltante (cria chamado para a secretaria)', async () => {
    const { reportarEstudanteFaltante } = await import('@/app/dashboard/simulados/actions')
    const antes = await prisma.message.count({ where: { escolaId: B.escola } })
    const r = await reportarEstudanteFaltante(B.turma, 'HACK portal')
    expect(r).toHaveProperty('error')
    expect(await prisma.message.count({ where: { escolaId: B.escola } })).toBe(antes)
  })
})

// Fase 0: a equipe continua baixando os PDFs da turma - inclusive quem é só
// AEE (sem o papel de professor), que já tinha acesso antes da correção.
describe('PDFs da turma: AEE sem papel de professor continua com acesso', () => {
  const pdfs: [string, string, () => Record<string, string>][] = [
    ['PDF de resultados da turma', 'relatorio/resultados/[id]/pdf', () => ({ id: B.turma })],
    ['PDF de status da turma', 'relatorio/status/[id]/pdf', () => ({ id: B.turma })],
    ['PDF da turma por disciplina', 'relatorio/turma/[id]/disciplina/[disciplinaId]/pdf', () => ({ id: B.turma, disciplinaId: B.disciplina })],
  ]
  for (const [nome, caminho, params] of pdfs) {
    it(nome, async () => {
      sessao.atual = { user: { ...sessaoDaEscolaB().user, isSuperuser: false, isDirecao: false, isStaff: false, isAEE: true, isPortalUser: false, estudanteId: null } }
      const { GET } = await rota(caminho)
      const r = await chamar(GET, 'GET', '/x', params())
      expect(r.status, `${nome} respondeu ${r.status}`).toBe(200)
    })
  }
})

// Fase 0: o POST de questoes já confere o banco de questões; PUT/DELETE de
// questoes/[id] precisam conferir também (professor com o módulo desligado).
describe('módulo desligado - banco de questões (professor da escola B)', () => {
  beforeAll(async () => {
    await prisma.escolaModulo.upsert({
      where: { escolaId_moduloId: { escolaId: B.escola, moduloId: 'banco-questoes' } },
      update: { ativo: false },
      create: { escolaId: B.escola, moduloId: 'banco-questoes', ativo: false },
    })
    sessao.atual = { user: { ...sessaoDaEscolaB().user, id: B.prof, username: 'prof-B', isSuperuser: false, isDirecao: false, isStaff: true, isAEE: false } }
  })
  afterAll(async () => {
    await prisma.escolaModulo.deleteMany({ where: { escolaId: B.escola } })
    sessao.atual = sessaoDaEscolaB()
  })

  it('editar a própria questão', async () => {
    const { PUT } = await rota('questoes/[id]')
    const r = await chamar(PUT, 'PUT', '/x', { id: B.questao }, { enunciado: 'HACK modulo' })
    expect(r.status).toBe(403)
  })

  it('excluir a própria questão', async () => {
    const { DELETE } = await rota('questoes/[id]')
    const r = await chamar(DELETE, 'DELETE', '/x', { id: B.questao })
    expect(r.status).toBe(403)
  })

  it('questão de B intacta', async () => {
    expect((await prisma.questao.findUnique({ where: { id: B.questao } }))?.enunciado).toBe('Questao B')
  })
})

describe('isolamento entre escolas - nada de A mudou', () => {
  it('dados da escola A intactos', async () => {
    const turma = await prisma.turma.findUnique({ where: { id: A.turma }, include: { estudantes: true, disciplinas: true } })
    expect(turma?.nome).toBe('Turma A')
    expect(turma?.estudantes.map((e) => e.matricula)).toEqual([A.matricula])
    expect(turma?.disciplinas.map((d) => d.nome)).toEqual(['Disciplina A'])
    expect((await prisma.curso.findUnique({ where: { id: A.curso } }))?.nome).toBe('Curso A')
    expect((await prisma.planoEnsino.findUnique({ where: { id: A.plano } }))?.disciplinaNome).toBe('Plano A')
    expect(await prisma.prova.findUnique({ where: { id: A.prova } })).not.toBeNull()
    expect((await prisma.questao.findUnique({ where: { id: A.questao } }))?.enunciado).toBe('Questao A')
    expect(await prisma.esquemaAvaliacao.findUnique({ where: { id: A.esquema } })).not.toBeNull()
    expect((await prisma.aEEProfile.findUnique({ where: { id: A.aee } }))?.condicao).toBe('segredo A')
    expect(await prisma.reservaLaboratorio.findUnique({ where: { id: A.reserva } })).not.toBeNull()
    expect((await prisma.laboratorio.findUnique({ where: { id: A.lab } }))?.nome).toBe('Lab A')
    expect((await prisma.ocorrencia.findUnique({ where: { id: A.ocorrencia } }))?.titulo).toBe('Ocorrencia A')
    const prof = await prisma.user.findUnique({ where: { id: A.prof } })
    expect(prof?.name).toBe('Prof A')
    expect(prof?.isActive).toBe(true)
    const alunoB = await prisma.estudante.findUnique({ where: { id: B.estudante } })
    expect(alunoB?.turmaId).toBe(B.turma)
    expect(alunoB?.nome).toBe('Aluno B')
    expect(await prisma.disciplina.count({ where: { turmaId: B.turma, nome: 'HACK' } })).toBe(0)
    expect(await prisma.curso.count({ where: { escolaId: B.escola, nome: 'HACK' } })).toBe(0)
    expect((await prisma.aEEProfile.findFirst({ where: { estudanteId: B.estudante } }))?.condicao).toBe('segredo B')
    const nota = await prisma.notaFinal.findUnique({ where: { id: A.nota } })
    expect(nota?.status).toBe('RECUPERACAO')
    expect(nota?.notaRecuperacao).toBeNull()
    // nada da escola B foi pendurado em turma/laboratório de A
    expect(await prisma.disciplina.count({ where: { turmaId: A.turma, nome: 'HACK' } })).toBe(0)
    expect(await prisma.notaSimulado.count({ where: { estudanteId: A.estudante } })).toBe(0)
    expect(await prisma.reservaLaboratorio.count({ where: { laboratorioId: A.lab } })).toBe(1)
    expect(await prisma.estudante.count({ where: { turmaId: A.turma } })).toBe(1)
    expect(await prisma.turma.count({ where: { cursoId: A.curso } })).toBe(1)
    expect(await prisma.prova.count({ where: { titulo: `HACK ${SUFIXO}` } })).toBe(0)
  })
})
