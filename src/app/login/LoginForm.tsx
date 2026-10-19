"use client"

import { signIn, getSession } from "next-auth/react"
import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { resetPassword } from "./actions"
import AcessoLayout, { type EscolaDoAcesso } from "@/components/AcessoLayout"
import { Alert, Button, Field, Input, PasswordInput } from "@/components/ui"
import { Dialog } from "@/components/ui/Dialog"

// Mensagem para cada código do ErroLogin (src/lib/auth.ts). Usuário inexistente
// e senha errada caem no mesmo "credenciais" de propósito.
const MENSAGENS: Record<string, { titulo: string; texto: string }> = {
  inativo: { titulo: "Conta pausada", texto: "Sua conta está pausada pela administração. Entre em contato com a escola para mais informações." },
  pendente: { titulo: "Cadastro em análise", texto: "Seu cadastro ainda está pendente de aprovação pela direção." },
  bloqueado: { titulo: "Acesso bloqueado temporariamente", texto: "Muitas tentativas sem sucesso. Aguarde 15 minutos ou crie uma nova senha pelo link “Esqueci minha senha”." },
  escola: { titulo: "Escola não identificada", texto: "Não foi possível identificar a escola por este endereço. Confira o endereço de acesso." },
  credenciais: { titulo: "Usuário ou senha incorretos", texto: "Confira os dados digitados (atenção ao Caps Lock) ou crie uma nova senha." },
}

function LoginContent({ escola }: { escola: EscolaDoAcesso }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<{ titulo: string; texto: string } | null>(null)
  const [loading, setLoading] = useState(false)

  // Recuperação de senha
  const [showForgotPassword, setShowForgotPassword] = useState(false)
  const [resetEmail, setResetEmail] = useState("")
  const [resetStatus, setResetStatus] = useState<{ loading: boolean; success?: boolean; message?: string }>({ loading: false })

  useEffect(() => {
    if (searchParams.get("timeout") === "true") {
      setError({ titulo: "Sessão encerrada", texto: "Sua sessão expirou por inatividade. Entre novamente para continuar." })
    }
  }, [searchParams])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const result = await signIn("credentials", {
        username: username.trim(),
        password,
        redirect: false,
      })

      if (result?.error) {
        setError(MENSAGENS[result.code ?? ""] ?? MENSAGENS.credenciais)
        setLoading(false)
      } else {
        const session = await getSession()
        router.push(session?.user?.isPortalUser ? "/portal" : "/dashboard")
        router.refresh()
      }
    } catch {
      setError({ titulo: "Não foi possível entrar", texto: "Erro de conexão. Tente novamente em instantes." })
      setLoading(false)
    }
    // Sem setLoading(false) no sucesso: mantém o estado visual durante o router.push
  }

  const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setResetStatus({ loading: true, message: "" })
    try {
      const result = await resetPassword(resetEmail)
      setResetStatus({ loading: false, success: result.success, message: result.message })
    } catch {
      setResetStatus({ loading: false, success: false, message: "Ocorreu um erro ao tentar recuperar a senha." })
    }
  }

  const closeResetModal = () => {
    setShowForgotPassword(false)
    setResetStatus({ loading: false, message: "" })
    setResetEmail("")
  }

  return (
    <AcessoLayout escola={escola} titulo="Entrar" descricao={`Acesse o sistema de ${escola.nome}.`}>
      <form onSubmit={handleSubmit} className="space-y-5">
        {error && <Alert tone="danger" title={error.titulo}>{error.texto}</Alert>}

        <Field label="Usuário ou e-mail">
          {(p) => (
            <Input
              {...p}
              name="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              required
              autoFocus
            />
          )}
        </Field>

        <div className="space-y-1.5">
          <div className="flex items-baseline justify-between">
            <label htmlFor="password" className="text-13 font-medium text-fg">Senha</label>
            <button type="button" onClick={() => setShowForgotPassword(true)} className="rounded-sm text-13 font-medium text-accent-fg hover:underline">
              Esqueci minha senha
            </button>
          </div>
          <PasswordInput
            id="password"
            name="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
        </div>

        <Button type="submit" loading={loading} className="w-full">
          {loading ? "Entrando…" : "Entrar"}
        </Button>
      </form>

      <Dialog
        open={showForgotPassword}
        onClose={closeResetModal}
        title="Esqueci minha senha"
        description="Informe o e-mail cadastrado. Você vai receber um link para criar uma nova senha."
        size="sm"
      >
        <div className="space-y-4">
          {resetStatus.message && (
            <Alert tone={resetStatus.success ? "success" : "danger"} title={resetStatus.success ? "Pedido registrado" : "Não foi possível enviar"}>
              {resetStatus.message}
            </Alert>
          )}
          {(!resetStatus.success || !resetStatus.message) ? (
            <form onSubmit={handleForgotPasswordSubmit} className="space-y-4">
              <Field label="E-mail">
                {(p) => (
                  <Input {...p} type="email" value={resetEmail} onChange={(e) => setResetEmail(e.target.value)} placeholder="nome@exemplo.com" autoComplete="email" required disabled={resetStatus.loading} data-autofocus />
                )}
              </Field>
              <div className="flex justify-end gap-2">
                <Button variant="secondary" onClick={closeResetModal}>Cancelar</Button>
                <Button type="submit" loading={resetStatus.loading} disabled={!resetEmail}>Enviar link</Button>
              </div>
            </form>
          ) : (
            <div className="flex justify-end">
              <Button variant="secondary" onClick={closeResetModal}>Voltar para o login</Button>
            </div>
          )}
        </div>
      </Dialog>
    </AcessoLayout>
  )
}

export default function LoginForm({ escola }: { escola: EscolaDoAcesso }) {
  return (
    <Suspense fallback={<div className="flex min-h-dvh items-center justify-center bg-surface text-sm text-fg-subtle">Carregando…</div>}>
      <LoginContent escola={escola} />
    </Suspense>
  )
}
