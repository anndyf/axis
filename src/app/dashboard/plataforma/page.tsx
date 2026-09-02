import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import PlataformaClient from "./PlataformaClient"

export const metadata = {
  title: 'Áxis - Plataforma'
}

export const runtime = 'nodejs'

export default async function PlataformaPage() {
  const session = await auth()

  if (!session?.user?.isPlatformAdmin) {
    redirect("/dashboard")
  }

  const escolas = await prisma.escola.findMany({
    include: { _count: { select: { users: true, estudantes: true } } },
    orderBy: { createdAt: 'desc' }
  })

  return <PlataformaClient escolasIniciais={escolas} />
}
