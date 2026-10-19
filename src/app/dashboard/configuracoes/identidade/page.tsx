import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { can } from "@/lib/rbac"
import { PageHeader } from "@/components/ui"
import { DESTAQUE_PADRAO } from "@/lib/services/identidade"
import IdentidadeClient from "./IdentidadeClient"

export const metadata = { title: "Áxis - Identidade visual" }
export const dynamic = "force-dynamic"

export default async function IdentidadePage() {
  const session = await auth()
  if (!session?.user?.escolaId || !can(session.user, "gestao")) redirect("/dashboard")
  const escola = await prisma.escola.findUnique({
    where: { id: session.user.escolaId },
    select: { nome: true, logoUrl: true, corPrimaria: true },
  })

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Identidade visual"
        description="Logo e cor de destaque da escola. A cor aparece no botão principal, no item ativo do menu, nos links e no login."
      />
      <IdentidadeClient
        nomeEscola={escola?.nome ?? "Escola"}
        corInicial={escola?.corPrimaria ?? ""}
        logoInicial={escola?.logoUrl ?? ""}
        corPadrao={DESTAQUE_PADRAO}
      />
    </div>
  )
}
