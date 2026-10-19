"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { 
  ArrowLeft, 
  Save, 
  Trash2, 
  Loader2, 
  Plus, 
  Users, 
  Award,
  BookOpen,
  CheckCircle2,
  AlertCircle,
  Search
} from "lucide-react"

interface Turma {
  id: string
  nome: string
}

interface Area {
  id: string
  nome: string
}

interface User {
  id: string
  name: string | null
  email: string
}

interface Responsavel {
  id: string
  userId: string
  turmaId: string
  areaId?: string | null
  provaId?: string | null
  unidade?: number | null
  user: { name: string | null, email: string }
  turma: { nome: string }
  area?: { nome: string } | null
  prova?: { titulo: string, codigo: number, unidade?: number | null } | null
}

interface Prova {
  id: string
  titulo: string
  codigo: number
  turmaId: string | null
  createdAt: Date
  unidade?: number | null
}

export default function ResponsaveisClient({
  turmas,
  areas,
  professores,
  provas
}: {
  turmas: Turma[],
  areas: Area[],
  professores: User[],
  provas: Prova[]
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [responsaveis, setResponsaveis] = useState<Responsavel[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  
  const [formData, setFormData] = useState({
    userId: "",
    turmaId: "",
    provaId: "",
    areaId: "",
    unidade: "2"
  })
  
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  useEffect(() => {
    loadResponsaveis()
  }, [])

  const loadResponsaveis = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/simulados/responsaveis', { cache: 'no-store' })
      const data = await res.json()
      if (res.ok) setResponsaveis(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setMessage(null)

    try {
      const res = await fetch('/api/simulados/responsaveis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (res.ok) {
        setMessage({ type: 'success', text: "Responsável designado com sucesso!" })
        setFormData({ userId: "", turmaId: "", provaId: "", areaId: "", unidade: "2" })
        loadResponsaveis()
      } else {
        const data = await res.json()
        setMessage({ type: 'error', text: data.message || "Erro ao salvar" })
      }
    } catch (err) {
      setMessage({ type: 'error', text: "Erro de conexão" })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Remover esta responsabilidade?")) return
    
    try {
      const res = await fetch(`/api/simulados/responsaveis?id=${id}`, { method: 'DELETE' })
      if (res.ok) {
        loadResponsaveis()
      }
    } catch (err) {
      console.error(err)
    }
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <Link 
            href="/dashboard/simulados"
            className="p-2 hover:bg-white rounded-xl transition-all border border-transparent hover:border-zinc-300"
          >
            <ArrowLeft className="w-5 h-5 text-fg-muted" />
          </Link>
          <div>
            <h1 className="text-2xl font-medium text-fg tracking-tight">Responsáveis de Simulado</h1>
            <p className="text-fg-muted text-sm">Designar professores para lançamento de notas por turma</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Formulário lateral */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-sm border border-zinc-300 p-6 space-y-6 sticky top-24">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-zinc-50 rounded-lg">
                <Plus className="w-5 h-5 text-fg-muted" />
              </div>
              <h3 className="font-medium text-fg">Nova Designação</h3>
            </div>

            <form onSubmit={handleAdd} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-fg-subtle ml-1">Turma</label>
                <select
                  required
                  value={formData.turmaId}
                  onChange={e => setFormData(p => ({ ...p, turmaId: e.target.value, provaId: "" }))}
                  className="w-full bg-zinc-50 border-none rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-zinc-500 outline-none"
                >
                  <option value="">Selecione a Turma...</option>
                  {turmas.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-fg-subtle ml-1">Unidade</label>
                <select
                  required
                  value={formData.unidade}
                  onChange={e => setFormData(p => ({ ...p, unidade: e.target.value, provaId: "" }))}
                  className="w-full bg-zinc-50 border-none rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-zinc-500 outline-none"
                >
                  <option value="1">1ª Unidade</option>
                  <option value="2">2ª Unidade</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-fg-subtle ml-1">Prova</label>
                <select
                  required
                  value={formData.provaId}
                  onChange={e => setFormData(p => ({ ...p, provaId: e.target.value, areaId: "" }))}
                  className="w-full bg-zinc-50 border-none rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-zinc-500 outline-none"
                  disabled={!formData.turmaId}
                >
                  <option value="">Selecione a Prova...</option>
                  {provas.filter(p => {
                     if (p.turmaId && p.turmaId !== formData.turmaId) return false;
                     if (formData.unidade) {
                       const unidNum = parseInt(formData.unidade);
                       if (p.unidade) return p.unidade === unidNum;
                       return unidNum === 2;
                     }
                     return true;
                  }).map(p => (
                    <option key={p.id} value={p.id}>#{p.codigo} - {p.titulo}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-fg-subtle ml-1">Professor Responsável</label>
                <select
                  required
                  value={formData.userId}
                  onChange={e => setFormData(p => ({ ...p, userId: e.target.value }))}
                  className="w-full bg-zinc-50 border-none rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-zinc-500 outline-none"
                >
                  <option value="">Selecione o Professor...</option>
                  {professores.map(p => <option key={p.id} value={p.id}>{p.name || p.email}</option>)}
                </select>
              </div>

              {message && (
                <div className={`p-3 rounded-xl flex items-center gap-2 text-xs font-medium animate-slide-up ${
                  message.type === 'success' ? 'bg-success-subtle text-success-fg' : 'bg-danger-subtle text-danger-fg'
                }`}>
                  {message.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                  <span>{message.text}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={saving}
                className="w-full bg-zinc-600 hover:bg-zinc-700 text-white font-medium py-3 rounded-xl flex items-center justify-center gap-2 transition-all shadow-card active:scale-95 disabled:opacity-50"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Designar Professor
              </button>
            </form>
          </div>
        </div>

        {/* Lista de Responsáveis */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-lg shadow-sm border border-zinc-300 overflow-hidden">
            <div className="p-4 border-b border-zinc-200 bg-zinc-50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
               <h3 className="font-medium text-fg">Professores Designados</h3>
               <div className="relative max-w-xs w-full">
                 <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-fg-subtle" />
                 <input
                   type="text"
                   placeholder="Buscar por professor ou turma..."
                   value={searchTerm}
                   onChange={(e) => setSearchTerm(e.target.value)}
                   className="w-full bg-white border border-zinc-300 rounded-xl pl-9 pr-4 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-500/10 focus:border-zinc-400 transition-all shadow-sm"
                 />
               </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-zinc-50 border-b border-zinc-300">
                  <tr>
                    <th className="px-6 py-4 text-xs font-medium text-fg-subtle">Professor / Prova</th>
                    <th className="px-6 py-4 text-xs font-medium text-fg-subtle text-center">Unidade</th>
                    <th className="px-6 py-4 text-xs font-medium text-fg-subtle text-center">Turma</th>
                    <th className="px-6 py-4 text-xs font-medium text-fg-subtle text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200">
                  {loading ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-20 text-center">
                        <Loader2 className="w-8 h-8 text-fg-muted animate-spin mx-auto mb-2" />
                        <span className="text-sm text-fg-muted font-medium tracking-tight">Carregando designações...</span>
                      </td>
                    </tr>
                  ) : responsaveis.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-20 text-center">
                        <div className="flex flex-col items-center gap-3">
                          <Users className="w-10 h-10 text-zinc-200" />
                          <p className="text-fg-subtle text-sm font-medium">Nenhum professor designado.</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    responsaveis.filter(item => 
                      (item.user.name || item.user.email).toLowerCase().includes(searchTerm.toLowerCase()) ||
                      item.turma.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      item.area?.nome.toLowerCase().includes(searchTerm.toLowerCase())
                    ).map((item) => (
                      <tr key={item.id} className="hover:bg-zinc-50 transition-colors group">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-zinc-50 rounded-xl flex items-center justify-center shadow-sm">
                              <Award className="w-5 h-5 text-fg-muted" />
                            </div>
                            <div>
                                <h4 className="text-sm font-medium text-fg tracking-tight">{item.user.name || item.user.email}</h4>
                                <div className="flex items-center gap-1.5 mt-1">
                                    <BookOpen className="w-3 h-3 text-fg-subtle" />
                                    <span className="text-xs font-medium text-fg-subtle">
                                        {item.prova ? `#${item.prova.codigo} - ${item.prova.titulo}` : item.area?.nome}
                                    </span>
                                </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="px-2.5 py-1 bg-accent-subtle text-accent-fg border border-accent/25 rounded-lg text-xs font-medium tracking-tighter">
                            {item.unidade ? `${item.unidade}ª Und` : item.prova?.unidade ? `${item.prova.unidade}ª Und` : 'Ambas'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="px-2.5 py-1 bg-subtle border border-line text-fg rounded-lg text-xs font-medium tracking-tighter">
                            {item.turma.nome}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={() => handleDelete(item.id)}
                            className="p-2 text-zinc-300 hover:text-danger-fg hover:bg-danger-subtle rounded-xl transition-all"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
