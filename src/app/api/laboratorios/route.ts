import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.escolaId) return NextResponse.json({ message: "Não autorizado" }, { status: 401 })

    const labs = await prisma.laboratorio.findMany({
      where: { escolaId: session.user.escolaId },
      orderBy: { nome: 'asc' }
    })

    return NextResponse.json(labs)
  } catch (error) {
    return NextResponse.json({ message: "Erro ao buscar laboratórios" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session || (!session.user.isSuperuser && !session.user.isDirecao)) {
      return NextResponse.json({ message: "Não autorizado" }, { status: 401 })
    }

    const { nome, descricao } = await request.json()
    const lab = await prisma.laboratorio.create({
      data: { nome, descricao, escolaId: session.user.escolaId }
    })

    return NextResponse.json(lab)
  } catch (error) {
    return NextResponse.json({ message: "Erro ao criar laboratório" }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await auth()
    if (!session || (!session.user.isSuperuser && !session.user.isDirecao)) {
      return NextResponse.json({ message: "Não autorizado" }, { status: 401 })
    }

    const { id, nome, descricao } = await request.json()
    
    if (!id) return NextResponse.json({ message: "ID do laboratório não informado" }, { status: 400 })

    const lab = await prisma.laboratorio.update({
      where: { id },
      data: { nome, descricao }
    })

    return NextResponse.json(lab)
  } catch (error) {
    return NextResponse.json({ message: "Erro ao editar laboratório" }, { status: 500 })
  }
}
