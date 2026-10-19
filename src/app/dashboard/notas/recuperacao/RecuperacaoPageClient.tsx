"use client"

import { useState } from "react"
import Link from "next/link"
import { Search, ChevronRight, Users, Filter, ArrowLeft, TrendingUp, AlertTriangle, FileText, CheckCircle2, BarChart3 } from "lucide-react"

interface RecuperacaoPageClientProps {
  turmas: any[]
  totalAlunosEmRecuperacao: number
}

export default function RecuperacaoPageClient({ turmas, totalAlunosEmRecuperacao }: RecuperacaoPageClientProps) {
  const [filterTurno, setFilterTurno] = useState("")
  const [filterNome, setFilterNome] = useState("")

  const filteredTurmas = turmas.filter(t => {
    const matchTurno = filterTurno ? t.turno === filterTurno : true
    const matchNome = filterNome ? t.nome.toLowerCase().includes(filterNome.toLowerCase()) : true
    return matchTurno && matchNome
  })

  const uniqueTurnos = Array.from(new Set(turmas.map(t => t.turno).filter(Boolean)))

  const recuperacaoTips = [
    {
      title: "Recuperação Final",
      description: "Lançamento da última oportunidade de aprovação para alunos retidos.",
      icon: <TrendingUp className="w-5 h-5 text-danger-fg" />,
      color: "rose"
    },
    {
      title: "Nota Substitutiva",
      description: "A nota de recuperação substitui o resultado final se for superior a 5.0.",
      icon: <CheckCircle2 className="w-5 h-5 text-warning-fg" />,
      color: "orange"
    },
    {
      title: "Alerta de Risco",
      description: "Fique atento aos alunos com médias críticas no conselho de classe.",
      icon: <AlertTriangle className="w-5 h-5 text-warning-fg" />,
      color: "amber"
    }
  ]

  return (
    <div className="bg-zinc-50">
      {/* Header Premium Estilo Resultados - Ajustado para ser Flush com o Layout */}
      <header className="mb-6 border-b border-line pb-4">
        <div className="max-w-7xl mx-auto py-4">
          <div className="flex items-center space-x-5">
            <Link
              href="/dashboard/notas"
              className="p-2 hover:bg-zinc-200 rounded-lg transition-colors text-fg-subtle hover:text-fg-muted"
            >
              <ArrowLeft size={20} />
            </Link>
            <div>
              <h1 className="text-2xl font-medium text-fg tracking-tight">Lançar Recuperação Final</h1>
              <p className="text-base text-fg-muted font-medium">Registro de notas substitutivas por turma</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-32 space-y-8">
        
        {/* Dicas Fixas - Estilo Resultados */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {recuperacaoTips.map((tip, index) => (
             <div key={index} className="bg-white/60 border border-zinc-300/60 p-5 rounded-xl flex items-start space-x-4 hover:bg-white hover:border-zinc-300 hover:shadow-card transition-all group">
                <div className={`p-3 rounded-lg bg-subtle text-fg-muted transition-all shadow-card`}>
                   {tip.icon}
                </div>
                <div>
                  <h3 className="text-sm font-medium text-fg uppercase tracking-widest mb-1">{tip.title}</h3>
                  <p className="text-[11px] font-medium text-fg-subtle uppercase leading-relaxed">{tip.description}</p>
                </div>
             </div>
          ))}
        </div>

        {/* Filtros Estilo Simulados */}
        <div className="bg-white p-5 rounded-lg shadow-sm border border-zinc-200 flex flex-wrap gap-5 items-end">
            <div className="flex-1 min-w-[250px] space-y-1.5">
                <label className="text-sm font-medium text-fg-subtle uppercase tracking-wider ml-1">Turma</label>
                <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-fg-subtle" size={16} />
                    <input 
                        type="text"
                        value={filterNome}
                        onChange={(e) => setFilterNome(e.target.value)}
                        placeholder="Ex: 1TIM1, 3TDS..."
                        className="w-full bg-zinc-50 border-none rounded-xl pl-11 pr-4 py-3 text-base focus:ring-2 focus:ring-danger/30 transition-all font-medium"
                    />
                </div>
            </div>

            <div className="flex-1 min-w-[200px] space-y-1.5">
                <label className="text-sm font-medium text-fg-subtle uppercase tracking-wider ml-1">Turno</label>
                <div className="relative">
                  <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-fg-subtle" size={16} />
                  <select 
                      value={filterTurno}
                      onChange={(e) => setFilterTurno(e.target.value)}
                      className="w-full bg-zinc-50 border-none rounded-xl pl-11 pr-4 py-3 text-base focus:ring-2 focus:ring-danger/30 transition-all appearance-none cursor-pointer"
                  >
                      <option value="">Selecione o Turno...</option>
                      {uniqueTurnos.map((t: any) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
            </div>

            <div className="flex items-center gap-3 pb-1">
                <div className="text-center px-4 py-2 bg-danger-subtle rounded-xl border border-danger-line">
                    <p className="text-[10px] font-medium text-danger uppercase tracking-widest">Alerta</p>
                    <p className="text-base font-medium text-danger-fg leading-none mt-1">{totalAlunosEmRecuperacao}</p>
                </div>
            </div>
        </div>

        {/* Listagem Estilo Simulados (Table) */}
        <div className="bg-white rounded-lg shadow-sm border border-zinc-300 overflow-hidden">
          <div className="p-4 border-b border-zinc-200 bg-zinc-50/10 flex items-center justify-between">
            <h2 className="text-lg font-medium text-fg flex items-center gap-2">
               <TrendingUp size={20} className="text-fg-subtle" />
               Turmas com Pendências (Final)
            </h2>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-zinc-50 border-b border-zinc-300">
                <tr>
                  <th className="px-6 py-4 text-xs font-medium text-fg-subtle uppercase tracking-widest">Turma / Pendência</th>
                  <th className="px-6 py-4 text-xs font-medium text-fg-subtle uppercase tracking-widest text-center">Turno</th>
                  <th className="px-6 py-4 text-xs font-medium text-fg-subtle uppercase tracking-widest text-center">Estudantes</th>
                  <th className="px-6 py-4 text-xs font-medium text-fg-subtle uppercase tracking-widest text-center w-24">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200">
                {filteredTurmas.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-16 text-center text-zinc-300">
                      <BarChart3 className="w-12 h-12 opacity-20 mx-auto mb-3" />
                       <p className="text-sm font-medium uppercase tracking-widest">Nenhuma turma com pendências encontrada</p>
                    </td>
                  </tr>
                ) : (
                  filteredTurmas.map((turma) => (
                    <tr 
                      key={turma.id} 
                      className="group hover:bg-danger-subtle transition-colors cursor-pointer"
                      onClick={() => window.location.href = `/dashboard/notas/recuperacao/${turma.id}`}
                    >
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                           <span className="text-base font-medium text-fg-muted uppercase group-hover:text-danger-fg transition-colors">{turma.nome}</span>
                           <span className="text-[11px] font-medium text-danger-fg uppercase">{turma.totalRecuperacao} ALUNOS PARA RECUPERAÇÃO FINAL</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="px-3 py-1 bg-zinc-200 text-fg-muted text-[11px] font-medium rounded-lg border border-zinc-300 uppercase tracking-wider">
                          {turma.turno || 'N/A'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                          <span className="text-sm font-medium text-fg-muted flex items-center justify-center gap-1.5"><Users size={14} className="text-zinc-300" /> {turma._count.estudantes}</span>
                      </td>
                      <td className="px-6 py-4 text-center">
                         <div className="flex justify-center">
                            <div className="w-8 h-8 rounded-full bg-zinc-50 group-hover:bg-danger group-hover:text-white flex items-center justify-center transition-all">
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
