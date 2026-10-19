
"use client"

import { useState } from "react"
import { ShieldCheck, Loader2, Key, X, ShieldAlert } from "lucide-react"
import { createPortalUser, updateMatricula } from "./actions"
import { useRouter } from "next/navigation"

export default function PortalActivationAction({ 
  estudanteId, 
  initialMatricula,
  hasUser 
}: { 
  estudanteId: string, 
  initialMatricula: string | null,
  hasUser: boolean 
}) {
  const [loading, setLoading] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [matricula, setMatricula] = useState(initialMatricula || "")
  const router = useRouter()

  const handleCreate = async () => {
    if (!matricula) return alert("Digite a matrícula primeiro")
    
    setLoading(true)
    
    // Se a matrícula mudou ou é nova, salva primeiro
    if (matricula !== initialMatricula) {
      const res = await (updateMatricula as any)(estudanteId, matricula)
      if (res.error) {
        alert(res.error)
        setLoading(false)
        return
      }
    }

    const res = await (createPortalUser as any)(estudanteId)
    if (res.error) {
      alert(res.error)
    } else {
      alert("Acesso ao portal ativado com sucesso! Usuário e Senha são o número da matrícula.")
      setIsModalOpen(false)
      router.refresh()
    }
    setLoading(false)
  }

  return (
    <>
      <button 
        onClick={() => setIsModalOpen(true)}
        className={`p-1.5 rounded-md transition-colors duration-150 hover:bg-subtle ${
          hasUser
          ? 'text-success-fg'
          : 'text-fg-subtle hover:text-fg'
        }`}
        title={hasUser ? "Portal Ativo" : "Ativar Acesso Estudante"}
        aria-label={hasUser ? "Portal ativo: gerenciar acesso" : "Ativar acesso ao portal"}
      >
        <ShieldCheck size={16} strokeWidth={1.75} />
      </button>

      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-zinc-900/60 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}></div>
          <div className="relative bg-white w-full max-w-md rounded-xl shadow-card overflow-hidden animate-pop-in border border-zinc-200">
            <div className="p-8">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                   <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${hasUser ? 'bg-success-subtle text-success-fg' : 'bg-zinc-100 text-fg-muted'}`}>
                      {hasUser ? <ShieldCheck size={24} /> : <ShieldAlert size={24} />}
                   </div>
                   <div>
                      <h3 className="font-bold text-fg tracking-tight">Gestão de Acesso</h3>
                      <p className="text-xs font-semibold text-fg-subtle">Ativação do Portal do Aluno</p>
                   </div>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-zinc-100 rounded-full transition-colors">
                  <X size={20} className="text-fg-subtle" />
                </button>
              </div>

              {hasUser ? (
                <div className="space-y-6">
                   <div className="bg-success-subtle p-6 rounded-lg border border-success-line text-center">
                      <p className="text-sm font-bold text-success-fg leading-tight">Este estudante já possui acesso ativo ao portal.</p>
                      <p className="text-xs text-success-fg mt-2">O login e a senha padrões registrados são a matrícula: <strong>{matricula}</strong></p>
                   </div>
                   <button 
                    onClick={() => setIsModalOpen(false)}
                    className="w-full bg-accent text-on-accent py-4 rounded-lg font-bold text-xs hover:bg-accent-hover transition-all"
                   >
                     Entendido
                   </button>
                </div>
              ) : (
                <div className="space-y-6">
                   <p className="text-sm text-fg-muted leading-relaxed font-medium">
                     Para liberar o acesso ao portal, confirme o número de matrícula do estudante. Uma conta será criada automaticamente usando este número como login e senha inicial.
                   </p>
                   
                   <div className="space-y-2">
                      <label className="text-xs font-semibold text-fg-subtle ml-1">Confirmar Matrícula</label>
                      <input 
                        type="text" 
                        value={matricula}
                        onChange={(e) => setMatricula(e.target.value)}
                        placeholder="Número da Matrícula"
                        className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-6 py-4 text-base font-bold text-fg outline-none focus:ring-4 focus:ring-zinc-900/5 focus:bg-white transition-all shadow-card"
                      />
                   </div>

                   <button 
                    onClick={handleCreate}
                    disabled={loading || !matricula}
                    className="w-full bg-accent text-on-accent py-4 rounded-lg font-bold text-xs hover:bg-accent-hover transition-all flex items-center justify-center gap-2 shadow-card disabled:opacity-50"
                   >
                     {loading ? <Loader2 size={16} className="animate-spin" /> : <ShieldCheck size={16} />}
                     Ativar Acesso Agora
                   </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
