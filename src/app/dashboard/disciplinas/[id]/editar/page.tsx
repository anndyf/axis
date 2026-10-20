import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import DisciplinaForm from "@/components/DisciplinaForm"
import { paginaDoModulo } from '@/lib/modulos/guarda'

export const metadata = {
  title: 'Áxis - Disciplinas'
}

export const runtime = 'nodejs'

async function getDisciplina(id: string, escolaId: string) {
  return await prisma.disciplina.findFirst({
    where: { id, turma: { escolaId } }
  })
}

export default async function EditarDisciplinaPage({
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
  const disciplina = await getDisciplina(id, session.user.escolaId)

  if (!disciplina) {
    redirect("/dashboard/disciplinas")
  }

  return <DisciplinaForm disciplina={disciplina} isEdit={true} />
}
