import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { NextResponse } from "next/server"
import { rotaDoModulo } from '@/lib/modulos/guarda'

export const GET = rotaDoModulo('NUC', 'leitura', async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.escolaId) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    const areas = await prisma.areaConhecimento.findMany({
      where: { escolaId: session.user.escolaId },
      orderBy: { nome: 'asc' }
    })
    return NextResponse.json(areas)
  } catch (error) {
    return NextResponse.json({ error: "Erro ao buscar áreas" }, { status: 500 })
  }
})
