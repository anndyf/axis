"use client"

import { useState, useEffect, useRef } from "react"
import { 
  Plus, 
  Search, 
  Filter, 
  Calendar, 
  FileText, 
  User, 
  Users, 
  Trash2, 
  Edit3, 
  Printer, 
  Download,
  ChevronRight,
  Info,
  Clock,
  ArrowLeft,
  FileWarning,
  CheckCircle2,
  XCircle,
  AlertTriangle
} from "lucide-react"
import { useSession } from "next-auth/react"
import Link from "next/link"
import OcorrenciaForm from "@/components/OcorrenciaForm"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"

interface Ocorrencia {
  id: string
  titulo: string
  descricao: string
  tipo: string
  data: string
  registradoPorId: string
  autor: { name: string | null }
  estudantes: {
    matricula: string
    nome: string
    turma: { nome: string }
  }[]
  createdAt: string
}

interface OcorrenciasClientProps {
  turmas: { id: string; nome: string }[]
}

export default function OcorrenciasClient({ turmas }: OcorrenciasClientProps) {
  const { data: session } = useSession()
  const [ocorrencias, setOcorrencias] = useState<Ocorrencia[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [selectedOcorrencia, setSelectedOcorrencia] = useState<Ocorrencia | null>(null)
  
  const [filters, setFilters] = useState({
    startDate: "",
    endDate: "",
    studentName: "",
    turmaId: "",
    type: ""
  })

  const fetchOcorrencias = async () => {
    setLoading(true)
    try {
      const query = new URLSearchParams(filters).toString()
      const res = await fetch(`/api/ocorrencias?${query}`)
      const data = await res.json()
      setOcorrencias(data)
    } catch (error) {
      console.error("Erro ao carregar ocorrências:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchOcorrencias()
  }, [filters])

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este registro?")) return
    
    try {
      const res = await fetch(`/api/ocorrencias/${id}`, { method: 'DELETE' })
      if (res.ok) fetchOcorrencias()
    } catch (error) {
      console.error("Erro ao excluir:", error)
    }
  }

  const handlePrint = () => {
    window.print()
  }

  const getTipoColor = (tipo: string) => {
    switch (tipo.toLowerCase()) {
      case 'comportamental': return 'bg-danger-subtle text-danger-fg border-danger-line'
      case 'pedagógica': return 'bg-accent-subtle text-accent-fg border-accent/25'
      case 'médica': return 'bg-success-subtle text-success-fg border-success-line'
      case 'elogio': return 'bg-warning-subtle text-warning-fg border-warning-line'
      default: return 'bg-zinc-50 text-fg-muted border-zinc-100'
    }
  }

  const getTipoIcon = (tipo: string) => {
    switch (tipo.toLowerCase()) {
      case 'comportamental': return <AlertTriangle className="w-4 h-4" />
      case 'médica': return <Clock className="w-4 h-4" />
      case 'elogio': return <CheckCircle2 className="w-4 h-4" />
      default: return <Info className="w-4 h-4" />
    }
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-32 animate-fade-in">
      {/* Header Premium */}
      <header className="mb-6">
        <div className="max-w-7xl mx-auto py-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center space-x-6">
              <Link
                href="/dashboard"
                className="p-3 hover:bg-zinc-100 rounded-lg transition-all text-fg-subtle hover:text-fg border border-transparent hover:border-zinc-200 shadow-sm"
              >
                <ArrowLeft size={16} strokeWidth={1.75} />
              </Link>
              <div>
                <h1 className="text-2xl font-semibold tracking-tight text-fg">Livro de Ocorrências</h1>
                <p className="text-sm text-fg-muted">Registro histórico e acompanhamento escolar</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button 
                onClick={handlePrint}
                className="flex items-center gap-2 bg-white border border-zinc-200 text-fg-muted px-6 py-3 rounded-lg font-semibold hover:bg-zinc-50 transition-all shadow-sm active:scale-95"
              >
                <Printer size={18} />
                <span className="hidden sm:inline">Imprimir Tudo</span>
              </button>
              <button 
                onClick={() => { setShowForm(true); setSelectedOcorrencia(null); }}
                className="inline-flex h-9 shrink-0 items-center gap-2 rounded-md bg-accent px-3 text-sm font-medium text-on-accent transition-colors duration-150 hover:bg-accent-hover disabled:opacity-50"
              >
                <Plus size={16} strokeWidth={1.75} />
                <span>Novo Registro</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Seção de Filtros */}
      <section className="bg-white p-6 md:p-8 rounded-xl shadow-card border border-zinc-100">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="space-y-2">
            <label className="text-xs font-bold text-fg-subtle ml-1">Estudante</label>
            <div className="relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-300 group-focus-within:text-fg transition-colors" size={18} />
              <input 
                type="text" 
                placeholder="Buscar por nome..."
                value={filters.studentName}
                onChange={e => setFilters({...filters, studentName: e.target.value})}
                className="w-full bg-zinc-50 border-transparent rounded-lg pl-12 pr-6 py-4 text-sm focus:ring-4 focus:ring-zinc-900/5 focus:bg-white focus:border-zinc-200 transition-all font-medium placeholder:text-zinc-300 shadow-card"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-fg-subtle ml-1">Período Inicial</label>
            <div className="relative group">
              <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-300 group-focus-within:text-fg transition-colors" size={18} />
              <input 
                type="date"
                value={filters.startDate}
                onChange={e => setFilters({...filters, startDate: e.target.value})}
                className="w-full bg-zinc-50 border-transparent rounded-lg pl-12 pr-6 py-4 text-sm focus:ring-4 focus:ring-zinc-900/5 focus:bg-white focus:border-zinc-200 transition-all font-medium shadow-card cursor-pointer"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-fg-subtle ml-1">Período Final</label>
            <div className="relative group">
              <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-300 group-focus-within:text-fg transition-colors" size={18} />
              <input 
                type="date"
                value={filters.endDate}
                onChange={e => setFilters({...filters, endDate: e.target.value})}
                className="w-full bg-zinc-50 border-transparent rounded-lg pl-12 pr-6 py-4 text-sm focus:ring-4 focus:ring-zinc-900/5 focus:bg-white focus:border-zinc-200 transition-all font-medium shadow-card cursor-pointer"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-fg-subtle ml-1">Turma</label>
            <div className="relative group">
              <Users className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-300 group-focus-within:text-fg transition-colors" size={18} />
              <select 
                value={filters.turmaId}
                onChange={e => setFilters({...filters, turmaId: e.target.value})}
                className="w-full bg-zinc-50 border-transparent rounded-lg pl-12 pr-10 py-4 text-sm focus:ring-4 focus:ring-zinc-900/5 focus:bg-white focus:border-zinc-200 transition-all font-medium shadow-card cursor-pointer appearance-none"
              >
                <option value="">Todas as turmas</option>
                {turmas.map(t => (
                  <option key={t.id} value={t.id}>{t.nome}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-fg-subtle ml-1">Tipo de Ocorrência</label>
            <div className="relative group">
              <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-300 group-focus-within:text-fg transition-colors" size={18} />
              <select 
                value={filters.type}
                onChange={e => setFilters({...filters, type: e.target.value})}
                className="w-full bg-zinc-50 border-transparent rounded-lg pl-12 pr-10 py-4 text-sm focus:ring-4 focus:ring-zinc-900/5 focus:bg-white focus:border-zinc-200 transition-all font-medium shadow-card cursor-pointer appearance-none"
              >
                <option value="">Todos os tipos</option>
                <option value="Comportamental">Comportamental</option>
                <option value="Pedagógica">Pedagógica</option>
                <option value="Médica">Médica</option>
                <option value="Elogio">Elogio</option>
              </select>
            </div>
          </div>
        </div>
      </section>

      {/* Lista de Registros */}
      <section className="space-y-6 print:space-y-8">
        {loading ? (
          <div className="py-32 text-center">
            <div className="w-12 h-12 border-4 border-zinc-200 border-t-zinc-900 rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-fg-subtle font-bold animate-pulse">Consultando Registros...</p>
          </div>
        ) : ocorrencias.length === 0 ? (
          <div className="py-32 text-center bg-white border border-dashed border-zinc-200 rounded-xl">
            <div className="w-20 h-20 bg-zinc-50 rounded-full flex items-center justify-center mx-auto mb-6 text-zinc-200">
              <FileWarning size={40} />
            </div>
            <h3 className="text-xl font-bold text-fg mb-2">Nenhum registro localizado</h3>
            <p className="text-fg-subtle max-w-xs mx-auto">Tente ajustar seus filtros ou verifique se há registros cadastrados no período.</p>
          </div>
        ) : (
          ocorrencias.map((item) => (
            <div 
              key={item.id} 
              className="group bg-white border border-zinc-100 rounded-xl p-8 md:p-10 shadow-card hover:shadow-card transition-all duration-500 relative overflow-hidden print:shadow-none print:border-zinc-200 print:mb-8"
            >
              <div className="absolute top-0 right-0 w-64 h-64 bg-zinc-50 rounded-full -mr-32 -mt-32 opacity-0 group-hover:opacity-100 blur-3xl transition-opacity duration-1000 print:hidden"></div>
              
              <div className="relative z-10 space-y-8">
                {/* Header do Registro */}
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                  <div className="space-y-4">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className={`px-4 py-1.5 rounded-full border text-xs font-semibold shadow-sm flex items-center gap-2 ${getTipoColor(item.tipo)}`}>
                        {getTipoIcon(item.tipo)}
                        {item.tipo}
                      </span>
                      <span className="px-4 py-1.5 bg-subtle border border-line text-fg rounded-full text-xs font-semibold shadow-card">
                        {format(new Date(item.data), "dd 'de' MMM, yyyy", { locale: ptBR })}
                      </span>
                    </div>
                    <h2 className="text-2xl md:text-3xl font-semibold text-fg tracking-tight leading-tight group-hover:text-accent-fg transition-colors">
                      {item.titulo}
                    </h2>
                  </div>

                  <div className="flex items-center gap-2 print:hidden">
                    <button 
                      onClick={() => { setSelectedOcorrencia(item); setShowForm(true); }}
                      className="p-3 bg-zinc-50 text-fg-subtle hover:text-fg hover:bg-zinc-100 rounded-lg transition-all border border-transparent hover:border-zinc-200"
                    >
                      <Edit3 size={18} />
                    </button>
                    <button 
                      onClick={() => handleDelete(item.id)}
                      className="p-3 bg-zinc-50 text-fg-subtle hover:text-danger-fg hover:bg-danger-subtle rounded-lg transition-all border border-transparent hover:border-danger-line"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>

                {/* Conteúdo */}
                <div className="bg-zinc-50/50 p-8 rounded-xl border border-zinc-100 group-hover:bg-white group-hover:shadow-card transition-all duration-500 print:bg-white print:border-zinc-200">
                  <p className="text-fg-muted text-lg leading-relaxed font-medium whitespace-pre-wrap">
                    {item.descricao}
                  </p>
                </div>

                {/* Rodapé - Estudantes e Autor */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 pt-4">
                  <div className="flex flex-wrap gap-4">
                    {item.estudantes.map(est => (
                      <div key={est.matricula} className="flex items-center gap-3 bg-white border border-zinc-200 pl-2 pr-5 py-2 rounded-lg shadow-sm hover:border-zinc-900 transition-colors cursor-default">
                        <div className="w-9 h-9 bg-subtle border border-line text-fg rounded-xl flex items-center justify-center font-bold text-xs ring-4 ring-zinc-50">
                          {est.nome.charAt(0)}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-fg leading-none mb-1">{est.nome}</p>
                          <p className="text-xs font-semibold text-fg-subtle">Turma: {est.turma.nome}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center gap-4 border-l border-zinc-100 pl-8 md:pl-10 print:border-zinc-200">
                    <div className="text-right">
                      <p className="text-xs font-semibold text-fg-subtle leading-none mb-2">Registrado por</p>
                      <p className="font-bold text-fg text-sm whitespace-nowrap">{item.autor.name || "Sistema"}</p>
                    </div>
                    <div className="w-12 h-12 bg-zinc-100 rounded-lg flex items-center justify-center text-fg-subtle border border-zinc-200">
                      <User size={20} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </section>

      {/* Footer Info */}
      <section className="py-12 border-t border-zinc-200 print:hidden">
        <div className="flex flex-col items-center text-center space-y-4">
          <div className="w-14 h-14 bg-zinc-50 rounded-xl flex items-center justify-center text-zinc-200">
            <Printer size={24} />
          </div>
          <h4 className="text-fg font-bold">Configuração de Impressão</h4>
          <p className="text-fg-subtle text-sm max-w-sm">Use os filtros acima para definir o conteúdo do relatório mensal desejado antes de imprimir.</p>
        </div>
      </section>

      {/* Modais */}
      {showForm && (
        <OcorrenciaForm
          ocorrencia={selectedOcorrencia} 
          onClose={() => setShowForm(false)}
          onSuccess={() => { setShowForm(false); fetchOcorrencias(); }}
        />
      )}

      {/* Estilos para impressão */}
      <style jsx global>{`
        @media print {
          body { background: white !important; padding: 0 !important; }
          .print\\:hidden { display: none !important; }
          main { margin: 0 !important; padding: 0 !important; max-width: 100% !important; }
          header { display: none !important; }
          .grid { display: none !important; }
          section { border: none !important; box-shadow: none !important; }
          @page { margin: 1cm; }
        }
      `}</style>
    </div>
  )
}
