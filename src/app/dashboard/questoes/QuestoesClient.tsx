"use client"

import { useState, useEffect, useCallback } from "react"
import { 
  Plus, 
  Search, 
  Filter, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  MoreVertical,
  Edit2,
  Trash2,
  MessageSquare,
  ChevronDown,
  Info,
  Eye,
  Image as ImageIcon,
  Calculator,
  Copy,
  X,
  Layers,
  Zap,
  BookOpen,
  Users
} from "lucide-react"
import { useRouter } from "next/navigation"
import QuestaoForm from "./QuestaoForm"
import QuestaoPreviewModal from "./QuestaoPreviewModal"
import TeacherTipsModal from "@/components/TeacherTipsModal"

export default function QuestoesClient({ user, turmas, disciplinas, metrics, questoesPorTurma, professores = [], areas = [], nomeEscola = 'Áxis' }: any) {
  const router = useRouter()
  const [questoes, setQuestoes] = useState<any[]>([])
  const [totalResultados, setTotalResultados] = useState(0)
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingQuestao, setEditingQuestao] = useState<any>(null)
  const [previewQuestao, setPreviewQuestao] = useState<any>(null)
  const [showBreakdown, setShowBreakdown] = useState(false)
  const [filters, setFilters] = useState({
    turmaId: '',
    disciplinaId: '',
    areaId: '',
    status: (user.isSuperuser || user.isDirecao) ? 'PENDENTE' : '',
    unidade: '',
    tipo: '',
    search: '',
    professorId: ''
  })
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [currentPage, setCurrentPage] = useState(1)

  const questaoTips = [
    {
      title: "Crie com Variedade",
      description: "Você pode adicionar textos longos e até 4 imagens por questão. Use o editor para formatar o enunciado e as alternativas com clareza.",
      icon: <ImageIcon className="w-10 h-10 text-rose-600" />,
      color: "bg-rose-600"
    },
    {
      title: "Organize por Turmas",
      description: "Vincule suas questões às turmas e disciplinas corretas. Isso facilita muito na hora de gerar uma prova específica mais tarde.",
      icon: <Layers className="w-10 h-10 text-indigo-600" />,
      color: "bg-indigo-600"
    },
    {
      title: "Gerador Automático",
      description: "Suas questões alimentam o Gerador de Provas. Basta selecionar o assunto e o sistema monta o exame para você em segundos.",
      icon: <Zap className="w-10 h-10 text-amber-500" />,
      color: "bg-amber-500"
    }
  ]

  const isAdmin = user.isSuperuser || user.isDirecao

  const fetchQuestoes = useCallback(async () => {
    setLoading(true)
    const activeFilters = Object.fromEntries(
      Object.entries(filters).filter(([_, v]) => v !== '')
    )
    const params = new URLSearchParams(activeFilters)
    try {
      const res = await fetch(`/api/questoes?${params.toString()}`)
      const data = await res.json()
      
      // Ler o total do header para exibir o contador real
      const totalHeader = res.headers.get('X-Total-Count')
      if (totalHeader) setTotalResultados(parseInt(totalHeader))

      if (Array.isArray(data)) {
        setQuestoes(data)
      } else {
        console.error("API did not return an array:", data)
        setQuestoes([])
      }
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }, [filters])

  useEffect(() => {
    setCurrentPage(1);
  }, [filters]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchQuestoes()
    }, 400)
    return () => clearTimeout(timer)
  }, [fetchQuestoes])

  const handleStatusUpdate = async (id: string, newStatus: string, feedback?: string) => {
    try {
      const res = await fetch(`/api/questoes/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus, feedbackAdmin: feedback })
      })
      if (res.ok) {
        fetchQuestoes()
        router.refresh()
      }
    } catch (error) {
      console.error(error)
    }
  }

  const handleBulkStatusUpdate = async (newStatus: string, feedback?: string) => {
    if (!confirm(`Deseja alterar o status de ${selectedIds.length} questões para ${newStatus}?`)) return
    
    setLoading(true)
    try {
      // Fazemos o update sequencial ou paralelo. Por simplicidade e segurança, paralelo aqui.
      await Promise.all(selectedIds.map(id => 
        fetch(`/api/questoes/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: newStatus, feedbackAdmin: feedback })
        })
      ))
      setSelectedIds([])
      fetchQuestoes()
      router.refresh()
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta questão?')) return
    try {
      const res = await fetch(`/api/questoes/${id}`, { method: 'DELETE' })
      if (res.ok) {
        fetchQuestoes()
        router.refresh()
      }
    } catch (error) {
      console.error(error)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'APROVADA':
        return <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold"><CheckCircle2 size={14} /> Aprovada</span>
      case 'REJEITADA':
        return <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-100 text-rose-700 text-xs font-bold"><XCircle size={14} /> Rejeitada</span>
      default:
        return <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 text-amber-700 text-xs font-bold"><Clock size={14} /> Pendente</span>
    }
  }

  const getDificuldadeColor = (nivel: string) => {
    switch (nivel) {
      case 'FACIL': return 'text-green-500'
      case 'MEDIO': return 'text-amber-500'
      case 'DIFICIL': return 'text-rose-500'
      default: return 'text-gray-500'
    }
  }

  
  const itemsPerPage = 20;
  const totalPages = Math.ceil(questoes.length / itemsPerPage);
  const paginatedQuestoes = questoes.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const stripHtml = (html: string) => {
    if (!html) return '';
    return html.replace(/<[^>]*>?/gm, '').replace(/&nbsp;/g, ' ').trim();
  };

  return (
    <div className="min-h-screen bg-slate-50/50 pb-20">
      <TeacherTipsModal 
        storageKey="seen_tips_questoes"
        title="Dicas do Banco"
        tips={questaoTips}
      />

      <div className="max-w-[1600px] mx-auto px-4 md:px-8 py-8">
        
        
        
        {/* Header with Inline Metrics */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-6">
            <h1 className="text-3xl font-bold text-gray-900">Banco de Questões</h1>
            <div className="hidden lg:flex items-center gap-4 bg-white px-4 py-2 rounded-lg border border-gray-200 shadow-sm">
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500 font-semibold uppercase">Total:</span>
                <span className="text-sm font-bold text-gray-900">{metrics?.totalAprovadas || 0}</span>
              </div>
              <div className="w-px h-4 bg-gray-200"></div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-emerald-600 font-semibold uppercase">{isAdmin ? "Aprovadas:" : "Minhas:"}</span>
                <span className="text-sm font-bold text-emerald-700">{isAdmin ? (metrics?.totalAprovadas || 0) : (metrics?.minhasQuestoes || 0)}</span>
              </div>
              <div className="w-px h-4 bg-gray-200"></div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-amber-600 font-semibold uppercase">Pendentes:</span>
                <span className="text-sm font-bold text-amber-700">{metrics?.totalPendentes || 0}</span>
              </div>
            </div>
          </div>

          <button
            onClick={() => { setEditingQuestao(null); setShowForm(true); }}
            className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg font-semibold transition-all active:scale-95"
          >
            <Plus size={18} />
            Nova Questão
          </button>
        </div>

        {/* Filters Area */}
        <div className="bg-white p-5 md:p-6 rounded-2xl border border-gray-200/60 shadow-sm mb-10">
          <div className="flex items-center gap-2 mb-5">
            <Filter className="w-5 h-5 text-gray-400" />
            <h2 className="text-base font-bold text-gray-800">Filtros e Ações</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-x-6 gap-y-5">
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-1.5">Pesquisar</label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Pesquisar questões..."
                  className="w-full pl-3 pr-9 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all outline-none"
                  value={filters.search}
                  onChange={(e) => setFilters({...filters, search: e.target.value})}
                />
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-1.5">Área de Conhecimento</label>
              <div className="relative">
                <select 
                  value={filters.areaId}
                  onChange={(e) => setFilters({...filters, areaId: e.target.value})}
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all outline-none appearance-none"
                >
                  <option value="">Todas as Áreas</option>
                  {areas.map((a: any) => (
                    <option key={a.id} value={a.id}>{a.nome}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-1.5">Disciplina</label>
              <div className="relative">
                <select 
                  value={filters.disciplinaId}
                  onChange={(e) => setFilters({...filters, disciplinaId: e.target.value})}
                  disabled={disciplinas.filter((d: any) => !filters.turmaId || d.turmaId === filters.turmaId).length === 0}
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all outline-none appearance-none disabled:opacity-50"
                >
                  <option value="">Todas as Disciplinas</option>
                  {disciplinas
                    .filter((d: any) => !filters.turmaId || d.turmaId === filters.turmaId)
                    .map((d: any) => (
                      <option key={d.id} value={d.id}>
                        {filters.turmaId ? d.nome : (d.label || d.nome)}
                      </option>
                    ))
                  }
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-1.5">Turma</label>
              <div className="relative">
                <select 
                  value={filters.turmaId}
                  onChange={(e) => setFilters({...filters, turmaId: e.target.value, disciplinaId: ''})}
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all outline-none appearance-none"
                >
                  <option value="">Todas as Turmas</option>
                  {turmas.map((t: any) => <option key={t.id} value={t.id}>{t.nome}</option>)}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-1.5">Status</label>
              <div className="relative">
                <select 
                  value={filters.status}
                  onChange={(e) => setFilters({...filters, status: e.target.value})}
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all outline-none appearance-none"
                >
                  <option value="">Todos os Status</option>
                  <option value="PENDENTE">Pendente</option>
                  <option value="APROVADA">Aprovada</option>
                  <option value="REJEITADA">Rejeitada</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
              </div>
            </div>
            
            {/* Secondary Row for extra filters */}
            {isAdmin && (
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-1.5">Professor</label>
                <div className="relative">
                  <select
                    value={filters.professorId}
                    onChange={(e) => setFilters({...filters, professorId: e.target.value})}
                    className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all outline-none appearance-none"
                  >
                    <option value="">Todos os Professores</option>
                    {professores.map((p: any) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.questoesCount} {p.questoesCount === 1 ? 'enviada' : 'enviadas'})
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-1.5">Unidade</label>
              <div className="relative">
                <select 
                  value={filters.unidade || ''}
                  onChange={(e) => setFilters({...filters, unidade: e.target.value})}
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all outline-none appearance-none"
                >
                  <option value="">Todas as Unidades</option>
                  <option value="1">1ª Unidade</option>
                  <option value="2">2ª Unidade</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-1.5">Tipo</label>
              <div className="relative">
                <select 
                  value={filters.tipo || ''}
                  onChange={(e) => setFilters({...filters, tipo: e.target.value})}
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all outline-none appearance-none"
                >
                  <option value="">Todos os Tipos</option>
                  <option value="NORMAL">Normal</option>
                  <option value="RECUPERACAO">Segunda Chamada</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
              </div>
            </div>

            <div className="flex flex-col justify-end gap-2 mt-auto">
              {(filters.search || filters.turmaId || filters.disciplinaId || filters.areaId || filters.status || filters.unidade || filters.tipo || filters.professorId) && (
                <button 
                  onClick={() => setFilters({ turmaId: '', disciplinaId: '', areaId: '', status: '', unidade: '', tipo: '', search: '', professorId: '' })}
                  className="w-full px-3 py-2 text-slate-600 bg-slate-100 hover:bg-slate-200 font-bold rounded-lg transition-all text-xs flex items-center justify-center gap-1.5"
                >
                  <X size={14} /> Limpar Filtros
                </button>
              )}
              {isAdmin && (
                <button 
                  onClick={() => {
                    const pendentesIds = questoes.filter((q: any) => q.status === 'PENDENTE').map((q: any) => q.id);
                    if (pendentesIds.length === 0) {
                      alert('Não há questões pendentes para selecionar no momento.');
                      return;
                    }
                    // Adiciona os IDs pendentes aos selecionados (evitando duplicatas)
                    setSelectedIds(Array.from(new Set([...selectedIds, ...pendentesIds])));
                  }}
                  className="w-full px-3 py-2 text-white bg-amber-500 hover:bg-amber-600 shadow-sm shadow-amber-500/20 font-bold rounded-lg transition-all text-xs flex items-center justify-center gap-1.5"
                >
                  <CheckCircle2 size={14} /> Selecionar Pendentes
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Bulk Actions Bar */}
        {selectedIds.length > 0 && isAdmin && (
          <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 bg-gray-900 text-white px-6 py-4 rounded-xl shadow-2xl flex items-center gap-6 animate-in slide-in-from-bottom-10">
            <div className="flex items-center gap-3 pr-6 border-r border-gray-700">
              <div className="bg-blue-600 text-white w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold">
                {selectedIds.length}
              </div>
              <span className="text-sm font-medium">Selecionadas</span>
            </div>
            
            <div className="flex gap-2">
              <button 
                onClick={() => handleBulkStatusUpdate('APROVADA')}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-bold transition-all"
              >
                <CheckCircle2 size={16} /> Aprovar
              </button>
              <button 
                onClick={() => {
                  const fb = prompt('Motivo do veto em massa:')
                  if (fb) handleBulkStatusUpdate('REJEITADA', fb)
                }}
                className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm font-bold transition-all"
              >
                <X size={16} /> Rejeitar
              </button>
              <button 
                onClick={() => setSelectedIds([])}
                className="px-4 py-2 text-gray-400 hover:text-white rounded-lg text-sm font-bold transition-all"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}

        {/* Header Results Info */}
        {!loading && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 mt-8 px-1">
            <h2 className="text-lg font-black text-slate-800 tracking-tight flex items-center gap-4">
              Resultados
              <div className="hidden sm:flex items-center gap-3 ml-2 bg-white px-3 py-1.5 rounded-lg border border-gray-100 shadow-sm">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-blue-400"></div>
                  <span className="text-[10px] font-bold text-gray-500 uppercase">Normal</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-orange-500"></div>
                  <span className="text-[10px] font-bold text-gray-500 uppercase">2ª Chamada</span>
                </div>
              </div>
            </h2>
            <div className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-bold shadow-sm self-start sm:self-auto">
              {questoes.length} {questoes.length === 1 ? 'questão encontrada' : 'questões encontradas'}
            </div>
          </div>
        )}

        {/* Card Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {loading ? (
            <div className="col-span-full py-20 text-center">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-500 font-medium">Carregando...</p>
            </div>
          ) : questoes.length === 0 ? (
            <div className="col-span-full py-20 text-center bg-white rounded-xl border border-dashed border-gray-300">
              <p className="text-gray-500 font-medium">Nenhuma questão encontrada com estes filtros.</p>
            </div>
          ) : (
            paginatedQuestoes.map((q: any) => (
              <div key={q.id} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col hover:shadow-md transition-shadow">
                <div className="p-5 flex flex-col h-full relative">
                  {/* Admin Checkbox */}
                  {isAdmin && (
                    <div className="absolute top-5 left-5 z-10">
                      <input 
                        type="checkbox"
                        checked={selectedIds.includes(q.id)}
                        onChange={(e) => {
                          if (e.target.checked) setSelectedIds([...selectedIds, q.id])
                          else setSelectedIds(selectedIds.filter(id => id !== q.id))
                        }}
                        className="w-4 h-4 rounded-sm border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                      />
                    </div>
                  )}
                  
                  {/* Card Header */}
                  <div className={"flex justify-between items-center mb-4 " + (isAdmin ? "ml-8" : "")}>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-slate-700">#CMRB{q.id.slice(-4).toUpperCase()}</span>
                      <div 
                        className={`w-2 h-2 rounded-full ${q.tipo === 'RECUPERACAO' ? 'bg-orange-500' : 'bg-blue-400'}`} 
                        title={q.tipo === 'RECUPERACAO' ? 'Questão de Segunda Chamada' : 'Questão Normal'}
                      />
                    </div>
                    {q.unidade ? (
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${q.unidade == 1 ? 'bg-indigo-100 text-indigo-700' : 'bg-emerald-100 text-emerald-700'}`}>
                        {q.unidade}ª Unidade
                      </span>
                    ) : (
                      <span className="text-xs font-semibold text-gray-500">Geral</span>
                    )}
                  </div>
                  
                  {/* Question Title */}
                  <div className="mb-6 flex-1">
                    <h3 className="text-base font-bold text-gray-900 line-clamp-3">
                      {stripHtml(q.enunciado) || "Questão sem texto"}
                    </h3>
                  </div>
                  
                  {/* Metadata */}
                  <div className="space-y-1.5 mb-6 text-sm text-gray-600">
                    <p className="truncate"><span className="font-semibold text-gray-900">Disciplina:</span> {q.disciplinas?.map((d: any)=>d.nome).join(', ') || 'Geral'}</p>
                    <p className="truncate"><span className="font-semibold text-gray-900">Turma:</span> {q.turmas?.map((t: any)=>t.nome).join(', ') || 'Nenhuma'}</p>
                    <p className="flex items-center gap-1">
                      <span className="font-semibold text-gray-900">Status:</span> 
                      {q.status === 'APROVADA' && <span className="bg-blue-100 text-blue-700 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase">Aprovada</span>}
                      {q.status === 'PENDENTE' && <span className="bg-amber-100 text-amber-700 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase">Pendente</span>}
                      {q.status === 'REJEITADA' && <span className="bg-gray-100 text-gray-600 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase">Rejeitada</span>}
                    </p>
                    <p className="flex items-center gap-1">
                      <span className="font-semibold text-gray-900">Usos:</span> 
                      {q._count?.provas > 0 ? (
                        <span className="bg-purple-100 text-purple-700 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase">Usada em {q._count.provas} prova{q._count.provas > 1 ? 's' : ''}</span>
                      ) : (
                        <span className="bg-gray-100 text-gray-500 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase">Inédita</span>
                      )}
                    </p>
                    <p className="truncate"><span className="font-semibold text-gray-900">Autor:</span> {q.professor?.name}</p>
                    <p><span className="font-semibold text-gray-900">Criado:</span> {new Date(q.createdAt).toLocaleString('pt-BR', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                  
                  {/* Action Icons */}
                  <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                    {(!isAdmin || q.professorId === user.id) && (
                      <button onClick={() => { setEditingQuestao(q); setShowForm(true); }} className="text-gray-400 hover:text-blue-600 transition-colors" title="Editar">
                        <Edit2 size={16} />
                      </button>
                    )}
                    <button onClick={() => setPreviewQuestao(q)} className="text-gray-400 hover:text-emerald-600 transition-colors" title="Visualizar">
                      <Eye size={16} />
                    </button>
                    {(isAdmin || (q.professorId === user.id && q.status !== 'APROVADA')) && (
                      <button onClick={() => handleDelete(q.id)} className="text-gray-400 hover:text-rose-600 transition-colors" title="Excluir">
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        
        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center mt-8 gap-2">
            <button 
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-semibold text-gray-700 disabled:opacity-50 hover:bg-gray-50 transition-colors"
            >
              Anterior
            </button>
            <span className="flex items-center px-4 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg">
              {currentPage} de {totalPages}
            </span>
            <button 
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-semibold text-gray-700 disabled:opacity-50 hover:bg-gray-50 transition-colors"
            >
              Próxima
            </button>
          </div>
        )}

        {/* Modals */}

        {showForm && (
          <QuestaoForm 
            questao={editingQuestao}
            onClose={() => setShowForm(false)}
            onSuccess={() => { 
              setShowForm(false); 
              fetchQuestoes(); 
              router.refresh();
            }}
            turmas={turmas}
            disciplinas={disciplinas}
          />
        )}

        <QuestaoPreviewModal
          questao={previewQuestao}
          onClose={() => setPreviewQuestao(null)}
          nomeEscola={nomeEscola}
        />
      </div>
    </div>
  )
}
