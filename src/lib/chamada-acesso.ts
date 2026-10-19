import { prisma } from '@/lib/prisma'
import { can, type RbacUser } from '@/lib/rbac'

/**
 * Quem pode fazer/ver a chamada de uma turma (server-only). Sempre dentro
 * da escola da sessão. Gestão: qualquer turma da escola. Professor: só as
 * disciplinas dele (POR_AULA) ou, na chamada diária (disciplinaId null), as
 * turmas em que leciona alguma disciplina ou que lhe foram atribuídas.
 */
export async function acessoChamada(
  user: RbacUser & { id: string; escolaId: string },
  turmaId: string,
  disciplinaId: string | null
): Promise<{ turma: { id: string; nome: string; cursoId: string | null; esquemaAvaliacaoId: string | null; anoLetivo: number | null }; disciplina: { id: string; nome: string } | null } | null> {
  if (!can(user, 'staff') || typeof turmaId !== 'string') return null
  const turma = await prisma.turma.findFirst({
    where: { id: turmaId, escolaId: user.escolaId },
    select: { id: true, nome: true, cursoId: true, esquemaAvaliacaoId: true, anoLetivo: true },
  })
  if (!turma) return null
  const gestao = can(user, 'gestao')

  if (disciplinaId !== null) {
    if (typeof disciplinaId !== 'string') return null
    const disciplina = await prisma.disciplina.findFirst({
      where: { id: disciplinaId, turmaId: turma.id, ...(gestao ? {} : { usuariosPermitidos: { some: { id: user.id } } }) },
      select: { id: true, nome: true },
    })
    return disciplina ? { turma, disciplina } : null
  }

  if (gestao) return { turma, disciplina: null }
  const vinculo = await prisma.turma.count({
    where: {
      id: turma.id,
      OR: [{ disciplinas: { some: { usuariosPermitidos: { some: { id: user.id } } } } }, { usuariosPermitidos: { some: { id: user.id } } }],
    },
  })
  return vinculo ? { turma, disciplina: null } : null
}
