"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { 
  ArrowLeft, Save, Loader2, Shield, User, Mail, 
  AlertCircle, Key, Calendar, CheckCircle2, ChevronRight,
  ShieldCheck, UserCircle, Settings2, Fingerprint, Accessibility
} from "lucide-react"

interface UsuarioFormProps {
  usuario?: {
    id: string
    name: string | null
    email: string
    username: string
    isSuperuser: boolean
    isDirecao: boolean
    isStaff: boolean
    isAEE?: boolean
    lastLogin?: string | null
  }
  isEdit?: boolean
}

export default function UsuarioForm({ usuario, isEdit = false }: UsuarioFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  
  const [formData, setFormData] = useState({
    name: usuario?.name || "",
    email: usuario?.email || "",
    password: "",
    isSuperuser: usuario?.isSuperuser || false,
    isDirecao: usuario?.isDirecao || false,
    isStaff: usuario?.isStaff || !isEdit,
    isAEE: (usuario as any)?.isAEE || false,
  })

  const formatLastLogin = (date: string | null | undefined) => {
    if (!date) return "Nunca"
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
    }).format(new Date(date))
  }

  const [showConfirm, setShowConfirm] = useState(false)
  
  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    setLoading(true)
    setError("")

    try {
      const url = isEdit ? `/api/usuarios/${usuario?.id}` : '/api/usuarios'
      const payload = { ...formData }
      if (isEdit && !payload.password) {
        delete (payload as any).password
      }

      const response = await fetch(url, {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (response.ok) {
        router.push('/dashboard/usuarios')
        router.refresh()
      } else {
        const data = await response.json()
        setError(`${data.message || 'Erro ao processar'}${data.detail ? ': ' + data.detail : ''}`)
        setShowConfirm(false)
      }
    } catch (err) {
      setError('Erro ao conectar com o servidor')
      setShowConfirm(false)
    } finally {
      setLoading(false)
    }
  }

  const roles = [
    { 
      id: 'isStaff', 
      label: 'Professor', 
      desc: 'Lançamento de notas das disciplinas permitidas',
      icon: <UserCircle className="w-5 h-5" />,
      color: 'blue' 
    },
    { 
      id: 'isDirecao', 
      label: 'Gestão Escolar', 
      desc: 'Acesso total a relatórios e visualização de turmas',
      icon: <ShieldCheck className="w-5 h-5" />,
      color: 'purple' 
    },
    { 
      id: 'isSuperuser', 
      label: 'Administrador (T.I)', 
      desc: 'Controle completo, logs e gestão de usuários',
      icon: <Fingerprint className="w-5 h-5" />,
      color: 'slate' 
    },
    { 
      id: 'isAEE', 
      label: 'Especialista AEE', 
      desc: 'Acesso exclusivo para gestão de alunos com necessidades especiais',
      icon: <Accessibility className="w-5 h-5" />,
      color: 'teal' 
    }
  ]

  return (
    <div className="min-h-screen bg-[#f1f5f9] pb-20">
      {/* Navbar Minimalista */}
      <nav className="bg-white/70 backdrop-blur-xl sticky top-0 z-50 border-b border-zinc-200">
        <div className="max-w-3xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <Link 
              href="/dashboard/usuarios" 
              className="flex items-center space-x-2 text-fg-subtle hover:text-fg transition-colors font-semibold text-sm"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Voltar</span>
            </Link>
            
            <div className="flex items-center space-x-2">
               <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
               <span className="text-[10px] font-semibold uppercase tracking-widest text-fg-subtle">
                  Sistema de Resultados
               </span>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-6 mt-12">
        {/* Título Centralizado */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-semibold text-fg tracking-tight mb-2">
            {isEdit ? 'Editar Acesso' : 'Novo Colaborador'}
          </h1>
          <p className="text-fg-subtle font-medium">
            {isEdit ? 'Atualize as credenciais e permissões do usuário' : 'Crie uma nova conta com envio automático de senha'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="p-4 bg-danger-subtle border-l-4 border-danger rounded-r-xl text-danger-fg flex items-center shadow-sm">
              <AlertCircle className="w-5 h-5 mr-3 shrink-0" />
              <span className="text-sm font-semibold">{error}</span>
            </div>
          )}

          {/* Seção 1: Dados do Usuário */}
          <div className="bg-white rounded-xl p-8 shadow-sm border border-zinc-200">
            <div className="flex items-center space-x-4 mb-8">
               <div className="w-10 h-10 bg-zinc-900 rounded-lg flex items-center justify-center text-white">
                  <User className="w-5 h-5" />
               </div>
               <h2 className="text-xl font-semibold text-fg tracking-tight">Informações Básicas</h2>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-xs font-semibold text-fg-subtle uppercase tracking-widest mb-2 ml-1">
                  Nome Completo
                </label>
                <input 
                  type="text" required value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full px-6 py-4 bg-zinc-50 border border-zinc-200 rounded-lg focus:ring-4 focus:ring-ring focus:border-accent focus:bg-white transition-all outline-none font-semibold text-fg-muted"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-semibold text-fg-subtle uppercase tracking-widest mb-2 ml-1">
                    E-mail do Usuário
                  </label>
                  <input 
                    type="email" required value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    className="w-full px-6 py-4 bg-zinc-50 border border-zinc-200 rounded-lg focus:ring-4 focus:ring-ring focus:border-accent focus:bg-white transition-all outline-none font-semibold text-fg-muted"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-fg-subtle uppercase tracking-widest mb-2 ml-1">
                    {isEdit ? 'Alterar Senha' : 'Senha Inicial'}
                  </label>
                  <input 
                    type="password" required={!isEdit}
                    value={formData.password}
                    onChange={(e) => setFormData({...formData, password: e.target.value})}
                    placeholder={isEdit ? "Deixe em branco..." : "••••••••"}
                    className="w-full px-6 py-4 bg-zinc-50 border border-zinc-200 rounded-lg focus:ring-4 focus:ring-ring focus:border-accent focus:bg-white transition-all outline-none font-semibold text-fg-muted"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Seção 2: Níveis de Acesso */}
          <div className="bg-white rounded-xl p-8 shadow-sm border border-zinc-200">
            <div className="flex items-center space-x-4 mb-8">
               <div className="w-10 h-10 bg-accent rounded-lg flex items-center justify-center text-on-accent shadow-card">
                  <Settings2 className="w-5 h-5" />
               </div>
               <h2 className="text-xl font-semibold text-fg tracking-tight">Nível de Permissão</h2>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {roles.map((role) => {
                const isActive = (formData as any)[role.id]
                return (
                  <label 
                    key={role.id} 
                    className={`flex items-center p-6 rounded-xl border-2 transition-all cursor-pointer ${
                      isActive 
                        ? 'bg-zinc-900 border-zinc-900 text-white shadow-card translate-y-[-2px]' 
                        : 'bg-white border-zinc-100 hover:border-zinc-300'
                    }`}
                  >
                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center mr-5 ${
                      isActive ? 'bg-white/10 text-white' : 'bg-zinc-100 text-fg-subtle'
                    }`}>
                      {role.icon}
                    </div>
                    <div className="flex-grow">
                       <p className={`font-semibold uppercase tracking-tight text-sm ${isActive ? 'text-white' : 'text-fg'}`}>
                          {role.label}
                       </p>
                       <p className={`text-xs ${isActive ? 'text-fg-subtle' : 'text-fg-subtle'}`}>
                          {role.desc}
                       </p>
                    </div>
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                      isActive ? 'border-accent bg-accent' : 'border-zinc-200'
                    }`}>
                       {isActive && <CheckCircle2 className="w-4 h-4 text-white" />}
                    </div>
                    <input 
                      type="checkbox" className="hidden" 
                      checked={isActive}
                      onChange={(e) => setFormData({...formData, [role.id]: e.target.checked})}
                    />
                  </label>
                )
              })}
            </div>
          </div>

          {/* Info Adicional + Botão */}
          <div className="space-y-6">
            {!isEdit && (
              <div className="flex items-center space-x-3 text-accent-fg bg-accent-subtle p-4 rounded-lg border border-accent/25">
                 <Mail className="w-5 h-5" />
                 <p className="text-xs font-semibold leading-tight">
                    Um e-mail de ativação com a senha gerada será enviado automaticamente para o endereço informado acima.
                 </p>
              </div>
            )}

            {isEdit && (
              <div className="bg-zinc-100 p-4 rounded-lg flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Calendar className="w-4 h-4 text-fg-subtle" />
                  <span className="text-xs font-semibold text-fg-subtle uppercase tracking-widest">Último Acesso</span>
                </div>
                <span className="text-sm font-semibold text-fg-muted">{formatLastLogin(usuario?.lastLogin)}</span>
              </div>
            )}

            <button
              type="button" 
              onClick={() => setShowConfirm(true)}
              disabled={loading}
              className="w-full flex items-center justify-center space-x-3 bg-zinc-900 text-white py-6 rounded-xl font-semibold text-lg hover:bg-zinc-800 transition-all shadow-card active:scale-[0.98] disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Save className="w-6 h-6" />}
              <span>{isEdit ? 'Salvar Alterações' : 'Finalizar Cadastro'}</span>
              {!loading && !isEdit && <ChevronRight className="w-5 h-5" />}
            </button>
          </div>
        </form>
      </main>

      {/* Modal de Confirmação */}
      {showConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-zinc-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white w-full max-w-md rounded-xl p-8 shadow-overlay animate-pop-in">
            <div className="w-16 h-16 bg-accent-subtle text-accent-fg rounded-lg flex items-center justify-center mb-6">
              <Shield className="w-8 h-8" />
            </div>
            <h3 className="text-2xl font-semibold text-fg mb-2">Confirmar Alterações?</h3>
            <p className="text-fg-subtle font-medium mb-8">
              Você está prestes a {isEdit ? 'atualizar os dados deste usuário' : 'criar um novo acesso no sistema'}. Deseja prosseguir?
            </p>
            <div className="grid grid-cols-2 gap-4">
              <button 
                onClick={() => setShowConfirm(false)}
                className="py-4 rounded-lg font-semibold text-fg-subtle hover:bg-zinc-50 transition-all"
              >
                Cancelar
              </button>
              <button 
                onClick={() => handleSubmit()}
                className="py-4 rounded-lg font-semibold bg-zinc-900 text-white hover:bg-zinc-800 transition-all shadow-card"
              >
                Sim, Salvar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
