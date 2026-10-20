import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Plus, BookOpen } from "lucide-react"
import { getDisciplinasPermitidas } from "@/lib/data-fetching"
import DisciplinasList from "./DisciplinasList"
import { paginaDoModulo } from '@/lib/modulos/guarda'

export const metadata = {
  title: 'Áxis - Disciplinas'
}

export const runtime = 'nodejs'

export default async function DisciplinasPage() {
  await paginaDoModulo('NUC')
  const session = await auth()
  
  if (!session) {
    redirect("/login")
  }

  const disciplinas = await getDisciplinasPermitidas(session)

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
                <h1 className="text-2xl font-semibold tracking-tight text-fg">Disciplinas</h1>
                <p className="text-sm text-fg-muted">Cadastrar e editar disciplinas</p>
              </div>
            </div>
            <Link
              href="/dashboard/disciplinas/nova"
              className={`flex items-center space-x-2 bg-accent text-on-accent px-6 py-3 rounded-lg font-medium hover:bg-accent-hover transition-all text-xs active:scale-95 shadow-card ${!session.user.isSuperuser ? 'hidden' : ''}`}
            >
              <Plus size={16} />
              <span>Nova Disciplina</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-32">
        {disciplinas.length === 0 ? (
          <div className="bg-surface rounded-xl shadow-card border border-line p-20 text-center">
            <div className="w-20 h-20 bg-canvas flex items-center justify-center rounded-xl mx-auto mb-6">
               <BookOpen className="w-10 h-10 text-fg-disabled" />
            </div>
            <h3 className="text-2xl font-medium text-fg mb-2">
              Nenhuma disciplina cadastrada
            </h3>
            <p className="text-fg-muted font-medium mb-6 max-w-sm mx-auto">
              Comece criando sua primeira disciplina
            </p>
            <Link
              href="/dashboard/disciplinas/nova"
              className="inline-flex items-center space-x-2 bg-accent text-on-accent px-6 py-3 rounded-lg hover:bg-accent-hover transition-colors"
            >
              <Plus className="w-5 h-5" />
              <span>Criar Primeira Disciplina</span>
            </Link>
          </div>
        ) : (
          <DisciplinasList disciplinas={disciplinas} />
        )}
      </main>
    </div>
  )
}
