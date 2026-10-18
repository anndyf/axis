"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Lock, Loader2, CheckCircle2, AlertCircle } from "lucide-react"
import { redefinirSenha } from "@/app/login/actions"

/**
 * Formulário de nova senha, usado em dois fluxos:
 * - "redefinir": link de "esqueci minha senha" (token do e-mail, sem login)
 * - "trocar": troca obrigatória no 1º acesso (logado, pede a senha atual)
 */
export default function NovaSenhaForm({ modo, token, destino, nomeEscola }: {
  modo: "redefinir" | "trocar"
  token?: string
  destino?: string
  nomeEscola: string
}) {
  const router = useRouter()
  const [atual, setAtual] = useState("")
  const [nova, setNova] = useState("")
  const [confirmacao, setConfirmacao] = useState("")
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState("")
  const [sucesso, setSucesso] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErro("")
    if (nova.length < 8) { setErro("A nova senha precisa ter pelo menos 8 caracteres."); return }
    if (nova !== confirmacao) { setErro("A confirmação não confere com a nova senha."); return }

    setLoading(true)
    try {
      if (modo === "redefinir") {
        const r = await redefinirSenha(token || "", nova)
        if (r.success) setSucesso(r.message)
        else setErro(r.message)
      } else {
        const res = await fetch("/api/auth/change-password", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ currentPassword: atual, newPassword: nova })
        })
        const data = await res.json()
        if (res.ok) {
          router.push(destino || "/dashboard")
          router.refresh()
          return
        }
        setErro(data.message || "Erro ao trocar a senha.")
      }
    } catch {
      setErro("Erro ao conectar com o servidor.")
    } finally {
      setLoading(false)
    }
  }

  const campo = (id: string, rotulo: string, valor: string, set: (v: string) => void, autoComplete: string) => (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-slate-700 mb-2">{rotulo}</label>
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Lock className="h-5 w-5 text-slate-400" />
        </div>
        <input
          id={id} type="password" value={valor} autoComplete={autoComplete} required
          onChange={(e) => set(e.target.value)}
          className="block w-full pl-10 pr-3 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-slate-800"
        />
      </div>
    </div>
  )

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-64 h-24 mb-4">
            <img src="/images/logo_axis_azul.png" alt="Áxis" className="w-full h-full object-contain" />
          </div>
          <p className="text-slate-500 font-medium text-xs">{nomeEscola}</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8 border border-slate-100">
          <h2 className="text-2xl font-semibold text-slate-800 mb-2">
            {modo === "redefinir" ? "Criar nova senha" : "Crie sua senha"}
          </h2>
          <p className="text-sm text-slate-500 mb-6">
            {modo === "redefinir"
              ? "Escolha uma nova senha para sua conta."
              : "Por segurança, troque a senha provisória antes de continuar."}
          </p>

          {sucesso ? (
            <div className="space-y-6">
              <div className="p-4 bg-green-50 text-green-700 border border-green-200 rounded-lg flex gap-3">
                <CheckCircle2 className="w-5 h-5 shrink-0" />
                <p className="text-sm">{sucesso}</p>
              </div>
              <Link href="/login" className="block w-full text-center bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-all">
                Ir para o login
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {modo === "trocar" && campo("atual", "Senha atual (provisória)", atual, setAtual, "current-password")}
              {campo("nova", "Nova senha (mínimo 8 caracteres)", nova, setNova, "new-password")}
              {campo("confirmacao", "Confirme a nova senha", confirmacao, setConfirmacao, "new-password")}

              {erro && (
                <div className="p-3 bg-red-50 text-red-700 border border-red-200 rounded-lg flex gap-2 text-sm">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{erro}</span>
                </div>
              )}

              <button
                type="submit" disabled={loading}
                className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-all disabled:opacity-50"
              >
                {loading && <Loader2 className="w-5 h-5 animate-spin" />}
                Salvar nova senha
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
