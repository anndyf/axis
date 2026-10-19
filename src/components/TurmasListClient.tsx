"use client"

import { useState, useMemo } from "react"
import { normalizarTurno } from "@/lib/services/calendario"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { Users, FileText, Pencil, Search, Filter, Copy, Loader2, X, Calendar } from "lucide-react"
import { decodeTurma, getTurmaColor, getTurmaIcon } from "@/lib/turma-utils"
import ConfirmModal from "./ConfirmModal"
import CloneTurmaModal from "./CloneTurmaModal"
import PromoverTurmaModal from "./PromoverTurmaModal"
import { ArrowUpCircle } from "lucide-react"

interface Turma {
  id: string
  nome: string
  curso: string | null
  turno: string | null
  modalidade: string | null
  _count: {
    estudantes: number
    disciplinas: number
  }
  serie: string | null
  anoLetivo: number | null
  minhasDisciplinas?: { id: string, nome: string }[]
}

interface TurmasListClientProps {
  turmas: Turma[]
}

export default function TurmasListClient({ 
  turmas
}: TurmasListClientProps) {
  const router = useRouter()
  const { data: session } = useSession()
  const isManagement = session?.user?.isSuperuser || (session?.user?.isDirecao && !session?.user?.isStaff)
  // Estados de Filtro
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCurso, setSelectedCurso] = useState<string | null>(null)
  const [selectedTurno, setSelectedTurno] = useState<string | null>(null)
  const [selectedSerie, setSelectedSerie] = useState<string | null>(null)
  
  const [cloningId, setCloningId] = useState<string | null>(null)
  const [isCloneModalOpen, setIsCloneModalOpen] = useState(false)
  const [turmaToClone, setTurmaToClone] = useState<{id: string, nome: string, turno: string | null} | null>(null)
  
  const [isPromoteModalOpen, setIsPromoteModalOpen] = useState(false)
  const [turmaToPromote, setTurmaToPromote] = useState<{id: string, nome: string, serie: string | null, modalidade: string | null, anoLetivo: number | null} | null>(null)
  const [promotingId, setPromotingId] = useState<string | null>(null)
  // ... (keep existing useMemo filters and turnosOrdenados logic)

  const handlePromoteClick = (turma: Turma) => {
    setTurmaToPromote({ 
      id: turma.id, 
      nome: turma.nome, 
      serie: turma.serie, 
      modalidade: turma.modalidade,
      anoLetivo: turma.anoLetivo 
    })
    setIsPromoteModalOpen(true)
  }

  const handleConfirmPromote = async (data: { nome: string, serie: string, anoLetivo: number }) => {
    if (!turmaToPromote) return
    
    setPromotingId(turmaToPromote.id)
    setIsPromoteModalOpen(false)
    
    try {
      const res = await fetch(`/api/turmas/${turmaToPromote.id}/promover`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })
      
      if (res.ok) {
        router.refresh()
      } else {
        const data = await res.json()
        alert(data.message || "Erro ao promover turma")
      }
    } catch (err) {
      console.error(err)
      alert("Erro de conexão ao promover")
    } finally {
      setPromotingId(null)
      setTurmaToPromote(null)
    }
  }

  const handleCloneClick = (turma: Turma) => {
    setTurmaToClone({ id: turma.id, nome: turma.nome, turno: turma.turno })
    setIsCloneModalOpen(true)
  }

  const handleConfirmClone = async (data: { nome: string, turno: string, numero: number }) => {
    if (!turmaToClone) return
    
    setCloningId(turmaToClone.id)
    setIsCloneModalOpen(false)
    
    try {
      const res = await fetch(`/api/turmas/${turmaToClone.id}/clonar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })
      
      if (res.ok) {
        router.refresh()
      } else {
        const data = await res.json()
        alert(data.message || "Erro ao clonar turma")
      }
    } catch (err) {
      console.error(err)
      alert("Erro de conexão ao clonar")
    } finally {
      setCloningId(null)
      setTurmaToClone(null)
    }
  }

  // REPEATING LOGIC FOR FILTERS TO ENSURE FILE IS VALID (I need the full content for replace_file_content if I replace a large chunk)
  // But wait, the previous tool output showed the whole file. I will write the whole file with multi_replace if needed, 
  // but let's try to be precise.

  const cursosOptions = useMemo(() => {
    const set = new Set<string>()
    turmas.forEach(t => {
      const decoded = decodeTurma(t.nome)
      set.add(t.curso || decoded.curso || "Outros")
    })
    return Array.from(set).sort()
  }, [turmas])

  const turnosOptions = ["Matutino", "Vespertino", "Noturno", "Integral", "Outros"]
  
  const seriesOptions = useMemo(() => {
    const set = new Set<string>()
    turmas.forEach(t => {
      const match = t.nome.match(/^(\d+)/)
      if (match) set.add(match[1])
    })
    return Array.from(set).sort()
  }, [turmas])

  const clearFilters = () => {
    setSearchTerm("")
    setSelectedCurso(null)
    setSelectedTurno(null)
    setSelectedSerie(null)
  }

  // Turno gravado como "MATUTINO" ou "Matutino": agrupa sempre pelo rótulo
  const rotuloTurno = (t?: string | null) => {
    const n = normalizarTurno(t)
    const rotulo = { MATUTINO: "Matutino", VESPERTINO: "Vespertino", NOTURNO: "Noturno", INTEGRAL: "Integral" }[n]
    return rotulo ?? "Outros"
  }

  const filteredTurmas = useMemo(() => {
    return turmas.filter(t => {
      const decoded = decodeTurma(t.nome)
      const nomeCurso = t.curso || decoded.curso || "Outros"
      const turno = rotuloTurno(t.turno || decoded.turno)
      const serieMatch = t.nome.match(/^(\d+)/)
      const serie = serieMatch ? serieMatch[1] : null

      const matchesSearch = t.nome.toLowerCase().includes(searchTerm.toLowerCase()) || 
                           nomeCurso.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesCurso = !selectedCurso || nomeCurso === selectedCurso
      const matchesTurno = !selectedTurno || turno === selectedTurno
      const matchesSerie = !selectedSerie || serie === selectedSerie

      return matchesSearch && matchesCurso && matchesTurno && matchesSerie
    })
  }, [turmas, searchTerm, selectedCurso, selectedTurno, selectedSerie])

  const turmasAgrupadas = useMemo(() => {
    return filteredTurmas.reduce((acc, turma) => {
      const decoded = decodeTurma(turma.nome)
      const turno = rotuloTurno(turma.turno || decoded.turno)
      if (!acc[turno]) acc[turno] = []
      acc[turno].push(turma)
      return acc
    }, {} as Record<string, Turma[]>)
  }, [filteredTurmas])

  const turnosOrdenados = ["Matutino", "Vespertino", "Noturno", "Integral", "Outros"].filter(t => turmasAgrupadas[t])

  return (
    <div className="space-y-4">
      {/* Top Row */}
      <div className="flex flex-col md:flex-row items-center gap-4 bg-white p-2 rounded-xl border border-zinc-200 shadow-sm">
        {/* Total Badge */}
        <div className="bg-zinc-900 rounded-lg py-2 px-4 flex items-center gap-3 shrink-0 self-stretch md:self-auto">
          <div className="w-8 h-8 bg-white/10 rounded-xl flex items-center justify-center">
            <Users className="w-4 h-4 text-white" />
          </div>
          <div className="text-white pr-2">
            <p className="text-xs font-semibold opacity-50 leading-none mb-1">Turmas</p>
            <p className="text-lg font-semibold leading-none">{filteredTurmas.length}</p>
          </div>
        </div>

        {/* Search Input */}
        <div className="flex-1 relative group self-stretch md:self-auto min-w-[200px]">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-fg-subtle w-4 h-4 group-focus-within:text-accent-fg transition-colors" />
          <input
            type="text"
            placeholder="Buscar por nome ou curso..."
            className="w-full pl-11 pr-4 py-3 bg-zinc-50 border-transparent rounded-lg text-sm focus:bg-white focus:ring-2 focus:ring-ring transition-all outline-none"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Dropdowns & Reset */}
        <div className="flex flex-wrap items-center gap-2 px-2 pb-2 md:pb-0">
          <select 
            value={selectedTurno || ""}
            onChange={(e) => setSelectedTurno(e.target.value || null)}
            className="px-3 py-2 bg-zinc-50 border-none rounded-xl text-xs font-semibold text-fg-muted focus:ring-2 focus:ring-ring outline-none cursor-pointer hover:bg-zinc-100 transition-colors"
          >
            <option value="">Turnos</option>
            {turnosOptions.map(t => <option key={t} value={t}>{t}</option>)}
          </select>

          <select 
            value={selectedSerie || ""}
            onChange={(e) => setSelectedSerie(e.target.value || null)}
            className="px-3 py-2 bg-zinc-50 border-none rounded-xl text-xs font-semibold text-fg-muted focus:ring-2 focus:ring-ring outline-none cursor-pointer hover:bg-zinc-100 transition-colors"
          >
            <option value="">Séries</option>
            {seriesOptions.map(s => <option key={s} value={s}>{s}ª Série</option>)}
          </select>

          {(searchTerm || selectedTurno || selectedSerie || selectedCurso) && (
            <button 
              onClick={clearFilters}
              className="flex items-center gap-2 px-4 py-2 bg-accent-subtle hover:bg-accent-subtle text-accent-fg rounded-xl transition-all group"
              title="Limpar filtros"
            >
              <X className="w-4 h-4 group-hover:rotate-90 transition-transform" />
              <span className="text-xs font-semibold">Limpar</span>
            </button>
          )}
        </div>
      </div>

      {/* Lista */}
      {turnosOrdenados.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-xl border border-dashed border-zinc-200">
           <p className="text-fg-subtle font-semibold text-sm">Nenhuma turma encontrada com esses filtros</p>
        </div>
      ) : (
        <div className="space-y-12">
          {turnosOrdenados.map(turno => (
            <div key={turno} className="space-y-6">
              <div className="flex items-center space-x-4">
                <h2 className="text-sm font-medium text-black bg-white px-4 py-1 rounded-full shadow-sm border border-zinc-100">
                  {turno}
                </h2>
                <div className="h-px bg-zinc-200 flex-1"></div>
                <span className="text-xs font-semibold text-fg-subtle bg-zinc-100 px-2 py-0.5 rounded uppercase">
                  {turmasAgrupadas[turno].length} {turmasAgrupadas[turno].length === 1 ? 'Turma' : 'Turmas'}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {turmasAgrupadas[turno].map((turma) => {
                  const decoded = decodeTurma(turma.nome)
                  const cursoExibicao = turma.curso || decoded.curso || "---"
                  const colors = getTurmaColor(cursoExibicao)
                  const Icon = getTurmaIcon(cursoExibicao)
                  const isCloning = cloningId === turma.id
                  
                  return (
                    <div
                      key={turma.id}
                      className="bg-white rounded-xl shadow-card border border-zinc-100 p-5 hover:shadow-card transition-all duration-300 flex flex-col"
                    >
                      <div className="flex items-start justify-between mb-5">
                        <div className="flex items-center space-x-4 min-w-0 flex-1">
                          <div className={`w-11 h-11 ${colors.bg} rounded-xl flex items-center justify-center shrink-0 shadow-card ${colors.shadow}`}>
                            <Icon className="w-6 h-6 text-white" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <h3 className="text-lg font-semibold text-black leading-none whitespace-nowrap truncate">
                              {turma.nome}
                            </h3>
                            <p className="text-xs text-black/40 font-semibold mt-1 whitespace-nowrap truncate">
                              {cursoExibicao}
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-0.5 shrink-0 ml-1">
                           <Link
                              href={`/dashboard/turmas/${turma.id}/relatorio`}
                              title="Relatório Geral"
                              className="p-1 text-accent-fg hover:bg-accent-subtle rounded-lg transition-colors"
                           >
                             <FileText className="w-3.5 h-3.5" />
                           </Link>
                           {isManagement && (
                             <Link
                                href={`/dashboard/turmas/${turma.id}/horario`}
                                title="Horário de Aulas"
                                className="p-1 text-accent-fg hover:bg-accent-subtle rounded-lg transition-colors"
                             >
                               <Calendar className="w-3.5 h-3.5" />
                             </Link>
                           )}
                           
                           {session?.user?.isSuperuser && (
                              <div className="flex items-center space-x-0.5">
                                <button
                                  onClick={() => handlePromoteClick(turma)}
                                  disabled={!!promotingId || !!cloningId}
                                  title="Promover para Próxima Etapa (Move Alunos)"
                                  className="p-1 text-accent-fg hover:bg-accent-subtle rounded-lg transition-colors disabled:opacity-30"
                                >
                                  {promotingId === turma.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ArrowUpCircle className="w-3.5 h-3.5" />}
                                </button>
                                <button
                                  onClick={() => handleCloneClick(turma)}
                                  disabled={!!cloningId || !!promotingId}
                                  title="Clonar Estrutura (sem alunos)"
                                  className="p-1 text-success-fg hover:bg-success-subtle rounded-lg transition-colors disabled:opacity-30"
                                >
                                  {cloningId === turma.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Copy className="w-3.5 h-3.5" />}
                                </button>
                              </div>
                           )}

                           {isManagement && (
                             <Link
                                href={`/dashboard/turmas/${turma.id}/editar`}
                                title="Editar Turma"
                                className="p-1 text-fg-subtle hover:bg-zinc-100 hover:text-black rounded-lg transition-all"
                             >
                               <Pencil className="w-3.5 h-3.5" />
                             </Link>
                           )}
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                           {turma.modalidade && (
                             <span className="px-1.5 py-0.5 bg-zinc-50 text-fg-subtle text-xs rounded font-semibold border border-zinc-100">
                               {turma.modalidade}
                             </span>
                           )}
                        </div>
                        <div className="flex items-center space-x-3">
                           <div className="flex items-center text-xs font-semibold text-black/60">
                             <Users className="w-3 h-3 mr-1 text-zinc-300" />
                             {turma._count.estudantes}
                           </div>
                            <div className="flex items-center text-xs font-semibold text-black/60">
                             <FileText className="w-3 h-3 mr-1 text-zinc-300" />
                             {turma._count.disciplinas}
                           </div>
                        </div>
                      </div>

                      {turma.minhasDisciplinas && turma.minhasDisciplinas.length > 0 && (
                        <div className="mt-4 pt-4 border-t border-zinc-100">
                          <p className="text-xs font-bold text-fg-subtle mb-2">Suas Disciplinas</p>
                          <div className="flex flex-wrap gap-1.5">
                            {turma.minhasDisciplinas.map((d: any) => (
                              <span key={d.id} className="inline-flex items-center px-2 py-1 bg-accent-subtle text-accent-fg text-xs font-bold rounded-lg border border-accent/25">
                                {d.nome}
                              </span>
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

      <CloneTurmaModal 
        isOpen={isCloneModalOpen}
        onClose={() => setIsCloneModalOpen(false)}
        onConfirm={handleConfirmClone}
        turmaOriginal={turmaToClone}
      />

      <PromoverTurmaModal
        isOpen={isPromoteModalOpen}
        onClose={() => setIsPromoteModalOpen(false)}
        onConfirm={handleConfirmPromote}
        turmaOriginal={turmaToPromote}
      />
    </div>
  )
}

