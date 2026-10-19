"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { redefinirSenha } from "@/app/login/actions"
import AcessoLayout, { type EscolaDoAcesso } from "@/components/AcessoLayout"
import { Alert, Button, ForcaDaSenha, PasswordInput, buttonClasses } from "@/components/ui"
import { SENHA_MINIMA } from "@/lib/services/forca-senha"

/**
 * Formulário de nova senha, usado em dois fluxos:
 * - "redefinir": link de "esqueci minha senha" (token do e-mail, sem login)
 * - "trocar": troca obrigatória no 1º acesso (logado, pede a senha atual)
 */
export default function NovaSenhaForm({ modo, token, destino, escola }: {
  modo: "redefinir" | "trocar"
  token?: string
  destino?: string
  escola: EscolaDoAcesso
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
    if (nova.length < SENHA_MINIMA) { setErro(`A nova senha precisa ter pelo menos ${SENHA_MINIMA} caracteres.`); return }
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
          body: JSON.stringify({ currentPassword: atual, newPassword: nova }),
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

  const confirmacaoErrada = confirmacao.length > 0 && confirmacao !== nova

  return (
    <AcessoLayout
      escola={escola}
      titulo={modo === "redefinir" ? "Criar nova senha" : "Crie sua senha"}
      descricao={modo === "redefinir" ? "Escolha uma nova senha para sua conta." : "Por segurança, troque a senha provisória antes de continuar."}
    >
      {sucesso ? (
        <div className="space-y-5">
          <Alert tone="success" title="Senha alterada">{sucesso}</Alert>
          <Link href="/login" className={buttonClasses({ className: "w-full" })}>Ir para o login</Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5" noValidate>
          {erro && <Alert tone="danger">{erro}</Alert>}
          {modo === "trocar" && (
            <div className="space-y-1.5">
              <label htmlFor="atual" className="block text-13 font-medium text-fg">Senha atual (provisória)</label>
              <PasswordInput id="atual" value={atual} onChange={(e) => setAtual(e.target.value)} autoComplete="current-password" required autoFocus />
            </div>
          )}
          <div className="space-y-1.5">
            <label htmlFor="nova" className="block text-13 font-medium text-fg">Nova senha</label>
            <PasswordInput id="nova" value={nova} onChange={(e) => setNova(e.target.value)} autoComplete="new-password" required autoFocus={modo === "redefinir"} aria-describedby="forca" />
            <div id="forca"><ForcaDaSenha senha={nova} /></div>
          </div>
          <div className="space-y-1.5">
            <label htmlFor="confirmacao" className="block text-13 font-medium text-fg">Confirme a nova senha</label>
            <PasswordInput id="confirmacao" value={confirmacao} onChange={(e) => setConfirmacao(e.target.value)} autoComplete="new-password" required aria-invalid={confirmacaoErrada || undefined} />
            {confirmacaoErrada && <p className="text-xs text-danger-fg">As senhas não conferem.</p>}
          </div>
          <Button type="submit" loading={loading} className="w-full">Salvar nova senha</Button>
          {modo === "redefinir" && (
            <p className="text-center text-13 text-fg-muted"><Link href="/login" className="font-medium text-accent-fg hover:underline">Voltar para o login</Link></p>
          )}
        </form>
      )}
    </AcessoLayout>
  )
}
