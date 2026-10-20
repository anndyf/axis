import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"
import { rotaDoModulo } from '@/lib/modulos/guarda'

export const DELETE = rotaDoModulo('REC', 'escrita', async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.escolaId) return NextResponse.json({ message: "Não autorizado" }, { status: 401 })

    const { id } = await params
    const reserva = await prisma.reservaLaboratorio.findFirst({
      where: { id, laboratorio: { escolaId: session.user.escolaId } }
    })

    if (!reserva) {
      return NextResponse.json({ message: "Reserva não encontrada" }, { status: 404 })
    }

    const isAdmin = session.user.isSuperuser || session.user.isDirecao
    const isOwner = reserva.userId === session.user.id

    if (!isAdmin && !isOwner) {
      return NextResponse.json({ message: "Sem permissão para cancelar esta reserva" }, { status: 403 })
    }

    await prisma.reservaLaboratorio.delete({
      where: { id }
    })

    return NextResponse.json({ message: "Reserva cancelada com sucesso" })
  } catch (error) {
    return NextResponse.json({ message: "Erro ao cancelar reserva" }, { status: 500 })
  }
})
