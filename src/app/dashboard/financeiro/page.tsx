import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { can } from "@/lib/rbac"
import { DollarSign } from "lucide-react"
import { paginaDoModulo } from '@/lib/modulos/guarda'

export const metadata = {
  title: 'Áxis - Financeiro'
}

export const runtime = 'nodejs'

// Esqueleto do módulo financeiro (Fase 11 do plano multi-tenant). Não é
// exposto na Sidebar/dashboard ainda - acessível só por URL direta, até
// haver requisito de produto real para o que o módulo precisa fazer.
export default async function FinanceiroPage() {
  await paginaDoModulo('FIN')
  const session = await auth()
  if (!session?.user?.escolaId || !can(session.user, 'gestao')) {
    redirect("/dashboard")
  }

  return (
    <div className="max-w-3xl mx-auto py-24 text-center space-y-4">
      <div className="w-16 h-16 bg-subtle text-fg-muted rounded-lg flex items-center justify-center mx-auto">
        <DollarSign className="w-8 h-8" />
      </div>
      <h1 className="text-2xl font-medium text-fg">Módulo Financeiro</h1>
      <p className="text-fg-muted">Em breve.</p>
    </div>
  )
}
