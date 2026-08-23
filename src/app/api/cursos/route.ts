import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

export async function POST(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.escolaId) {
      return NextResponse.json({ message: "Não autorizado" }, { status: 401 })
    }
    const escolaId = session.user.escolaId

    const { nome, sigla, modalidade, modalidades, turnos } = await req.json()

    if (!nome || !sigla) {
      return NextResponse.json(
        { message: "Nome e sigla são obrigatórios" },
        { status: 400 }
      )
    }

    // Suporte a múltiplas modalidades (novo) ou modalidade única (compat. retroativa)
    const listaModalidades: string[] = modalidades && modalidades.length > 0
      ? modalidades
      : [modalidade || "EPTM"]

    if (listaModalidades.length === 0) {
      return NextResponse.json(
        { message: "Selecione pelo menos uma modalidade" },
        { status: 400 }
      )
    }

    const criados: any[] = []
    const erros: string[] = []

    for (const mod of listaModalidades) {
      // Gera ID único por modalidade
      const sufixo = listaModalidades.length > 1 ? `_${mod.toLowerCase().slice(0, 3)}` : ""
      let cursoId = `${mod.toLowerCase()}_${sigla.toLowerCase()}`.replace(/[^a-z0-9_]/g, '')

      // Sigla por modalidade (única no BD)
      const siglaFinal = listaModalidades.length > 1 ? `${sigla}_${mod.slice(0, 3).toUpperCase()}` : sigla

      // Verifica se já existe
      const existingCurso = await prisma.curso.findFirst({
        where: {
          escolaId,
          OR: [
            { id: cursoId },
            { nome, modalidade: mod }
          ]
        }
      })

      if (existingCurso) {
        erros.push(`Curso "${nome}" na modalidade ${mod} já existe.`)
        continue
      }

      // Verifica sigla única
      const existingSigla = await prisma.curso.findUnique({ where: { escolaId_sigla: { escolaId, sigla: siglaFinal } } })
      if (existingSigla) {
        erros.push(`Sigla "${siglaFinal}" já está em uso.`)
        continue
      }

      try {
        const curso = await prisma.curso.create({
          data: {
            id: cursoId,
            escolaId,
            nome,
            sigla: siglaFinal,
            modalidade: mod,
            turnos: turnos || []
          }
        })
        criados.push(curso)
      } catch (err: any) {
        if (err.code === 'P2002') {
          erros.push(`Conflito ao criar para modalidade ${mod}.`)
        } else {
          erros.push(`Erro ao criar para modalidade ${mod}: ${err.message}`)
        }
      }
    }

    if (criados.length === 0) {
      return NextResponse.json(
        { message: erros.join(" | ") || "Nenhum curso foi criado." },
        { status: 400 }
      )
    }

    // Se alguns foram criados e outros não, retorna 207 Multi-Status
    if (erros.length > 0) {
      return NextResponse.json(
        { cursos: criados, avisos: erros, message: `${criados.length} curso(s) criado(s). ${erros.length} ignorado(s): ${erros.join(", ")}` },
        { status: 207 }
      )
    }

    return NextResponse.json(criados, { status: 201 })
  } catch (error: any) {
    if (error.code === 'P2002') {
      return NextResponse.json(
        { message: "Conflito de unicidade (nome, sigla ou modalidade já existem)." },
        { status: 400 }
      )
    }
    console.error("Erro ao criar curso:", error)
    return NextResponse.json(
      { message: "Erro interno no servidor ao criar curso" },
      { status: 500 }
    )
  }
}
