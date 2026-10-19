"use client"

import { useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { 
  ArrowLeft, Save, BookOpen, Search, CheckCircle2, 
  Loader2, Info, ChevronDown, ChevronUp, Filter,
  School, GraduationCap, X, ClipboardPaste, AlertCircle
} from "lucide-react"

export default function VincularDisciplinasClient({ usuario, todasDisciplinas }: { usuario: any, todasDisciplinas: any[] }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState("")
  const [selectedIds, setSelectedIds] = useState<string[]>(
    usuario.disciplinasPermitidas.map((d: any) => d.id)
  )
  const [expandedTurmas, setExpandedTurmas] = useState<Record<string, boolean>>(() => {
    // Auto-expandir turmas que já possuem vínculos ativos
    const initial: Record<string, boolean> = {}
    todasDisciplinas.forEach(d => {
      if (usuario.disciplinasPermitidas.some((up: any) => up.id === d.id)) {
        initial[d.turma.id] = true
      }
    })
    return initial
  })
  const [showOnlySelected, setShowOnlySelected] = useState(false)

  // Organizar e filtrar disciplinas
  const disciplinasPorTurma = useMemo(() => {
    const grouped = todasDisciplinas.reduce((acc: any, disc: any) => {
      const turmaLabel = disc.turma.modalidade 
        ? `${disc.turma.nome} (${disc.turma.modalidade})`
        : disc.turma.nome
      
      const turmaKey = disc.turma.id

      // Filtro por nome da turma ou da disciplina
      const matchesSearch = 
        turmaLabel.toLowerCase().includes(search.toLowerCase()) || 
        disc.nome.toLowerCase().includes(search.toLowerCase())
      
      const isSelected = selectedIds.includes(disc.id)
      const matchesFilter = showOnlySelected ? isSelected : true

      if (!matchesSearch || !matchesFilter) return acc

      if (!acc[turmaKey]) {
        acc[turmaKey] = {
          label: turmaLabel,
          disciplinas: []
        }
      }
      acc[turmaKey].disciplinas.push(disc)
      return acc
    }, {})
    return grouped
  }, [todasDisciplinas, search])

  const disciplinasSelecionadasList = useMemo(() => {
    return todasDisciplinas
      .filter((d: any) => selectedIds.includes(d.id))
      .map((d: any) => ({
        id: d.id,
        nome: d.nome,
        turma: d.turma.modalidade ? `${d.turma.nome} (${d.turma.modalidade})` : d.turma.nome
      }))
      .sort((a: any, b: any) => a.turma.localeCompare(b.turma) || a.nome.localeCompare(b.nome))
  }, [todasDisciplinas, selectedIds])

  const toggleTurma = (turma: string) => {
    setExpandedTurmas(prev => ({ ...prev, [turma]: !prev[turma] }))
  }

  const toggleDisciplina = (id: string) => {
    const isNowSelected = !selectedIds.includes(id)

    if (isNowSelected) {
      // Verificar se essa disciplina tem outro professor vinculado nas props
      const disc = todasDisciplinas.find(d => d.id === id)
      const outro = disc?.usuariosPermitidos?.find((u: any) => u.id !== usuario.id)
      
      if (outro) {
        if (!confirm(`Esta disciplina já está vinculada ao professor(a) ${outro.name}. Ao confirmar, ela será transferida para ${usuario.name}. Deseja continuar?`)) {
          return
        }
      }
    }

    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  const handleSave = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/usuarios/${usuario.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          disciplinasIds: selectedIds 
        })
      })

      if (response.ok) {
        router.push('/dashboard/usuarios')
        router.refresh()
      }
    } catch (err) {
      alert('Erro ao salvar')
    } finally {
      setLoading(false)
    }
  }

  const turmaEntries = Object.entries(disciplinasPorTurma)

  return (
    <div className="">
      {/* Header Fixo Premium */}
      <header className="mb-6">
        <div className="max-w-5xl mx-auto px-6 py-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <Link 
                href="/dashboard/usuarios" 
                className="p-2 hover:bg-subtle-hover rounded-xl transition-colors border border-transparent hover:border-line-strong"
              >
                <ArrowLeft className="w-5 h-5 text-fg-muted" />
              </Link>
              <div>
                <h1 className="text-2xl font-semibold tracking-tight text-fg">Vincular Disciplinas</h1>
                <p className="text-sm text-fg-muted">
                   Professor: {usuario.name}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <Link
                href={`/dashboard/usuarios/${usuario.id}/importar-horario`}
                className="flex items-center gap-2 border border-line-strong text-fg-muted px-4 py-2.5 rounded-xl font-medium text-sm hover:bg-canvas transition-all"
              >
                <ClipboardPaste className="w-4 h-4" />
                <span>Importar Horário</span>
              </Link>
              <button
                onClick={handleSave} disabled={loading}
                className="inline-flex h-9 shrink-0 items-center gap-2 rounded-md bg-accent px-3 text-sm font-medium text-on-accent transition-colors duration-150 hover:bg-accent-hover disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                <span>Salvar Alterações</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-10">
        
        {/* Barra de Pesquisa e Filtro */}
        <div className="relative mb-10 group">
          <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none">
            <Search className="w-5 h-5 text-fg-subtle group-focus-within:text-fg-muted transition-colors" />
          </div>
          <input 
            type="text"
            placeholder="Buscar por turma ou disciplina..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-14 pr-12 py-5 bg-surface border border-line-strong rounded-xl shadow-sm focus:ring-4 focus:ring-zinc-500/10 focus:border-zinc-500 outline-none font-medium text-fg-muted transition-all"
          />
          <div className="absolute inset-y-0 right-5 flex items-center gap-2">
            {search && (
              <button 
                onClick={() => setSearch("")}
                className="p-1 hover:bg-subtle rounded-lg transition-colors"
                title="Limpar busca"
              >
                <X className="w-5 h-5 text-fg-subtle hover:text-fg-muted" />
              </button>
            )}
            <button
               onClick={() => setShowOnlySelected(!showOnlySelected)}
               className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
                 showOnlySelected 
                 ? 'bg-accent-subtle text-accent-fg border-accent shadow-card' 
                 : 'bg-surface text-fg-subtle border-line hover:border-line-strong'
               }`}
            >
               <Filter className="w-3.5 h-3.5" />
               {showOnlySelected ? 'Mostrando Apenas Vinculadas' : 'Ver Todas'}
            </button>
          </div>
        </div>
        
        {/* Banner de Aviso de Regra */}
        <div className="mb-6 p-4 bg-accent-subtle border border-accent/25 rounded-lg flex items-start gap-3 shadow-sm">
          <Info className="w-5 h-5 text-accent-fg shrink-0 mt-0.5" />
          <div className="text-sm text-accent-fg">
            <p className="font-bold mb-1">Regra de Exclusividade Ativa</p>
            <p className="text-xs font-medium opacity-90 leading-relaxed">
              Cada disciplina pode ter apenas <strong>um professor associado</strong>. 
              Ao selecionar uma matéria que já possui professor (marcada em <span className="text-warning-fg font-bold">amarelo</span>), 
              o vínculo anterior será removido e transferido para este usuário ao salvar.
            </p>
          </div>
        </div>

        {/* Disciplinas Vinculadas Atualmente */}
        {disciplinasSelecionadasList.length > 0 && (
          <div className="mb-10 p-6 bg-surface rounded-xl border border-line shadow-sm">
            <h2 className="text-xs font-bold text-fg mb-5 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-fg-subtle" />
              Disciplinas Já Vinculadas ({disciplinasSelecionadasList.length})
            </h2>
            <div className="flex flex-wrap gap-2.5">
              {disciplinasSelecionadasList.map((disc: any) => (
                <div key={disc.id} className="flex items-center gap-2 px-3 py-2 bg-canvas text-fg-muted rounded-xl border border-line">
                  <span className="text-xs font-semibold">{disc.nome} <span className="text-fg-subtle font-medium">· {disc.turma}</span></span>
                  <button 
                    onClick={() => toggleDisciplina(disc.id)}
                    className="ml-1 p-1 hover:bg-danger-subtle hover:text-danger-fg text-fg-subtle rounded-lg transition-colors"
                    title="Remover"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {turmaEntries.length === 0 ? (
          <div className="text-center py-20 bg-surface rounded-xl border border-dashed border-line-strong">
            <div className="w-16 h-16 bg-canvas rounded-full flex items-center justify-center mx-auto mb-4">
              <Filter className="w-8 h-8 text-fg-disabled" />
            </div>
            <p className="text-fg-muted font-medium">Nenhuma turma encontrada para "{search}"</p>
          </div>
        ) : (
          <div className="space-y-4">
            {turmaEntries.map(([turmaKey, data]: [string, any]) => {
              const { label, disciplinas } = data
              const isExpanded = expandedTurmas[turmaKey] || search.length > 0
              const selecionadasNaTurma = disciplinas.filter((d: any) => selectedIds.includes(d.id)).length
              
              return (
                <div 
                  key={turmaKey} 
                  className={`bg-surface rounded-xl border transition-all overflow-hidden ${
                    isExpanded ? 'ring-2 ring-zinc-900 border-transparent shadow-card' : 'border-line-strong hover:border-zinc-400'
                  }`}
                >
                  {/* Cabeçalho da Turma (Acordeão) */}
                  <button
                    onClick={() => toggleTurma(turmaKey)}
                    className="w-full px-8 py-6 flex items-center justify-between hover:bg-canvas transition-colors text-left"
                  >
                    <div className="flex items-center space-x-4">
                      <div className={`w-12 h-12 rounded-lg flex items-center justify-center transition-all ${
                        isExpanded ? 'bg-subtle border border-line text-fg' : 'bg-subtle-hover text-fg-muted'
                      }`}>
                        <School className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="font-medium text-fg text-lg">{label}</h3>
                        <p className="text-xs font-medium text-fg-subtle">
                           {selecionadasNaTurma} de {disciplinas.length} disciplinas vinculadas
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                       {selecionadasNaTurma > 0 && !isExpanded && (
                         <span className="px-3 py-1 bg-success-subtle text-success-fg text-xs font-medium rounded-full">
                            Ativo
                         </span>
                       )}
                       {isExpanded ? <ChevronUp className="w-5 h-5 text-fg-subtle" /> : <ChevronDown className="w-5 h-5 text-fg-subtle" />}
                    </div>
                  </button>

                  {/* Conteúdo das Disciplinas */}
                  {isExpanded && (
                    <div className="px-8 pb-8 animate-slide-up">
                      <div className="h-px bg-subtle-hover mb-6" />
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {disciplinas.map((disc: any) => {
                          const isSelected = selectedIds.includes(disc.id)
                          // Identificar se outro professor (que não seja este) está vinculado
                          const outroProfessor = disc.usuariosPermitidos?.find((u: any) => u.id !== usuario.id)
                          
                          return (
                            <label 
                              key={disc.id} 
                              className={`group flex flex-col p-4 rounded-lg border-2 transition-all cursor-pointer relative ${
                                isSelected 
                                  ? 'bg-subtle border-zinc-700 shadow-sm' 
                                  : 'bg-surface border-line hover:border-line-strong'
                              } ${outroProfessor && !isSelected ? 'border-warning-line bg-warning-subtle' : ''}`}
                            >
                              <div className="flex items-center justify-between w-full">
                                <span className={`text-sm font-semibold flex-grow ${isSelected ? 'text-accent-fg' : 'text-fg-muted'}`}>
                                  {disc.nome}
                                </span>
                                <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${
                                  isSelected ? 'border-zinc-700 bg-zinc-700' : 'border-line-strong group-hover:border-line-strong'
                                }`}>
                                  <input
                                    type="checkbox"
                                    className="hidden"
                                    checked={isSelected}
                                    onChange={() => toggleDisciplina(disc.id)}
                                  />
                                  {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                                </div>
                              </div>
                              
                              {outroProfessor && !isSelected && (
                                <div className="mt-2 flex items-center gap-1.5 text-xs text-warning-fg font-bold bg-warning-subtle px-2 py-1 rounded-lg">
                                  <AlertCircle className="w-3 h-3" />
                                  <span>{outroProfessor.name || 'Outro Prof.'}</span>
                                </div>
                              )}

                              {isSelected && usuario.disciplinasPermitidas.some((up: any) => up.id === disc.id) && (
                                <div className="mt-2 flex items-center gap-1.5 text-xs text-success-fg font-bold bg-success-subtle px-2 py-1 rounded-lg">
                                  <CheckCircle2 className="w-3 h-3" />
                                  <span>VINCULADA A VOCÊ</span>
                                </div>
                              )}
                            </label>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </main>

      {/* Info Flutuante no Rodapé */}
      <div className="fixed bottom-[calc(var(--barra-inferior)+2rem)] left-1/2 -translate-x-1/2 bg-zinc-900 text-white px-6 py-3 rounded-full shadow-overlay flex items-center space-x-4 border border-white/10 backdrop-blur-md">
         <Info className="w-4 h-4 text-accent" />
         <span className="text-xs font-medium leading-none">
            {selectedIds.length} selecionadas
         </span>
         {todasDisciplinas.some(d => selectedIds.includes(d.id) && d.usuariosPermitidos?.some((u: any) => u.id !== usuario.id)) && (
           <div className="flex items-center gap-2 border-l border-white/20 pl-4 ml-4">
             <AlertCircle className="w-4 h-4 text-warning" />
             <span className="text-xs font-bold text-warning">Vínculos serão transferidos</span>
           </div>
         )}
      </div>
    </div>
  )
}
