import { prisma } from '@/lib/prisma'
import { chaveData } from '@/lib/services/calendario'
import { carregarEsquemaDaTurma } from '@/lib/services/notas-leitura'
import { carregarCalendario, carregarFrequenciaDaTurma } from '@/lib/services/frequencia-leitura'
import { aulasDoDia, diasComAulaAte, hojeNaEscola } from '@/lib/services/chamada'
import { frequenciaConsiderada } from '@/lib/services/frequencia'

/**
 * Números do painel inicial (server-only, só leitura). Tudo escopado pela
 * escola recebida, que deve vir da sessão. As contas usam os serviços que já
 * existem (frequência, chamada); aqui só se agrega por turma.
 */

export interface ResumoTurmaPainel {
  turmaId: string
  nome: string
  frequenciaMedia: number | null
  abaixoDoMinimo: number
  chamadasPendentes: number
}

export interface ResumoGestao {
  frequenciaMedia: number | null
  abaixoDoMinimo: number
  /** alunos abaixo da frequência mínima (para unir com quem está em recuperação) */
  idsAbaixoDoMinimo: string[]
  chamadasPendentes: number
  turmas: ResumoTurmaPainel[]
}

/** Chamadas que deveriam ter sido feitas (dia letivo com aula até hoje) e não foram salvas. */
function contarPendentes(
  hoje: string,
  turmaId: string,
  calendario: NonNullable<Awaited<ReturnType<typeof carregarCalendario>>>,
  horario: { diaSemana: number; horario: number; disciplinaId: string | null }[],
  registradas: Set<string>,
  porDia: boolean
): number {
  if (porDia) {
    return diasComAulaAte(hoje, turmaId, calendario, horario, null).filter((d) => !registradas.has(`${d}|`)).length
  }
  let total = 0
  for (const disciplinaId of new Set(horario.map((h) => h.disciplinaId).filter((x): x is string => !!x))) {
    total += diasComAulaAte(hoje, turmaId, calendario, horario, disciplinaId).filter((d) => !registradas.has(`${d}|${disciplinaId}`)).length
  }
  return total
}

export async function resumoGestao(escolaId: string, anoLetivo: number): Promise<ResumoGestao> {
  const hoje = hojeNaEscola()
  const [turmas, calendario] = await Promise.all([
    prisma.turma.findMany({ where: { escolaId, anoLetivo }, orderBy: { nome: 'asc' }, select: { id: true, nome: true, cursoId: true, esquemaAvaliacaoId: true } }),
    carregarCalendario(escolaId, anoLetivo),
  ])

  const resumos: ResumoTurmaPainel[] = []
  const idsAbaixo: string[] = []
  let somaFreq = 0
  let alunosComFreq = 0
  for (const turma of turmas) {
    const [freq, esquema, horario, aulas] = await Promise.all([
      carregarFrequenciaDaTurma(escolaId, turma.id),
      carregarEsquemaDaTurma(turma),
      prisma.horarioAula.findMany({ where: { turmaId: turma.id }, select: { diaSemana: true, horario: true, disciplinaId: true } }),
      prisma.aula.findMany({ where: { escolaId, turmaId: turma.id, situacao: { not: 'PREVISTA' } }, select: { data: true, disciplinaId: true } }),
    ])

    let soma = 0
    let n = 0
    let abaixo = 0
    if (freq?.temChamada) {
      for (const [id, f] of freq.porAluno) {
        if (f.geral.percentual !== null) { soma += f.geral.percentual; n++ }
        const p = frequenciaConsiderada(f, freq.regra)
        if (p !== null && p < freq.regra.minimo) { abaixo++; idsAbaixo.push(id) }
      }
    }
    somaFreq += soma
    alunosComFreq += n

    const registradas = new Set(aulas.map((a) => `${chaveData(a.data)}|${a.disciplinaId ?? ''}`))
    const pendentes = calendario ? contarPendentes(hoje, turma.id, calendario, horario, registradas, esquema?.registroFrequencia === 'POR_DIA') : 0

    resumos.push({ turmaId: turma.id, nome: turma.nome, frequenciaMedia: n ? Math.round((soma / n) * 10) / 10 : null, abaixoDoMinimo: abaixo, chamadasPendentes: pendentes })
  }

  return {
    frequenciaMedia: alunosComFreq ? Math.round((somaFreq / alunosComFreq) * 10) / 10 : null,
    abaixoDoMinimo: resumos.reduce((s, r) => s + r.abaixoDoMinimo, 0),
    idsAbaixoDoMinimo: idsAbaixo,
    chamadasPendentes: resumos.reduce((s, r) => s + r.chamadasPendentes, 0),
    turmas: resumos,
  }
}

export interface AulaDeHoje {
  turmaId: string
  turmaNome: string
  disciplinaId: string | null
  nome: string
  tempos: number[]
  feita: boolean
}

export interface DisciplinaDoProfessor {
  id: string
  nome: string
  turmaId: string
  turmaNome: string
  alunos: number
  semNota: number
}

/**
 * Para o professor: aulas de hoje nas disciplinas dele (pelo horário e
 * calendário) e quantos alunos ainda estão sem nota lançada em cada uma.
 */
export async function resumoProfessor(escolaId: string, userId: string, anoLetivo: number): Promise<{ hoje: string; aulasDeHoje: AulaDeHoje[]; disciplinas: DisciplinaDoProfessor[] }> {
  const hoje = hojeNaEscola()
  const disciplinas = await prisma.disciplina.findMany({
    where: { usuariosPermitidos: { some: { id: userId } }, turma: { escolaId, anoLetivo } },
    orderBy: [{ turma: { nome: 'asc' } }, { nome: 'asc' }],
    select: {
      id: true, nome: true, turmaId: true,
      turma: { select: { nome: true, cursoId: true, esquemaAvaliacaoId: true, _count: { select: { estudantes: true } } } },
      _count: { select: { notas: true } },
    },
  })
  const calendario = await carregarCalendario(escolaId, anoLetivo)
  const turmaIds = [...new Set(disciplinas.map((d) => d.turmaId))]
  const [horarios, aulasHoje] = await Promise.all([
    prisma.horarioAula.findMany({ where: { turmaId: { in: turmaIds }, turma: { escolaId } }, select: { turmaId: true, diaSemana: true, horario: true, disciplinaId: true } }),
    prisma.aula.findMany({ where: { escolaId, turmaId: { in: turmaIds }, data: new Date(`${hoje}T00:00:00Z`), situacao: { not: 'PREVISTA' } }, select: { turmaId: true, disciplinaId: true } }),
  ])
  const feitas = new Set(aulasHoje.map((a) => `${a.turmaId}|${a.disciplinaId ?? ''}`))

  const aulasDeHoje: AulaDeHoje[] = []
  if (calendario) {
    const vistas = new Set<string>()
    for (const d of disciplinas) {
      const dia = aulasDoDia(hoje, d.turmaId, calendario, horarios.filter((h) => h.turmaId === d.turmaId))
      if (!dia.letivo) continue
      const esquema = await carregarEsquemaDaTurma(d.turma)
      if (esquema?.registroFrequencia === 'POR_DIA') {
        if (vistas.has(d.turmaId) || dia.temposPorDisciplina.size === 0) continue
        vistas.add(d.turmaId)
        aulasDeHoje.push({ turmaId: d.turmaId, turmaNome: d.turma.nome, disciplinaId: null, nome: 'Chamada diária', tempos: [], feita: feitas.has(`${d.turmaId}|`) })
        continue
      }
      const tempos = dia.temposPorDisciplina.get(d.id) ?? []
      if (tempos.length) aulasDeHoje.push({ turmaId: d.turmaId, turmaNome: d.turma.nome, disciplinaId: d.id, nome: d.nome, tempos, feita: feitas.has(`${d.turmaId}|${d.id}`) })
    }
    aulasDeHoje.sort((a, b) => (a.tempos[0] ?? 0) - (b.tempos[0] ?? 0) || a.turmaNome.localeCompare(b.turmaNome))
  }

  return {
    hoje,
    aulasDeHoje,
    disciplinas: disciplinas.map((d) => ({
      id: d.id, nome: d.nome, turmaId: d.turmaId, turmaNome: d.turma.nome,
      alunos: d.turma._count.estudantes,
      semNota: Math.max(0, d.turma._count.estudantes - d._count.notas),
    })),
  }
}

/* ------------------------------------------------------------------------
 * Painéis por perfil (rota /dashboard/modelos). Só leitura; toda consulta
 * filtra pela escola recebida, que deve vir da sessão.
 * --------------------------------------------------------------------- */

export interface PendenciaDisciplina {
  /** null = chamada diária da turma (registro POR_DIA) */
  disciplinaId: string | null
  disciplinaNome: string
  turmaId: string
  turmaNome: string
  alunos: number
  chamadasPendentes: number
  semNota: number
  professores: { id: string; nome: string }[]
}

/**
 * Chamadas pendentes e alunos sem nota por disciplina, com os professores
 * vinculados. `professorId` restringe às disciplinas daquele professor.
 */
export async function pendenciasPorDisciplina(escolaId: string, anoLetivo: number, professorId?: string): Promise<PendenciaDisciplina[]> {
  const hoje = hojeNaEscola()
  const filtroDisciplina = professorId ? { usuariosPermitidos: { some: { id: professorId } } } : {}
  const [turmas, calendario] = await Promise.all([
    prisma.turma.findMany({
      where: { escolaId, anoLetivo, ...(professorId ? { disciplinas: { some: filtroDisciplina } } : {}) },
      orderBy: { nome: 'asc' },
      select: {
        id: true, nome: true, cursoId: true, esquemaAvaliacaoId: true,
        _count: { select: { estudantes: true } },
        disciplinas: {
          where: filtroDisciplina,
          orderBy: { nome: 'asc' },
          select: { id: true, nome: true, _count: { select: { notas: true } }, usuariosPermitidos: { where: { escolaId }, select: { id: true, name: true } } },
        },
      },
    }),
    carregarCalendario(escolaId, anoLetivo),
  ])

  const linhas: PendenciaDisciplina[] = []
  for (const turma of turmas) {
    const [esquema, horario, aulas] = await Promise.all([
      carregarEsquemaDaTurma(turma),
      prisma.horarioAula.findMany({ where: { turmaId: turma.id }, select: { diaSemana: true, horario: true, disciplinaId: true } }),
      prisma.aula.findMany({ where: { escolaId, turmaId: turma.id, situacao: { not: 'PREVISTA' } }, select: { data: true, disciplinaId: true } }),
    ])
    const registradas = new Set(aulas.map((a) => `${chaveData(a.data)}|${a.disciplinaId ?? ''}`))
    const porDia = esquema?.registroFrequencia === 'POR_DIA'
    const pessoas = (us: { id: string; name: string | null }[]) => us.map((p) => ({ id: p.id, nome: p.name ?? 'Sem nome' }))

    if (porDia) {
      const professores = new Map<string, { id: string; nome: string }>()
      for (const d of turma.disciplinas) for (const p of pessoas(d.usuariosPermitidos)) professores.set(p.id, p)
      linhas.push({
        disciplinaId: null, disciplinaNome: 'Chamada diária', turmaId: turma.id, turmaNome: turma.nome, alunos: turma._count.estudantes,
        chamadasPendentes: calendario ? diasComAulaAte(hoje, turma.id, calendario, horario, null).filter((d) => !registradas.has(`${d}|`)).length : 0,
        semNota: 0, professores: [...professores.values()],
      })
    }
    for (const d of turma.disciplinas) {
      linhas.push({
        disciplinaId: d.id, disciplinaNome: d.nome, turmaId: turma.id, turmaNome: turma.nome, alunos: turma._count.estudantes,
        chamadasPendentes: !porDia && calendario ? diasComAulaAte(hoje, turma.id, calendario, horario, d.id).filter((x) => !registradas.has(`${x}|${d.id}`)).length : 0,
        semNota: Math.max(0, turma._count.estudantes - d._count.notas),
        professores: pessoas(d.usuariosPermitidos),
      })
    }
  }
  return linhas
}

export interface ProfessorAtrasado {
  id: string
  nome: string
  chamadasPendentes: number
  semNota: number
  disciplinas: number
}

/** Professores com chamada ou nota em atraso, do mais atrasado para o menos. */
export function professoresAtrasados(pendencias: PendenciaDisciplina[]): ProfessorAtrasado[] {
  const mapa = new Map<string, ProfessorAtrasado>()
  for (const p of pendencias) {
    if (p.chamadasPendentes === 0 && p.semNota === 0) continue
    for (const prof of p.professores) {
      const atual = mapa.get(prof.id) ?? { id: prof.id, nome: prof.nome, chamadasPendentes: 0, semNota: 0, disciplinas: 0 }
      atual.chamadasPendentes += p.chamadasPendentes
      atual.semNota += p.semNota
      atual.disciplinas += 1
      mapa.set(prof.id, atual)
    }
  }
  return [...mapa.values()].sort((a, b) => b.chamadasPendentes + b.semNota - (a.chamadasPendentes + a.semNota) || a.nome.localeCompare(b.nome))
}

export interface EstudanteEmRisco {
  id: string
  nome: string
  matricula: string
  turmaNome: string
  frequencia: boolean
  notas: boolean
}

/** Estudantes abaixo da frequência mínima e/ou em recuperação, sem repetir. */
export async function estudantesEmRisco(escolaId: string, anoLetivo: number, idsAbaixoDoMinimo: string[], limite = 8): Promise<{ total: number; lista: EstudanteEmRisco[] }> {
  const estudantes = await prisma.estudante.findMany({
    where: { escolaId, turma: { anoLetivo }, OR: [{ id: { in: idsAbaixoDoMinimo } }, { notas: { some: { status: 'RECUPERACAO' } } }] },
    orderBy: [{ turma: { nome: 'asc' } }, { nome: 'asc' }],
    select: { id: true, nome: true, matricula: true, turma: { select: { nome: true } }, notas: { where: { status: 'RECUPERACAO' }, select: { id: true }, take: 1 } },
  })
  const abaixo = new Set(idsAbaixoDoMinimo)
  const lista = estudantes.map((e) => ({ id: e.id, nome: e.nome, matricula: e.matricula, turmaNome: e.turma.nome, frequencia: abaixo.has(e.id), notas: e.notas.length > 0 }))
  // Os dois motivos primeiro
  lista.sort((a, b) => Number(b.frequencia && b.notas) - Number(a.frequencia && a.notas))
  return { total: lista.length, lista: lista.slice(0, limite) }
}

export async function estudantesAEE(escolaId: string, limite = 6) {
  const where = { estudante: { escolaId } }
  const [total, lista] = await Promise.all([
    prisma.aEEProfile.count({ where }),
    prisma.aEEProfile.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      take: limite,
      select: { id: true, condicao: true, precisaProvaAdaptada: true, precisaProvaSalaEspecial: true, estudante: { select: { nome: true, matricula: true, turma: { select: { nome: true } } } } },
    }),
  ])
  return { total, lista }
}

export async function ocorrenciasRecentes(escolaId: string, limite = 5) {
  const desde = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  const [ultimos30Dias, lista] = await Promise.all([
    prisma.ocorrencia.count({ where: { escolaId, data: { gte: desde } } }),
    prisma.ocorrencia.findMany({
      where: { escolaId },
      orderBy: { data: 'desc' },
      take: limite,
      select: { id: true, titulo: true, tipo: true, data: true, estudantes: { where: { estudante: { escolaId } }, select: { estudante: { select: { nome: true } } } } },
    }),
  ])
  return { ultimos30Dias, lista }
}

/** Comunicados para o público do perfil (mesmos grupos do painel atual). */
export async function comunicadosRecentes(escolaId: string, publico: 'professor' | 'gestao', limite = 4) {
  const grupos = publico === 'gestao' ? ['GROUP_STAFF', 'GROUP_TEACHERS', 'GROUP_DIRECAO'] : ['GROUP_TEACHERS']
  return prisma.message.findMany({
    where: { escolaId, category: 'COMUNICADO', OR: [{ isGlobal: true }, { receiverId: null }, { receiverId: { in: grupos } }] },
    orderBy: { createdAt: 'desc' },
    take: limite,
    select: { id: true, subject: true, createdAt: true, sender: { select: { name: true } } },
  })
}

/** Próximas avaliações do professor (com data a partir de hoje ou sem data). */
export async function atividadesDoProfessor(escolaId: string, userId: string, anoLetivo: number, limite = 6) {
  const hoje = new Date(`${hojeNaEscola()}T00:00:00Z`)
  return prisma.avaliacaoDisciplina.findMany({
    where: {
      disciplina: { usuariosPermitidos: { some: { id: userId } }, turma: { escolaId, anoLetivo } },
      OR: [{ data: { gte: hoje } }, { data: null }],
    },
    orderBy: [{ data: { sort: 'asc', nulls: 'last' } }, { ordem: 'asc' }],
    take: limite,
    select: { id: true, nome: true, data: true, disciplina: { select: { nome: true, turmaId: true, turma: { select: { nome: true } } } }, _count: { select: { notas: true } } },
  })
}

export interface DataDoCalendario {
  data: string
  titulo: string
  tipo: 'nao-letivo' | 'prazo'
}

/** Próximos dias não letivos e prazos de lançamento de etapas. */
export async function proximasDatas(escolaId: string, anoLetivo: number, limite = 5): Promise<DataDoCalendario[]> {
  const hoje = new Date(`${hojeNaEscola()}T00:00:00Z`)
  const [naoLetivos, prazos] = await Promise.all([
    prisma.diaNaoLetivo.findMany({ where: { escolaId, data: { gte: hoje }, turmaId: null }, orderBy: { data: 'asc' }, take: limite, select: { data: true, descricao: true } }),
    prisma.etapaCalendario.findMany({
      where: { periodoLetivo: { escolaId, anoLetivo }, prazoLancamento: { gte: hoje } },
      orderBy: { prazoLancamento: 'asc' },
      take: limite,
      select: { prazoLancamento: true, esquemaUnidade: { select: { nome: true, esquema: { select: { nome: true } } } } },
    }),
  ])
  const datas: DataDoCalendario[] = [
    ...naoLetivos.map((d) => ({ data: chaveData(d.data), titulo: d.descricao, tipo: 'nao-letivo' as const })),
    ...prazos.map((p) => ({ data: chaveData(p.prazoLancamento!), titulo: `Prazo de notas: ${p.esquemaUnidade.nome} (${p.esquemaUnidade.esquema.nome})`, tipo: 'prazo' as const })),
  ]
  return datas.sort((a, b) => a.data.localeCompare(b.data)).slice(0, limite)
}

export async function numerosDaEscola(escolaId: string, anoLetivo: number) {
  const [turmas, estudantes, professores, disciplinas] = await Promise.all([
    prisma.turma.count({ where: { escolaId, anoLetivo } }),
    prisma.estudante.count({ where: { escolaId, turma: { anoLetivo } } }),
    prisma.user.count({ where: { escolaId, isStaff: true, isActive: true, isPortalUser: false } }),
    prisma.disciplina.count({ where: { turma: { escolaId, anoLetivo } } }),
  ])
  return { turmas, estudantes, professores, disciplinas }
}
