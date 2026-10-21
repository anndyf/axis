import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { can } from "@/lib/rbac"
import { papeisDoUsuarioNoBanco } from "@/lib/papeis"
import { papeisDosBooleanos, rotuloDoPapelPrincipal } from "@/lib/permissoes"
import { CabecalhoPagina, Badge } from "@/components/ui"
import { Abas } from "@/components/ui/Abas"
import { abasDoUsuario } from "@/lib/fichas/abas"
import { podeVerHistorico } from "@/lib/services/historico-regra"

/**
 * Ficha do usuário (equipe): cabeçalho e abas sobre as telas do usuário.
 * Só para quem gerencia usuários; lê nome, usuário e papéis, na escola da
 * sessão (nunca o registro inteiro de User).
 */
export default async function FichaUsuarioLayout({ children, params }: { children: React.ReactNode; params: Promise<{ id: string }> }) {
  const session = await auth()
  const { id } = await params
  if (!session?.user?.escolaId || !can(session.user, "usuario.gerenciar")) return children

  const usuario = await prisma.user.findFirst({
    where: { id, escolaId: session.user.escolaId },
    select: { id: true, name: true, username: true, email: true, isActive: true, isApproved: true, isSuperuser: true, isDirecao: true, isStaff: true, isAEE: true, isPortalUser: true },
  })
  if (!usuario) return children
  const noBanco = await papeisDoUsuarioNoBanco(prisma, usuario.id, session.user.escolaId)
  const papeis = noBanco.length ? noBanco : papeisDosBooleanos(usuario)

  return (
    <div>
      <CabecalhoPagina
        titulo={<span className="inline-flex flex-wrap items-center gap-2">{usuario.name || usuario.username}{!usuario.isActive && <Badge tone="danger">Inativo</Badge>}{usuario.isActive && !usuario.isApproved && <Badge tone="warning">Aguardando aprovação</Badge>}</span>}
        caminho={[{ label: "Início", href: "/dashboard" }, { label: "Usuários", href: "/dashboard/usuarios" }, { label: usuario.name || usuario.username }]}
        dados={[
          { rotulo: "Papel", valor: rotuloDoPapelPrincipal(papeis) },
          { rotulo: "Usuário", valor: <span className="font-mono">{usuario.username}</span> },
        ]}
        abas={<Abas rotulo={`Seções da ficha de ${usuario.name || usuario.username}`} itens={abasDoUsuario(usuario.id, { disciplinas: papeis.includes("PROFESSOR"), historico: podeVerHistorico(session.user) })} />}
      />
      {children}
    </div>
  )
}
