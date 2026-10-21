import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import SessionTimer from "@/components/SessionTimer"
import MessageNotification from "@/components/MessageNotification"
import DashboardLayoutWrapper from "@/components/DashboardLayoutWrapper"
import RodapeSistema from "@/components/RodapeSistema"
import AvisoUltimoAcesso from "@/components/AvisoUltimoAcesso"
import { textoUltimoAcesso } from "@/lib/ultimo-acesso"
import { getGlobalConfig, precisaTrocarSenha } from "@/lib/data-fetching"
import { getModulosAtivos } from "@/lib/modules-server"
import { can } from "@/lib/rbac"
import { visoesDisponiveis } from "@/lib/services/painel-visoes-servidor"
import { CaminhoAutomatico } from "@/components/ui/CaminhoAutomatico"
import { AjudaTela } from "@/components/ui/AjudaTela"

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
  // Último acesso: só as duas datas da própria conta (sem IP)
  const acesso = await prisma.user.findFirst({ where: { id: session.user.id, escolaId: session.user.escolaId }, select: { lastLogin: true, acessoAnterior: true } })

  return (
    <div className="flex font-sans text-fg print:block print:min-h-0">
      <SessionTimer />
      <MessageNotification />
      <AvisoUltimoAcesso
        texto={acesso?.acessoAnterior ? textoUltimoAcesso(acesso.acessoAnterior) : null}
        loginAtual={acesso?.lastLogin ? acesso.lastLogin.toISOString() : null}
      />
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
          <div className="caminho-layout mb-3 hidden items-center gap-1 md:flex print:hidden">
            <CaminhoAutomatico />
            <AjudaTela />
          </div>
          {children}
        </div>

        <RodapeSistema escola={escola?.nome || "Áxis"} />
      </DashboardLayoutWrapper>
    </div>
  )
}
