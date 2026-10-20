import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import UploadForm from "./UploadForm"
import { paginaDoModulo } from '@/lib/modulos/guarda'

export const metadata = {
  title: 'Áxis - Estudantes'
}

export default async function ImportarEstudantesPage() {
  await paginaDoModulo('SEC')
  const session = await auth()
  
  if (!session?.user?.escolaId) {
    redirect("/login")
  }

  // Fetch turmas for the datalist
  const turmas = await prisma.turma.findMany({
    where: { escolaId: session.user.escolaId },
    orderBy: { nome: 'asc' },
    select: { id: true, nome: true, modalidade: true, turno: true }
  })

  return <UploadForm turmas={turmas} />
}
