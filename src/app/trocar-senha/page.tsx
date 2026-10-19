import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import NovaSenhaForm from "@/components/NovaSenhaForm"

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const metadata = { title: 'Crie sua senha · Áxis' }

// Troca obrigatória de senha (User.deveTrocarSenha) - dashboard e portal
// redirecionam pra cá até a senha provisória ser trocada.
export default async function TrocarSenhaPage() {
  const session = await auth()
  if (!session?.user?.escolaId) redirect("/login")

  const escola = await prisma.escola.findUnique({ where: { id: session.user.escolaId }, select: { nome: true, logoUrl: true } })

  return (
    <NovaSenhaForm
      modo="trocar"
      destino={session.user.isPortalUser ? "/portal" : "/dashboard"}
      escola={{ nome: escola?.nome ?? 'Áxis', logoUrl: escola?.logoUrl ?? null }}
    />
  )
}
