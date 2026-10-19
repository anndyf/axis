"use client"

import { useState } from "react"
import Link from "next/link"
import { Search, GraduationCap, CheckCircle2, AlertCircle, Users, ChevronRight, Filter, Info, BarChart3 } from "lucide-react"

interface TurmaProcessada {
  id: string
  nome: string
  curso: string
  turno: string
  totalAlunosPendentes: number
  totalAlunosResolvidos: number
  isResolvido: boolean
}

export default function ConselhoClasseList({ 
  gruposIniciais 
}: { 
  gruposIniciais: Record<string, Record<string, TurmaProcessada[]>> 
}) {
  const [search, setSearch] = useState("")

  const turnos = Object.keys(gruposIniciais).sort()
  
  const getTurnoColor = (turno: string) => {
    const t = turno.toUpperCase()
    if (t.includes('MATUTINO')) return 'bg-warning'
    if (t.includes('VESPERTINO')) return 'bg-zinc-700'
    if (t.includes('NOTURNO')) return 'bg-zinc-600'
    return 'bg-zinc-600'
  }

  const conselhoTips = [
    {
      title: "Deliberação Final",
      description: "Aprovação ou retenção de alunos que não atingiram a média mínima após a recuperação.",
      icon: <CheckCircle2 className="w-5 h-5 text-success-fg" />,
      color: "emerald"
    },
    {
      title: "Status de Decisão",
      description: "Turmas com pendência são destacadas em vermelho para priorizar o fechamento.",
      icon: <AlertCircle className="w-5 h-5 text-danger-fg" />,
      color: "rose"
    },
    {
      title: "Transparência",
      description: "Todas as decisões do conselho são registradas para consulta em atas oficiais.",
      icon: <Info className="w-5 h-5 text-fg-muted" />,
      color: "blue"
    }
  ]

  return (
    <div className="space-y-8">

      {/* Filtros Premium */}
      <div className="bg-white p-6 rounded-xl shadow-card border border-zinc-200 flex flex-wrap gap-6 items-end relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-zinc-50 rounded-full -mr-16 -mt-16 opacity-50 blur-3xl"></div>
          
          <div className="flex-1 min-w-[300px] space-y-2">
              <label className="text-[10px] font-medium text-fg-subtle uppercase tracking-[0.2em] ml-2">Turma ou Curso</label>
              <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center bg-zinc-50 rounded-lg text-fg-subtle group-focus-within:text-fg-muted group-focus-within:bg-zinc-50 transition-all">
                      <Search size={18} />
                  </div>
                  <input 
                      type="text"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Busque por nome ou curso..."
                      className="w-full bg-zinc-50 hover:bg-zinc-200 border-none rounded-lg pl-14 pr-6 py-4 text-sm focus:ring-2 focus:ring-zinc-500 transition-all font-medium text-fg-muted shadow-card placeholder:text-zinc-300"
                  />
              </div>
          </div>

          <div className="pb-2.5">
              <div className="flex items-center gap-2 bg-zinc-50 px-4 py-2.5 rounded-lg border border-zinc-200 shadow-sm">
                  <span className="w-2 h-2 rounded-full bg-zinc-500 animate-pulse"></span>
                  <span className="text-[10px] font-semibold text-fg-muted uppercase tracking-widest">Sincronização Ativa</span>
              </div>
          </div>
      </div>

      {/* Listagem Estilo Premium */}
      <div className="bg-white rounded-xl shadow-card border border-zinc-200 overflow-hidden">
        <div className="p-8 border-b border-zinc-200 bg-zinc-50/10 flex items-center justify-between">
           <h2 className="text-[10px] font-semibold text-fg-subtle uppercase tracking-[0.2em] flex items-center gap-3">
             <div className="w-8 h-8 rounded-lg bg-zinc-50 text-fg-muted flex items-center justify-center shadow-card">
               <Users size={16} />
             </div>
             Turmas em Deliberação de Conselho
           </h2>
        </div>

        <div className="overflow-x-auto">
          {turnos.length === 0 ? (
            <div className="text-center py-20 text-zinc-300">
              <BarChart3 className="w-12 h-12 opacity-20 mx-auto mb-3" />
              <p className="text-xs font-medium uppercase tracking-widest">Nenhuma turma para deliberar</p>
            </div>
          ) : turnos.map(turno => {
            const turmasNoTurno: TurmaProcessada[] = []
            Object.keys(gruposIniciais[turno]).forEach(curso => {
               gruposIniciais[turno][curso].forEach(t => {
                 if (t.nome.toLowerCase().includes(search.toLowerCase()) || t.curso.toLowerCase().includes(search.toLowerCase())) {
                   turmasNoTurno.push(t)
                 }
               })
            })

            if (turmasNoTurno.length === 0) return null

            return (
              <div key={turno}>
                <div className="bg-zinc-50 px-6 py-2 border-b border-zinc-300">
                   <span className={`px-3 py-0.5 text-white text-[9px] font-medium uppercase tracking-widest rounded-md ${getTurnoColor(turno)} shadow-sm`}>
                    {turno}
                  </span>
                </div>
                <table className="w-full text-left">
                  <thead className="bg-white border-b border-zinc-200">
                    <tr>
                      <th className="px-6 py-3 text-[10px] font-medium text-fg-subtle uppercase tracking-widest">Turma / Curso</th>
                      <th className="px-6 py-3 text-[10px] font-medium text-fg-subtle uppercase tracking-widest text-center">Situação IA</th>
                      <th className="px-6 py-3 text-[10px] font-medium text-fg-subtle uppercase tracking-widest text-center">Status</th>
                      <th className="px-6 py-3 text-[10px] font-medium text-fg-subtle uppercase tracking-widest text-center w-24">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-50">
                    {turmasNoTurno.map((turma) => (
                      <tr 
                        key={turma.id} 
                        className={`group hover:bg-zinc-50 transition-colors cursor-pointer ${!turma.isResolvido ? 'bg-danger-subtle' : ''}`}
                        onClick={() => window.location.href = `/dashboard/conselho-classe/${turma.id}`}
                      >
                        <td className="px-6 py-4">
                           <div className="flex flex-col">
                              <span className="text-sm font-medium text-fg-muted uppercase group-hover:text-fg-muted transition-colors">{turma.nome}</span>
                              <span className="text-[10px] font-medium text-fg-subtle uppercase tracking-wider">{turma.curso}</span>
                           </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                           <div className="flex flex-col items-center">
                              {turma.isResolvido ? (
                                <span className="text-[10px] font-medium text-success-fg bg-success-subtle px-2 py-0.5 rounded border border-success-line uppercase">{turma.totalAlunosResolvidos} DECIDIDOS</span>
                              ) : (
                                <span className="text-[10px] font-medium text-danger-fg bg-danger-subtle px-2 py-0.5 rounded border border-danger-line uppercase">{turma.totalAlunosPendentes} PENDENTES</span>
                              )}
                           </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                           <span className={`text-[9px] font-medium px-2 py-1 rounded-full uppercase tracking-widest border border-current opacity-70 ${
                             turma.isResolvido ? 'text-success-fg' : 'text-danger-fg animate-pulse'
                           }`}>
                             {turma.isResolvido ? 'Fechado' : 'Em Conselho'}
                           </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                           <div className="flex justify-center">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                                turma.isResolvido ? 'bg-zinc-200 text-fg-subtle group-hover:bg-success group-hover:text-white' : 'bg-danger-subtle text-danger-fg group-hover:bg-danger group-hover:text-white'
                              }`}>
                                 <ChevronRight size={16} />
                              </div>
                           </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
