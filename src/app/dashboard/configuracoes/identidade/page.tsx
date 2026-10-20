import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { can } from "@/lib/rbac"
import { PageHeader } from "@/components/ui"
import { DESTAQUE_PADRAO } from "@/lib/services/identidade"
import IdentidadeClient from "./IdentidadeClient"
import { paginaDoModulo } from '@/lib/modulos/guarda'

export const metadata = { title: "Áxis - Identidade visual" }
export const dynamic = "force-dynamic"

export default async function IdentidadePage() {
  await paginaDoModulo('NUC')
  const session = await auth()
  if (!session?.user?.escolaId || !can(session.user, "identidade.editar")) redirect("/dashboard")
  const escola = await prisma.escola.findUnique({
    where: { id: session.user.escolaId },
    select: { nome: true, logoUrl: true, corPrimaria: true },
  })

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Identidade visual"
        description="Logo e cor da escola. O logo aparece no menu, no cabeçalho, no portal e nos PDFs; a cor, só como detalhe. Botões, links e menu usam sempre o azul Áxis."
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
