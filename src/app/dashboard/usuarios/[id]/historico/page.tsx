import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { can } from "@/lib/rbac"
import { historicoDoUsuario, podeVerHistorico } from "@/lib/services/historico-leitura"
import TabelaHistorico from "@/components/fichas/TabelaHistorico"
import { paginaDoModulo } from '@/lib/modulos/guarda'

export const metadata = { title: 'Áxis - Usuário' }
export const dynamic = 'force-dynamic'

/** Ficha do usuário, aba "Histórico" (mesma permissão da auditoria; escola da sessão). */
export default async function UsuarioHistoricoPage({ params }: { params: Promise<{ id: string }> }) {
  await paginaDoModulo('NUC')
  const session = await auth()
  if (!session?.user?.escolaId || !can(session.user, 'usuario.gerenciar') || !podeVerHistorico(session.user)) redirect("/dashboard")
  const { id } = await params
  const entradas = await historicoDoUsuario(session.user.escolaId, id)
  if (!entradas) redirect("/dashboard/usuarios")
  return <TabelaHistorico entradas={entradas} vazio="Nenhuma alteração registrada para esta conta." />
}
