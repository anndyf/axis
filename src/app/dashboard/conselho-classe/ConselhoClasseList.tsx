"use client"

import { useState } from "react"
import Link from "next/link"
import { Search, GraduationCap, CheckCircle2, AlertCircle, Users, ChevronRight, Filter, Info, BarChart3 } from "lucide-react"
import { Badge } from "@/components/ui"

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
    <div className="space-y-5">

      {/* Filtros Premium */}
      <div className="bg-surface p-4 rounded-xl border border-line flex flex-wrap gap-4 items-end relative overflow-hidden">
          
          <div className="flex-1 min-w-[300px] space-y-2">
              <label className="text-xs font-medium text-fg-subtle ml-2">Turma ou Curso</label>
              <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center bg-canvas rounded-lg text-fg-subtle group-focus-within:text-fg-muted group-focus-within:bg-canvas transition-all">
                      <Search size={18} />
                  </div>
                  <input 
                      type="text"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Busque por nome ou curso..."
                      className="w-full bg-canvas hover:bg-subtle-hover border-none rounded-lg pl-14 pr-6 py-4 text-sm focus:ring-2 focus:ring-zinc-500 transition-all font-medium text-fg-muted placeholder:text-fg-disabled"
                  />
              </div>
          </div>

          <div className="pb-2.5">
              <div className="flex items-center gap-2 bg-canvas px-4 py-2.5 rounded-lg border border-line">
                  <span className="w-2 h-2 rounded-full bg-zinc-500"></span>
                  <span className="text-xs font-semibold text-fg-muted">Sincronização ativa</span>
              </div>
          </div>
      </div>

      {/* Listagem Estilo Premium */}
      <div className="bg-surface rounded-xl border border-line overflow-hidden">
        <div className="p-4 border-b border-line bg-canvas/10 flex items-center justify-between">
           <h2 className="text-xs font-semibold text-fg-subtle flex items-center gap-3">
             <div className="w-8 h-8 rounded-lg bg-canvas text-fg-muted flex items-center justify-center">
               <Users size={16} />
             </div>
             Turmas em deliberação de conselho
           </h2>
        </div>

        <div className="overflow-x-auto">
          {turnos.length === 0 ? (
            <div className="text-center py-10 text-fg-disabled">
              <BarChart3 className="w-12 h-12 opacity-20 mx-auto mb-3" />
              <p className="text-xs font-medium">Nenhuma turma para deliberar</p>
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
                <div className="flex items-center gap-2 border-b border-line-subtle bg-canvas/60 px-4 py-2 sm:px-5">
                  <span className="text-xs font-semibold text-fg-muted">{turno.charAt(0) + turno.slice(1).toLowerCase()}</span>
                  <span className="text-xs tabular-nums text-fg-subtle">· {turmasNoTurno.length} {turmasNoTurno.length === 1 ? 'turma' : 'turmas'}</span>
                </div>
                <div className="relative overflow-x-auto">
                <table className="w-full min-w-[32rem] text-left text-13">
                  <thead>
                    <tr className="border-b border-line-subtle text-xs text-fg-subtle">
                      <th scope="col" className="h-9 px-4 font-medium sm:px-5">Turma / curso</th>
                      <th scope="col" className="h-9 px-3 font-medium">Alunos</th>
                      <th scope="col" className="h-9 px-3 font-medium">Situação</th>
                      <th scope="col" className="h-9 w-12 px-4 font-medium sm:px-5"><span className="sr-only">Abrir</span></th>
                    </tr>
                  </thead>
                  <tbody>
                    {turmasNoTurno.map((turma) => (
                      <tr
                        key={turma.id}
                        className="group cursor-pointer border-b border-line-subtle last:border-0 transition-colors duration-150 hover:bg-subtle/60"
                        onClick={() => window.location.href = `/dashboard/conselho-classe/${turma.id}`}
                      >
                        <td className="px-4 py-2.5 sm:px-5">
                          <span className="block font-medium text-fg">{turma.nome}</span>
                          <span className="block text-xs text-fg-subtle">{turma.curso}</span>
                        </td>
                        <td className="px-3 py-2.5 tabular-nums text-fg-muted">
                          {turma.isResolvido ? `${turma.totalAlunosResolvidos} decididos` : `${turma.totalAlunosPendentes} pendentes`}
                        </td>
                        <td className="px-3 py-2.5">
                          <Badge tone={turma.isResolvido ? 'success' : 'warning'} dot>{turma.isResolvido ? 'Fechado' : 'Em conselho'}</Badge>
                        </td>
                        <td className="px-4 py-2.5 text-right sm:px-5">
                          <Link href={`/dashboard/conselho-classe/${turma.id}`} aria-label={`Abrir conselho da ${turma.nome}`} className="inline-flex rounded-md p-1 text-fg-subtle transition-colors duration-150 group-hover:text-fg" onClick={(e) => e.stopPropagation()}>
                            <ChevronRight size={16} strokeWidth={1.75} />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
