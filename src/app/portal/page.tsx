
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import PortalClient from "./PortalClient"
import { getStudentPortalData } from "./actions"
import { prisma } from "@/lib/prisma"
import { precisaTrocarSenha } from "@/lib/data-fetching"
import { paginaDoModulo } from '@/lib/modulos/guarda'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export default async function PortalPage({ searchParams }: { searchParams: Promise<{ aba?: string }> }) {
  await paginaDoModulo('NUC')
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
    select: { nome: true, logoUrl: true }
  })

  const { aba } = await searchParams

  // Só o id vai ao navegador (chave local das mensagens lidas)
  return <PortalClient initialData={data} user={{ id: session.user.id }} escola={{ nome: escola?.nome || 'Áxis', logoUrl: escola?.logoUrl ?? null }} abaInicial={aba} />
}
