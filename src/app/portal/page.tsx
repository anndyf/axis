
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import PortalClient from "./PortalClient"
import { getStudentPortalData } from "./actions"
import { prisma } from "@/lib/prisma"
import { precisaTrocarSenha } from "@/lib/data-fetching"

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export default async function PortalPage() {
  const session = await auth()

  if (!session) {
    redirect("/login")
  }

  if (!session.user.isPortalUser) {
    redirect("/dashboard")
  }

  if (await precisaTrocarSenha(session.user.id)) {
    redirect("/trocar-senha")
  }

  const data = await getStudentPortalData()
  const escola = await prisma.escola.findUnique({
    where: { id: session.user.escolaId },
    select: { nome: true }
  })

  return <PortalClient initialData={data} user={session.user} nomeEscola={escola?.nome || 'Áxis'} />
}
