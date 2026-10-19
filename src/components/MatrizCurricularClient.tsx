"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import CursoModal, { CursoParaEditar } from "./CursoModal"
import { 
  Plus, 
  Trash2, 
  BookOpen, 
  GraduationCap, 
  Layers,
  Search,
  Loader2,
  AlertCircle,
  ArrowLeft,
  Filter,
  Users,
  Pencil,
  ChevronDown,
  Calendar,
  Clock,
  Check,
  X
} from "lucide-react"

interface Curso {
  id: string
  nome: string
  modalidade: string
  nivelEnsino?: string | null
  esquemaAvaliacaoId?: string | null
  sigla: string
  turnos: string[]
}

interface Area {
  id: string
  nome: string
}

interface MatrizItem {
  id: string
  nome: string
  cursoId: string
  serie: string
  areaId: string | null
  area?: { nome: string } | null
}

export default function MatrizCurricularClient({ 
  cursos, 
  areas 
}: { 
  cursos: Curso[], 
  areas: Area[] 
}) {
  const router = useRouter()
  const [selectedCurso, setSelectedCurso] = useState("")
  const [selectedModalidade, setSelectedModalidade] = useState("")
  const [selectedSerie, setSelectedSerie] = useState("1")
  const [selectedAno, setSelectedAno] = useState(new Date().getFullYear().toString())
  const [items, setItems] = useState<MatrizItem[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [isModalCursoOpen, setIsModalCursoOpen] = useState(false)
  const [cursoParaEditar, setCursoParaEditar] = useState<CursoParaEditar | null>(null)
  const [cursosLocais, setCursosLocais] = useState<Curso[]>(cursos)
  const [showCursoDropdown, setShowCursoDropdown] = useState(false)
  const [selectedTurno, setSelectedTurno] = useState("")
  const [deletingCursoId, setDeletingCursoId] = useState<string | null>(null)
  
  const [selectedAreaFiltro, setSelectedAreaFiltro] = useState("")
  // Seleção múltipla para exclusão em lote
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  // Feedback de propagação
  const [propagacaoMsg, setPropagacaoMsg] = useState<string | null>(null)

  // Edição em linha
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editNome, setEditNome] = useState("")
  const [editArea, setEditArea] = useState("")

  // Novo item
  const [novoNome, setNovoNome] = useState("")
  const [novaArea, setNovaArea] = useState("")
  const [searchTerm, setSearchTerm] = useState("")

  useEffect(() => {
    // Se tem termo de busca, busca globalmente (ignorando curso/série)
    // Se não tem, busca conforme os filtros selecionados
    if (searchTerm || (selectedCurso && selectedSerie)) {
      const timeoutId = setTimeout(() => {
        loadMatriz()
      }, searchTerm ? 400 : 0) // Debounce para busca
      return () => clearTimeout(timeoutId)
    } else {
      setItems([]) // Limpa a lista se não houver busca nem curso selecionado
    }
  }, [selectedCurso, selectedSerie, selectedAno, searchTerm])

  const loadMatriz = async () => {
    setLoading(true)
    try {
      let url = `/api/matriz?anoLetivo=${selectedAno}`
      
      if (searchTerm) {
        url += `&q=${encodeURIComponent(searchTerm)}`
      } else {
        url += `&cursoId=${selectedCurso}&serie=${selectedSerie}`
      }

      const res = await fetch(url)
      if (res.ok) {
        const data = await res.json()
        setItems(Array.isArray(data) ? data : [])
      } else {
        setItems([])
      }
    } catch (err) {
      console.error(err)
      setItems([])
    } finally {
      setLoading(false)
    }
  }

  // Limpa seleção ao trocar filtros
  useEffect(() => { setSelectedIds(new Set()) }, [selectedCurso, selectedSerie, selectedAno, selectedAreaFiltro])

  const handleAdd = async (e: React.FormEvent) => {

    e.preventDefault()
    if (!novoNome || !selectedCurso || !selectedSerie) return

    setSaving(true)
    try {
      const nomes = novoNome
        .split(/[\n,]/)
        .map(n => n.trim())
        .filter(n => n.length > 0)

      if (nomes.length === 0) return

      const respostas = await Promise.all(nomes.map(nome =>
        fetch('/api/matriz', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            nome,
            cursoId: selectedCurso,
            serie: selectedSerie,
            areaId: novaArea || null,
            anoLetivo: selectedAno
          })
        }).then(r => r.json())
      ))

      // Calcular total de turmas afetadas
      const totalPropagadas = respostas.reduce((acc: number, r: any) => acc + (r.propagadas ?? 0), 0)
      if (totalPropagadas > 0) {
        setPropagacaoMsg(
          `✅ ${nomes.length} disciplina(s) adicionada(s) à matriz e propagada(s) para ${totalPropagadas} turma(s) existente(s)!`
        )
        setTimeout(() => setPropagacaoMsg(null), 5000)
      }

      setNovoNome("")
      setNovaArea("")
      loadMatriz()
    } catch (err) {
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  const handleUpdate = async (id: string) => {
    if (!editNome) return
    setSaving(true)
    try {
      const res = await fetch('/api/matriz', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, nome: editNome, areaId: editArea || null })
      })
      const data = await res.json()
      if (res.ok) {
        if (data.propagadas > 0) {
          setPropagacaoMsg(`✅ Sincronizado: ${data.nome} atualizada em ${data.propagadas} turmas!`)
          setTimeout(() => setPropagacaoMsg(null), 5000)
        }
        setEditingId(null)
        loadMatriz()
      } else {
        alert(data.message || "Erro ao atualizar")
      }
    } catch (err) {
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Remover esta disciplina da matriz padrão?")) return
    try {
      await fetch(`/api/matriz?id=${id}`, { method: 'DELETE' })
      setSelectedIds(prev => { const s = new Set(prev); s.delete(id); return s })
      loadMatriz()
    } catch (err) {
      console.error(err)
    }
  }

  const handleDeleteBulk = async () => {
    if (selectedIds.size === 0) return
    if (!confirm(`Remover ${selectedIds.size} disciplina(s) da matriz padrão? Esta ação não pode ser desfeita.`)) return
    setSaving(true)
    try {
      await Promise.all(
        Array.from(selectedIds).map(id =>
          fetch(`/api/matriz?id=${id}`, { method: 'DELETE' })
        )
      )
      setSelectedIds(new Set())
      loadMatriz()
    } catch (err) {
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  const cursosFiltrados = cursosLocais
    .filter(c => !selectedModalidade || c.modalidade === selectedModalidade)
    .filter(c => !selectedTurno || c.turnos?.includes(selectedTurno))

  const handleDeleteCurso = async (id: string, nome: string) => {
    if (!confirm(`Excluir o curso "${nome}"? Esta ação não pode ser desfeita.`)) return
    setDeletingCursoId(id)
    try {
      const res = await fetch(`/api/cursos/${id}`, { method: 'DELETE' })
      if (res.ok) {
        setCursosLocais(prev => prev.filter(c => c.id !== id))
        if (selectedCurso === id) setSelectedCurso('')
      } else {
        const data = await res.json()
        alert(data.message || 'Erro ao excluir curso')
      }
    } catch {
      alert('Erro ao conectar com o servidor')
    } finally {
      setDeletingCursoId(null)
    }
  }

  const itemsFiltradosNaLista = items.filter(i => {
    const matchesArea = !selectedAreaFiltro || i.areaId === selectedAreaFiltro
    const matchesSearch = !searchTerm || 
      i.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (i.area?.nome && i.area.nome.toLowerCase().includes(searchTerm.toLowerCase()))
    
    return matchesArea && matchesSearch
  })

  return (
    <div className="min-h-screen bg-[#fcfcfd]">
      {/* Header Premium Estilo Resultados - Ajustado para ser Flush com o Layout */}
      <header className="bg-white/80 backdrop-blur-xl border-b border-zinc-200 sticky top-0 z-50 -mx-4 -mt-4 md:-mx-8 md:-mt-8 mb-4 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto py-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="flex items-center space-x-5">
              <Link
                href="/dashboard"
                className="p-2 hover:bg-zinc-100 rounded-lg transition-colors text-fg-subtle hover:text-fg-muted"
              >
                <ArrowLeft size={20} />
              </Link>
              <div>
                <h1 className="text-2xl font-semibold text-fg tracking-tight">Matriz Curricular</h1>
                <p className="text-base text-fg-muted font-medium">Definição de disciplinas padrão por curso e série</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-32 space-y-8">
        
        {/* Filtros Premium */}
        <div className="bg-white p-5 rounded-xl shadow-card border border-zinc-100 flex flex-wrap gap-4 items-end relative overflow-visible">
            <div className="absolute top-0 right-0 w-32 h-32 bg-accent-subtle rounded-full -mr-16 -mt-16 opacity-40 blur-3xl pointer-events-none" />

            {/* Modalidade */}
            <div className="flex-1 min-w-[130px] max-w-[180px] space-y-1.5">
                <label className="text-xs font-semibold text-fg-subtle ml-1">Modalidade</label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-subtle">
                      <Layers size={15} />
                  </div>
                  <select
                      value={selectedModalidade}
                      onChange={(e) => { setSelectedModalidade(e.target.value); setSelectedCurso("") }}
                      className="w-full bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 rounded-xl pl-9 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-all appearance-none cursor-pointer font-semibold text-fg-muted"
                  >
                      <option value="">Todas</option>
                      <option value="EPTM">EPTM</option>
                      <option value="PROEJA">PROEJA</option>
                      <option value="SUBSEQUENTE">Subsequente</option>
                  </select>
                </div>
            </div>

            {/* Turno */}
            <div className="flex-1 min-w-[130px] max-w-[170px] space-y-1.5">
                <label className="text-xs font-semibold text-fg-subtle ml-1">Turno</label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-subtle">
                      <Clock size={15} />
                  </div>
                  <select
                      value={selectedTurno}
                      onChange={(e) => { setSelectedTurno(e.target.value); setSelectedCurso("") }}
                      className="w-full bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 rounded-xl pl-9 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-all appearance-none cursor-pointer font-semibold text-fg-muted"
                  >
                      <option value="">Todos</option>
                      <option value="Matutino">Matutino</option>
                      <option value="Vespertino">Vespertino</option>
                      <option value="Noturno">Noturno</option>
                  </select>
                </div>
            </div>

            {/* Curso — Dropdown customizado */}
            <div className="flex-[2] min-w-[220px] space-y-1.5">
                <div className="flex items-center justify-between ml-1">
                  <label className="text-xs font-semibold text-fg-subtle">Curso</label>
                  <button
                    onClick={() => { setCursoParaEditar(null); setIsModalCursoOpen(true) }}
                    className="text-xs font-bold text-accent-fg hover:text-accent-fg transition-colors flex items-center gap-1 bg-accent-subtle hover:bg-accent-subtle px-2 py-0.5 rounded-md"
                  >
                    <Plus size={9} strokeWidth={3} />
                    Novo
                  </button>
                </div>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowCursoDropdown(prev => !prev)}
                    className="w-full bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 rounded-xl pl-9 pr-8 py-3 text-sm text-left focus:outline-none focus:ring-2 focus:ring-ring transition-all cursor-pointer font-semibold text-fg-muted flex items-center gap-2"
                  >
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-subtle">
                      <GraduationCap size={15} />
                    </div>
                    <span className={`truncate ${selectedCurso ? 'text-fg' : 'text-fg-subtle font-normal'}`}>
                      {selectedCurso
                        ? (() => {
                            const c = cursosLocais.find(curr => curr.id === selectedCurso);
                            return c ? `${c.nome} (${c.modalidade})` : 'Selecione...';
                          })()
                        : 'Selecione o Curso...'}
                    </span>
                    <ChevronDown size={14} className={`ml-auto shrink-0 text-fg-subtle transition-transform ${showCursoDropdown ? 'rotate-180' : ''}`} />
                  </button>

                  {showCursoDropdown && (
                    <div className="absolute z-40 top-full mt-1.5 w-full min-w-[260px] bg-white border border-zinc-100 rounded-lg shadow-overlay overflow-hidden">
                      <div className="max-h-60 overflow-y-auto">
                        <button
                          type="button"
                          onClick={() => { setSelectedCurso(''); setShowCursoDropdown(false) }}
                          className="w-full text-left px-4 py-2.5 text-sm text-fg-subtle font-medium hover:bg-zinc-50 transition-colors border-b border-zinc-50"
                        >
                          Todos os cursos
                        </button>
                        {cursosFiltrados.length === 0 && (
                          <p className="px-4 py-4 text-xs text-fg-subtle text-center">Nenhum curso encontrado</p>
                        )}
                        {cursosFiltrados.map((c) => (
                          <div key={c.id} className={`flex items-center group transition-colors ${selectedCurso === c.id ? 'bg-accent-subtle' : 'hover:bg-zinc-50'}`}>
                            <button
                              type="button"
                              onClick={() => { setSelectedCurso(c.id); setShowCursoDropdown(false) }}
                              className="flex-1 text-left px-4 py-2.5 min-w-0"
                            >
                              <span className={`block text-sm font-semibold truncate ${selectedCurso === c.id ? 'text-accent-fg' : 'text-fg-muted'}`}>{c.nome}</span>
                              <span className="text-xs font-bold text-fg-subtle uppercase">{c.modalidade} · {c.turnos?.join(', ') || '—'}</span>
                            </button>
                            {/* Ações: editar e excluir */}
                            <div className="flex items-center gap-1 pr-2 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                              <button
                                type="button"
                                title="Editar"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setShowCursoDropdown(false)
                                  setCursoParaEditar({ id: c.id, nome: c.nome, sigla: c.sigla ?? '', modalidade: c.modalidade, nivelEnsino: c.nivelEnsino, esquemaAvaliacaoId: c.esquemaAvaliacaoId, turnos: c.turnos ?? [] })
                                  setIsModalCursoOpen(true)
                                }}
                                className="p-1.5 text-zinc-300 hover:text-warning-fg hover:bg-warning-subtle rounded-lg transition-all"
                              >
                                <Pencil size={13} />
                              </button>
                              <button
                                type="button"
                                title="Excluir"
                                disabled={deletingCursoId === c.id}
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleDeleteCurso(c.id, c.nome)
                                }}
                                className="p-1.5 text-zinc-300 hover:text-danger-fg hover:bg-danger-subtle rounded-lg transition-all disabled:opacity-50"
                              >
                                {deletingCursoId === c.id
                                  ? <Loader2 size={13} className="animate-spin" />
                                  : <Trash2 size={13} />}
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
            </div>

            {/* Série / Ciclo */}
            <div className="flex-1 min-w-[160px] max-w-[210px] space-y-1.5">
                <label className="text-xs font-semibold text-fg-subtle ml-1">Série / Ciclo</label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-subtle">
                    <Filter size={15} />
                  </div>
                  <select
                      value={selectedSerie}
                      onChange={(e) => setSelectedSerie(e.target.value)}
                      className="w-full bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 rounded-xl pl-9 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-all appearance-none cursor-pointer font-semibold text-fg-muted"
                  >
                      <option value="1">1ª Série</option>
                      <option value="2">2ª Série</option>
                      <option value="3">3ª Série</option>
                      <option value="4">4º Semestre</option>
                      <option value="5">5º Semestre</option>
                  </select>
                </div>
            </div>

            {/* Ano Letivo — compacto */}
            <div className="w-[110px] shrink-0 space-y-1.5">
                <label className="text-xs font-semibold text-fg-subtle ml-1">Ano</label>
                <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-subtle">
                        <Calendar size={14} />
                    </div>
                    <select
                        value={selectedAno}
                        onChange={(e) => setSelectedAno(e.target.value)}
                        className="w-full bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 rounded-xl pl-8 pr-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-all appearance-none cursor-pointer font-bold text-fg-muted"
                    >
                        {[2024, 2025, 2026, 2027].map(ano => (
                          <option key={ano} value={ano}>{ano}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Badge de disciplinas */}
            <div className="shrink-0 pb-0.5">
                <div className="flex items-center gap-1.5 bg-accent text-on-accent px-3 py-2.5 rounded-xl shadow-card">
                    <span className="w-1.5 h-1.5 rounded-full bg-white/70 animate-pulse" />
                    <span className="text-xs font-semibold whitespace-nowrap">{itemsFiltradosNaLista.length} disciplinas</span>
                </div>
            </div>
        </div>

        {/* Formulário de Lançamento em Lote */}
        {selectedCurso && (
          <div className="bg-white p-6 rounded-lg shadow-sm border border-zinc-200">
            <h2 className="text-base font-semibold text-fg mb-4 flex items-center gap-2">
               <Plus size={20} className="text-accent-fg" />
               Adicionar Disciplinas à Matriz
            </h2>
            <form onSubmit={handleAdd} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
              <div className="md:col-span-5 space-y-1.5">
                <label className="text-xs font-semibold text-fg-subtle ml-1">Nomes (Separe por linha ou vírgula)</label>
                <textarea
                  placeholder="Português&#10;Matemática&#10;História"
                  value={novoNome}
                  onChange={(e) => setNovoNome(e.target.value)}
                  rows={1}
                  className="w-full bg-zinc-50 border-none rounded-xl px-4 py-4 text-base font-semibold text-fg focus:ring-2 focus:ring-ring transition-all outline-none resize-none min-h-[60px] custom-scrollbar"
                />
              </div>
              <div className="md:col-span-4 space-y-1.5">
                <label className="text-xs font-semibold text-fg-subtle ml-1">Área do Simulado</label>
                <select
                  value={novaArea}
                  onChange={(e) => setNovaArea(e.target.value)}
                  className="w-full bg-zinc-50 border-none rounded-xl px-4 py-4 text-base font-semibold text-fg-muted focus:ring-2 focus:ring-ring transition-all outline-none h-[60px] appearance-none cursor-pointer"
                >
                  <option value="">Sem Área Vinculada</option>
                  {areas.map(a => <option key={a.id} value={a.id}>{a.nome}</option>)}
                </select>
              </div>
              <div className="md:col-span-3 pt-5.5">
                <button
                  type="submit"
                  disabled={saving || !novoNome}
                  className="w-full bg-zinc-900 border border-zinc-900 text-white font-semibold h-[60px] rounded-xl shadow-card transition-all flex items-center justify-center gap-2 disabled:opacity-50 active:scale-95 text-sm"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  Lançar na Matriz
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Listagem da Matriz */}
        <div className="bg-white rounded-lg shadow-sm border border-zinc-200 overflow-hidden">
          <div className="p-4 border-b border-zinc-100 bg-zinc-50/50 flex flex-col sm:flex-row items-center justify-between gap-4">
            <h2 className="text-lg font-semibold text-fg-muted flex items-center gap-2">
               <BookOpen size={20} className="text-fg-subtle" />
               Componentes Curriculares Definidos
            </h2>
            <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
              <div className="relative w-full sm:w-64">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-subtle">
                  <Search size={14} />
                </div>
                <input
                  type="text"
                  placeholder="Buscar disciplina..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-white border border-zinc-200 rounded-xl pl-9 pr-4 py-2.5 text-xs font-semibold text-fg-muted focus:ring-2 focus:ring-ring transition-all outline-none"
                />
              </div>
              {selectedCurso && items.length > 0 && (
                <div className="relative w-full sm:w-auto min-w-[200px]">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 flex items-center justify-center text-fg-subtle">
                      <Filter size={14} />
                  </div>
                  <select 
                    value={selectedAreaFiltro}
                    onChange={(e) => setSelectedAreaFiltro(e.target.value)}
                    className="w-full bg-white border border-zinc-200 rounded-xl pl-9 pr-8 py-2.5 text-xs font-semibold text-fg-muted focus:ring-2 focus:ring-ring transition-all appearance-none cursor-pointer outline-none"
                  >
                    <option value="">Todas as Áreas...</option>
                    {areas.map(a => <option key={a.id} value={a.id}>{a.nome}</option>)}
                  </select>
                </div>
              )}
            </div>
          </div>

          <div className="overflow-x-auto">
            {!selectedCurso && !searchTerm ? (
              <div className="p-20 text-center space-y-4">
                <Search className="w-12 h-12 text-zinc-200 mx-auto" />
                <p className="text-sm font-semibold text-fg-subtle">Selecione um curso para ver a matriz</p>
              </div>
            ) : loading ? (
              <div className="p-20 text-center flex flex-col items-center gap-3">
                <Loader2 className="w-8 h-8 text-accent-fg animate-spin" />
                <p className="text-sm font-semibold text-fg-subtle">Sincronizando dados...</p>
              </div>
            ) : items.length === 0 ? (
              <div className="p-20 text-center space-y-3">
                 <AlertCircle className="w-10 h-10 text-zinc-200 mx-auto" />
                 <p className="text-sm font-semibold text-fg-subtle">Matriz vazia para esta configuração</p>
              </div>
            ) : (
              <table className="w-full text-left">
                <thead className="bg-zinc-50/30 border-b border-zinc-100">
                  <tr>
                    {/* Checkbox selecionar todos */}
                    <th className="pl-6 pr-2 py-4 w-10">
                      <input
                        type="checkbox"
                        checked={itemsFiltradosNaLista.length > 0 && selectedIds.size === itemsFiltradosNaLista.length}
                        ref={el => { if (el) el.indeterminate = selectedIds.size > 0 && selectedIds.size < itemsFiltradosNaLista.length }}
                        onChange={e => {
                          if (e.target.checked) {
                            setSelectedIds(new Set(itemsFiltradosNaLista.map(i => i.id)))
                          } else {
                            setSelectedIds(new Set())
                          }
                        }}
                        className="w-4 h-4 rounded cursor-pointer accent-[var(--accent)]"
                      />
                    </th>
                    <th className="px-4 py-4 text-xs font-semibold text-fg-subtle">Disciplina</th>
                    {searchTerm && (
                      <th className="px-4 py-4 text-xs font-semibold text-fg-subtle">Curso / Série</th>
                    )}
                    <th className="px-6 py-4 text-xs font-semibold text-fg-subtle">Área Vinculada</th>
                    <th className="px-6 py-4 text-xs font-semibold text-fg-subtle text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100/80">
                  {itemsFiltradosNaLista.map((item) => (
                    <tr
                      key={item.id}
                      className={`transition-colors group cursor-pointer ${
                        selectedIds.has(item.id)
                          ? 'bg-accent-subtle'
                          : 'hover:bg-zinc-50/50'
                      }`}
                      onClick={() => {
                        setSelectedIds(prev => {
                          const s = new Set(prev)
                          s.has(item.id) ? s.delete(item.id) : s.add(item.id)
                          return s
                        })
                      }}
                    >
                      {/* Checkbox */}
                      <td className="pl-6 pr-2 py-4 w-10" onClick={e => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selectedIds.has(item.id)}
                          onChange={() => {
                            setSelectedIds(prev => {
                              const s = new Set(prev)
                              s.has(item.id) ? s.delete(item.id) : s.add(item.id)
                              return s
                            })
                          }}
                          className="w-4 h-4 rounded cursor-pointer accent-[var(--accent)]"
                        />
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                            selectedIds.has(item.id)
                              ? 'bg-accent-subtle text-accent-fg'
                              : 'bg-zinc-100 text-fg-subtle group-hover:bg-accent-subtle group-hover:text-accent-fg'
                          }`}>
                            <BookOpen size={16} />
                          </div>
                          {editingId === item.id ? (
                            <input
                              type="text"
                              value={editNome}
                              onChange={(e) => setEditNome(e.target.value)}
                              className="bg-white border border-accent rounded-lg px-2 py-1 text-sm font-semibold text-fg-muted outline-none w-full"
                              autoFocus
                              onClick={(e) => e.stopPropagation()}
                            />
                          ) : (
                            <span className="text-base font-semibold text-fg-muted uppercase">{item.nome}</span>
                          )}
                        </div>
                      </td>
                      {searchTerm && (
                        <td className="px-4 py-4">
                          <div className="flex flex-col">
                            {(() => {
                              const c = cursos.find(curr => curr.id === item.cursoId);
                              return (
                                <>
                                  <span className="text-sm font-bold text-fg-muted">{c?.nome || '—'}</span>
                                  <span className="text-xs font-semibold text-fg-subtle">
                                    {item.serie}ª Série • {c?.modalidade || '—'}
                                  </span>
                                </>
                              )
                            })()}
                          </div>
                        </td>
                      )}
                      <td className="px-6 py-4" onClick={e => e.stopPropagation()}>
                        {editingId === item.id ? (
                          <select
                            value={editArea}
                            onChange={(e) => setEditArea(e.target.value)}
                            className="bg-white border border-accent/25 rounded-lg px-2 py-1 text-xs font-semibold text-fg-muted outline-none w-full"
                          >
                            <option value="">Sem Área...</option>
                            {areas.map(a => <option key={a.id} value={a.id}>{a.nome}</option>)}
                          </select>
                        ) : item.area ? (
                          <span className="inline-flex items-center px-3 py-1.5 rounded-lg bg-accent-subtle text-accent-fg text-xs font-semibold border border-accent/25">
                            {item.area.nome}
                          </span>
                        ) : (
                          <span className="text-zinc-300 text-xs font-medium italic">Não vinculada</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          {editingId === item.id ? (
                            <>
                              <button
                                onClick={() => handleUpdate(item.id)}
                                disabled={saving}
                                className="p-2 text-success-fg hover:bg-success-subtle rounded-xl transition-all"
                              >
                                {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                              </button>
                              <button
                                onClick={() => setEditingId(null)}
                                className="p-2 text-fg-subtle hover:bg-zinc-50 rounded-xl transition-all"
                              >
                                <X size={16} />
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => {
                                  setEditingId(item.id)
                                  setEditNome(item.nome)
                                  setEditArea(item.areaId || "")
                                }}
                                className="p-2 text-zinc-300 hover:text-accent-fg hover:bg-accent-subtle rounded-xl transition-all opacity-0 group-hover:opacity-100"
                              >
                                <Pencil size={16} />
                              </button>
                              <button
                                onClick={() => handleDelete(item.id)}
                                className="p-2 text-zinc-300 hover:text-danger-fg hover:bg-danger-subtle rounded-xl transition-all"
                              >
                                <Trash2 size={16} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
            }
          </div>
        </div>
      </main>

      {/* Barra flutuante de ação em lote */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-slide-up">
          <div className="flex items-center gap-4 bg-zinc-900 text-white px-5 py-3.5 rounded-lg shadow-card border border-white/10">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-danger flex items-center justify-center text-xs font-semibold">
                {selectedIds.size}
              </div>
              <span className="text-sm font-semibold">
                {selectedIds.size === 1 ? 'disciplina selecionada' : 'disciplinas selecionadas'}
              </span>
            </div>
            <div className="w-px h-5 bg-white/20" />
            <button
              onClick={() => setSelectedIds(new Set())}
              className="text-xs font-semibold text-white/50 hover:text-white transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleDeleteBulk}
              disabled={saving}
              className="flex items-center gap-2 bg-danger hover:bg-danger text-white text-xs font-bold px-4 py-2 rounded-xl transition-all disabled:opacity-50 active:scale-95"
            >
              {saving
                ? <Loader2 size={14} className="animate-spin" />
                : <Trash2 size={14} />}
              Excluir {selectedIds.size > 1 ? `${selectedIds.size} disciplinas` : 'disciplina'}
            </button>
          </div>
        </div>
      )}

      {/* Toast de propagação para turmas */}
      {propagacaoMsg && (
        <div className="fixed bottom-6 right-6 z-50 animate-slide-up">
          <div className="flex items-center gap-3 bg-success text-white px-5 py-3.5 rounded-lg shadow-card border border-success max-w-sm">
            <div className="w-8 h-8 bg-white/20 rounded-xl flex items-center justify-center shrink-0">
              <BookOpen size={16} />
            </div>
            <p className="text-sm font-semibold leading-tight">{propagacaoMsg}</p>
            <button
              onClick={() => setPropagacaoMsg(null)}
              className="ml-auto shrink-0 text-white/60 hover:text-white transition-colors"
            >
              <span className="text-lg leading-none">×</span>
            </button>
          </div>
        </div>
      )}

      {/* Curso Modal (criação e edição) */}
      <CursoModal 
        isOpen={isModalCursoOpen}
        onClose={() => { setIsModalCursoOpen(false); setCursoParaEditar(null) }}
        cursoParaEditar={cursoParaEditar}
        onSuccess={(cursosCriados: any[]) => {
          setIsModalCursoOpen(false)
          setCursoParaEditar(null)
          // Atualiza localmente a lista sem precisar de refresh completo
          if (cursosCriados.length > 0) {
            setCursosLocais(prev => {
              const novos = cursosCriados.filter(nc => !prev.find(p => p.id === nc.id))
              const atualizados = prev.map(p => {
                const atualizado = cursosCriados.find(nc => nc.id === p.id)
                return atualizado ? { ...p, ...atualizado } : p
              })
              return [...atualizados, ...novos]
            })
          }
          router.refresh()
        }}
      />
    </div>
  )
}
