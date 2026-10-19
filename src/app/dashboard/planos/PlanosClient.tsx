"use client"

import { useState, useEffect } from "react"
import { 
  Plus, 
  Search, 
  Users, 
  BookOpen, 
  Edit3, 
  Trash2, 
  ChevronRight,
  Download,
  FileText,
  Eye,
  ArrowLeft,
  Calendar,
  Layers,
  Sparkles,
  BarChart3
} from "lucide-react"
import { useSession } from "next-auth/react"
import Link from "next/link"
import PlanoForm from "@/components/PlanoForm"
import PlanoView from "@/components/PlanoView"
import TeacherTipsModal from "@/components/TeacherTipsModal"

interface Plano {
  id: string
  disciplinaNome: string
  periodoInicio: string
  periodoFim: string
  professor: { name: string }
  turmas: { id: string, nome: string }[]
  createdAt: string
}

export default function PlanosClient() {
  const { data: session } = useSession()
  const [planos, setPlanos] = useState<Plano[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [showView, setShowView] = useState(false)
  const [viewPlanoId, setViewPlanoId] = useState<string | null>(null)
  const [selectedPlano, setSelectedPlano] = useState<Plano | null>(null)
  const [expandedTurmas, setExpandedTurmas] = useState<string[]>([])
  
  const [filters, setFilters] = useState({
    professorId: "",
    turmaId: "",
    disciplinaNome: "",
    dataInicio: "",
    dataFim: ""
  })

  const [professores, setProfessores] = useState<{id: string, name: string}[]>([])
  const [turmas, setTurmas] = useState<{id: string, nome: string}[]>([])

  const isAdmin = session?.user?.isSuperuser || session?.user?.isDirecao

  const fetchPlanos = async () => {
    setLoading(true)
    const query = new URLSearchParams(filters as any).toString()
    const res = await fetch(`/api/planos?${query}`)
    const data = await res.json()
    setPlanos(data)
    setLoading(false)
  }

  useEffect(() => {
    fetchPlanos()
    
    // Todos precisam da lista de turmas para o filtro (a API já retorna apenas as permitidas)
    fetch('/api/turmas').then(res => res.json()).then(setTurmas)

    if (isAdmin) {
      fetch('/api/usuarios?role=professor').then(res => res.json()).then(setProfessores)
    }
  }, [filters, isAdmin])

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este plano?")) return
    
    const res = await fetch(`/api/planos/${id}`, { method: 'DELETE' })
    if (res.ok) fetchPlanos()
  }

  const groupPlanos = () => {
    const groups: Record<string, Record<string, Plano[]>> = {}
    
    planos.forEach(plano => {
        const date = new Date(plano.periodoInicio)
        const monthName = date.toLocaleString('pt-BR', { month: 'long', timeZone: 'UTC' }).toUpperCase()
        
        plano.turmas.forEach(turma => {
            if (filters.turmaId && turma.id !== filters.turmaId) return

            if (!groups[turma.nome]) groups[turma.nome] = {}
            if (!groups[turma.nome][monthName]) groups[turma.nome][monthName] = []
            groups[turma.nome][monthName].push(plano)
        })
    })

    return Object.keys(groups).sort().reduce((acc, turma) => {
        const sortedMonths = Object.keys(groups[turma]).sort((a, b) => {
            const dateA = new Date(groups[turma][a][0].periodoInicio)
            const dateB = new Date(groups[turma][b][0].periodoInicio)
            return dateB.getTime() - dateA.getTime() 
        })

        acc[turma] = sortedMonths.reduce((mAcc, month) => {
            mAcc[month] = groups[turma][month]
            return mAcc
        }, {} as Record<string, Plano[]>)

        return acc
    }, {} as Record<string, Record<string, Plano[]>>)
  }

  const groupedData = groupPlanos()
  const turmasNomes = Object.keys(groupedData)

  const isCurrentFortnight = (start: string, end: string) => {
    const now = new Date()
    const startDate = new Date(start)
    const endDate = new Date(end)
    // Para comparação de "hoje", ajustamos a data de início e fim para abranger o dia todo considerando UTC
    return now >= startDate && now <= endDate
  }

  const toggleTurmaExpansion = (nome: string) => {
    setExpandedTurmas(prev => 
        prev.includes(nome) ? prev.filter(t => t !== nome) : [...prev, nome]
    )
  }

  const planoTips = [
    {
      title: "Planejamento Quinzenal",
      description: "Organize seus conteúdos e indicadores para as próximas duas semanas de aula.",
      icon: <Calendar className="w-5 h-5 text-success-fg" />,
      color: "emerald"
    },
    {
      title: "Matriz Pedagógica",
      description: "Selecione as turmas de mesmo ano/série para replicar o planejamento rapidamente.",
      icon: <Layers className="w-5 h-5 text-fg-muted" />,
      color: "blue"
    },
    {
      title: "Resultados Finais",
      description: "Gere relatórios sintéticos de todos os planos para acompanhamento da coordenação.",
      icon: <Sparkles className="w-5 h-5 text-fg-muted" />,
      color: "indigo"
    }
  ]

  return (
    <div className="">
      <TeacherTipsModal storageKey="seen_tips_planos_v1" title="Planos de Ensino" tips={planoTips} />
      
      {/* Header Premium Estilo Resultados - Ajustado para ser Flush com o Layout */}
      <header className="mb-6 border-b border-line pb-4">
        <div className="max-w-7xl mx-auto py-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="flex items-center space-x-5">
              <Link
                href="/dashboard"
                className="p-2 hover:bg-zinc-200 rounded-lg transition-colors text-fg-subtle hover:text-fg-muted"
              >
                <ArrowLeft size={20} />
              </Link>
              <div>
                <h1 className="text-2xl font-medium text-fg tracking-tight">Planos de Ensino</h1>
                <p className="text-base text-fg-muted font-medium">Gestão de cronogramas e conteúdos programáticos</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {!isAdmin && (
                <button 
                  onClick={() => { setShowForm(true); setSelectedPlano(null); }}
                  className="flex items-center gap-2 bg-zinc-900 text-white px-6 py-3 rounded-lg font-medium hover:bg-zinc-800 transition-all text-xs active:scale-95 shadow-card"
                >
                  <Plus size={16} /> Novo Plano
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-32 space-y-8">
        
        {/* Dicas Fixas - Estilo Resultados */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {planoTips.map((tip, index) => (
             <div key={index} className="bg-white/60 border border-zinc-300/60 p-5 rounded-xl flex items-start space-x-4 hover:bg-white hover:border-zinc-300 hover:shadow-card transition-all group">
                <div className={`p-3 rounded-lg bg-subtle text-fg-muted transition-all shadow-card`}>
                   {tip.icon}
                </div>
                <div>
                  <h3 className="text-sm font-medium text-fg mb-1">{tip.title}</h3>
                  <p className="text-xs font-medium text-fg-subtle uppercase leading-relaxed">{tip.description}</p>
                </div>
             </div>
          ))}
        </div>

        {/* Filtros Premium */}
        <div className="bg-white p-6 rounded-xl shadow-card border border-zinc-200 flex flex-wrap gap-6 items-end relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-zinc-50 rounded-full -mr-16 -mt-16 opacity-50 blur-3xl"></div>
            
            <div className="flex-1 min-w-[200px] space-y-2">
                <label className="text-xs font-medium text-fg-subtle ml-2">Filtrar por Turma</label>
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center bg-zinc-50 rounded-lg text-fg-subtle group-focus-within:text-fg-muted group-focus-within:bg-zinc-50 transition-all">
                    <Users size={16} />
                  </div>
                  <select 
                      value={filters.turmaId} 
                      onChange={e => setFilters({...filters, turmaId: e.target.value})}
                      className="w-full bg-zinc-50 hover:bg-zinc-200 border-none rounded-lg pl-14 pr-6 py-4 text-sm focus:ring-2 focus:ring-zinc-500 transition-all appearance-none cursor-pointer font-medium text-fg-muted shadow-card"
                  >
                      <option value="">Selecione a Turma...</option>
                      {turmas.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
                  </select>
                </div>
            </div>

            <div className="flex-1 min-w-[200px] space-y-2">
                <label className="text-xs font-medium text-fg-subtle ml-2">Disciplina</label>
                <div className="relative group">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center bg-zinc-50 rounded-lg text-fg-subtle group-focus-within:text-fg-muted group-focus-within:bg-zinc-50 transition-all">
                        <Search size={16} />
                    </div>
                    <input 
                        type="text" 
                        placeholder="Buscar matéria..." 
                        value={filters.disciplinaNome} 
                        onChange={e => setFilters({...filters, disciplinaNome: e.target.value})} 
                        className="w-full bg-zinc-50 hover:bg-zinc-200 border-none rounded-lg pl-14 pr-6 py-4 text-sm focus:ring-2 focus:ring-zinc-500 transition-all font-medium text-fg-muted shadow-card placeholder:text-zinc-300" 
                    />
                </div>
            </div>

            {isAdmin && (
                <div className="flex-1 min-w-[200px] space-y-2">
                    <label className="text-xs font-medium text-fg-subtle ml-2">Professor</label>
                    <div className="relative group">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center bg-zinc-50 rounded-lg text-fg-subtle group-focus-within:text-fg-muted group-focus-within:bg-zinc-50 transition-all">
                        <BookOpen size={16} />
                      </div>
                      <select 
                        value={filters.professorId} 
                        onChange={e => setFilters({...filters, professorId: e.target.value})}
                        className="w-full bg-zinc-50 hover:bg-zinc-200 border-none rounded-lg pl-14 pr-6 py-4 text-sm focus:ring-2 focus:ring-zinc-500 transition-all appearance-none cursor-pointer font-medium text-fg-muted shadow-card"
                      >
                          <option value="">Todos os Professores</option>
                          {professores.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                    </div>
                </div>
            )}
        </div>

        {/* Matriz de Planos Estilo Resultados (Cards Table) */}
        <div className="bg-white rounded-xl shadow-card border border-zinc-200 overflow-hidden relative">
          <div className="p-6 border-b border-zinc-50 bg-zinc-50/10 flex items-center justify-between">
            <h2 className="text-sm font-medium text-fg-subtle flex items-center gap-3 ml-2">
              <div className="w-8 h-8 rounded-lg bg-zinc-50 text-fg-muted flex items-center justify-center shadow-card">
                <Users size={16} />
              </div>
              Matriz de Planos Quinzenais
            </h2>
            <div className="hidden md:flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-success animate-pulse shadow-card"></span>
                <p className="text-xs font-medium text-fg-subtle leading-none">Acesso em tempo real</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            {loading ? (
              <div className="p-20 text-center">
                 <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-success mx-auto"></div>
              </div>
            ) : turmasNomes.length === 0 ? (
              <div className="text-center py-20 text-zinc-300">
                  <BarChart3 className="w-12 h-12 opacity-20 mx-auto mb-3" />
                  <p className="text-sm font-medium">Nenhum plano localizado</p>
              </div>
            ) : (
                <div className="divide-y divide-zinc-200">
                    {turmasNomes.map(turmaNome => {
                        const isExpanded = expandedTurmas.includes(turmaNome)
                        const matches = Object.values(groupedData[turmaNome]).flat()
                        
                        return (
                            <div key={turmaNome} className="bg-white">
                                <button 
                                    onClick={() => toggleTurmaExpansion(turmaNome)}
                                    className={`w-full px-8 py-5 flex items-center justify-between transition-all hover:bg-zinc-50/80 group ${isExpanded ? 'bg-zinc-50 border-b border-zinc-200' : ''}`}
                                >
                                    <div className="flex items-center gap-5">
                                        <div className={`w-12 h-12 rounded-lg flex items-center justify-center transition-all duration-500 ${isExpanded ? 'bg-zinc-600 text-white shadow-card rotate-6' : 'bg-zinc-200 text-fg-subtle group-hover:bg-white group-hover:shadow-card'}`}>
                                            <Users size={20} />
                                        </div>
                                        <div className="text-left">
                                            <h3 className="text-lg font-medium text-fg group-hover:text-fg-muted transition-colors">{turmaNome}</h3>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <div className="w-1.5 h-1.5 rounded-full bg-zinc-300"></div>
                                                <span className="text-xs font-medium text-fg-subtle">{matches.length} Documentos Arquivados</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center border transition-all duration-300 ${isExpanded ? 'bg-zinc-50 border-zinc-300 text-fg-muted rotate-90' : 'bg-white border-zinc-200 text-zinc-300 group-hover:border-zinc-300'}`}>
                                        <ChevronRight size={16} />
                                    </div>
                                </button>

                                {isExpanded && (
                                    <div className="bg-zinc-50/20 border-t border-zinc-200/50 animate-slide-up pb-2">
                                        {Object.keys(groupedData[turmaNome]).map(month => (
                                            <div key={month} className="space-y-0">
                                                <div className="px-8 py-3 bg-zinc-50 border-b border-zinc-200 flex items-center gap-3">
                                                   <div className="w-1 h-3 bg-zinc-500 rounded-full"></div>
                                                   <span className="text-xs font-medium text-fg-muted">{month}</span>
                                                </div>
                                                <table className="w-full text-left border-collapse">
                                                    <thead>
                                                        <tr className="bg-white">
                                                            <th className="px-8 py-4 text-xs font-medium text-fg-subtle border-b border-zinc-50">Disciplina / Matéria</th>
                                                            <th className="px-6 py-4 text-xs font-medium text-fg-subtle text-center border-b border-zinc-50">Período de Vigência</th>
                                                            <th className="px-8 py-4 text-xs font-medium text-fg-subtle text-center border-b border-zinc-50">Ações</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-zinc-50">
                                                        {groupedData[turmaNome][month].map((plano) => {
                                                            const current = isCurrentFortnight(plano.periodoInicio, plano.periodoFim)
                                                            return (
                                                                <tr key={plano.id} className="group hover:bg-zinc-50/30 transition-all">
                                                                    <td className="px-8 py-5">
                                                                        <div className="flex items-center gap-4">
                                                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${current ? 'bg-success-subtle text-success-fg shadow-sm border border-success-line' : 'bg-zinc-50 text-fg-subtle border border-zinc-200 group-hover:bg-white'}`}>
                                                                                <FileText size={18} />
                                                                            </div>
                                                                            <div className="flex flex-col">
                                                                                 <span className="text-base font-medium text-fg-muted uppercase group-hover:text-fg-muted transition-colors leading-tight">{plano.disciplinaNome}</span>
                                                                                 <span className="text-xs font-medium text-fg-subtle mt-1">
                                                                                    {isAdmin ? `PROF. ${plano.professor.name}` : 'Documento Quinzenal'}
                                                                                 </span>
                                                                             </div>
                                                                        </div>
                                                                    </td>
                                                                    <td className="px-6 py-5 text-center">
                                                                        <div className="inline-flex items-center gap-2 bg-zinc-50 px-4 py-2 rounded-xl border border-zinc-200 shadow-sm group-hover:bg-white transition-all">
                                                                            <Calendar size={14} className="text-fg-subtle" />
                                                                            <span className="text-xs font-medium text-fg-muted">
                                                                                {new Date(plano.periodoInicio).toLocaleDateString('pt-BR', {day:'2-digit', month:'2-digit', timeZone: 'UTC'})} — {new Date(plano.periodoFim).toLocaleDateString('pt-BR', {day:'2-digit', month:'2-digit', timeZone: 'UTC'})}
                                                                            </span>
                                                                        </div>
                                                                    </td>
                                                                    <td className="px-8 py-5 text-center">
                                                                        <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-all -translate-y-1 group-hover:translate-y-0">
                                                                            <button onClick={() => { setViewPlanoId(plano.id); setShowView(true); }} className="w-9 h-9 flex items-center justify-center bg-white border border-zinc-300 text-fg-subtle rounded-xl hover:bg-zinc-50 hover:text-fg-muted hover:border-zinc-300 transition-all shadow-sm" title="Ver Detalhes"><Eye size={16} /></button>
                                                                            <button onClick={() => { setSelectedPlano(plano); setShowForm(true); }} className="w-9 h-9 flex items-center justify-center bg-white border border-zinc-300 text-fg-subtle rounded-xl hover:bg-zinc-900 hover:text-white hover:border-zinc-900 transition-all shadow-sm" title="Editar"><Edit3 size={16} /></button>
                                                                            <button onClick={() => handleDelete(plano.id)} className="w-9 h-9 flex items-center justify-center bg-white border border-zinc-300 text-fg-subtle rounded-xl hover:bg-danger-subtle hover:text-danger-fg hover:border-danger-line transition-all shadow-sm" title="Remover"><Trash2 size={16} /></button>
                                                                        </div>
                                                                    </td>
                                                                </tr>
                                                            )
                                                        })}
                                                    </tbody>
                                                </table>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>
            )}
          </div>
        </div>
      </main>

      {showForm && (
        <PlanoForm 
          plano={selectedPlano}
          onSuccess={() => { setShowForm(false); fetchPlanos(); }}
          onClose={() => setShowForm(false)}
        />
      )}
      {showView && viewPlanoId && (
        <PlanoView 
          planoId={viewPlanoId}
          onClose={() => setShowView(false)}
        />
      )}
    </div>
  )
}
