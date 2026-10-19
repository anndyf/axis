"use client"

import { useState, useEffect } from "react"
import { X, Save, Loader2, GraduationCap, Hash, Pencil } from "lucide-react"

export interface CursoParaEditar {
  id: string
  nome: string
  sigla: string
  modalidade: string
  nivelEnsino?: string | null
  esquemaAvaliacaoId?: string | null
  turnos: string[]
}

interface EsquemaOption {
  id: string
  nome: string
}

interface CursoModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: (cursos: any[]) => void
  /** Quando passado, o modal entra em modo de edição */
  cursoParaEditar?: CursoParaEditar | null
}

const MODALIDADES = ["EPTM", "PROEJA", "SUBSEQUENTE"]
const TURNOS = ["Matutino", "Vespertino", "Noturno"]

const labelModalidade: Record<string, string> = {
  EPTM: "EPTM",
  PROEJA: "PROEJA",
  SUBSEQUENTE: "Subsequente",
}

// Rótulo livre de nível de ensino - não afeta o esquema de avaliação
// automaticamente, é só classificação (útil pra relatórios/filtros).
const NIVEIS_ENSINO = ["FUNDAMENTAL_I", "FUNDAMENTAL_II", "ENSINO_MEDIO", "TECNICO", "EJA", "OUTRO"]

const labelNivelEnsino: Record<string, string> = {
  FUNDAMENTAL_I: "Ensino Fundamental I",
  FUNDAMENTAL_II: "Ensino Fundamental II",
  ENSINO_MEDIO: "Ensino Médio",
  TECNICO: "Técnico",
  EJA: "EJA",
  OUTRO: "Outro",
}

export default function CursoModal({ isOpen, onClose, onSuccess, cursoParaEditar }: CursoModalProps) {
  const isEdit = !!cursoParaEditar
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [esquemas, setEsquemas] = useState<EsquemaOption[]>([])

  // Estado do formulário
  const [formData, setFormData] = useState({
    nome: "",
    sigla: "",
    modalidades: ["EPTM"] as string[],
    nivelEnsino: "" as string,
    esquemaAvaliacaoId: "" as string,
    turnos: [] as string[]
  })

  // Preenche o formulário ao abrir em modo edição
  useEffect(() => {
    if (isEdit && cursoParaEditar) {
      setFormData({
        nome: cursoParaEditar.nome,
        sigla: cursoParaEditar.sigla,
        modalidades: [cursoParaEditar.modalidade],
        nivelEnsino: cursoParaEditar.nivelEnsino || "",
        esquemaAvaliacaoId: cursoParaEditar.esquemaAvaliacaoId || "",
        turnos: cursoParaEditar.turnos || []
      })
    } else {
      setFormData({ nome: "", sigla: "", modalidades: ["EPTM"], nivelEnsino: "", esquemaAvaliacaoId: "", turnos: [] })
    }
    setError("")
  }, [isOpen, cursoParaEditar, isEdit])

  useEffect(() => {
    if (!isOpen) return
    fetch('/api/esquemas-avaliacao')
      .then(res => res.json())
      .then(data => setEsquemas(Array.isArray(data) ? data : []))
      .catch(() => setEsquemas([]))
  }, [isOpen])

  if (!isOpen) return null

  const handleToggleTurno = (turno: string) => {
    setFormData(prev => ({
      ...prev,
      turnos: prev.turnos.includes(turno)
        ? prev.turnos.filter(t => t !== turno)
        : [...prev.turnos, turno]
    }))
  }

  const handleToggleModalidade = (modalidade: string) => {
    if (isEdit) return // Não permite mudar modalidade na edição
    setFormData(prev => ({
      ...prev,
      modalidades: prev.modalidades.includes(modalidade)
        ? prev.modalidades.filter(m => m !== modalidade)
        : [...prev.modalidades, modalidade]
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (formData.turnos.length === 0) {
      setError("Selecione pelo menos um turno")
      return
    }
    if (!isEdit && formData.modalidades.length === 0) {
      setError("Selecione pelo menos uma modalidade")
      return
    }

    setLoading(true)
    setError("")

    try {
      if (isEdit && cursoParaEditar) {
        // ── EDIÇÃO ─────────────────────────────
        const response = await fetch(`/api/cursos/${cursoParaEditar.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            nome: formData.nome,
            sigla: formData.sigla,
            turnos: formData.turnos,
            nivelEnsino: formData.nivelEnsino || null,
            esquemaAvaliacaoId: formData.esquemaAvaliacaoId || null,
          })
        })

        if (response.ok) {
          const data = await response.json()
          onSuccess([data])
          onClose()
        } else {
          const data = await response.json()
          setError(data.message || 'Erro ao atualizar curso')
        }
      } else {
        // ── CRIAÇÃO (múltiplas modalidades) ────
        const response = await fetch('/api/cursos', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            nome: formData.nome,
            sigla: formData.sigla,
            modalidades: formData.modalidades,
            turnos: formData.turnos,
            nivelEnsino: formData.nivelEnsino || null,
            esquemaAvaliacaoId: formData.esquemaAvaliacaoId || null,
          })
        })

        const data = await response.json()

        if (response.ok || response.status === 207) {
          onSuccess(Array.isArray(data) ? data : data.cursos || [data])
          if (data.avisos?.length) {
            // Parcialmente criado — mostramos aviso mas fechamos
            console.warn("[CursoModal] Avisos:", data.avisos)
          }
          onClose()
        } else {
          setError(data.message || 'Erro ao criar curso')
        }
      }
    } catch {
      setError('Erro ao conectar com o servidor')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-zinc-900/40 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-xl w-full max-w-lg shadow-overlay border border-zinc-100 overflow-hidden animate-pop-in">

        {/* Header */}
        <div className={`px-8 py-6 border-b border-zinc-100 flex items-center justify-between ${isEdit ? 'bg-warning-subtle' : 'bg-zinc-50'}`}>
          <div className="flex items-center space-x-3">
            <div className={`p-2 rounded-xl ${isEdit ? 'bg-warning' : 'bg-accent'}`}>
              {isEdit ? <Pencil className="w-5 h-5 text-white" /> : <GraduationCap className="w-5 h-5 text-white" />}
            </div>
            <div>
              <h2 className="text-xl font-semibold text-fg tracking-tight">
                {isEdit ? 'Editar Curso' : 'Novo Curso'}
              </h2>
              <p className="text-xs text-fg-subtle font-medium">
                {isEdit
                  ? `Modificando: ${cursoParaEditar?.nome} — ${cursoParaEditar?.modalidade}`
                  : 'Cadastre em uma ou mais modalidades'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-zinc-200 rounded-full transition-colors">
            <X className="w-5 h-5 text-fg-subtle" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          {error && (
            <div className="p-4 bg-danger-subtle border border-danger-line rounded-xl text-danger-fg text-xs font-semibold animate-slide-up">
              {error}
            </div>
          )}

          <div className="space-y-5">
            {/* Nome */}
            <div className="group">
              <label className="block text-xs font-semibold text-fg-subtle mb-1.5 ml-1">Nome do Curso</label>
              <input
                required type="text" placeholder="Ex: Técnico em Meio Ambiente"
                value={formData.nome}
                onChange={e => {
                  const nome = e.target.value
                  if (!isEdit) {
                    const words = nome.split(' ').filter(w => !['de', 'da', 'do', 'e', 'o', 'a', 'em', 'dos', 'das'].includes(w.toLowerCase()))
                    let autoSigla = ""
                    if (words.length >= 2) {
                      autoSigla = ((words[0]?.[0] || "") + (words[1]?.[0] || "")).toUpperCase()
                    } else if (words.length === 1) {
                      autoSigla = (words[0]?.[0] || "").toUpperCase()
                    }
                    setFormData({ ...formData, nome, sigla: autoSigla })
                  } else {
                    setFormData({ ...formData, nome })
                  }
                }}
                className="w-full px-5 py-4 bg-zinc-50 border border-zinc-200 rounded-lg outline-none font-semibold text-fg-muted focus:bg-white focus:border-accent transition-all"
              />
            </div>

            {/* Sigla */}
            <div className="group">
              <label className="block text-xs font-semibold text-fg-subtle mb-1.5 ml-1">Sigla</label>
              <div className="relative">
                <input
                  required type="text" placeholder="Ex: MA" maxLength={8}
                  value={formData.sigla}
                  onChange={e => setFormData({ ...formData, sigla: e.target.value.toUpperCase() })}
                  className="w-full pl-10 pr-5 py-4 bg-zinc-50 border border-zinc-200 rounded-lg outline-none font-semibold text-fg-muted focus:bg-white focus:border-accent transition-all"
                />
                <Hash className="w-4 h-4 text-fg-subtle absolute left-4 top-1/2 -translate-y-1/2" />
              </div>
              {!isEdit && formData.modalidades.length > 1 && (
                <p className="text-xs text-fg-subtle mt-1.5 ml-1">
                  💡 Será combinada com cada modalidade (ex: {formData.sigla || "MA"}_EPTM)
                </p>
              )}
            </div>

            {/* Modalidades */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-fg-subtle mb-2 ml-1">
                Modalidade{!isEdit && 's'}
                {!isEdit && formData.modalidades.length > 1 && (
                  <span className="ml-2 text-accent-fg normal-case font-bold">
                    ({formData.modalidades.length} selecionadas)
                  </span>
                )}
              </label>
              <div className="flex flex-wrap gap-2">
                {MODALIDADES.map(m => (
                  <button
                    key={m} type="button"
                    onClick={() => handleToggleModalidade(m)}
                    disabled={isEdit}
                    className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all border ${
                      formData.modalidades.includes(m)
                        ? 'bg-accent text-on-accent border-accent shadow-card '
                        : 'bg-zinc-50 text-fg-subtle border-zinc-200 hover:border-zinc-300 hover:text-fg-muted'
                    } ${isEdit ? 'opacity-60 cursor-not-allowed' : ''}`}
                  >
                    {labelModalidade[m]}
                  </button>
                ))}
              </div>
              {isEdit && (
                <p className="text-xs text-fg-subtle ml-1">
                  ⚠️ A modalidade não pode ser alterada após a criação.
                </p>
              )}

              {/* Preview de criação */}
              {!isEdit && formData.modalidades.length > 1 && formData.nome && (
                <div className="mt-3 p-3 bg-accent-subtle border border-accent/25 rounded-xl space-y-1">
                  <p className="text-xs font-bold text-accent-fg mb-1.5">Serão criados:</p>
                  {formData.modalidades.map(m => (
                    <div key={m} className="flex items-center gap-2 text-xs text-accent-fg">
                      <span className="w-1.5 h-1.5 rounded-full bg-accent shrink-0" />
                      <span className="font-semibold">{formData.nome}</span>
                      <span className="text-accent">–</span>
                      <span className="font-bold text-xs bg-accent-subtle px-1.5 py-0.5 rounded">{m}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Nível de Ensino */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-fg-subtle mb-2 ml-1">
                Nível de Ensino <span className="normal-case font-medium text-zinc-300">(opcional)</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {NIVEIS_ENSINO.map(n => (
                  <button
                    key={n} type="button"
                    onClick={() => setFormData(prev => ({ ...prev, nivelEnsino: prev.nivelEnsino === n ? "" : n }))}
                    className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all border ${
                      formData.nivelEnsino === n
                        ? 'bg-success text-white border-success shadow-card '
                        : 'bg-zinc-50 text-fg-subtle border-zinc-200 hover:border-zinc-300 hover:text-fg-muted'
                    }`}
                  >
                    {labelNivelEnsino[n]}
                  </button>
                ))}
              </div>
            </div>

            {/* Esquema de Avaliação */}
            <div className="group">
              <label className="block text-xs font-semibold text-fg-subtle mb-1.5 ml-1">
                Esquema de Avaliação <span className="normal-case font-medium text-zinc-300">(opcional)</span>
              </label>
              <select
                value={formData.esquemaAvaliacaoId}
                onChange={e => setFormData({ ...formData, esquemaAvaliacaoId: e.target.value })}
                className="w-full px-5 py-4 bg-zinc-50 border border-zinc-200 rounded-lg outline-none font-semibold text-fg-muted focus:bg-white focus:border-accent transition-all"
              >
                <option value="">Padrão da escola</option>
                {esquemas.map(esq => (
                  <option key={esq.id} value={esq.id}>{esq.nome}</option>
                ))}
              </select>
            </div>

            {/* Turnos */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-fg-subtle mb-2 ml-1">Turnos Disponíveis</label>
              <div className="flex flex-wrap gap-2">
                {TURNOS.map(t => (
                  <button
                    key={t} type="button"
                    onClick={() => handleToggleTurno(t)}
                    className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all border ${
                      formData.turnos.includes(t)
                        ? 'bg-accent text-on-accent border-accent shadow-card '
                        : 'bg-zinc-50 text-fg-subtle border-zinc-200 hover:border-zinc-300 hover:text-fg-muted'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="pt-2 flex gap-3">
            <button
              type="button" onClick={onClose}
              className="px-6 py-4 rounded-lg font-semibold text-sm text-fg-subtle hover:bg-zinc-100 transition-all"
            >
              Cancelar
            </button>
            <button
              type="submit" disabled={loading}
              className={`flex-1 text-white py-4 rounded-lg font-semibold text-sm flex items-center justify-center space-x-2 transition-all disabled:opacity-50 ${
                isEdit
                  ? 'bg-warning hover:bg-warning'
                  : 'bg-zinc-900 hover:bg-zinc-800'
              }`}
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
              <span>
                {isEdit
                  ? 'Salvar Alterações'
                  : formData.modalidades.length > 1
                    ? `Cadastrar em ${formData.modalidades.length} Modalidades`
                    : 'Cadastrar Curso'}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
