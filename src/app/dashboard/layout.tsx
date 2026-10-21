import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import SessionTimer from "@/components/SessionTimer"
import MessageNotification from "@/components/MessageNotification"
import DashboardLayoutWrapper from "@/components/DashboardLayoutWrapper"
import { getGlobalConfig, precisaTrocarSenha } from "@/lib/data-fetching"
import { getModulosAtivos } from "@/lib/modules-server"
import { can } from "@/lib/rbac"
import { visoesDisponiveis } from "@/lib/services/painel-visoes-servidor"
import { CaminhoAutomatico } from "@/components/ui/CaminhoAutomatico"

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()

  if (!session) {
    redirect("/login")
  }

  // Se for usuário do portal, não acessa o dashboard administrativo
  if (can(session.user, 'portal.acessar')) {
    redirect("/portal")
  }

  if (await precisaTrocarSenha(session.user.id)) {
    redirect("/trocar-senha")
  }

  const escola = await prisma.escola.findUnique({
    where: { id: session.user.escolaId },
    select: { nome: true, plano: true, logoUrl: true }
  })

  let config = await getGlobalConfig(session.user.escolaId)

  if (!config) {
    // Caso raro onde a escola ainda não tem config, cria a inicial
    config = await prisma.globalConfig.create({
      data: {
        id: session.user.escolaId,
        escolaId: session.user.escolaId,
        anoLetivoAtual: new Date().getFullYear()
      }
    })
  }

  const modulosAtivos = await getModulosAtivos(session.user.escolaId, escola?.plano || 'BASICO')
  const visoes = await visoesDisponiveis(session.user, session.user.escolaId, config.anoLetivoAtual)

  return (
    <div className="flex font-sans text-fg print:block print:min-h-0">
      <SessionTimer />
      <MessageNotification />
      <DashboardLayoutWrapper
        user={session.user}
        escola={{ nome: escola?.nome ?? "Áxis", logoUrl: escola?.logoUrl ?? null }}
        modulosAtivos={modulosAtivos}
        anoLetivo={config.anoLetivoAtual}
        visoes={visoes}
      >
        {/* Área de trabalho: ocupa a largura disponível. O caminho automático
            some quando a tela traz o próprio CabecalhoPagina (globals.css). */}
        <div className="w-full min-w-0 flex-1 px-pagina py-pagina-y print:p-0">
          <CaminhoAutomatico className="caminho-layout mb-3 hidden md:block print:hidden" />
          {children}
        </div>

        <footer className="border-t border-line-subtle px-pagina py-3 print:hidden">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-fg-subtle">
            <span>Áxis · Sistema de Gestão Escolar · © {new Date().getFullYear()} {escola?.nome || "Áxis"}</span>
            <span>Desenvolvido por <span className="text-fg-muted">Andressa Mirella</span></span>
          </div>
        </footer>
      </DashboardLayoutWrapper>
    </div>
  )
}
