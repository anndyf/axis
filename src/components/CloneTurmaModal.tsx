"use client"

import { useState, useEffect } from "react"
import { X, Loader2, Copy, AlertTriangle } from "lucide-react"

interface CloneTurmaModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (data: { nome: string, turno: string, numero: number }) => Promise<void>
  turmaOriginal: { id: string, nome: string, turno: string | null } | null
}

export default function CloneTurmaModal({ 
    isOpen, 
    onClose, 
    onConfirm, 
    turmaOriginal 
}: CloneTurmaModalProps) {
  const [nome, setNome] = useState("")
  const [turno, setTurno] = useState("")
  const [numero, setNumero] = useState(1)
  const [loading, setLoading] = useState(false)

  const turnos = ["Matutino", "Vespertino", "Noturno", "Integral"]

  useEffect(() => {
    if (turmaOriginal && isOpen) {
      // 1TIM1 -> Serie: 1, Curso: I, Turno: M, Numero: 1
      const match = turmaOriginal.nome.match(/^(\d+)T([A-Z]+)([MVNI])(\d+)(.*)$/)
      if (match) {
        const [_, serie, cursoSigla, turnoSigla, numOriginal, sufixo] = match
        const turnoMap: Record<string, string> = { 
            "M": "Matutino", 
            "V": "Vespertino", 
            "N": "Noturno", 
            "I": "Integral" 
        }
        const currentTurno = turnoMap[turnoSigla] || "Matutino"
        setTurno(currentTurno)
        setNumero(parseInt(numOriginal))
        setNome(turmaOriginal.nome)
      } else {
        setTurno(turmaOriginal.turno || "Matutino")
        setNumero(1)
        setNome(`${turmaOriginal.nome} (CLONE)`)
      }
    }
  }, [turmaOriginal, isOpen])

  // Efeito para atualizar o nome automaticamente ao mudar turno ou número
  useEffect(() => {
    if (turmaOriginal && isOpen) {
      const match = turmaOriginal.nome.match(/^(\d+)T([A-Z]+)([MVNI])(\d+)(.*)$/)
      if (match) {
        const [_, serie, cursoSigla, turnoSigla, numOriginal, sufixo] = match
        const reverseTurnoMap: Record<string, string> = { 
            "Matutino": "M", 
            "Vespertino": "V", 
            "Noturno": "N", 
            "Integral": "I" 
        }
        const tSigla = reverseTurnoMap[turno] || "M"
        setNome(`${serie}T${cursoSigla}${tSigla}${numero}${sufixo}`)
      }
    }
  }, [turno, numero, turmaOriginal, isOpen])

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await onConfirm({ nome, turno, numero })
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
            <div className="w-10 h-10 bg-success-subtle rounded-xl flex items-center justify-center">
              <Copy className="w-5 h-5 text-success-fg" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-fg">Clonar turma</h3>
              <p className="text-xs text-fg-subtle font-medium">{turmaOriginal?.nome}</p>
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
          <div className="bg-warning-subtle border border-warning-line rounded-lg p-4 flex gap-3">
            <AlertTriangle className="w-5 h-5 text-warning-fg shrink-0 mt-0.5" />
            <p className="text-xs text-warning-fg font-medium leading-relaxed">
              As disciplinas serão copiadas, mas <span className="font-semibold underline">vínculos com professores e alunos não serão mantidos</span>. 
              A nova turma nascerá limpa.
            </p>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-fg-subtle ml-1">Novo turno</label>
                <select
                  value={turno}
                  onChange={(e) => setTurno(e.target.value)}
                  className="w-full bg-canvas border-none rounded-xl px-4 py-2.5 text-sm font-semibold text-fg-muted focus:ring-2 focus:ring-success/30 transition-all"
                >
                  {turnos.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-fg-subtle ml-1">Nomenclatura (Número)</label>
                <input
                  type="number"
                  min="1"
                  max="9"
                  value={numero}
                  onChange={(e) => setNumero(parseInt(e.target.value))}
                  className="w-full bg-canvas border-none rounded-xl px-4 py-2.5 text-sm font-semibold text-fg-muted focus:ring-2 focus:ring-success/30 transition-all font-mono"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-fg-subtle ml-1">Nome final da turma</label>
              <input
                type="text"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                className="w-full bg-canvas border-none rounded-xl px-4 py-2.5 text-sm font-semibold text-fg focus:ring-2 focus:ring-success/30 transition-all font-mono shadow-card"
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
              {loading ? <Loader2 size={18} className="animate-spin" /> : <Copy size={18} />}
              Confirmar Clone
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
