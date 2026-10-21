import { auth } from "@/lib/auth"
import { redirect, notFound } from "next/navigation"
import { prisma } from "@/lib/prisma"
import ImportarHorarioClient from "./ImportarHorarioClient"
import { paginaDoModulo } from '@/lib/modulos/guarda'
import { can } from '@/lib/rbac'

export const runtime = 'nodejs'

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  const { id } = await params
  const user = session?.user?.escolaId
    ? await prisma.user.findUnique({ where: { id, escolaId: session.user.escolaId }, select: { name: true } })
    : null
  return { title: `Importar Horário — ${user?.name ?? 'Professor'}` }
}

export default async function ImportarHorarioPage({ params }: { params: Promise<{ id: string }> }) {
  await paginaDoModulo('NUC')
  const session = await auth()
  if (!session?.user?.escolaId || !can(session.user, 'usuario.gerenciar')) redirect("/dashboard")

  const { id } = await params
  const usuario = await prisma.user.findUnique({
    where: { id, escolaId: session.user.escolaId },
    select: { id: true, name: true, isStaff: true }
  })

  if (!usuario) notFound()

  return <ImportarHorarioClient usuario={usuario} />
}
