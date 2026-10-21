import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { historicoDoEstudante, podeVerHistorico } from "@/lib/services/historico-leitura"
import TabelaHistorico from "@/components/fichas/TabelaHistorico"
import { paginaDoModulo } from '@/lib/modulos/guarda'

export const metadata = { title: 'Áxis - Estudante' }
export const dynamic = 'force-dynamic'

/** Ficha do estudante, aba "Histórico" (mesma permissão da auditoria; escola da sessão). */
export default async function EstudanteHistoricoPage({ params }: { params: Promise<{ id: string }> }) {
  await paginaDoModulo('NUC')
  const session = await auth()
  if (!session?.user?.escolaId || !podeVerHistorico(session.user)) redirect("/dashboard")
  const { id } = await params
  const entradas = await historicoDoEstudante(session.user.escolaId, id)
  if (!entradas) redirect("/dashboard/estudantes")
  return <TabelaHistorico entradas={entradas} vazio="Nenhuma alteração registrada para este estudante." />
}
