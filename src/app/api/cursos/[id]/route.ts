import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()
    if (!session?.user?.escolaId) {
      return NextResponse.json({ message: "Não autorizado" }, { status: 401 })
    }
    const escolaId = session.user.escolaId

    const { id } = await params
    const { nome, sigla, turnos, nivelEnsino } = await req.json()

    if (!nome || !sigla) {
      return NextResponse.json(
        { message: "Nome e sigla são obrigatórios" },
        { status: 400 }
      )
    }

    // Verifica se o curso existe e pertence a escola do chamador
    const current = await prisma.curso.findUnique({ where: { id, escolaId } })
    if (!current) {
      return NextResponse.json({ message: "Curso não encontrado." }, { status: 404 })
    }

    // Verifica se a sigla já é usada por outro curso DA MESMA ESCOLA
    const existingSigla = await prisma.curso.findFirst({
      where: { escolaId, sigla, NOT: { id } }
    })
    if (existingSigla) {
      return NextResponse.json(
        { message: `Sigla "${sigla}" já está em uso por outro curso.` },
        { status: 400 }
      )
    }

    // Verifica se nome+modalidade já existe em outro curso DA MESMA ESCOLA
    const duplicateNome = await prisma.curso.findFirst({
      where: { escolaId, nome, modalidade: current.modalidade, NOT: { id } }
    })
    if (duplicateNome) {
      return NextResponse.json(
        { message: `Já existe outro curso com este nome na modalidade ${current.modalidade}.` },
        { status: 400 }
      )
    }

    const curso = await prisma.curso.update({
      where: { id },
      data: { nome, sigla, turnos: turnos || [], nivelEnsino: nivelEnsino ?? current.nivelEnsino }
    })

    return NextResponse.json(curso)
  } catch (error: any) {
    if (error.code === 'P2002') {
      return NextResponse.json(
        { message: "Conflito: sigla já em uso." },
        { status: 400 }
      )
    }
    console.error("Erro ao atualizar curso:", error)
    return NextResponse.json(
      { message: "Erro interno ao atualizar curso" },
      { status: 500 }
    )
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()
    if (!session?.user?.escolaId) {
      return NextResponse.json({ message: "Não autorizado" }, { status: 401 })
    }
    const escolaId = session.user.escolaId

    const { id } = await params

    const existente = await prisma.curso.findUnique({ where: { id, escolaId } })
    if (!existente) {
      return NextResponse.json({ message: "Curso não encontrado." }, { status: 404 })
    }

    await prisma.curso.delete({ where: { id } })

    return NextResponse.json({ message: "Curso removido com sucesso." })
  } catch (error: any) {
    if (error.code === 'P2025') {
      return NextResponse.json({ message: "Curso não encontrado." }, { status: 404 })
    }
    console.error("Erro ao remover curso:", error)
    return NextResponse.json(
      { message: "Erro interno ao remover curso" },
      { status: 500 }
    )
  }
}
