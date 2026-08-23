import { Metadata } from "next"
import OcorrenciasClient from "./OcorrenciasClient"

export const metadata: Metadata = {
  title: "Registro de Ocorrências | Áxis",
  description: "Livro de registros e ocorrências escolares.",
}

import { prisma } from "@/lib/prisma"
import { getGlobalConfig } from "@/lib/data-fetching"
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"

export default async function OcorrenciasPage() {
  const session = await auth()
  if (!session?.user?.escolaId) redirect("/login")

  const config = await getGlobalConfig(session.user.escolaId)
  const currentYear = config?.anoLetivoAtual || new Date().getFullYear()

  const turmas = await prisma.turma.findMany({
    where: {
      escolaId: session.user.escolaId,
      anoLetivo: currentYear
    },
    select: {
      id: true,
      nome: true
    },
    orderBy: {
      nome: 'asc'
    }
  })

  return (
    <OcorrenciasClient turmas={turmas} />
  )
}
