import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { exigirAdminPlataforma, SELECT_ESCOLA_PLATAFORMA } from "@/lib/plataforma"
import PlataformaClient from "./PlataformaClient"

export const metadata = {
  title: 'Áxis - Plataforma'
}

export const runtime = 'nodejs'

export default async function PlataformaPage() {
  if (!(await exigirAdminPlataforma())) {
    redirect("/dashboard")
  }

  const escolas = await prisma.escola.findMany({
    select: SELECT_ESCOLA_PLATAFORMA,
    orderBy: { createdAt: 'desc' }
  })

  return <PlataformaClient escolasIniciais={escolas} />
}
