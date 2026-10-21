import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { can } from "@/lib/rbac"
import { getTurmasPermitidas } from "@/lib/data-fetching"
import { UserX } from "lucide-react"
import { Card, EmptyState, PageHeader } from "@/components/ui"
import SeletorTurma from "./SeletorTurma"
import ConteudoFrequencia from "./ConteudoFrequencia"
import { paginaDoModulo } from '@/lib/modulos/guarda'

export const metadata = { title: 'Áxis - Frequência' }
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export default async function FrequenciaPage({ searchParams }: { searchParams: Promise<{ turma?: string; todos?: string }> }) {
  await paginaDoModulo('DIA')
  const session = await auth()
  if (!session?.user?.escolaId || can(session.user, 'portal.acessar') || !can(session.user, 'frequencia.acompanhar')) redirect("/dashboard")
  const escolaId = session.user.escolaId
  const { turma: turmaId, todos } = await searchParams

  const turmas = (await getTurmasPermitidas(session)).map((t) => ({ id: t.id, nome: t.nome }))
  const turma = turmaId ? await prisma.turma.findFirst({ where: { id: turmaId, escolaId }, select: { id: true, nome: true } }) : null

  let conteudo: React.ReactNode = (
    <Card><EmptyState icon={UserX} title="Escolha uma turma" description="Veja quem está abaixo ou perto da frequência mínima e registre atestados e justificativas." /></Card>
  )

  if (turma) {
    conteudo = <ConteudoFrequencia escolaId={escolaId} turma={turma} todos={todos} base={`/dashboard/frequencia?turma=${turma.id}`} />
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Frequência"
        description="Infrequência por turma e cadastro de atestados e justificativas."
        actions={<SeletorTurma turmas={turmas} atual={turma?.id ?? ""} />}
      />
      {conteudo}
    </div>
  )
}
