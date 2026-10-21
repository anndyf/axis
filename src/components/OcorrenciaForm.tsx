"use client"

import { useState, useEffect } from "react"
import { 
  X, 
  Save, 
  UserPlus, 
  Search, 
  Users, 
  Loader2, 
  AlertCircle,
  Hash,
  FileText
} from "lucide-react"

interface Estudante {
  matricula: string
  nome: string
  turma: { nome: string }
}

export default function OcorrenciaForm({
  ocorrencia,
  onClose,
  onSuccess
}: {
  ocorrencia: any | null
  onClose: () => void
  onSuccess: () => void
}) {
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  
  // Form State
  const [formData, setFormData] = useState({
    titulo: ocorrencia?.titulo || "",
    descricao: ocorrencia?.descricao || "",
    tipo: ocorrencia?.tipo || "Comportamental",
    data: ocorrencia?.data ? new Date(ocorrencia.data).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
    estudantesIds: ocorrencia?.estudantes?.map((e: any) => e.matricula) || [] as string[]
  })

  // Students Search
  const [searchTerm, setSearchTerm] = useState("")
  const [searchResults, setSearchResults] = useState<Estudante[]>([])
  const [selectedEstudantes, setSelectedEstudantes] = useState<Estudante[]>(ocorrencia?.estudantes || [])

  useEffect(() => {
    if (searchTerm.length > 2) {
      const search = async () => {
        setLoading(true)
        try {
          const res = await fetch(`/api/estudantes?search=${searchTerm}`)
          const data = await res.json()
          setSearchResults(Array.isArray(data) ? data : [])
        } catch (error) {
          console.error("Erro na busca de estudantes:", error)
        } finally {
          setLoading(false)
        }
      }
      const timeoutId = setTimeout(search, 300)
      return () => clearTimeout(timeoutId)
    } else {
      setSearchResults([])
    }
  }, [searchTerm])

  const toggleEstudante = (est: Estudante) => {
    if (selectedEstudantes.some(e => e.matricula === est.matricula)) {
      setSelectedEstudantes(prev => prev.filter(e => e.matricula !== est.matricula))
      setFormData(prev => ({ ...prev, estudantesIds: prev.estudantesIds.filter((id: string) => id !== est.matricula) }))
    } else {
      setSelectedEstudantes(prev => [...prev, est])
      setFormData(prev => ({ ...prev, estudantesIds: [...prev.estudantesIds, est.matricula] }))
    }
    setSearchTerm("")
    setSearchResults([])
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (formData.estudantesIds.length === 0) return alert("Selecione pelo menos um estudante")
    
    setSaving(true)
    try {
      const method = ocorrencia ? 'PUT' : 'POST'
      const url = ocorrencia ? `/api/ocorrencias/${ocorrencia.id}` : '/api/ocorrencias'
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (res.ok) {
        onSuccess()
      } else {
        const err = await res.json()
        alert(err.message || "Erro ao salvar")
      }
    } catch (error) {
      console.error("Erro ao salvar ocorrência:", error)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-zinc-900/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-surface rounded-xl shadow-overlay w-full max-w-4xl overflow-hidden animate-pop-in flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-4 py-3 border-b border-line-subtle flex justify-between items-center bg-canvas/50">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-subtle border border-line text-fg rounded-lg flex items-center justify-center">
              <UserPlus size={22} />
            </div>
            <div>
              <h3 className="text-xl font-bold text-fg tracking-tight">
                {ocorrencia ? 'Editar Registro' : 'Novo Registro de Ocorrência'}
              </h3>
              <p className="text-xs font-bold text-fg-subtle">Preencha os dados do evento</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-3 hover:bg-subtle-hover rounded-lg transition-all text-fg-subtle"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 space-y-5 custom-scrollbar">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-fg-subtle ml-1">Título da Ocorrência</label>
              <input
                required
                type="text"
                value={formData.titulo}
                onChange={e => setFormData({ ...formData, titulo: e.target.value })}
                placeholder="Ex: Entrega de documentação pendente"
                className="w-full bg-canvas border-transparent rounded-lg px-4 py-4 text-sm focus:ring-4 focus:ring-zinc-900/5 focus:bg-surface focus:border-line transition-all font-medium placeholder:text-fg-disabled"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-fg-subtle ml-1">Tipo de Evento</label>
              <select
                value={formData.tipo}
                onChange={e => setFormData({ ...formData, tipo: e.target.value })}
                className="w-full bg-canvas border-transparent rounded-lg px-4 py-4 text-sm focus:ring-4 focus:ring-zinc-900/5 focus:bg-surface focus:border-line transition-all font-medium appearance-none cursor-pointer"
              >
                <option value="Comportamental">Comportamental</option>
                <option value="Pedagógica">Pedagógica</option>
                <option value="Médica">Médica</option>
                <option value="Elogio">Elogio</option>
                <option value="Financeira">Financeira</option>
                <option value="Outros">Outros</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-fg-subtle ml-1">Data do Evento</label>
              <input
                type="date"
                value={formData.data}
                onChange={e => setFormData({ ...formData, data: e.target.value })}
                className="w-full bg-canvas border-transparent rounded-lg px-4 py-4 text-sm focus:ring-4 focus:ring-zinc-900/5 focus:bg-surface focus:border-line transition-all font-medium cursor-pointer"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-fg-subtle ml-1">Estudantes Envolvidos</label>
            
            {/* Multi-select students */}
            <div className="space-y-4">
              <div className="relative group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-fg-disabled group-focus-within:text-fg" size={18} />
                <input
                  type="text"
                  placeholder="Pesquise para adicionar estudantes..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full bg-canvas border-transparent rounded-lg pl-12 pr-6 py-4 text-sm focus:ring-4 focus:ring-zinc-900/5 focus:bg-surface focus:border-line transition-all font-medium placeholder:text-fg-disabled"
                />
                
                {/* Search Results Dropdown */}
                {searchResults.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-surface border border-line rounded-2xl shadow-overlay z-50 overflow-hidden animate-slide-up">
                    {searchResults.map(est => (
                      <button
                        key={est.matricula}
                        type="button"
                        onClick={() => toggleEstudante(est)}
                        className="w-full px-4 py-4 flex items-center justify-between hover:bg-canvas transition-colors border-b border-line-subtle last:border-0"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 bg-subtle rounded-xl flex items-center justify-center font-bold text-fg-subtle">
                            {est.nome.charAt(0)}
                          </div>
                          <div className="text-left">
                            <p className="text-sm font-bold text-fg">{est.nome}</p>
                            <p className="text-xs font-bold text-fg-subtle">{est.turma?.nome}</p>
                          </div>
                        </div>
                        <Hash size={16} className="text-fg-disabled" />
                      </button>
                    ))}
                  </div>
                )}
                {loading && <div className="absolute right-4 top-1/2 -translate-y-1/2"><Loader2 className="w-4 h-4 animate-spin text-fg-subtle" /></div>}
              </div>

              {/* Selected Chips */}
              <div className="flex flex-wrap gap-2">
                {selectedEstudantes.map(est => (
                  <div key={est.matricula} className="flex items-center gap-1.5 bg-subtle border border-line text-fg pl-3 pr-1 py-1 rounded-md group">
                    <span className="text-xs font-bold">{est.nome}</span>
                    <button 
                      type="button"
                      onClick={() => toggleEstudante(est)}
                      className="p-1 text-fg-subtle hover:bg-line hover:text-fg rounded transition-colors duration-150"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
                {selectedEstudantes.length === 0 && (
                  <div className="flex items-center gap-3 text-warning-fg bg-warning-subtle px-5 py-3 rounded-lg border border-warning-line">
                    <AlertCircle size={16} />
                    <p className="text-xs font-bold">Nenhum estudante selecionado ainda</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-fg-subtle ml-1">Descrição Detalhada</label>
            <textarea
              required
              rows={12}
              value={formData.descricao}
              onChange={e => setFormData({ ...formData, descricao: e.target.value })}
              placeholder="Descreva detalhadamente o ocorrido..."
              className="w-full bg-canvas border-transparent rounded-xl px-4 py-3 text-base focus:ring-4 focus:ring-zinc-900/5 focus:bg-surface focus:border-line transition-all font-medium placeholder:text-fg-disabled resize-none"
            />
          </div>

        </form>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-line-subtle bg-canvas/50 flex gap-4">
          <button 
            type="button"
            onClick={onClose}
            className="flex-1 py-4 text-sm font-bold text-fg-subtle hover:text-fg hover:bg-surface rounded-lg transition-all"
          >
            CANCELAR
          </button>
          <button 
            type="button"
            onClick={handleSubmit}
            disabled={saving}
            className="flex-3 py-4 bg-accent text-on-accent text-sm font-bold rounded-lg hover:bg-accent-hover transition-all disabled:opacity-50 flex items-center justify-center gap-3 px-4"
          >
            {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save size={18} />}
            {saving ? 'SALVANDO...' : 'CONFIRMAR E REGISTRAR'}
          </button>
        </div>
      </div>
    </div>
  )
}
