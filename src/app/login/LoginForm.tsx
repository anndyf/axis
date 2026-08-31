"use client"

import { signIn, getSession } from "next-auth/react"
import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { GraduationCap, Lock, User, Clock, CheckCircle2, AlertCircle, Loader2, X, Code } from "lucide-react"
import { resetPassword } from "./actions"

import { Suspense } from "react"

function LoginContent({ nomeEscola }: { nomeEscola: string }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  // Estados para recuperação de senha
  const [showForgotPassword, setShowForgotPassword] = useState(false)
  const [resetEmail, setResetEmail] = useState("")
  const [resetStatus, setResetStatus] = useState<{
    loading: boolean;
    success?: boolean;
    message?: string;
  }>({ loading: false })

  useEffect(() => {
    if (searchParams.get('timeout') === 'true') {
      setError("Sua sessão expirou por inatividade. Por favor, faça login novamente.")
    }
  }, [searchParams])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      const result = await signIn("credentials", {
        username: username.trim(),
        password,
        redirect: false
      })

      if (result?.error) {
        const errorMsg = result.error.toLowerCase();
        
        if (errorMsg.includes('user_not_found')) {
          setError("Usuário ou e-mail não encontrado. Verifique os dados e tente novamente.")
        } else if (errorMsg.includes('invalid_password')) {
          setError("Senha incorreta. Verifique se o Caps Lock está ligado ou recupere sua senha.")
        } else if (errorMsg.includes('user_inactive')) {
          setError("Sua conta está pausada pela administração. Entre em contato para mais informações.")
        } else if (errorMsg.includes('user_not_approved')) {
          setError("Seu cadastro ainda está pendente de aprovação pela direção.")
        } else {
          setError("Usuário ou senha inválidos. Tente novamente.")
        }
        setLoading(false)
      } else {
        const session = await getSession()
        if (session?.user?.isPortalUser) {
          router.push("/portal")
        } else {
          router.push("/dashboard")
        }
        router.refresh()
      }
    } catch (error) {
      setError("Erro ao fazer login. Tente novamente.")
      setLoading(false)
    }
    // Removido setLoading(false) do finally para manter o estado visual durante o router.push
  }

  const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setResetStatus({ loading: true, message: "" })
    
    try {
      const result = await resetPassword(resetEmail)
      setResetStatus({
        loading: false,
        success: result.success,
        message: result.message
      })
    } catch (error) {
      setResetStatus({
        loading: false,
        success: false,
        message: "Ocorreu um erro ao tentar recuperar a senha."
      })
    }
  }

  const closeResetModal = () => {
    setShowForgotPassword(false)
    setResetStatus({ loading: false, message: "" })
    setResetEmail("")
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4 relative">
      <div className="w-full max-w-md relative z-10">
        {/* Logo e Título */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-64 h-24 mb-4">
            <img src="/images/logo_axis_azul.png" alt="Áxis" className="w-full h-full object-contain" />
          </div>
          <p className="text-slate-600 font-semibold text-sm uppercase tracking-wide">
            Sistema de Gestão Acadêmica
          </p>
          <p className="text-slate-500 font-medium text-xs mt-0.5">
            {nomeEscola}
          </p>
        </div>

        {/* Card de Login */}
        <div className="bg-white rounded-2xl shadow-xl p-8 border border-slate-100">
          <h2 className="text-2xl font-semibold text-slate-800 mb-6">
            Bem-vindo(a)
          </h2>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Campo de Usuário */}
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-slate-700 mb-2">
                Usuário ou Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="block w-full pl-10 pr-3 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-slate-800"
                  placeholder="Digite seu usuário"
                  required
                />
              </div>
            </div>

            {/* Campo de Senha */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label htmlFor="password" className="block text-sm font-medium text-slate-700">
                  Senha
                </label>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-3 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-slate-800"
                  placeholder="Digite sua senha"
                  required
                />
              </div>
              <div className="flex justify-end mt-2">
                <button
                  type="button"
                  onClick={() => setShowForgotPassword(true)}
                  className="text-sm font-medium text-blue-600 hover:text-blue-700 focus:outline-none hover:underline transition-all"
                >
                  Esqueceu a senha?
                </button>
              </div>
            </div>

            {/* Mensagem de Erro */}
            {error && (
              <div className={`border px-4 py-3 rounded-lg text-sm flex items-center gap-2 ${
                error.includes('sessão expirou') 
                  ? 'bg-amber-50 border-amber-200 text-amber-700' 
                  : 'bg-red-50 border-red-200 text-red-700'
              }`}>
                {error.includes('sessão expirou') && <Clock className="w-4 h-4 shrink-0" />}
                {error}
              </div>
            )}

            {/* Botão de Login */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 px-4 rounded-lg font-medium hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="w-5 h-5 animate-spin" />}
              {loading ? "Entrando..." : "Acessar"}
            </button>
          </form>
        </div>

        {/* Rodapé estilizado */}
        <div className="flex justify-center mt-8">
          <div className="inline-flex items-center gap-2.5 px-5 py-2.5 bg-white/80 backdrop-blur-sm border border-slate-100 rounded-full shadow-sm hover:shadow-md transition-all">
            <Code size={14} className="text-slate-700" />
            <span className="text-[11px] font-medium text-slate-400">Desenvolvido por</span>
            <span className="text-[11px] font-bold text-slate-900">Andressa Mirella</span>
          </div>
        </div>
      </div>

      {/* Modal de Recuperação de Senha */}
      {showForgotPassword && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 relative animate-in zoom-in-95 duration-200 border border-slate-100">
            <button 
              onClick={closeResetModal}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors bg-slate-100 p-1 rounded-full"
            >
              <X className="w-5 h-5" />
            </button>
            
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-100 rounded-xl mb-4 text-blue-600">
                <Lock className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-semibold text-slate-800">Recuperar Senha</h3>
              <p className="text-slate-600 mt-2 text-sm leading-relaxed">
                Digite seu e-mail cadastrado para receber uma nova senha de acesso.
              </p>
            </div>

            {resetStatus.message ? (
               <div className={`mb-6 p-4 rounded-lg flex items-start gap-3 border ${
                 resetStatus.success ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'
               }`}>
                 {resetStatus.success ? (
                   <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
                 ) : (
                   <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                 )}
                 <div className="text-left">
                   <p className="font-semibold">{resetStatus.success ? 'E-mail enviado!' : 'Erro'}</p>
                   <p className="text-sm mt-1 text-opacity-90">{resetStatus.message}</p>
                 </div>
               </div>
            ) : null}

            {(!resetStatus.success || !resetStatus.message) && (
              <form onSubmit={handleForgotPasswordSubmit} className="space-y-4">
                <div>
                  <label htmlFor="reset-email" className="block text-sm font-medium text-slate-700 mb-1">
                    E-mail Cadastrado
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <User className="h-5 w-5 text-slate-400" />
                    </div>
                    <input
                      id="reset-email"
                      type="email"
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      className="block w-full pl-10 pr-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-slate-800"
                      placeholder="exemplo@email.com"
                      required
                      disabled={resetStatus.loading}
                    />
                  </div>
                </div>
                
                <button
                  type="submit"
                  disabled={resetStatus.loading}
                  className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-2.5 px-4 rounded-lg font-medium hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-md hover:shadow-lg"
                >
                  {resetStatus.loading && <Loader2 className="w-4 h-4 animate-spin" />}
                  {resetStatus.loading ? "Processando..." : "Enviar Nova Senha"}
                </button>
              </form>
            )}

            {resetStatus.success && (
              <button
                onClick={closeResetModal}
                className="w-full mt-2 bg-slate-100 text-slate-700 py-2.5 px-4 rounded-lg font-medium hover:bg-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 transition-all"
              >
                Voltar para Login
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default function LoginForm({ nomeEscola }: { nomeEscola: string }) {
  return (
    <Suspense fallback={<div className="min-h-screen flex text-slate-500 items-center justify-center p-4">Carregando sistema...</div>}>
      <LoginContent nomeEscola={nomeEscola} />
    </Suspense>
  )
}
