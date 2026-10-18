
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import ScheduleEditor from "@/app/dashboard/turmas/[id]/horario/ScheduleEditor"
import { getSchedule } from "../../schedule-actions"

export const metadata = {
  title: 'Áxis - Turmas'
}

export const runtime = 'nodejs'

export default async function SchedulePage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params
  const session = await auth()

  if (!session?.user?.escolaId || (!session.user.isSuperuser && !session.user.isDirecao)) {
    redirect("/dashboard")
  }

  const turma = await prisma.turma.findUnique({
    where: { id: params.id, escolaId: session.user.escolaId },
    include: {

      disciplinas: {
        orderBy: { nome: 'asc' },
        include: {
          usuariosPermitidos: true
        }
      }
    }
  })

  if (!turma) {
    redirect("/dashboard/turmas")
  }

  const schedule = await getSchedule(params.id)

  return <ScheduleEditor turma={turma} initialSchedule={schedule?.horarios || []} />
}
