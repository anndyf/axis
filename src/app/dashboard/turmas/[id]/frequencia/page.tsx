import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { can } from "@/lib/rbac"
import ConteudoFrequencia from "@/app/dashboard/frequencia/ConteudoFrequencia"
import { paginaDoModulo } from '@/lib/modulos/guarda'

export const metadata = { title: 'Áxis - Turma' }
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** Ficha da turma, aba "Frequência": o mesmo conteúdo da tela Frequência para esta turma. */
export default async function TurmaFrequenciaPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ todos?: string }> }) {
  await paginaDoModulo('DIA')
  const session = await auth()
  if (!session?.user?.escolaId || can(session.user, 'portal.acessar') || !can(session.user, 'frequencia.acompanhar')) redirect("/dashboard")
  const { id } = await params
  const { todos } = await searchParams
  const turma = await prisma.turma.findFirst({ where: { id, escolaId: session.user.escolaId }, select: { id: true, nome: true } })
  if (!turma) redirect("/dashboard/turmas")
  return (
    <div className="space-y-6">
      <ConteudoFrequencia escolaId={session.user.escolaId} turma={turma} todos={todos} base={`/dashboard/turmas/${turma.id}/frequencia`} />
    </div>
  )
}
