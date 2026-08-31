import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import EstudanteForm from "@/components/EstudanteForm"

export const metadata = {
  title: 'Áxis - Estudantes'
}

export const runtime = 'nodejs'

async function getEstudante(escolaId: string, matricula: string) {
  return await prisma.estudante.findUnique({
    where: { escolaId_matricula: { escolaId, matricula } }
  })
}

export default async function EditarEstudantePage({
  params
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()

  if (!session?.user?.escolaId) {
    redirect("/login")
  }

  const { id } = await params
  const estudante = await getEstudante(session.user.escolaId, id)

  if (!estudante) {
    redirect("/dashboard/estudantes")
  }

  return <EstudanteForm estudante={estudante} isEdit={true} />
}
