"use server"
// @modulo NUC - Núcleo sempre ativo; sem checagem de módulo (ver src/lib/modulos/mapa-rotas.ts)

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { can } from "@/lib/rbac"
import { revalidatePath } from "next/cache"
import { normalizarHex, validarLogo } from "@/lib/services/identidade"

// Identidade visual da escola - só gestão; a escola é sempre a da sessão.
export async function salvarIdentidade(dados: { corPrimaria?: string | null; logoUrl?: string | null }): Promise<{ ok: true } | { erro: string }> {
  const session = await auth()
  if (!session?.user?.escolaId || session.user.isPortalUser || !can(session.user, "gestao")) return { erro: "Não autorizado" }

  let cor: string | null = null
  if (dados?.corPrimaria) {
    cor = normalizarHex(dados.corPrimaria)
    if (!cor) return { erro: "Cor inválida. Use o formato #RRGGBB." }
  }
  const logo = validarLogo(dados?.logoUrl)
  if (logo && typeof logo === "object") return logo

  await prisma.escola.update({
    where: { id: session.user.escolaId },
    data: { corPrimaria: cor, logoUrl: logo },
  })
  revalidatePath("/", "layout")
  return { ok: true }
}
