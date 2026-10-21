
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
    if (!confirm("Atenção: isso removerá o acesso de TODOS os alunos ao portal. Eles não conseguirão logar até que o acesso seja reativado individualmente. Deseja continuar?")) {
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
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={loading !== null}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        className="flex h-9 items-center justify-between md:justify-start w-full md:w-auto gap-2 bg-surface text-fg border border-line px-3 rounded-md hover:bg-subtle transition-colors duration-150 font-medium text-sm disabled:opacity-50"
      >
        <div className="flex items-center space-x-2">
          <Shield size={16} strokeWidth={1.75} className="text-fg-subtle" />
          <span>Gestão de acessos</span>
        </div>
        <ChevronDown size={14} className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 left-0 md:left-auto mt-2 w-full md:w-64 bg-elevated rounded-lg shadow-overlay border border-line py-1 z-50 animate-pop-in">
          <div className="px-3 py-1.5 mb-1 border-b border-line-subtle">
            <span className="text-xs font-medium text-fg-subtle">Ações em lote</span>
          </div>
          
          <button
            onClick={handleActivate}
            disabled={loading !== null}
            role="menuitem"
            className="w-full flex items-center gap-3 px-3 py-2 text-sm text-fg hover:bg-subtle transition-colors duration-150 text-left"
          >
            {loading === "activate" ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <ShieldCheck size={16} strokeWidth={1.75} className="text-fg-subtle" />
            )}
            <div>
              <p className="font-medium">Ativar todos</p>
              <p className="text-xs text-fg-subtle">Cria acesso para alunos sem portal</p>
            </div>
          </button>

          <button
            onClick={handleDeactivate}
            disabled={loading !== null}
            role="menuitem"
            className="w-full flex items-center gap-3 px-3 py-2 text-sm text-danger-fg hover:bg-danger-subtle transition-colors duration-150 text-left"
          >
            {loading === "deactivate" ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <ShieldX size={16} strokeWidth={1.75} />
            )}
            <div>
              <p className="font-medium">Desativar todos</p>
              <p className="text-xs text-fg-subtle">Remove acesso de todos os alunos</p>
            </div>
          </button>
        </div>
      )}
    </div>
  )
}
