import { prisma } from '@/lib/prisma'
import { acessoChamada } from '@/lib/chamada-acesso'
import type { RbacUser } from '@/lib/rbac'
import { carregarEsquemaDaTurma } from '@/lib/services/notas-leitura'
import { anoLetivoDaTurma, carregarCalendario } from '@/lib/services/frequencia-leitura'
import { hojeNaEscola } from '@/lib/services/chamada'
import { calendarioDaDisciplina, type DiaDoCalendario } from '@/lib/services/calendario-disciplina'

/**
 * Calendário da disciplina para a chamada e o diário (server-only). Mesmo
 * acesso da chamada (acessoChamada: escola da sessão; professor só nas
 * disciplinas dele). Na chamada diária (POR_DIA) o calendário é da turma.
 * null = sem acesso ou sem calendário letivo configurado.
 */
export async function calendarioDaChamada(
  user: RbacUser & { id: string; escolaId: string },
  turmaId: string,
  disciplinaId: string | null
): Promise<{ dias: DiaDoCalendario[]; turmaId: string; disciplinaId: string | null; hoje: string } | null> {
  if (typeof turmaId !== 'string') return null
  const turma = await prisma.turma.findFirst({ where: { id: turmaId, escolaId: user.escolaId }, select: { id: true, cursoId: true, esquemaAvaliacaoId: true, anoLetivo: true } })
  if (!turma) return null
  const esquema = await carregarEsquemaDaTurma(turma)
  const acesso = await acessoChamada(user, turma.id, esquema?.registroFrequencia === 'POR_DIA' ? null : disciplinaId)
  if (!acesso) return null
  const alvo = acesso.disciplina?.id ?? null

  const [calendario, horario, aulas] = await Promise.all([
    anoLetivoDaTurma(user.escolaId, turma).then((ano) => carregarCalendario(user.escolaId, ano)),
    prisma.horarioAula.findMany({ where: { turmaId: turma.id }, select: { diaSemana: true, horario: true, disciplinaId: true } }),
    prisma.aula.findMany({ where: { escolaId: user.escolaId, turmaId: turma.id, disciplinaId: alvo }, select: { data: true, situacao: true } }),
  ])
  if (!calendario) return null
  const hoje = hojeNaEscola()
  return { dias: calendarioDaDisciplina({ calendario, turmaId: turma.id, disciplinaId: alvo, horario, aulas, hoje }), turmaId: turma.id, disciplinaId: alvo, hoje }
}
