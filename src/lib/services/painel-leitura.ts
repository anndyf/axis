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
