import TurmaForm from "@/components/TurmaForm"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"

export const metadata = {
  title: 'Áxis - Turmas'
}

export const runtime = 'nodejs'

export default async function NovaTurmaPage() {
  const session = await auth()
  if (!session?.user?.escolaId) {
    redirect("/login")
  }

  const cursos = await prisma.curso.findMany({
    where: { escolaId: session.user.escolaId },
    orderBy: { nome: 'asc' }
  })
  
  return <TurmaForm dbCursos={cursos} />
}
