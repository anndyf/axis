import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import Link from "next/link"

export const metadata = {
  title: 'Áxis - Turmas'
}
import { 
  ArrowLeft, Plus, Users 
} from "lucide-react"

import { getTurmasPermitidas } from "@/lib/data-fetching"
import { decodeTurma } from "@/lib/turma-utils"
import TurmasListClient from "@/components/TurmasListClient"
import { paginaDoModulo } from '@/lib/modulos/guarda'
import { can } from '@/lib/rbac'

export const runtime = 'nodejs'

export default async function TurmasPage() {
  await paginaDoModulo('NUC')
  const session = await auth()
  
  if (!session) {
    redirect("/login")
  }

  const turmas = await getTurmasPermitidas(session)

  // Agrupar turmas por turno para o banner
  const turmasAgrupadas = turmas.reduce((acc: any, turma: any) => {
    const decoded = decodeTurma(turma.nome)
    const turno = turma.turno || decoded.turno || "Outros"
    if (!acc[turno]) acc[turno] = []
    acc[turno].push(turma)
    return acc
  }, {} as Record<string, typeof turmas>)

  const turnosOrdenados = ["Matutino", "Vespertino", "Noturno", "Integral"].filter(t => turmasAgrupadas[t])

  return (
    <div className="">
      {/* Header Premium Estilo Resultados - Ajustado para ser Flush com o Layout */}
      <header className="mb-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <Link
                href="/dashboard"
                aria-label="Voltar" className="hidden sm:inline-flex p-1.5 rounded-md text-fg-subtle transition-colors duration-150 hover:bg-subtle hover:text-fg"
              >
                <ArrowLeft size={16} strokeWidth={1.75} />
              </Link>
              <div>
                <h1 className="text-2xl font-semibold tracking-tight text-fg">Turmas</h1>
                <p className="text-sm text-fg-muted">Gestão de turmas e acessos rápidos</p>
              </div>
            </div>
            <Link
              href="/dashboard/turmas/nova"
              className={`flex items-center space-x-2 bg-accent text-on-accent px-6 py-3 rounded-lg font-medium hover:bg-accent-hover transition-all text-xs active:scale-95 shadow-card ${!can(session.user, 'turma.gerenciar') ? 'hidden' : ''}`}
            >
              <Plus size={16} />
              <span>Nova Turma</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl">

        {turmas.length === 0 ? (
          <div className="bg-surface rounded-xl shadow-card border border-line p-20 text-center">
            <div className="w-20 h-20 bg-canvas rounded-xl flex items-center justify-center mx-auto mb-6">
              <Users className="w-10 h-10 text-fg-disabled" />
            </div>
            <h3 className="text-2xl font-medium text-fg mb-2">
              Nenhuma turma encontrada
            </h3>
            <p className="text-fg-muted font-medium mb-8 max-w-xs mx-auto text-sm">
              Você ainda não possui turmas vinculadas ao seu perfil.
            </p>
            <Link
              href="/dashboard/turmas/nova"
              className="inline-flex items-center space-x-2 bg-accent text-on-accent px-8 py-4 rounded-lg hover:bg-accent-hover transition-all font-medium text-xs shadow-card active:scale-95"
            >
              <Plus size={16} />
              <span>Criar Primeira Turma</span>
            </Link>
          </div>
        ) : (
          <TurmasListClient turmas={turmas as any} />
        )}
      </main>
    </div>
  )
}
