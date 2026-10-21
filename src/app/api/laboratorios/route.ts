import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { can } from "@/lib/rbac"
import { NextResponse } from "next/server"
import { rotaDoModulo } from '@/lib/modulos/guarda'

export const GET = rotaDoModulo('REC', 'leitura', async function GET() {
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
})

export const POST = rotaDoModulo('REC', 'escrita', async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session || !can(session.user, 'laboratorio.gerenciar')) {
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
})

export const PATCH = rotaDoModulo('REC', 'escrita', async function PATCH(request: Request) {
  try {
    const session = await auth()
    if (!session || !can(session.user, 'laboratorio.gerenciar')) {
      return NextResponse.json({ message: "Não autorizado" }, { status: 401 })
    }

    const { id, nome, descricao } = await request.json()
    
    if (!id) return NextResponse.json({ message: "ID do laboratório não informado" }, { status: 400 })

    const lab = await prisma.laboratorio.update({
      where: { id, escolaId: session.user.escolaId },
      data: { nome, descricao }
    })

    return NextResponse.json(lab)
  } catch (error) {
    return NextResponse.json({ message: "Erro ao editar laboratório" }, { status: 500 })
  }
})
