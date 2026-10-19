import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import SessionTimer from "@/components/SessionTimer"
import MessageNotification from "@/components/MessageNotification"
import DashboardLayoutWrapper from "@/components/DashboardLayoutWrapper"
import { getGlobalConfig, precisaTrocarSenha } from "@/lib/data-fetching"
import { getModulosAtivos } from "@/lib/modules-server"

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
  if (session.user.isPortalUser) {
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

  return (
    <div className="flex font-sans text-fg print:block print:min-h-0">
      <SessionTimer />
      <MessageNotification />
      <DashboardLayoutWrapper
        user={session.user}
        escola={{ nome: escola?.nome ?? "Áxis", logoUrl: escola?.logoUrl ?? null }}
        modulosAtivos={modulosAtivos}
        anoLetivo={config.anoLetivoAtual}
      >
        <div className="mx-auto w-full max-w-[1400px] flex-1 px-4 py-6 md:px-8 md:py-8 print:p-0">
          {children}
        </div>

        <footer className="border-t border-line-subtle px-4 py-4 md:px-8 print:hidden">
          <div className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-between gap-2 text-xs text-fg-subtle">
            <span>Áxis · Sistema de Gestão Escolar · © {new Date().getFullYear()} {escola?.nome || "Áxis"}</span>
            <span>Desenvolvido por <span className="text-fg-muted">Andressa Mirella</span></span>
          </div>
        </footer>
      </DashboardLayoutWrapper>
    </div>
  )
}
