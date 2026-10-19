
"use client"

import { useState, useRef, useEffect } from "react"
import { Shield, ShieldCheck, ShieldX, ChevronDown, Loader2 } from "lucide-react"
import { activateAllPortals, deactivateAllPortals } from "./actions"

export default function PortalActionsMenu() {
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState<"activate" | "deactivate" | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const handleActivate = async () => {
    if (!confirm("Isso criará acesso ao portal para TODOS os alunos que ainda não possuem. A senha inicial será o número de matrícula. Deseja continuar?")) {
      return
    }

    setLoading("activate")
    const res = await activateAllPortals()
    if (res.error) {
      alert(res.error)
    } else {
      alert(`${res.count || 0} acessos ao portal foram criados com sucesso.`)
    }
    setLoading(null)
    setIsOpen(false)
  }

  const handleDeactivate = async () => {
    if (!confirm("🚨 ATENÇÃO: Isso removerá o acesso de TODOS os alunos ao portal. Eles não conseguirão logar até que o acesso seja reativado individualmente. Deseja continuar?")) {
      return
    }

    setLoading("deactivate")
    const res = await deactivateAllPortals()
    if (res.error) {
      alert(res.error)
    } else {
      alert("Todos os portais foram desativados com sucesso.")
    }
    setLoading(null)
    setIsOpen(false)
  }

  return (
    <div className="relative w-full md:w-auto" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={loading !== null}
        className="flex items-center justify-between md:justify-start w-full md:w-auto space-x-2 bg-white text-fg-muted border border-zinc-300 px-4 py-2.5 rounded-lg hover:bg-zinc-50 transition-all shadow-sm font-medium text-sm"
      >
        <div className="flex items-center space-x-2">
          <Shield size={16} className="text-fg-muted" />
          <span>Gestão de Acessos</span>
        </div>
        <ChevronDown size={14} className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 left-0 md:left-auto mt-2 w-full md:w-64 bg-white rounded-xl shadow-overlay border border-zinc-300 py-2 z-50 animate-slide-up">
          <div className="px-4 py-2 mb-1 border-b border-zinc-200">
            <span className="text-xs font-medium text-fg-subtle">Ações em Lote</span>
          </div>
          
          <button
            onClick={handleActivate}
            disabled={loading !== null}
            className="w-full flex items-center space-x-3 px-4 py-3 text-sm text-success-fg hover:bg-success-subtle transition-colors text-left"
          >
            {loading === "activate" ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <ShieldCheck size={16} />
            )}
            <div>
              <p className="font-medium">Ativar Todos</p>
              <p className="text-xs text-success-fg">Cria acesso para alunos sem portal</p>
            </div>
          </button>

          <button
            onClick={handleDeactivate}
            disabled={loading !== null}
            className="w-full flex items-center space-x-3 px-4 py-3 text-sm text-danger-fg hover:bg-danger-subtle transition-colors text-left"
          >
            {loading === "deactivate" ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <ShieldX size={16} />
            )}
            <div>
              <p className="font-medium">Desativar Todos</p>
              <p className="text-xs text-danger-fg">Remove acesso de todos os alunos</p>
            </div>
          </button>
        </div>
      )}
    </div>
  )
}
