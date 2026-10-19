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

export const runtime = 'nodejs'

export default async function TurmasPage() {
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
    <div className="bg-zinc-50">
      {/* Header Premium Estilo Resultados - Ajustado para ser Flush com o Layout */}
      <header className="mb-6 border-b border-line pb-4">
        <div className="max-w-7xl mx-auto py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-5">
              <Link
                href="/dashboard"
                className="p-2 hover:bg-zinc-200 rounded-lg transition-colors text-fg-subtle hover:text-fg-muted"
              >
                <ArrowLeft size={20} />
              </Link>
              <div>
                <h1 className="text-2xl font-medium text-fg tracking-tight">Turmas</h1>
                <p className="text-base text-fg-muted font-medium">Gestão de turmas e acessos rápidos</p>
              </div>
            </div>
            <Link
              href="/dashboard/turmas/nova"
              className={`flex items-center space-x-2 bg-zinc-900 text-white px-6 py-3 rounded-lg font-medium hover:bg-zinc-800 transition-all text-xs active:scale-95 shadow-card ${(!session.user.isSuperuser && !session.user.isDirecao) ? 'hidden' : ''}`}
            >
              <Plus size={16} />
              <span>Nova Turma</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-32">
        {turmas.length > 0 && (
          <div className="relative overflow-hidden bg-zinc-700 rounded-lg p-6 mb-6 shadow-card">
            <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-medium text-white mb-1">Gestão de Turmas</h2>
                <p className="text-zinc-200 max-w-xl text-sm">
                  Acesse rapidamente o lançamento de notas, relatórios e matrizes de desempenho para todas as suas turmas.
                </p>
              </div>
              
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0 scrollbar-hide">
                <div className="bg-white/10 backdrop-blur-md rounded-xl p-2 border border-white/20 min-w-[75px] text-center shrink-0">
                  <p className="text-zinc-200 text-xs font-medium mb-0.5 opacity-80">Total</p>
                  <p className="text-xl font-medium text-white leading-none">{turmas.length}</p>
                </div>
                {turnosOrdenados.map(turno => (
                  <div key={turno} className="bg-white/10 backdrop-blur-md rounded-xl p-2 border border-white/20 min-w-[75px] text-center shrink-0">
                    <p className="text-zinc-200 text-xs font-medium mb-0.5 opacity-80">{turno}</p>
                    <p className="text-xl font-medium text-white leading-none">{turmasAgrupadas[turno].length}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Decorative background visual */}
            <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 bg-white/5 rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 bg-black/10 rounded-full blur-3xl" />
          </div>
        )}

        {turmas.length === 0 ? (
          <div className="bg-white rounded-xl shadow-card border border-zinc-200 p-20 text-center">
            <div className="w-20 h-20 bg-zinc-50 rounded-xl flex items-center justify-center mx-auto mb-6">
              <Users className="w-10 h-10 text-zinc-300" />
            </div>
            <h3 className="text-2xl font-medium text-fg mb-2">
              Nenhuma turma encontrada
            </h3>
            <p className="text-fg-muted font-medium mb-8 max-w-xs mx-auto text-sm">
              Você ainda não possui turmas vinculadas ao seu perfil.
            </p>
            <Link
              href="/dashboard/turmas/nova"
              className="inline-flex items-center space-x-2 bg-zinc-900 text-white px-8 py-4 rounded-lg hover:bg-zinc-800 transition-all font-medium text-xs shadow-card active:scale-95"
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
