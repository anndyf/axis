"use client"

import { useState } from "react"
import { Lock, Key, CheckCircle2, AlertCircle, Save } from "lucide-react"
import { useSession } from "next-auth/react"

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
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-medium text-fg tracking-tight flex items-center gap-3">
          <div className="w-10 h-10 bg-zinc-200 rounded-xl flex items-center justify-center">
            <Lock className="w-6 h-6 text-fg-muted" />
          </div>
          Meu Perfil
        </h1>
        <p className="text-fg-muted font-medium ml-14">Gerencie suas informações de acesso.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* User Info Card */}
        <div className="md:col-span-1 space-y-6">
          <div className="bg-white rounded-xl p-6 shadow-card border border-zinc-200 relative overflow-hidden group">
             <div className="absolute top-0 left-0 w-full h-24 bg-zinc-500" />
             
             <div className="relative flex flex-col items-center mt-8">
                <div className="w-20 h-20 bg-white p-1 rounded-full shadow-card">
                  <div className="w-full h-full rounded-full bg-zinc-200 flex items-center justify-center text-2xl font-medium text-fg-muted">
                    {session?.user?.name?.charAt(0).toUpperCase() || "U"}
                  </div>
                </div>
                
                <h3 className="mt-4 text-lg font-medium text-fg text-center leading-tight">
                  {session?.user?.name}
                </h3>
                <p className="text-sm font-medium text-fg-muted text-center">
                  {session?.user?.email}
                </p>
                
                <div className="mt-4 inline-flex items-center px-3 py-1 rounded-full bg-zinc-50 text-fg-muted text-xs font-medium uppercase tracking-wider">
                  {session?.user?.isSuperuser ? "Administrador" : "Professor"}
                </div>
             </div>
          </div>
        </div>

        {/* Change Password Form */}
        <div id="senha" className="md:col-span-2 scroll-mt-20">
          <div className="bg-white rounded-xl p-8 shadow-card border border-zinc-200">
            <h2 className="text-xl font-medium text-fg mb-6 flex items-center gap-2">
              <Key className="w-5 h-5 text-fg-muted" />
              Alterar Senha
            </h2>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <label className="text-xs font-medium text-fg-subtle uppercase tracking-widest ml-1">
                  Senha Atual
                </label>
                <input
                  type="password"
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full h-12 px-4 rounded-xl bg-zinc-50 border border-zinc-300 text-fg font-medium focus:ring-4 focus:ring-zinc-500/10 focus:border-zinc-500 transition-all outline-none"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <label className="text-xs font-medium text-fg-subtle uppercase tracking-widest ml-1">
                    Nova Senha
                  </label>
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full h-12 px-4 rounded-xl bg-zinc-50 border border-zinc-300 text-fg font-medium focus:ring-4 focus:ring-zinc-500/10 focus:border-zinc-500 transition-all outline-none"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-medium text-fg-subtle uppercase tracking-widest ml-1">
                    Confirmar Nova Senha
                  </label>
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full h-12 px-4 rounded-xl bg-zinc-50 border border-zinc-300 text-fg font-medium focus:ring-4 focus:ring-zinc-500/10 focus:border-zinc-500 transition-all outline-none"
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
                  className="h-12 px-8 bg-zinc-900 text-white rounded-xl font-medium shadow-card hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2 group"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <Save className="w-4 h-4 group-hover:scale-110 transition-transform" />
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
          <div className="bg-white w-full max-w-sm rounded-xl p-8 shadow-overlay animate-pop-in">
            <div className="w-16 h-16 bg-zinc-100 text-fg-muted rounded-lg flex items-center justify-center mb-6">
              <Key className="w-8 h-8" />
            </div>
            <h3 className="text-2xl font-medium text-fg mb-2">Alterar Senha?</h3>
            <p className="text-fg-muted font-medium mb-8">
              Sua senha atual será substituída pela nova. Deseja confirmar esta ação?
            </p>
            <div className="grid grid-cols-2 gap-4">
              <button 
                onClick={() => setShowConfirm(false)}
                className="py-4 rounded-lg font-medium text-fg-muted hover:bg-zinc-50 transition-all"
              >
                Cancelar
              </button>
              <button 
                onClick={() => handleSubmit()}
                className="py-4 rounded-lg font-medium bg-zinc-900 text-white hover:bg-zinc-800 transition-all shadow-card"
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
