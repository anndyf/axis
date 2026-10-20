import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { can } from "@/lib/rbac"
import { resolverEsquemaAvaliacaoId } from "@/lib/services/notas"

// Server-only (não é server action): quem pode ver/editar as avaliações
// criadas pelo professor numa disciplina, sempre na escola da sessão.

/** Disciplina + esquema da turma, se o usuário pode mexer nas avaliações dela. */
export async function contextoDaDisciplina(disciplinaId: string) {
  const session = await auth()
  const user = session?.user
  if (!user?.escolaId || can(user, "portal.acessar") || !can(user, "nota.lancar") || typeof disciplinaId !== "string") return null

  const disciplina = await prisma.disciplina.findFirst({
    where: {
      id: disciplinaId,
      turma: { escolaId: user.escolaId },
      ...(can(user, "escopo.escola") ? {} : { usuariosPermitidos: { some: { id: user.id } } }),
    },
    select: { id: true, nome: true, turma: { select: { id: true, nome: true, cursoId: true, esquemaAvaliacaoId: true } } },
  })
  if (!disciplina) return null

  const curso = disciplina.turma.cursoId
    ? await prisma.curso.findFirst({ where: { id: disciplina.turma.cursoId, escolaId: user.escolaId }, select: { esquemaAvaliacaoId: true } })
    : null
  const esquemaId = resolverEsquemaAvaliacaoId(disciplina.turma, curso)
  const esquema = esquemaId
    ? await prisma.esquemaAvaliacao.findFirst({
        where: { id: esquemaId, escolaId: user.escolaId },
        include: { unidades: { orderBy: { ordem: "asc" }, include: { atividades: { select: { notaMaxima: true, peso: true } } } } },
      })
    : null
  return { user, disciplina, esquema }
}

