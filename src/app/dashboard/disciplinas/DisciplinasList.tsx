"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { BookOpen, ChevronRight, Sun, Sunset, Moon, Clock, Pencil, Search } from "lucide-react"
import { EmptyState } from "@/components/ui"

const CONTROLE = "h-9 w-full rounded-lg border border-line bg-surface px-3 text-sm text-fg transition-colors duration-150 placeholder:text-fg-subtle hover:border-line-strong focus:border-accent"

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

  // Ícone discreto por turno
  const getTurnoIcon = (turno: string) => {
    const props = { size: 16, strokeWidth: 1.75, className: "text-fg-subtle", "aria-hidden": true }
    switch(turno.toLowerCase()) {
      case 'matutino': return <Sun {...props} />
      case 'vespertino': return <Sunset {...props} />
      case 'noturno': return <Moon {...props} />
      default: return <Clock {...props} />
    }
  }

  const rotulo = (t: string) => t.charAt(0).toUpperCase() + t.slice(1).toLowerCase()

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <div className="bg-surface p-4 rounded-lg border border-line flex flex-col md:flex-row gap-3 md:items-end">
        <div className="flex-1 w-full space-y-1.5">
            <label htmlFor="disc-busca" className="text-xs font-medium text-fg-muted">Pesquisar</label>
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-subtle" size={16} strokeWidth={1.75} aria-hidden />
                <input
                    id="disc-busca"
                    type="search"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Nome da disciplina ou turma..."
                    className={`${CONTROLE} pl-9`}
                />
            </div>
        </div>

        <div className="w-full md:w-48 space-y-1.5">
            <label htmlFor="disc-turno" className="text-xs font-medium text-fg-muted">Turno</label>
            <select id="disc-turno" value={filterTurno} onChange={(e) => setFilterTurno(e.target.value)} className={CONTROLE}>
                <option value="">Todos os turnos</option>
                {uniqueTurnos.map((t: any) => <option key={t} value={t}>{rotulo(t)}</option>)}
            </select>
        </div>

        <div className="w-full md:w-56 space-y-1.5">
            <label htmlFor="disc-turma" className="text-xs font-medium text-fg-muted">Turma</label>
            <select id="disc-turma" value={filterTurma} onChange={(e) => setFilterTurma(e.target.value)} className={CONTROLE}>
                <option value="">Todas as turmas</option>
                {uniqueTurmas.map((t: any) => <option key={t} value={t}>{t}</option>)}
            </select>
        </div>
      </div>

      {sortedTurnos.length === 0 ? (
        <EmptyState icon={Search} title="Nenhuma disciplina encontrada" description="Tente ajustar os filtros de busca." className="rounded-lg border border-dashed border-line bg-surface" />
      ) : (
        <div className="space-y-8">
      {sortedTurnos.map(turno => (
        <section key={turno} className="space-y-3" aria-label={rotulo(turno)}>
          <div className="flex items-center gap-2">
            {getTurnoIcon(turno)}
            <h2 className="text-13 font-semibold text-fg">{rotulo(turno)}</h2>
            <div className="h-px flex-1 bg-line" aria-hidden />
          </div>

          <div className="overflow-hidden rounded-lg border border-line bg-surface divide-y divide-line-subtle">
            {Object.values(porTurno[turno])
            .sort((a, b) => a.turma.nome.localeCompare(b.turma.nome))
            .map(({ turma, disciplinas: discs }) => {
              const isOpen = openTurmas.includes(turma.id)

              return (
                <div key={turma.id}>
                  <button
                    type="button"
                    onClick={() => toggleTurma(turma.id)}
                    aria-expanded={isOpen}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors duration-150 hover:bg-subtle/60"
                  >
                    <ChevronRight size={16} strokeWidth={1.75} className={`shrink-0 text-fg-subtle transition-transform duration-150 ${isOpen ? 'rotate-90' : ''}`} aria-hidden />
                    <span className="text-sm font-medium text-fg">{turma.nome}</span>
                    <span className="ml-auto text-xs tabular-nums text-fg-subtle">{discs.length} {discs.length === 1 ? 'disciplina' : 'disciplinas'}</span>
                  </button>

                  {isOpen && (
                    <div className="border-t border-line-subtle bg-canvas/60 p-3 sm:p-4 animate-fade-in">
                       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                        {discs.map((disciplina) => (
                          <Link
                            key={disciplina.id}
                            href={`/dashboard/disciplinas/${disciplina.id}/editar`}
                            className="group flex items-center gap-3 rounded-lg border border-line bg-surface px-3 py-2.5 transition-colors duration-150 hover:border-line-strong"
                          >
                            <BookOpen size={16} strokeWidth={1.75} className="shrink-0 text-fg-subtle" aria-hidden />
                            <div className="flex-1 min-w-0">
                              <p className="text-13 font-medium text-fg truncate" title={disciplina.nome}>{disciplina.nome}</p>
                              <p className="text-xs tabular-nums text-fg-subtle">{disciplina._count.notas} notas</p>
                            </div>
                            <Pencil size={14} strokeWidth={1.75} className="shrink-0 text-fg-disabled transition-colors duration-150 group-hover:text-fg-muted" aria-label="Editar" />
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </section>
      ))}
        </div>
      )}
    </div>
  )
}
