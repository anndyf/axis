import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"
import { startOfWeek, endOfWeek, isAfter, startOfMonth, format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

async function laboratorioDaEscola(laboratorioId: string, escolaId: string) {
  return prisma.laboratorio.findUnique({ where: { id: laboratorioId, escolaId }, select: { id: true } })
}

export async function GET(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.escolaId) return NextResponse.json({ message: "Não autorizado" }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const labId = searchParams.get('labId')
    const dateStr = searchParams.get('date')

    if (!labId || !dateStr) {
      return NextResponse.json({ message: "labId e data são obrigatórios" }, { status: 400 })
    }

    if (!(await laboratorioDaEscola(labId, session.user.escolaId))) {
      return NextResponse.json({ message: "Laboratório não encontrado" }, { status: 404 })
    }

    const date = new Date(dateStr)
    const view = searchParams.get('view') || 'day'

    let gte = new Date(date)
    gte.setUTCHours(0, 0, 0, 0)
    
    let lte = new Date(date)
    lte.setUTCHours(23, 59, 59, 999)

    if (view === 'week') {
      gte = startOfWeek(date, { weekStartsOn: 1 })
      gte.setUTCHours(0, 0, 0, 0)
      lte = endOfWeek(date, { weekStartsOn: 1 })
      lte.setUTCHours(23, 59, 59, 999)
    }

    const reservas = await prisma.reservaLaboratorio.findMany({
      where: {
        laboratorioId: labId,
        data: {
          gte,
          lte
        }
      },
      include: {
        user: {
          select: { id: true, name: true, username: true }
        }
      }
    })

    return NextResponse.json(reservas)
  } catch (error) {
    return NextResponse.json({ message: "Erro ao buscar reservas" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.escolaId) return NextResponse.json({ message: "Não autorizado" }, { status: 401 })

    const { laboratorioId, data: dateStr, turno, horario, disciplina, turmaId, slots } = await request.json()

    if (!laboratorioId || !(await laboratorioDaEscola(laboratorioId, session.user.escolaId))) {
      return NextResponse.json({ message: "Laboratório não encontrado" }, { status: 404 })
    }
    if (turmaId && !(await prisma.turma.findUnique({ where: { id: turmaId, escolaId: session.user.escolaId }, select: { id: true } }))) {
      return NextResponse.json({ message: "Turma não encontrada" }, { status: 404 })
    }

    const isAdmin = session.user.isSuperuser || session.user.isDirecao || session.user.name === 'Andressa Mirella'
    const today = new Date()

    // Normalize input to array of slots
    const slotsToReserve = slots && Array.isArray(slots) 
      ? slots 
      : [{ data: dateStr, turno, horario }]

    if (slotsToReserve.length === 0) {
      return NextResponse.json({ message: "Nenhum horário selecionado" }, { status: 400 })
    }

    // Memory tracking for multi-reserva limits
    const currentRequestDaysPerTurno: Record<string, Set<string>> = {}
    const currentRequestSlotsPerDayTurno: Record<string, number> = {}

    // 1. Validations and preparation
    const transactions = []
    
    for (const slot of slotsToReserve) {
      if (!laboratorioId || !slot.data || !slot.turno || slot.horario === undefined) {
        return NextResponse.json({ message: "Dados incompletos em um dos horários" }, { status: 400 })
      }

      const reservationDate = new Date(slot.data)
      reservationDate.setUTCHours(0, 0, 0, 0)

      const firstDayOfReservationMonth = startOfMonth(reservationDate)
      const firstDayOfCurrentMonth = startOfMonth(today)

      if (!isAdmin && isAfter(firstDayOfReservationMonth, firstDayOfCurrentMonth)) {
        return NextResponse.json({ 
          message: `As reservas para ${format(reservationDate, 'MMMM', { locale: ptBR })} só serão liberadas quando o mês iniciar.` 
        }, { status: 400 })
      }

      // Check existing
      const existing = await prisma.reservaLaboratorio.findUnique({
        where: {
          laboratorioId_data_turno_horario: {
            laboratorioId,
            data: reservationDate,
            turno: slot.turno,
            horario: parseInt(slot.horario)
          }
        }
      })

      if (existing) {
        return NextResponse.json({ 
          message: `O ${slot.horario}º horário de ${format(reservationDate, 'dd/MM')} já está reservado.` 
        }, { status: 400 })
      }

      // 2. Weekly limit check per slot if not admin
      if (!isAdmin) {
        const start = startOfWeek(reservationDate, { weekStartsOn: 0 })
        const end = endOfWeek(reservationDate, { weekStartsOn: 0 })
        const dateISO = reservationDate.toISOString().split('T')[0]
        const turnoKey = slot.turno
        const dayTurnoKey = `${dateISO}_${turnoKey}`

        const userReservationsThisWeek = await prisma.reservaLaboratorio.findMany({
          where: {
            userId: session.user.id,
            turno: turnoKey,
            data: { gte: start, lte: end }
          },
          select: { data: true }
        })

        const uniqueDaysTurno = new Set(userReservationsThisWeek.map(r => new Date(r.data).toISOString().split('T')[0]))
        
        if (currentRequestDaysPerTurno[turnoKey]) {
           for (const d of currentRequestDaysPerTurno[turnoKey]) uniqueDaysTurno.add(d)
        }
        
        if (uniqueDaysTurno.size >= 3 && !uniqueDaysTurno.has(dateISO)) {
          return NextResponse.json({ message: `Você atingiu o limite de 3 dias de reserva por semana no turno ${turnoKey}.` }, { status: 400 })
        }

        const userReservationsTodayTurno = userReservationsThisWeek.filter(r => new Date(r.data).toISOString().split('T')[0] === dateISO)
        const dbSlotsTodayTurno = userReservationsTodayTurno.length
        const reqSlotsTodayTurno = currentRequestSlotsPerDayTurno[dayTurnoKey] || 0

        if (dbSlotsTodayTurno + reqSlotsTodayTurno >= 4) {
          return NextResponse.json({ message: `Você não pode fechar todos os horários. O limite é de 4 horários por dia no turno ${turnoKey}.` }, { status: 400 })
        }
        
        // Block consecutive weeks same timeslot
        const prevWeekDate = new Date(reservationDate)
        prevWeekDate.setDate(prevWeekDate.getDate() - 7)
        
        const nextWeekDate = new Date(reservationDate)
        nextWeekDate.setDate(nextWeekDate.getDate() + 7)

        const consecutiveReservation = await prisma.reservaLaboratorio.findFirst({
          where: {
            laboratorioId,
            userId: session.user.id,
            turno: slot.turno,
            horario: parseInt(slot.horario),
            data: {
              in: [prevWeekDate, nextWeekDate]
            }
          }
        })

        if (consecutiveReservation) {
          const diaFormatado = format(new Date(consecutiveReservation.data), 'dd/MM', { locale: ptBR })
          return NextResponse.json({ 
            message: `Não é permitido reservar o mesmo horário em semanas seguidas. Você já tem reserva neste horário no dia ${diaFormatado}.` 
          }, { status: 400 })
        }

        if (!currentRequestDaysPerTurno[turnoKey]) currentRequestDaysPerTurno[turnoKey] = new Set()
        currentRequestDaysPerTurno[turnoKey].add(dateISO)
        currentRequestSlotsPerDayTurno[dayTurnoKey] = reqSlotsTodayTurno + 1
      }

      transactions.push(
        prisma.reservaLaboratorio.create({
          data: {
            laboratorioId,
            userId: session.user.id,
            data: reservationDate,
            turno: slot.turno,
            horario: parseInt(slot.horario),
            disciplina,
            turmaId
          }
        })
      )
    }

    // 3. Execute all
    await prisma.$transaction(transactions)

    return NextResponse.json({ message: "Reserva realizada com sucesso!" })
  } catch (error) {
    console.error("Erro ao criar reserva:", error)
    return NextResponse.json({ message: "Erro ao criar reserva" }, { status: 500 })
  }
}
