import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { can } from "@/lib/rbac"
import { hojeNaEscola, dataValida } from "@/lib/services/chamada"
import ChamadaClient from "./ChamadaClient"

export const metadata = { title: 'Áxis - Fazer chamada' }
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// A aula é aberta/criada pela server action no navegador (abrirChamada), não
// na renderização - um prefetch de link não deve criar registro de aula.
export default async function FazerChamadaPage({ searchParams }: { searchParams: Promise<{ turma?: string; disciplina?: string; data?: string }> }) {
  const session = await auth()
  if (!session?.user?.escolaId || session.user.isPortalUser || !can(session.user, 'staff')) redirect("/dashboard")
  const { turma, disciplina, data } = await searchParams
  if (!turma) redirect("/dashboard/chamada")
  const hoje = hojeNaEscola()
  return <ChamadaClient turmaId={turma} disciplinaId={disciplina ?? null} data={dataValida(data) ? data : hoje} hoje={hoje} />
}
