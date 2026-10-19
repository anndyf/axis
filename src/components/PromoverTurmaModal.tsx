"use client"

import { useState, useEffect } from "react"
import { X, Loader2, ArrowUpCircle, AlertCircle } from "lucide-react"

interface PromoverTurmaModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (data: { nome: string, serie: string, anoLetivo: number }) => Promise<void>
  turmaOriginal: { id: string, nome: string, serie: string | null, modalidade: string | null, anoLetivo: number | null } | null
}

export default function PromoverTurmaModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  turmaOriginal 
}: PromoverTurmaModalProps) {
  const [nome, setNome] = useState("")
  const [serie, setSerie] = useState("")
  const [anoLetivo, setAnoLetivo] = useState(new Date().getFullYear())
  const [loading, setLoading] = useState(false)

  const labelLevel = turmaOriginal?.modalidade === 'PROEJA' ? 'Semestre' : 
                    turmaOriginal?.modalidade === 'SUBSEQUENTE' ? 'Módulo' : 'Ano'

  useEffect(() => {
    if (turmaOriginal && isOpen) {
        const currentSerie = parseInt(turmaOriginal.serie || "1")
        const nextSerie = (currentSerie + 1).toString()
        setSerie(nextSerie)
        setAnoLetivo(turmaOriginal.anoLetivo || new Date().getFullYear())

        // Tentar gerar o nome sugerido
        // 1TIM1 -> 2TIM1
        const match = turmaOriginal.nome.match(/^(\d+)(.*)$/)
        if (match) {
            setNome(`${nextSerie}${match[2]}`)
        } else {
            setNome(`${turmaOriginal.nome} - PRÓXIMO`)
        }
    }
  }, [turmaOriginal, isOpen])

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await onConfirm({ nome, serie, anoLetivo })
      onClose()
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-zinc-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-surface rounded-xl w-full max-w-md shadow-overlay overflow-hidden border border-line-subtle flex flex-col animate-pop-in">
        <div className="flex items-center justify-between p-6 border-b border-line-subtle bg-canvas/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-accent-subtle rounded-xl flex items-center justify-center">
              <ArrowUpCircle className="w-5 h-5 text-accent-fg" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-fg">Promover Turma</h3>
              <p className="text-xs text-fg-subtle font-medium">Avançar nível do curso</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-surface rounded-xl transition-colors text-fg-subtle hover:text-fg-muted shadow-sm"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="bg-accent-subtle border border-accent/25 rounded-lg p-4 flex gap-3">
            <AlertCircle className="w-5 h-5 text-accent-fg shrink-0 mt-0.5" />
            <div className="text-xs text-accent-fg font-medium leading-relaxed">
              <p className="font-bold border-b border-accent/25 mb-1 pb-1">O que acontecerá:</p>
              <ul className="list-disc ml-3 space-y-0.5">
                <li>Uma nova turma para o <b>{labelLevel} {serie}</b> será criada.</li>
                <li>Disciplinas serão clonadas automaticamente.</li>
                <li><span className="font-bold underline">TODOS os alunos</span> serão transferidos para a nova turma.</li>
                <li>A turma original ({turmaOriginal?.nome}) será mantida como histórico acadêmico.</li>
              </ul>
            </div>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-fg-subtle ml-1">{labelLevel} Alvo</label>
                <input
                  type="number"
                  min="1"
                  max="9"
                  value={serie}
                  onChange={(e) => setSerie(e.target.value)}
                  className="w-full bg-canvas border-none rounded-xl px-4 py-2.5 text-sm font-semibold text-fg-muted focus:ring-2 focus:ring-ring transition-all font-mono"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-fg-subtle ml-1">Ano Letivo</label>
                <input
                  type="number"
                  value={anoLetivo}
                  onChange={(e) => setAnoLetivo(parseInt(e.target.value))}
                  className="w-full bg-canvas border-none rounded-xl px-4 py-2.5 text-sm font-semibold text-fg-muted focus:ring-2 focus:ring-ring transition-all font-mono"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-fg-subtle ml-1">Código da Nova Turma</label>
              <input
                type="text"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                className="w-full bg-canvas border-none rounded-xl px-4 py-2.5 text-sm font-semibold text-fg focus:ring-2 focus:ring-ring transition-all font-mono shadow-card"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 px-4 rounded-xl text-sm font-semibold text-fg-subtle hover:bg-canvas transition-colors border border-line-subtle"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || !nome}
              className="flex-1 py-3 px-4 bg-accent hover:bg-accent-hover text-on-accent rounded-xl text-sm font-semibold shadow-card transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? <Loader2 size={18} className="animate-spin" /> : <ArrowUpCircle size={18} />}
              Confirmar Promoção
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
