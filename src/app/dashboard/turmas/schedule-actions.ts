
"use server"

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"

// Server actions podem ser chamadas direto pelo client com qualquer turmaId -
// a turma precisa ser conferida contra a escola da sessão a cada chamada.
async function turmaDaEscola(turmaId: string, escolaId: string) {
  return prisma.turma.findUnique({ where: { id: turmaId, escolaId }, select: { id: true } })
}

export async function getSchedule(turmaId: string) {
  const session = await auth()
  if (!session?.user?.escolaId || !(await turmaDaEscola(turmaId, session.user.escolaId))) {
    return { error: "Sem permissão" }
  }

  try {
    const horarios = await prisma.horarioAula.findMany({
      where: { turmaId },
      orderBy: [
        { diaSemana: 'asc' },
        { horario: 'asc' }
      ]
    })
    return { horarios }
  } catch (error) {
    console.error("Erro ao buscar horários", error)
    return { error: "Erro ao buscar horários" }
  }
}

export type ScheduleItem = {
    diaSemana: number
    horario: number
    disciplinaId: string
}

/**
 * Salva a grade da turma. Recebe só a disciplina (chave); nome e professor
 * são resolvidos aqui a partir das disciplinas DA PRÓPRIA TURMA - o client
 * não define texto nem professor.
 */
export async function saveSchedule(turmaId: string, items: ScheduleItem[]) {
  const session = await auth()
  if (!session?.user?.escolaId || (!session.user.isSuperuser && !session.user.isDirecao)) {
    return { error: "Sem permissão" }
  }
  if (!(await turmaDaEscola(turmaId, session.user.escolaId))) {
    return { error: "Sem permissão" }
  }

  const disciplinas = await prisma.disciplina.findMany({
    where: { turmaId },
    select: { id: true, nome: true, usuariosPermitidos: { select: { id: true, name: true, username: true }, take: 1 } }
  })
  const porId = new Map(disciplinas.map((d) => [d.id, d]))
  if (items.some((i) => !porId.has(i.disciplinaId) || !(i.diaSemana >= 1 && i.diaSemana <= 5) || !(i.horario >= 1))) {
    return { error: "Disciplina ou horário inválido" }
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.horarioAula.deleteMany({ where: { turmaId } })
      if (items.length > 0) {
        await tx.horarioAula.createMany({
          data: items.map((i) => {
            const disc = porId.get(i.disciplinaId)!
            const prof = disc.usuariosPermitidos[0]
            return {
              turmaId,
              diaSemana: i.diaSemana,
              horario: i.horario,
              disciplinaId: disc.id,
              disciplina: disc.nome,
              professorId: prof?.id ?? null,
              professor: prof ? (prof.name || prof.username) : null,
            }
          })
        })
      }
    })

    revalidatePath(`/dashboard/turmas/${turmaId}/horario`)
    return { success: true }
  } catch (error) {
    console.error("Erro ao salvar horário", error)
    return { error: "Erro ao salvar horário" }
  }
}
