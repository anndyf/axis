import { prisma } from '@/lib/prisma'
import { can, type RbacUser } from '@/lib/rbac'

export type ModoAcessoChamada = 'leitura' | 'escrita'

/**
 * Quem pode fazer/ver a chamada de uma turma (server-only). Sempre dentro
 * da escola da sessão.
 *
 * - escrita (fazer chamada, salvar, observação, cancelar, replicar): SÓ quem
 *   leciona a disciplina (POR_AULA) ou, na chamada diária (disciplinaId
 *   null), quem leciona alguma disciplina na turma ou tem a turma atribuída.
 *   Vale para qualquer papel: Direção e Administrador só visualizam, e quem é
 *   da direção e também dá aula grava apenas onde leciona (decisão da dona
 *   do produto, 20/10/2026).
 * - leitura (diário, calendário da disciplina): gestão (escopo da escola)
 *   em qualquer turma da escola; os demais, só onde lecionam.
 */
export async function acessoChamada(
  user: RbacUser & { id: string; escolaId: string },
  turmaId: string,
  disciplinaId: string | null,
  modo: ModoAcessoChamada = 'escrita'
): Promise<{ turma: { id: string; nome: string; cursoId: string | null; esquemaAvaliacaoId: string | null; anoLetivo: number | null }; disciplina: { id: string; nome: string } | null } | null> {
  if (typeof turmaId !== 'string') return null
  if (modo === 'escrita' ? !can(user, 'frequencia.lancar') : !(can(user, 'frequencia.lancar') || can(user, 'frequencia.acompanhar'))) return null
  const turma = await prisma.turma.findFirst({
    where: { id: turmaId, escolaId: user.escolaId },
    select: { id: true, nome: true, cursoId: true, esquemaAvaliacaoId: true, anoLetivo: true },
  })
  if (!turma) return null
  const todaEscola = modo === 'leitura' && can(user, 'escopo.escola')

  if (disciplinaId !== null) {
    if (typeof disciplinaId !== 'string') return null
    const disciplina = await prisma.disciplina.findFirst({
      where: { id: disciplinaId, turmaId: turma.id, ...(todaEscola ? {} : { usuariosPermitidos: { some: { id: user.id } } }) },
      select: { id: true, nome: true },
    })
    return disciplina ? { turma, disciplina } : null
  }

  if (todaEscola) return { turma, disciplina: null }
  return (await lecionaNaTurma(user.id, turma.id)) ? { turma, disciplina: null } : null
}

/** Leciona alguma disciplina na turma ou tem a turma atribuída (chamada diária). */
export async function lecionaNaTurma(userId: string, turmaId: string): Promise<boolean> {
  const vinculo = await prisma.turma.count({
    where: {
      id: turmaId,
      OR: [{ disciplinas: { some: { usuariosPermitidos: { some: { id: userId } } } } }, { usuariosPermitidos: { some: { id: userId } } }],
    },
  })
  return vinculo > 0
}

/** Ids das disciplinas que o usuário leciona na escola (quem pode gravar nota/chamada nelas). */
export async function disciplinasLecionadas(userId: string, escolaId: string): Promise<Set<string>> {
  const lista = await prisma.disciplina.findMany({
    where: { usuariosPermitidos: { some: { id: userId } }, turma: { escolaId } },
    select: { id: true },
  })
  return new Set(lista.map((d) => d.id))
}
