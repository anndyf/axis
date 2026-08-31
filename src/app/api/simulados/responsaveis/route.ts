import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.escolaId || (!session.user.isSuperuser && !session.user.isDirecao)) {
      return NextResponse.json({ message: "Não autorizado" }, { status: 401 })
    }
    const escolaId = session.user.escolaId

    const { searchParams } = new URL(request.url)
    const turmaId = searchParams.get("turmaId") || undefined
    const anoLetivo = searchParams.get("anoLetivo") ? parseInt(searchParams.get("anoLetivo")!) : 2026

    // ResponsavelSimulado nao tem escolaId proprio - o escopo e feito via
    // relacao com a turma, que sempre pertence a uma unica escola.
    const responsaveis = await (prisma as any).responsavelSimulado.findMany({
      where: {
        turmaId,
        anoLetivo,
        turma: { escolaId }
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
        turma: { select: { id: true, nome: true } },
        area: { select: { id: true, nome: true } },
        prova: { select: { id: true, titulo: true, codigo: true, unidade: true } }
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json(responsaveis)
  } catch (error) {
    console.error("Erro ao buscar responsáveis de simulado:", error)
    return NextResponse.json({ message: "Erro interno" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.escolaId || (!session.user.isSuperuser && !session.user.isDirecao)) {
      return NextResponse.json({ message: "Não autorizado" }, { status: 401 })
    }
    const escolaId = session.user.escolaId

    const { userId, turmaId, areaId, provaId, unidade, anoLetivo = 2026 } = await request.json()

    if (!userId || !turmaId || (!areaId && !provaId)) {
      return NextResponse.json({ message: "Preencha os campos obrigatórios (Usuário, Turma, Prova/Área)" }, { status: 400 })
    }

    // Valida que a turma e o usuario designado pertencem a escola do chamador
    // antes de qualquer escrita, ja que ResponsavelSimulado nao tem escolaId proprio.
    const [turma, usuarioDesignado] = await Promise.all([
      prisma.turma.findUnique({ where: { id: turmaId, escolaId } }),
      prisma.user.findUnique({ where: { id: userId, escolaId } })
    ])
    if (!turma || !usuarioDesignado) {
      return NextResponse.json({ message: "Turma ou usuário inválido para esta escola" }, { status: 404 })
    }

    const modelName = Object.keys(prisma).find(k => k.toLowerCase() === "responsavelsimulado") || "responsavelSimulado"

    // Busca se já existe um responsável para esta turma + prova + unidade (ou área)
    let whereClause: any = { turmaId, anoLetivo }
    if (provaId) {
      whereClause.provaId = provaId
      if (unidade) whereClause.unidade = parseInt(unidade.toString())
    } else {
      whereClause.areaId = areaId
    }

    let responsavel = await (prisma as any)[modelName].findFirst({
      where: { ...whereClause, turma: { escolaId } }
    })

    if (responsavel) {
      responsavel = await (prisma as any)[modelName].update({
        where: { id: responsavel.id },
        data: { userId }
      })
    } else {
      responsavel = await (prisma as any)[modelName].create({
        data: {
          userId,
          turmaId,
          areaId: areaId || null,
          provaId: provaId || null,
          unidade: unidade ? parseInt(unidade.toString()) : null,
          anoLetivo
        }
      })
    }

    return NextResponse.json(responsavel)
  } catch (error) {
    console.error("Erro ao designar responsável:", error)
    return NextResponse.json({ message: "Erro ao salvar" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
    try {
      const session = await auth()
      if (!session?.user?.escolaId || (!session.user.isSuperuser && !session.user.isDirecao)) {
        return NextResponse.json({ message: "Não autorizado" }, { status: 401 })
      }
      const escolaId = session.user.escolaId

      const { searchParams } = new URL(request.url)
      const id = searchParams.get("id")

      if (!id) return NextResponse.json({ message: "ID obrigatório" }, { status: 400 })

      const existente = await (prisma as any).responsavelSimulado.findFirst({
        where: { id, turma: { escolaId } }
      })
      if (!existente) {
        return NextResponse.json({ message: "Responsável não encontrado" }, { status: 404 })
      }

      await (prisma as any).responsavelSimulado.delete({ where: { id } })

      return NextResponse.json({ message: "Responsável removido" })
    } catch (error) {
      return NextResponse.json({ message: "Erro ao remover" }, { status: 500 })
    }
}
