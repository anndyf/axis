import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import ScheduleEditor from "@/app/dashboard/turmas/[id]/horario/ScheduleEditor"
import { getSchedule } from "../../schedule-actions"
import { getGlobalConfig } from "@/lib/data-fetching"
import { diasLetivos, aulasPrevistasPorDisciplina, normalizarTurno } from "@/lib/services/calendario"

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
  const escolaId = session.user.escolaId

  const turma = await prisma.turma.findUnique({
    where: { id: params.id, escolaId },
    include: {
      disciplinas: {
        orderBy: { nome: 'asc' },
        // Só o necessário pra tela - nunca o registro inteiro do usuário (tem o hash da senha)
        select: { id: true, nome: true, cargaHoraria: true, usuariosPermitidos: { select: { name: true, username: true }, take: 1 } }
      }
    }
  })

  if (!turma) {
    redirect("/dashboard/turmas")
  }

  const schedule = await getSchedule(params.id)
  const horarios = 'horarios' in schedule ? schedule.horarios ?? [] : []

  // Tempos do turno da turma (hora de início/fim de cada "1º, 2º..." horário)
  const tempos = await prisma.tempoAula.findMany({
    where: { escolaId, turno: normalizarTurno(turma.turno) },
    orderBy: { ordem: 'asc' },
    select: { ordem: true, inicio: true, fim: true }
  })

  // Aulas previstas no ano = horário salvo × dias letivos da turma
  const anoLetivo = turma.anoLetivo ?? (await getGlobalConfig(escolaId))?.anoLetivoAtual ?? new Date().getFullYear()
  const periodo = await prisma.periodoLetivo.findUnique({ where: { escolaId_anoLetivo: { escolaId, anoLetivo } } })
  let previstas: Record<string, number> | null = null
  if (periodo) {
    const [naoLetivos, extras] = await Promise.all([
      prisma.diaNaoLetivo.findMany({ where: { escolaId, OR: [{ turmaId: null }, { turmaId: turma.id }] } }),
      prisma.diaLetivoExtra.findMany({ where: { escolaId } }),
    ])
    const dias = diasLetivos({ inicio: periodo.inicio, fim: periodo.fim, naoLetivos, extras }, turma.id)
    previstas = Object.fromEntries(aulasPrevistasPorDisciplina(horarios, dias))
  }

  return (
    <ScheduleEditor
      turma={{
        id: turma.id,
        nome: turma.nome,
        curso: turma.curso,
        anoLetivo,
        disciplinas: turma.disciplinas.map((d) => ({
          id: d.id,
          nome: d.nome,
          cargaHoraria: d.cargaHoraria,
          professor: d.usuariosPermitidos[0] ? (d.usuariosPermitidos[0].name || d.usuariosPermitidos[0].username) : null,
        })),
      }}
      initialSchedule={horarios.map((h) => ({ diaSemana: h.diaSemana, horario: h.horario, disciplinaId: h.disciplinaId, disciplina: h.disciplina }))}
      tempos={tempos}
      previstas={previstas}
    />
  )
}
