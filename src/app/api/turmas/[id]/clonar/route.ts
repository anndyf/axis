import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"
import { revalidatePath } from "next/cache"

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session || !session.user.isSuperuser) {
      return NextResponse.json({ message: "Não autorizado" }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const { nome, turno, numero, anoLetivo } = body

    // 1. Buscar a turma original com suas disciplinas
    const originalTurma = await prisma.turma.findUnique({
      where: { id },
      include: {
        disciplinas: true
      }
    })

    if (!originalTurma) {
      return NextResponse.json({ message: "Turma não encontrada" }, { status: 404 })
    }

    // 2. Criar a nova turma (clonada) - SEM PROFESSORES
    const newTurma = await prisma.turma.create({
      data: {
        nome: nome || `${originalTurma.nome} (CLONE)`,
        cursoId: originalTurma.cursoId,
        curso: originalTurma.curso,
        turno: turno || originalTurma.turno,
        modalidade: originalTurma.modalidade,
        serie: originalTurma.serie,
        numero: numero !== undefined ? parseInt(numero.toString()) : originalTurma.numero,
        anoLetivo: anoLetivo || originalTurma.anoLetivo,
        escolaId: originalTurma.escolaId,
      }
    })

    // 3. Clonar as disciplinas - SOMENTE O NOME, SEM PROFESSORES
    if (originalTurma.disciplinas.length > 0) {
      await prisma.disciplina.createMany({
        data: originalTurma.disciplinas.map(disc => ({
          nome: disc.nome,
          turmaId: newTurma.id,
          areaId: disc.areaId
        }))
      })
    }

    revalidatePath('/dashboard/turmas')
    return NextResponse.json({ 
      message: "Turma clonada com sucesso", 
      id: newTurma.id 
    })

  } catch (error) {
    console.error("Erro ao clonar turma:", error)
    return NextResponse.json({ message: "Erro interno ao clonar turma" }, { status: 500 })
  }
}
