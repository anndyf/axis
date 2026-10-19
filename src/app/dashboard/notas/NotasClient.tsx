"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Search, ChevronRight, Users, Filter, ArrowLeft, TrendingUp, FileText, BarChart3, GraduationCap } from "lucide-react"

export default function NotasClient({ turmas }: { turmas: any[] }) {
  const router = useRouter()
  const [filterTurno, setFilterTurno] = useState("")
  const [filterNome, setFilterNome] = useState("")

  const filteredTurmas = turmas.filter(t => {
    const matchTurno = filterTurno ? t.turno === filterTurno : true
    const matchNome = filterNome ? t.nome.toLowerCase().includes(filterNome.toLowerCase()) : true
    return matchTurno && matchNome
  })

  const uniqueTurnos = Array.from(new Set(turmas.map(t => t.turno).filter(Boolean)))

  const launchTips = [
    {
      title: "Lançamento Ágil",
      description: "As notas são registradas por unidade e a média anual é calculada em tempo real.",
      icon: <FileText className="w-5 h-5 text-success-fg" />,
      color: "emerald"
    },
    {
      title: "Status de Turma",
      description: "Monitore rapidamente quais turmas já possuem fechamento de notas concluído.",
      icon: <CheckCircle2 className="w-5 h-5 text-fg-muted" />,
      color: "blue"
    },
    {
      title: "Recuperação Final",
      description: "Acesse o módulo específico para lançamento de notas substitutivas anuais.",
      icon: <TrendingUp className="w-5 h-5 text-warning-fg" />,
      color: "orange"
    }
  ]

  return (
    <div className="">
      {/* Header Premium Estilo Resultados - Ajustado para ser Flush com o Layout */}
      <header className="mb-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="flex min-w-0 items-center gap-3">
              <Link
                href="/dashboard"
                aria-label="Voltar" className="hidden sm:inline-flex p-1.5 rounded-md text-fg-subtle transition-colors duration-150 hover:bg-subtle hover:text-fg"
              >
                <ArrowLeft size={16} strokeWidth={1.75} />
              </Link>
              <div>
                <h1 className="text-2xl font-semibold tracking-tight text-fg">Lançar Notas</h1>
                <p className="text-sm text-fg-muted">Gestão de avaliações e fechamento de unidades</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Link 
                  href="/dashboard/notas/recuperacao"
                  className="inline-flex h-9 shrink-0 items-center gap-2 rounded-md bg-accent px-3 text-sm font-medium text-on-accent transition-colors duration-150 hover:bg-accent-hover disabled:opacity-50"
              >
                  <TrendingUp size={16} strokeWidth={1.75} /> Lançar Recuperação Final
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-32 space-y-8">
        
        {/* Dicas Fixas - Estilo Resultados */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {launchTips.map((tip, index) => (
             <div key={index} className="bg-surface border border-line p-4 rounded-lg flex items-start gap-3">
                <div className={`p-3 rounded-lg bg-subtle text-fg-muted transition-all shadow-card`}>
                   {tip.icon}
                </div>
                <div>
                  <h3 className="text-sm font-medium text-fg mb-1">{tip.title}</h3>
                  <p className="text-xs font-medium text-fg-subtle leading-relaxed">{tip.description}</p>
                </div>
             </div>
          ))}
        </div>

        {/* Filtros Premium */}
        <div className="bg-surface p-6 rounded-xl shadow-card border border-line flex flex-wrap gap-6 items-end relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-success-subtle rounded-full -mr-16 -mt-16 opacity-50 blur-3xl"></div>
            
            <div className="flex-1 min-w-[250px] space-y-2">
                <label className="text-xs font-medium text-fg-subtle ml-2">Pesquisar Turma</label>
                <div className="relative group">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center bg-canvas rounded-lg text-fg-subtle group-focus-within:text-success-fg group-focus-within:bg-success-subtle transition-all">
                        <Search size={18} />
                    </div>
                    <input 
                        type="text"
                        value={filterNome}
                        onChange={(e) => setFilterNome(e.target.value)}
                        placeholder="Ex: 1º Ano, TDS, Enfermagem..."
                        className="w-full bg-canvas hover:bg-subtle-hover border-none rounded-lg pl-14 pr-6 py-4 text-sm focus:ring-2 focus:ring-success/30 transition-all font-medium text-fg-muted shadow-card placeholder:text-fg-disabled"
                    />
                </div>
            </div>

            <div className="flex-1 min-w-[200px] space-y-2">
                <label className="text-xs font-medium text-fg-subtle ml-2">Turno / Período</label>
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center bg-canvas rounded-lg text-fg-subtle group-focus-within:text-success-fg group-focus-within:bg-success-subtle transition-all">
                    <Filter size={16} />
                  </div>
                  <select 
                      value={filterTurno}
                      onChange={(e) => setFilterTurno(e.target.value)}
                      className="w-full bg-canvas hover:bg-subtle-hover border-none rounded-lg pl-14 pr-6 py-4 text-sm focus:ring-2 focus:ring-success/30 transition-all appearance-none cursor-pointer font-medium text-fg-muted shadow-card"
                  >
                      <option value="">Selecione o Turno...</option>
                      {uniqueTurnos.map((t: any) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
            </div>

            <div className="pb-2.5">
                <div className="flex items-center gap-2 bg-success-subtle px-4 py-2.5 rounded-lg border border-success-line shadow-sm">
                    <span className="w-2 h-2 rounded-full bg-success animate-pulse"></span>
                    <span className="text-xs font-semibold text-success-fg">{filteredTurmas.length} turmas mapeadas</span>
                </div>
            </div>
        </div>

        {/* Listagem Estilo Premium */}
        <div className="bg-surface rounded-xl shadow-card border border-line overflow-hidden">
          <div className="p-8 border-b border-line bg-canvas/10 flex items-center justify-between">
            <h2 className="text-xs font-semibold text-fg-subtle flex items-center gap-3">
               <div className="w-8 h-8 rounded-lg bg-success-subtle text-success-fg flex items-center justify-center shadow-card">
                 <Users size={16} />
               </div>
               Listagem de Turmas para Lançamento
            </h2>
            <div className="hidden md:block">
              <span className="px-3 py-1 bg-canvas text-fg-subtle text-xs font-semibold rounded-full border border-line">
                Acesso Rápido Habilitado
              </span>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-canvas border-b border-line-strong">
                <tr>
                  <th className="px-6 py-4 text-xs font-medium text-fg-subtle">Turma / Série</th>
                  <th className="px-6 py-4 text-xs font-medium text-fg-subtle text-center">Turno</th>
                  <th className="px-6 py-4 text-xs font-medium text-fg-subtle text-center">Estudantes</th>
                  <th className="px-6 py-4 text-xs font-medium text-fg-subtle text-center">Disciplinas</th>
                  <th className="px-6 py-4 text-xs font-medium text-fg-subtle text-center w-24">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {filteredTurmas.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-16 text-center text-fg-disabled">
                      <BarChart3 className="w-12 h-12 opacity-20 mx-auto mb-3" />
                      <p className="text-sm font-medium">Ajuste os filtros para localizar a turma</p>
                    </td>
                  </tr>
                ) : (
                  filteredTurmas.map((turma) => (
                    <tr 
                      key={turma.id} 
                      className="group hover:bg-success-subtle transition-colors cursor-pointer"
                      onClick={() => router.push(`/dashboard/notas/lancar/${turma.id}`)}
                    >
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                           <span className="text-base font-medium text-fg-muted group-hover:text-success-fg transition-colors">{turma.nome}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="px-3 py-1 bg-subtle-hover text-fg-muted text-xs font-medium rounded-lg border border-line-strong">
                          {turma.turno || 'N/A'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                          <span className="text-sm font-medium text-fg-muted flex items-center justify-center gap-1.5"><Users size={14} className="text-fg-disabled" /> {turma._count.estudantes}</span>
                       </td>
                       <td className="px-6 py-4 text-center">
                          <span className="text-sm font-medium text-fg-muted flex items-center justify-center gap-1.5"><GraduationCap size={14} className="text-fg-disabled" /> {turma._count.disciplinas}</span>
                      </td>
                      <td className="px-6 py-4 text-center">
                         <div className="flex justify-center">
                            <div className="w-8 h-8 rounded-full bg-canvas group-hover:bg-success group-hover:text-white flex items-center justify-center transition-all">
                               <ChevronRight size={16} />
                            </div>
                         </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  )
}

function CheckCircle2(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20 6 9 17l-5-5" />
      <circle cx="12" cy="12" r="10" />
    </svg>
  )
}
