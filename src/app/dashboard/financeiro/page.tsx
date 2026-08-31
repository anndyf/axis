import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { can } from "@/lib/rbac"
import { getModulosAtivos } from "@/lib/modules-server"
import { DollarSign } from "lucide-react"

export const metadata = {
  title: 'Áxis - Financeiro'
}

export const runtime = 'nodejs'

// Esqueleto do módulo financeiro (Fase 11 do plano multi-tenant). Não é
// exposto na Sidebar/dashboard ainda - acessível só por URL direta, até
// haver requisito de produto real para o que o módulo precisa fazer.
export default async function FinanceiroPage() {
  const session = await auth()
  if (!session?.user?.escolaId || !can(session.user, 'gestao')) {
    redirect("/dashboard")
  }

  const escola = await prisma.escola.findUnique({ where: { id: session.user.escolaId }, select: { plano: true } })
  const modulosAtivos = await getModulosAtivos(session.user.escolaId, escola?.plano || 'BASICO')

  if (!modulosAtivos.includes('financeiro')) {
    redirect("/dashboard")
  }

  return (
    <div className="max-w-3xl mx-auto py-24 text-center space-y-4">
      <div className="w-16 h-16 bg-slate-100 text-slate-700 rounded-2xl flex items-center justify-center mx-auto">
        <DollarSign className="w-8 h-8" />
      </div>
      <h1 className="text-2xl font-medium text-slate-800">Módulo Financeiro</h1>
      <p className="text-slate-600">Em breve.</p>
    </div>
  )
}
