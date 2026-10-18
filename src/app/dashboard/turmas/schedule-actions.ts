
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
    disciplina: string
    professor: string
}

export async function saveSchedule(turmaId: string, items: ScheduleItem[]) {
  const session = await auth()
  if (!session?.user?.escolaId || (!session.user.isSuperuser && !session.user.isDirecao)) {
    return { error: "Sem permissão" }
  }
  if (!(await turmaDaEscola(turmaId, session.user.escolaId))) {
    return { error: "Sem permissão" }
  }

  try {
    // Transaction to update all
    await prisma.$transaction(async (tx: any) => {
      // Delete existing for this turma
      await tx.horarioAula.deleteMany({
        where: { turmaId }
      })

      // Create new ones
      if (items.length > 0) {
        await tx.horarioAula.createMany({
            data: items.map(i => ({
                turmaId,
                diaSemana: i.diaSemana,
                horario: i.horario,
                disciplina: i.disciplina,
                professor: i.professor
            }))
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
