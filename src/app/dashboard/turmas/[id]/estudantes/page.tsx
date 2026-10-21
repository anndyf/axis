import Link from "next/link"
import { redirect } from "next/navigation"
import { Plus } from "lucide-react"
import { auth } from "@/lib/auth"
import { can } from "@/lib/rbac"
import { turmaPermitida } from "@/lib/fichas/turma"
import { getEstudantes } from "@/lib/services/estudantes-lista"
import { buttonClasses } from "@/components/ui"
import TabelaEstudantes from "@/components/estudantes/TabelaEstudantes"
import { paginaDoModulo } from '@/lib/modulos/guarda'

export const metadata = { title: 'Áxis - Turma' }
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** Ficha da turma, aba "Estudantes": a mesma consulta da tela Estudantes, filtrada pela turma. */
export default async function TurmaEstudantesPage({ params }: { params: Promise<{ id: string }> }) {
  await paginaDoModulo('NUC')
  const session = await auth()
  if (!session?.user?.escolaId) redirect("/login")
  if (!can(session.user, 'estudante.ler')) redirect(`/dashboard/turmas`)
  const { id } = await params
  const turma = await turmaPermitida(session, id)
  if (!turma) redirect("/dashboard/turmas")

  const { estudantes, portalUserIds } = await getEstudantes({
    turmaId: id, userId: session.user.id, isDirecao: can(session.user, 'escopo.escola'), escolaId: session.user.escolaId,
  })

  return (
    <TabelaEstudantes
      estudantes={estudantes}
      portalUserIds={[...portalUserIds]}
      nomeExportacao={`Estudantes ${turma.nome}`}
      acoes={can(session.user, 'estudante.editar') ? (
        <Link href="/dashboard/estudantes/novo" className={buttonClasses({ size: "sm" })}><Plus size={14} strokeWidth={1.75} aria-hidden /> Novo estudante</Link>
      ) : undefined}
    />
  )
}
