import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import TurmaForm from "@/components/TurmaForm"
import { paginaDoModulo } from '@/lib/modulos/guarda'

export const metadata = {
  title: 'Áxis - Turmas'
}

export const runtime = 'nodejs'

async function getTurma(id: string, escolaId: string) {
  return await prisma.turma.findUnique({
    where: { id, escolaId }
  })
}

export default async function EditarTurmaPage({
  params
}: {
  params: Promise<{ id: string }>
}) {
  await paginaDoModulo('NUC')
  const session = await auth()
  
  if (!session?.user?.escolaId) {
    redirect("/login")
  }

  const { id } = await params
  const turma = await getTurma(id, session.user.escolaId)

  if (!turma) {
    redirect("/dashboard/turmas")
  }

  const cursos = await prisma.curso.findMany({
    where: { escolaId: session.user.escolaId },
    orderBy: { nome: 'asc' }
  })

  return <TurmaForm turma={turma} isEdit={true} dbCursos={cursos} />
}
