import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { can } from "@/lib/rbac"
import OcorrenciasClient from "@/app/dashboard/ocorrencias/OcorrenciasClient"
import { paginaDoModulo } from '@/lib/modulos/guarda'

export const metadata = { title: 'Áxis - Turma' }

/** Ficha da turma, aba "Ocorrências": o livro de ocorrências filtrado por esta turma. */
export default async function TurmaOcorrenciasPage({ params }: { params: Promise<{ id: string }> }) {
  await paginaDoModulo('SEC')
  const session = await auth()
  if (!session?.user?.escolaId) redirect("/login")
  // Mesma regra da API e do menu: sem ela a lista viria como erro
  const { id } = await params
  if (!can(session.user, "ocorrencia.gerenciar")) redirect(`/dashboard/turmas/${encodeURIComponent(id)}`)
  const turma = await prisma.turma.findFirst({ where: { id, escolaId: session.user.escolaId }, select: { id: true, nome: true } })
  if (!turma) redirect("/dashboard/turmas")
  return <OcorrenciasClient turmas={[turma]} turmaFixa={turma.id} />
}
