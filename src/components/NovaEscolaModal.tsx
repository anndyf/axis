"use client"

import { useState } from "react"
import { X, Save, Loader2, Building2 } from "lucide-react"

interface NovaEscolaModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: (escola: any) => void
}

const PLANOS = ["BASICO", "PRO", "ENTERPRISE"]
const labelPlano: Record<string, string> = { BASICO: "Básico", PRO: "Pro", ENTERPRISE: "Enterprise" }

function slugify(nome: string): string {
  return nome
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export default function NovaEscolaModal({ isOpen, onClose, onSuccess }: NovaEscolaModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [slugTocado, setSlugTocado] = useState(false)

  const [formData, setFormData] = useState({
    nome: "",
    slug: "",
    plano: "BASICO",
    adminNome: "",
    adminUsername: "admin",
    adminEmail: "",
    adminSenha: "",
  })

  if (!isOpen) return null

  const handleClose = () => {
    setFormData({ nome: "", slug: "", plano: "BASICO", adminNome: "", adminUsername: "admin", adminEmail: "", adminSenha: "" })
    setSlugTocado(false)
    setError("")
    onClose()
  }

  const handleSubmit = async () => {
    if (!formData.nome || !formData.slug) {
      setError("Nome e slug são obrigatórios")
      return
    }
    if (!formData.adminNome || !formData.adminEmail || !formData.adminSenha) {
      setError("Preencha os dados do administrador inicial")
      return
    }

    setLoading(true)
    setError("")

    try {
      const response = await fetch('/api/plataforma/escolas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })
      const data = await response.json()

      if (response.ok) {
        onSuccess(data)
        handleClose()
      } else {
        setError(data.message || 'Erro ao criar escola')
      }
    } catch {
      setError('Erro ao conectar com o servidor')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl border border-slate-100 overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col max-h-[90vh]">

        <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-slate-50 shrink-0">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-slate-900">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-slate-800 tracking-tight">Nova Escola</h2>
              <p className="text-xs text-slate-400 font-medium">Cria a escola e o administrador inicial</p>
            </div>
          </div>
          <button onClick={handleClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <div className="p-8 space-y-5 overflow-y-auto">
          {error && (
            <div className="p-4 bg-rose-50 border border-rose-100 rounded-xl text-rose-600 text-xs font-semibold animate-in slide-in-from-top-2">
              {error}
            </div>
          )}

          <div>
            <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Nome da Escola</label>
            <input
              type="text" placeholder="Ex: Colégio Nova Era"
              value={formData.nome}
              onChange={e => {
                const nome = e.target.value
                setFormData(prev => ({ ...prev, nome, slug: slugTocado ? prev.slug : slugify(nome) }))
              }}
              className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-semibold text-slate-700 focus:bg-white focus:border-blue-500 transition-all"
            />
          </div>

          <div>
            <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">
              Slug (subdomínio) <span className="normal-case font-medium text-slate-300">— {formData.slug || 'slug'}.axis.com</span>
            </label>
            <input
              type="text" placeholder="Ex: colegio-nova-era"
              value={formData.slug}
              onChange={e => { setSlugTocado(true); setFormData({ ...formData, slug: slugify(e.target.value) }) }}
              className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-semibold text-slate-700 focus:bg-white focus:border-blue-500 transition-all"
            />
          </div>

          <div>
            <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-2 ml-1">Plano</label>
            <div className="flex flex-wrap gap-2">
              {PLANOS.map(p => (
                <button
                  key={p} type="button"
                  onClick={() => setFormData({ ...formData, plano: p })}
                  className={`px-4 py-2.5 rounded-xl text-[11px] font-bold uppercase tracking-wide transition-all border ${
                    formData.plano === p
                      ? 'bg-blue-500 text-white border-blue-500 shadow-lg shadow-blue-200'
                      : 'bg-slate-50 text-slate-400 border-slate-200 hover:border-slate-300 hover:text-slate-600'
                  }`}
                >
                  {labelPlano[p]}
                </button>
              ))}
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-3">Administrador Inicial</p>
            <div className="space-y-3">
              <input
                type="text" placeholder="Nome completo"
                value={formData.adminNome}
                onChange={e => setFormData({ ...formData, adminNome: e.target.value })}
                className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-semibold text-slate-700 focus:bg-white focus:border-blue-500 transition-all"
              />
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="text" placeholder="Usuário"
                  value={formData.adminUsername}
                  onChange={e => setFormData({ ...formData, adminUsername: e.target.value })}
                  className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-semibold text-slate-700 focus:bg-white focus:border-blue-500 transition-all"
                />
                <input
                  type="email" placeholder="E-mail"
                  value={formData.adminEmail}
                  onChange={e => setFormData({ ...formData, adminEmail: e.target.value })}
                  className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-semibold text-slate-700 focus:bg-white focus:border-blue-500 transition-all"
                />
              </div>
              <input
                type="password" placeholder="Senha (mín. 6 caracteres)"
                value={formData.adminSenha}
                onChange={e => setFormData({ ...formData, adminSenha: e.target.value })}
                className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-semibold text-slate-700 focus:bg-white focus:border-blue-500 transition-all"
              />
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-slate-100 flex gap-3 shrink-0 bg-white">
          <button
            type="button" onClick={handleClose}
            className="px-6 py-4 rounded-2xl font-semibold text-sm text-slate-500 hover:bg-slate-100 transition-all"
          >
            Cancelar
          </button>
          <button
            type="button" onClick={handleSubmit} disabled={loading}
            className="flex-1 bg-slate-900 hover:bg-slate-800 text-white py-4 rounded-2xl font-semibold text-sm flex items-center justify-center space-x-2 transition-all disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
            <span>Criar Escola</span>
          </button>
        </div>
      </div>
    </div>
  )
}
