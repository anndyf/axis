"use client"

import { erroDeData } from "@/lib/navegador/mascaras"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { 
  Save, 
  X, 
  AlertCircle, 
  ChevronRight, 
  Calendar, 
  BookOpen, 
  Users,
  Layout,
  FileText,
  Target,
  Wrench,
  GraduationCap
} from "lucide-react"

interface Turma {
  id: string
  nome: string
  serie: string
  modalidade: string
}

interface PlanoFormProps {
  plano?: any
  onSuccess: () => void
  onClose: () => void
}

export default function PlanoForm({ plano, onSuccess, onClose }: PlanoFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [disciplinaData, setDisciplinaData] = useState<Record<string, Record<string, Turma[]>>>({})
  const [selectedDisc, setSelectedDisc] = useState("")
  const [selectedClusterKey, setSelectedClusterKey] = useState("")
  
  const [formData, setFormData] = useState({
    disciplinaNome: plano?.disciplinaNome || "",
    periodoInicio: plano?.periodoInicio ? new Date(plano.periodoInicio).toISOString().split('T')[0] : "",
    periodoFim: plano?.periodoFim ? new Date(plano.periodoFim).toISOString().split('T')[0] : "",
    indicadores: plano?.indicadores || "",
    conteudos: plano?.conteudos || "",
    metodologias: plano?.metodologias || "",
    recursos: plano?.recursos || "",
    avaliacao: plano?.avaliacao || "",
    observacoes: plano?.observacoes || "",
    turmasIds: plano?.turmas?.map((t: any) => t.id) || []
  })

  useEffect(() => {
    fetch('/api/planos/utils/compativeis')
      .then(res => res.json())
      .then(data => {
        setDisciplinaData(data)
        if (plano?.disciplinaNome) {
            setSelectedDisc(plano.disciplinaNome)
            if (plano.turmas?.[0]) {
                const t = plano.turmas[0]
                setSelectedClusterKey(`${t.serie} - ${t.modalidade}`)
            }
        }
      })
  }, [plano])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.disciplinaNome) { setError("Selecione uma disciplina"); return; }
    if (formData.turmasIds.length === 0) { setError("Selecione pelo menos uma turma"); return; }

    setLoading(true); setError("");

    try {
      const url = plano ? `/api/planos/${plano.id}` : "/api/planos"
      const method = plano ? "PUT" : "POST"
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      })
      if (response.ok) onSuccess()
      else { const result = await response.json(); setError(result.message || "Erro ao salvar"); }
    } catch (err) { setError("Erro de conexão") } finally { setLoading(false) }
  }

  const toggleTurma = (id: string) => {
    const current = [...formData.turmasIds]
    const index = current.indexOf(id)
    if (index > -1) current.splice(index, 1)
    else current.push(id)
    setFormData({ ...formData, turmasIds: current })
  }

  // Validação no navegador (o servidor continua validando): fim não pode ser antes do início
  const erroFim = erroDeData(formData.periodoFim, { min: formData.periodoInicio || undefined, rotuloMin: "à data de início" })

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-zinc-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-surface w-full max-w-4xl max-h-[90vh] rounded-xl shadow-overlay flex flex-col overflow-hidden animate-pop-in border border-line-subtle">
        
        {/* Header Compact */}
        <div className="px-4 py-2.5 border-b border-line-subtle bg-surface flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-accent-subtle border border-accent/25 rounded-xl flex items-center justify-center">
               <FileText className="w-6 h-6 text-accent-fg" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-fg tracking-tight leading-tight">
                {plano ? 'Editar Plano' : 'Novo Plano'}
              </h2>
              <p className="text-fg-subtle text-xs font-medium">Gestão Pedagógica</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-canvas rounded-lg transition-all text-fg-disabled hover:text-fg-muted border border-transparent hover:border-line-subtle"><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-canvas/30">
          {error && (
            <div className="p-3 bg-danger-subtle border border-danger-line rounded-xl flex items-center gap-3 text-danger-fg text-xs font-bold animate-slide-up">
              <AlertCircle size={16} /> {error}
            </div>
          )}

          <div className="space-y-4">
            <h3 className="text-xs font-bold text-fg-subtle flex items-center gap-2 px-1">
               <Users size={12} /> Turmas e Período
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-surface p-4 rounded-2xl border border-line-subtle">
              <div className="space-y-1.5 text-left">
                <label className="text-xs font-bold text-fg-subtle ml-1">Disciplina</label>
                <select 
                  required
                  className="w-full h-10 px-3 bg-canvas border border-line-subtle rounded-xl text-xs font-semibold text-fg-muted focus:bg-surface focus:ring-4 focus:ring-ring transition-all outline-none appearance-none"
                  value={selectedDisc}
                  onChange={e => {
                    setSelectedDisc(e.target.value)
                    setFormData({...formData, disciplinaNome: e.target.value, turmasIds: []})
                    setSelectedClusterKey("")
                  }}
                >
                    <option value="">Escolha...</option>
                    {Object.keys(disciplinaData).map(name => <option key={name} value={name}>{name}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                 <div className="space-y-1.5 text-left">
                    <label className="text-xs font-bold text-fg-subtle ml-1">Início</label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-fg-subtle" />
                      <input type="date" required className="w-full h-10 pl-8 pr-3 bg-canvas border border-line-subtle rounded-xl text-xs font-semibold text-fg-muted" value={formData.periodoInicio} onChange={e => setFormData({...formData, periodoInicio: e.target.value})} />
                    </div>
                 </div>
                 <div className="space-y-1.5 text-left">
                    <label className="text-xs font-bold text-fg-subtle ml-1">Fim</label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-fg-subtle" />
                      <input type="date" required min={formData.periodoInicio || undefined} aria-invalid={!!erroFim || undefined} aria-describedby={erroFim ? "plano-erro-fim" : undefined} className="w-full h-10 pl-8 pr-3 bg-canvas border border-line-subtle rounded-xl text-xs font-semibold text-fg-muted aria-[invalid=true]:border-danger" value={formData.periodoFim} onChange={e => setFormData({...formData, periodoFim: e.target.value})} />
                    </div>
                    {erroFim && <p id="plano-erro-fim" role="alert" className="text-xs text-danger-fg">{erroFim}</p>}
                 </div>
              </div>

              <div className="space-y-1.5 md:col-span-2">
                 <label className="text-xs font-bold text-fg-subtle ml-1">Categoria de Turmas</label>
                 <select 
                   value={selectedClusterKey}
                   disabled={!selectedDisc}
                   onChange={e => {
                     setSelectedClusterKey(e.target.value)
                     const newClusterTurmas = (selectedDisc && disciplinaData[selectedDisc]) ? disciplinaData[selectedDisc][e.target.value] : []
                     const validIds = formData.turmasIds.filter((id: string) => newClusterTurmas.some((t: Turma) => t.id === id))
                     setFormData({...formData, turmasIds: validIds})
                   }}
                   className="w-full h-10 px-3 bg-canvas border border-line-subtle rounded-xl text-xs font-semibold text-fg-muted outline-none appearance-none disabled:opacity-50 transition-all"
                 >
                    <option value="">Selecione...</option>
                    {selectedDisc && disciplinaData[selectedDisc] && Object.keys(disciplinaData[selectedDisc]).map((key: string) => <option key={key} value={key}>{key}</option>)}
                 </select>
              </div>

              {selectedDisc && selectedClusterKey && (
                  <div className="md:col-span-2 pt-2">
                      <div className="flex flex-wrap gap-2">
                          {disciplinaData[selectedDisc][selectedClusterKey].map((turma: Turma) => (
                              <button
                                key={turma.id} type="button" onClick={() => toggleTurma(turma.id)}
                                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                                  formData.turmasIds.includes(turma.id) ? 'bg-accent text-on-accent shadow-card ' : 'bg-canvas text-fg-subtle border border-line-subtle hover:bg-subtle'
                                }`}
                              >
                                  {turma.nome}
                              </button>
                          ))}
                      </div>
                  </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <TextField icon={<Target size={12} className="text-accent-fg" />} title="Indicadores" value={formData.indicadores} onChange={(v: string) => setFormData({...formData, indicadores: v})} placeholder="Metas de aprendizagem..." />
              <TextField icon={<BookOpen size={12} className="text-success-fg" />} title="Conteúdos" value={formData.conteudos} onChange={(v: string) => setFormData({...formData, conteudos: v})} placeholder="O que será ensinado?" />
              <TextField icon={<Layout size={12} className="text-warning-fg" />} title="Metodologias" value={formData.metodologias} onChange={(v: string) => setFormData({...formData, metodologias: v})} placeholder="Como será ensinado?" />
              <TextField icon={<Wrench size={12} className="text-accent-fg" />} title="Recursos" value={formData.recursos} onChange={(v: string) => setFormData({...formData, recursos: v})} placeholder="Materiais usados..." />
              <TextField full icon={<GraduationCap size={12} className="text-danger-fg" />} title="Avaliação" value={formData.avaliacao} onChange={(v: string) => setFormData({...formData, avaliacao: v})} placeholder="Formas de avaliação..." rows={3} />
          </div>
        </form>

        <div className="p-4 border-t border-line-subtle bg-surface flex items-center justify-end gap-3 shrink-0">
            <button type="button" onClick={onClose} className="px-4 py-2.5 rounded-xl text-xs font-bold text-fg-subtle hover:bg-canvas transition-all">Cancelar</button>
            <button onClick={handleSubmit} disabled={loading} className="px-4 py-2.5 bg-accent text-on-accent rounded-xl text-xs font-bold hover:bg-accent-hover transition-all flex items-center gap-2 disabled:opacity-50">
                {loading ? <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save size={14} />}
                {plano ? 'Salvar Alterações' : 'Finalizar Plano'}
            </button>
        </div>
      </div>
    </div>
  )
}

function TextField({ icon, title, value, onChange, placeholder, rows = 4, full = false }: any) {
    return (
        <div className={`space-y-1.5 ${full ? 'md:col-span-2' : ''}`}>
            <label className="text-xs font-bold text-fg-subtle ml-1 flex items-center gap-2">
                {icon} {title}
            </label>
            <textarea 
              rows={rows} required placeholder={placeholder}
              className="w-full p-4 bg-surface border border-line-subtle rounded-lg text-xs font-medium text-fg-muted focus:ring-4 focus:ring-ring focus:border-accent/25 transition-all outline-none resize-none"
              value={value} onChange={e => onChange(e.target.value)}
            />
        </div>
    )
}
