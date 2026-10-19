"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { BookOpen, ChevronDown, ChevronRight, Sun, Sunset, Moon, Clock, Pencil, Search, Filter } from "lucide-react"

interface Disciplina {
  id: string
  nome: string
  turma: {
    id: string
    nome: string
    turno: string | null
  }
  _count: {
    notas: number
  }
}

interface DisciplinasListProps {
  disciplinas: Disciplina[]
}

export default function DisciplinasList({ disciplinas }: DisciplinasListProps) {
  const [openTurmas, setOpenTurmas] = useState<string[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [filterTurno, setFilterTurno] = useState("")
  const [filterTurma, setFilterTurma] = useState("")

  const toggleTurma = (turmaId: string) => {
    setOpenTurmas(prev => 
      prev.includes(turmaId) 
        ? prev.filter(id => id !== turmaId)
        : [...prev, turmaId]
    )
  }

  // Agrupar por Turno e depois por Turma
  const porTurno: Record<string, Record<string, { turma: any, disciplinas: Disciplina[] }>> = {}

  // Filtrar disciplinas antes de agrupar
  const filteredDisciplinas = useMemo(() => {
    return disciplinas.filter(disc => {
      const matchSearch = searchTerm 
        ? disc.nome.toLowerCase().includes(searchTerm.toLowerCase()) || 
          disc.turma.nome.toLowerCase().includes(searchTerm.toLowerCase())
        : true
      const matchTurno = filterTurno ? disc.turma.turno === filterTurno : true
      const matchTurma = filterTurma ? disc.turma.nome === filterTurma : true
      return matchSearch && matchTurno && matchTurma
    })
  }, [disciplinas, searchTerm, filterTurno, filterTurma])

  // Obter listas únicas para os selects
  const uniqueTurnos = useMemo(() => Array.from(new Set(disciplinas.map(d => d.turma.turno).filter(Boolean))), [disciplinas])
  const uniqueTurmas = useMemo(() => Array.from(new Set(disciplinas.map(d => d.turma.nome).filter(Boolean))).sort(), [disciplinas])

  filteredDisciplinas.forEach(disc => {
    const turno = disc.turma.turno || 'Indefinido'
    const turmaId = disc.turma.id

    if (!porTurno[turno]) {
      porTurno[turno] = {}
    }

    if (!porTurno[turno][turmaId]) {
      porTurno[turno][turmaId] = {
        turma: disc.turma,
        disciplinas: []
      }
    }

    porTurno[turno][turmaId].disciplinas.push(disc)
  })

  // Ordem dos turnos
  const ordemTurnos = ['Matutino', 'Vespertino', 'Noturno', 'Integral', 'Indefinido']
  const sortedTurnos = Object.keys(porTurno).sort((a, b) => {
    return ordemTurnos.indexOf(a) - ordemTurnos.indexOf(b)
  })

  // Icones por turno
  const getTurnoIcon = (turno: string) => {
    switch(turno.toLowerCase()) {
      case 'matutino': return <Sun className="w-5 h-5 text-warning-fg" />
      case 'vespertino': return <Sunset className="w-5 h-5 text-warning-fg" />
      case 'noturno': return <Moon className="w-5 h-5 text-fg-muted" />
      default: return <Clock className="w-5 h-5 text-fg-muted" />
    }
  }

  // Cores por turno
  const getTurnoColor = (turno: string) => {
    switch(turno.toLowerCase()) {
      case 'matutino': return 'bg-warning-subtle border-warning-line text-warning-fg'
      case 'vespertino': return 'bg-warning-subtle border-warning-line text-warning-fg'
      case 'noturno': return 'bg-zinc-100 border-zinc-300 text-accent-fg'
      default: return 'bg-zinc-100 border-zinc-300 text-accent-fg'
    }
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-zinc-300 flex flex-col md:flex-row gap-4 items-end">
        <div className="flex-1 w-full space-y-1.5">
            <label className="text-xs font-medium text-fg-subtle uppercase tracking-wider ml-1">Pesquisar</label>
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-subtle" size={18} />
                <input 
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Nome da disciplina ou turma..."
                    className="w-full bg-zinc-50 border-none rounded-xl pl-10 pr-4 py-2.5 text-sm focus:ring-2 focus:ring-zinc-500 transition-all placeholder:text-fg-subtle"
                />
            </div>
        </div>

        <div className="w-full md:w-48 space-y-1.5">
            <label className="text-xs font-medium text-fg-subtle uppercase tracking-wider ml-1">Turno</label>
            <select 
                value={filterTurno}
                onChange={(e) => setFilterTurno(e.target.value)}
                className="w-full bg-zinc-50 border-none rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-zinc-500 transition-all text-fg-muted"
            >
                <option value="">Todos os Turnos</option>
                {uniqueTurnos.map((t: any) => <option key={t} value={t}>{t}</option>)}
            </select>
        </div>

        <div className="w-full md:w-64 space-y-1.5">
            <label className="text-xs font-medium text-fg-subtle uppercase tracking-wider ml-1">Turma</label>
            <select 
                value={filterTurma}
                onChange={(e) => setFilterTurma(e.target.value)}
                className="w-full bg-zinc-50 border-none rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-zinc-500 transition-all text-fg-muted"
            >
                <option value="">Todas as Turmas</option>
                {uniqueTurmas.map((t: any) => <option key={t} value={t}>{t}</option>)}
            </select>
        </div>
      </div>

      {sortedTurnos.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-zinc-300 border-dashed">
          <div className="w-16 h-16 bg-zinc-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <Search className="w-8 h-8 text-zinc-300" />
          </div>
          <h3 className="text-fg font-medium mb-1">Nenhuma disciplina encontrada</h3>
          <p className="text-fg-muted text-sm">Tente ajustar os filtros de busca.</p>
        </div>
      ) : (
        <div className="space-y-8">
      {sortedTurnos.map(turno => (
        <div key={turno} className="space-y-4">
          <div className={`flex items-center space-x-2 px-4 py-2 rounded-lg border w-fit ${getTurnoColor(turno)}`}>
            {getTurnoIcon(turno)}
            <h2 className="font-medium text-lg">{turno}</h2>
          </div>

          <div className="grid gap-4">
            {Object.values(porTurno[turno])
            .sort((a, b) => a.turma.nome.localeCompare(b.turma.nome))
            .map(({ turma, disciplinas: discs }) => {
              const isOpen = openTurmas.includes(turma.id)

              return (
                <div key={turma.id} className="bg-white rounded-xl shadow-sm border border-zinc-300 overflow-hidden transition-all duration-200">
                  <button 
                    onClick={() => toggleTurma(turma.id)}
                    className="w-full flex items-center justify-between p-4 bg-zinc-50 hover:bg-zinc-200 transition-colors"
                  >
                    <div className="flex items-center space-x-3">
                      <div className={`transition-transform duration-200 ${isOpen ? 'rotate-90' : ''}`}>
                        <ChevronRight className="w-5 h-5 text-fg-muted" />
                      </div>
                      <div className="text-left">
                        <h3 className="font-medium text-fg">{turma.nome}</h3>
                        <p className="text-sm text-fg-muted">{discs.length} disciplinas</p>
                      </div>
                    </div>
                  </button>
                  
                  {isOpen && (
                    <div className="p-6 border-t border-zinc-200 animate-slide-up">
                       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {discs.map((disciplina) => (
                          <Link
                            key={disciplina.id}
                            href={`/dashboard/disciplinas/${disciplina.id}/editar`}
                            className="group block bg-white border border-zinc-300 rounded-lg p-3 hover:border-accent/25 hover:shadow-card transition-all duration-200"
                          >
                            <div className="flex items-center space-x-3">
                              <div className="flex-shrink-0 w-10 h-10 bg-accent-subtle group-hover:bg-accent-subtle rounded-lg flex items-center justify-center transition-colors">
                                <BookOpen className="w-5 h-5 text-accent-fg" />
                              </div>
                              
                              <div className="flex-1 min-w-0">
                                <h3 className="text-sm font-medium text-fg truncate" title={disciplina.nome}>
                                  {disciplina.nome}
                                </h3>
                                <p className="text-xs text-fg-muted mt-0.5">
                                  {disciplina._count.notas} notas
                                </p>
                              </div>

                              <div className="opacity-0 group-hover:opacity-100 transition-opacity text-accent">
                                <Pencil className="w-4 h-4" />
                              </div>
                            </div>
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      ))}
        </div>
      )}
    </div>
  )
}
