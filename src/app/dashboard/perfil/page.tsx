"use client"

// @modulo NUC - página cliente; o Núcleo está sempre ativo (guarda nas rotas que ela chama)
import { useState } from "react"
import { Lock, Key, CheckCircle2, AlertCircle, Save } from "lucide-react"
import { useSession } from "next-auth/react"
import { can, papeisDoUsuario } from "@/lib/rbac"

/** Era isSuperuser ? "Administrador" : "Professor"; Secretaria e Coordenação ganham o próprio nome. */
function rotuloDoPerfil(user: Parameters<typeof can>[0]) {
  if (can(user, "escola.administrar")) return "Administrador"
  const papeis = user ? papeisDoUsuario(user) : []
  if (papeis.includes("SECRETARIA")) return "Secretaria"
  if (papeis.includes("COORDENACAO")) return "Coordenação"
  return "Professor"
}

export default function ProfilePage() {
  const { data: session } = useSession()
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showConfirm, setShowConfirm] = useState(false)

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    
    if (!showConfirm) {
      setShowConfirm(true)
      return
    }

    setLoading(true)
    setError(null)
    setSuccess(false)
    setShowConfirm(false)

    if (newPassword !== confirmPassword) {
      setError("As novas senhas não coincidem")
      setLoading(false)
      return
    }

    if (newPassword.length < 6) {
      setError("A nova senha deve ter pelo menos 6 caracteres")
      setLoading(false)
      return
    }

    try {
      const res = await fetch("/api/auth/change-password", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword })
      })

      const data = await res.json()

      if (res.ok) {
        setSuccess(true)
        setCurrentPassword("")
        setNewPassword("")
        setConfirmPassword("")
      } else {
        setError(data.message || "Erro ao alterar senha")
      }
    } catch (err) {
      setError("Erro na conexão com o servidor")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-leitura space-y-5">
      <div>
        <h1 className="text-xl font-medium text-fg tracking-tight flex items-center gap-3">
          <div className="w-10 h-10 bg-subtle-hover rounded-xl flex items-center justify-center">
            <Lock className="w-6 h-6 text-fg-muted" />
          </div>
          Meu Perfil
        </h1>
        <p className="text-fg-muted font-medium ml-14">Gerencie suas informações de acesso.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* User Info Card */}
        <div className="md:col-span-1 space-y-4">
          <div className="bg-surface rounded-xl p-4 border border-line relative overflow-hidden group">
             <div className="absolute top-0 left-0 w-full h-24 bg-zinc-500" />
             
             <div className="relative flex flex-col items-center mt-4">
                <div className="w-12 h-12 bg-surface p-1 rounded-full">
                  <div className="w-full h-full rounded-full bg-subtle-hover flex items-center justify-center text-2xl font-medium text-fg-muted">
                    {session?.user?.name?.charAt(0).toUpperCase() || "U"}
                  </div>
                </div>
                
                <h3 className="mt-4 text-lg font-medium text-fg text-center leading-tight">
                  {session?.user?.name}
                </h3>
                <p className="text-sm font-medium text-fg-muted text-center">
                  {session?.user?.email}
                </p>
                
                <div className="mt-4 inline-flex items-center px-3 py-1 rounded-full bg-canvas text-fg-muted text-xs font-medium">
                  {rotuloDoPerfil(session?.user)}
                </div>
             </div>
          </div>
        </div>

        {/* Change Password Form */}
        <div id="senha" className="md:col-span-2 scroll-mt-20">
          <div className="bg-surface rounded-xl p-4 border border-line">
            <h2 className="text-xl font-medium text-fg mb-6 flex items-center gap-2">
              <Key className="w-5 h-5 text-fg-muted" />
              Alterar Senha
            </h2>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <label className="text-xs font-medium text-fg-subtle ml-1">
                  Senha Atual
                </label>
                <input
                  type="password"
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full h-12 px-4 rounded-xl bg-canvas border border-line-strong text-fg font-medium focus:ring-4 focus:ring-zinc-500/10 focus:border-zinc-500 transition-all outline-none"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <label className="text-xs font-medium text-fg-subtle ml-1">
                    Nova Senha
                  </label>
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full h-12 px-4 rounded-xl bg-canvas border border-line-strong text-fg font-medium focus:ring-4 focus:ring-zinc-500/10 focus:border-zinc-500 transition-all outline-none"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-medium text-fg-subtle ml-1">
                    Confirmar Nova Senha
                  </label>
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full h-12 px-4 rounded-xl bg-canvas border border-line-strong text-fg font-medium focus:ring-4 focus:ring-zinc-500/10 focus:border-zinc-500 transition-all outline-none"
                  />
                </div>
              </div>

              {error && (
                <div className="p-4 bg-danger-subtle border border-danger-line rounded-xl text-danger-fg text-xs font-medium flex items-center gap-2 animate-slide-up">
                  <AlertCircle className="w-4 h-4" />
                  {error}
                </div>
              )}

              {success && (
                <div className="p-4 bg-success-subtle border border-success-line rounded-xl text-success-fg text-xs font-medium flex items-center gap-2 animate-slide-up">
                  <CheckCircle2 className="w-4 h-4" />
                  Senha alterada com sucesso!
                </div>
              )}

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => handleSubmit()}
                  disabled={loading}
                  className="h-12 px-4 bg-accent text-on-accent rounded-xl font-medium hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2 group"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <Save className="w-4 h-4 group- transition-transform" />
                      Salvar Alterações
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Modal de Confirmação para Senha */}
      {showConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-zinc-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-surface w-full max-w-sm rounded-xl p-4 shadow-overlay animate-pop-in">
            <div className="w-16 h-16 bg-subtle text-fg-muted rounded-lg flex items-center justify-center mb-6">
              <Key className="w-8 h-8" />
            </div>
            <h3 className="text-2xl font-medium text-fg mb-2">Alterar Senha?</h3>
            <p className="text-fg-muted font-medium mb-4">
              Sua senha atual será substituída pela nova. Deseja confirmar esta ação?
            </p>
            <div className="grid grid-cols-2 gap-4">
              <button 
                onClick={() => setShowConfirm(false)}
                className="py-4 rounded-lg font-medium text-fg-muted hover:bg-canvas transition-all"
              >
                Cancelar
              </button>
              <button 
                onClick={() => handleSubmit()}
                className="py-4 rounded-lg font-medium bg-accent text-on-accent hover:bg-accent-hover transition-all"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
