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
    const { nome, serie, anoLetivo } = body

    // 1. Buscar a turma original com estudantes e disciplinas
    const originalTurma = await prisma.turma.findUnique({
      where: { id },
      include: {
        estudantes: true,
        disciplinas: true
      }
    })

    if (!originalTurma) {
      return NextResponse.json({ message: "Turma não encontrada" }, { status: 404 })
    }

    // 2. Criar a nova turma (promovida)
    const newTurma = await prisma.turma.create({
      data: {
        nome: nome || `${originalTurma.nome} PROMOVIDO`,
        cursoId: originalTurma.cursoId,
        curso: originalTurma.curso,
        turno: originalTurma.turno,
        modalidade: originalTurma.modalidade,
        serie: serie || originalTurma.serie,
        numero: originalTurma.numero,
        anoLetivo: anoLetivo || originalTurma.anoLetivo,
        escolaId: originalTurma.escolaId,
      }
    })

    // 3. Definir disciplinas (Apenas via Matriz Curricular)
    const matrizDisciplinas = await (prisma as any).matrizCurricular.findMany({
      where: {
        cursoId: originalTurma.cursoId || "",
        serie: serie || originalTurma.serie || "",
        anoLetivo: anoLetivo ? parseInt(anoLetivo.toString()) : originalTurma.anoLetivo || 2026
      }
    })

    if (matrizDisciplinas.length > 0) {
      console.log(`📚 Usando matriz curricular para criar ${matrizDisciplinas.length} disciplinas.`)
      await prisma.disciplina.createMany({
        data: matrizDisciplinas.map((m: any) => ({
          nome: m.nome,
          turmaId: newTurma.id,
          areaId: m.areaId
        }))
      })
    } else {
      console.log(`⚠️ Matriz não encontrada para esta série. A turma será criada sem disciplinas iniciais.`)
    }

    // 4. Mover os estudantes para a nova turma
    if (originalTurma.estudantes.length > 0) {
      await prisma.estudante.updateMany({
        where: {
          id: { in: originalTurma.estudantes.map(e => e.id) }
        },
        data: {
          turmaId: newTurma.id
        }
      })
    }

    revalidatePath('/dashboard/turmas')
    return NextResponse.json({ 
      message: "Turma promovida com sucesso", 
      id: newTurma.id 
    })

  } catch (error) {
    console.error("Erro ao promover turma:", error)
    return NextResponse.json({ message: "Erro interno ao promover turma" }, { status: 500 })
  }
}
