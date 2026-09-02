import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import EsquemaAvaliacaoClient from "./EsquemaAvaliacaoClient"

export const metadata = {
  title: 'Áxis - Esquemas de Avaliação'
}

export const runtime = 'nodejs'

export default async function EsquemasAvaliacaoPage() {
  const session = await auth()

  if (!session?.user?.escolaId || !session.user.isSuperuser) {
    redirect("/dashboard")
  }

  const esquemas = await prisma.esquemaAvaliacao.findMany({
    where: { escolaId: session.user.escolaId },
    include: {
      unidades: {
        orderBy: { ordem: 'asc' },
        include: { atividades: { orderBy: { ordem: 'asc' } } }
      },
      _count: { select: { cursos: true, turmas: true } }
    },
    orderBy: { nome: 'asc' }
  })

  return <EsquemaAvaliacaoClient esquemasIniciais={esquemas} />
}
