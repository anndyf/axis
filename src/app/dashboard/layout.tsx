import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import SessionTimer from "@/components/SessionTimer"
import MessageNotification from "@/components/MessageNotification"
import { Code } from "lucide-react"
import DashboardLayoutWrapper from "@/components/DashboardLayoutWrapper"
import { getGlobalConfig } from "@/lib/data-fetching"

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

  const escola = await prisma.escola.findUnique({
    where: { id: session.user.escolaId },
    select: { nome: true }
  })

  let config = await getGlobalConfig(session.user.escolaId)

  if (!config) {
    // Caso raro onde a escola ainda não tem config, cria a inicial
    config = await prisma.globalConfig.create({
      data: {
        id: session.user.escolaId,
        escolaId: session.user.escolaId,
        isBancoQuestoesAtivo: true,
        anoLetivoAtual: new Date().getFullYear()
      }
    })
  }

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans antialiased text-slate-800 print:min-h-0 print:bg-slate-50 print:block">
      <SessionTimer />
      <MessageNotification />
      <DashboardLayoutWrapper 
        user={session.user} 
        isBancoQuestoesAtivo={config.isBancoQuestoesAtivo} 
        anoLetivo={config.anoLetivoAtual}
      >
        {/* Mobile Header Spacer */}
        <div className="h-16 md:h-0 w-full md:hidden bg-transparent print:hidden" />
        
        <div className="p-4 md:p-8 animate-in fade-in zoom-in-95 duration-300 print:p-0 print:animate-none flex-1">
          {children}
        </div>
        
        {/* Footer com Copyright */}
        <footer className="mt-auto py-6 px-4 md:px-8 border-t border-slate-200 bg-slate-50 print:hidden">
            <div className="flex flex-col md:flex-row items-center gap-6 text-xs text-slate-500 font-medium">
            <div className="flex items-center gap-2">
              <span className="font-medium text-slate-700">Áxis</span>
              <span className="opacity-20">|</span>
              <span className="font-medium">Sistema de Gestão Escolar</span>
            </div>
            
            <div className="flex items-center gap-2 md:gap-4 flex-1 justify-center">
              <span>© {new Date().getFullYear()} {escola?.nome || 'Áxis'}</span>
              <span className="hidden md:inline opacity-10">•</span>
              <span className="text-slate-400">Todos os direitos reservados</span>
            </div>

            <div className="flex items-center gap-2 py-1 px-3 bg-slate-50/50 rounded-full border border-slate-50 shadow-sm ml-auto">
              <Code size={12} className="text-slate-700" />
              <span className="text-[10px] font-medium text-slate-300">Desenvolvido por</span>
              <span className="text-[10px] font-medium text-slate-950 hover:text-slate-700 transition-colors cursor-default">Andressa Mirella</span>
            </div>
          </div>
        </footer>
      </DashboardLayoutWrapper>
    </div>
  )
}
