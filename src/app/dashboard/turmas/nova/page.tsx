import TurmaForm from "@/components/TurmaForm"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { paginaDoModulo } from '@/lib/modulos/guarda'

export const metadata = {
  title: 'Áxis - Turmas'
}

export const runtime = 'nodejs'

export default async function NovaTurmaPage() {
  await paginaDoModulo('NUC')
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
