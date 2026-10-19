"use client"

import { useState, useEffect } from "react"
import { 
  X, 
  Calendar, 
  BookOpen, 
  Users,
  Layout,
  Target,
  Wrench,
  GraduationCap,
  Download,
  User as UserIcon,
  FileText
} from "lucide-react"

interface Turma {
  id: string
  nome: string
}

interface Plano {
  id: string
  disciplinaNome: string
  periodoInicio: string
  periodoFim: string
  indicadores: string
  conteudos: string
  metodologias: string
  recursos: string
  avaliacao: string
  observacoes?: string
  professor: { name: string }
  turmas: Turma[]
}

interface PlanoViewProps {
  planoId: string
  onClose: () => void
}

export default function PlanoView({ planoId, onClose }: PlanoViewProps) {
  const [plano, setPlano] = useState<Plano | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/planos/${planoId}`)
      .then(res => res.json())
      .then(data => {
        setPlano(data)
        setLoading(false)
      })
  }, [planoId])

  const handleDownload = () => window.open(`/api/planos/${planoId}/pdf`, '_blank')

  if (loading) {
    return (
      <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-zinc-900/40 backdrop-blur-sm animate-in fade-in duration-200">
        <div className="bg-white p-8 rounded-lg shadow-card flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-3 border-accent/25 border-t-accent rounded-full animate-spin" />
            <p className="text-fg-subtle text-xs font-bold uppercase tracking-widest animate-pulse">Buscando Detalhes...</p>
        </div>
      </div>
    )
  }

  if (!plano) return null

  const formatDate = (date: string) => new Date(date).toLocaleDateString('pt-BR', { timeZone: 'UTC' })

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-zinc-900/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-4xl max-h-[90vh] rounded-xl shadow-card flex flex-col overflow-hidden animate-in zoom-in-95 duration-300 border border-zinc-100">
        
        {/* Header Compact */}
        <div className="px-6 py-5 border-b border-zinc-50 flex items-center justify-between bg-white relative shrink-0">
          <div className="absolute top-0 left-0 w-1.5 bg-accent h-full" />
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-accent-subtle rounded-xl flex items-center justify-center">
                 <FileText className="w-5 h-5 text-accent-fg" />
            </div>
            <div>
                <h2 className="text-lg font-bold text-fg tracking-tight leading-tight uppercase">{plano.disciplinaNome}</h2>
                <div className="flex items-center gap-3 mt-0.5">
                    <span className="text-[10px] font-bold text-fg-subtle flex items-center gap-1">
                        <Calendar size={12} className="text-accent" /> {formatDate(plano.periodoInicio)} - {formatDate(plano.periodoFim)}
                    </span>
                    <span className="text-[10px] font-bold text-fg-subtle flex items-center gap-1">
                        <UserIcon size={12} className="text-accent" /> PROF. {plano.professor.name.toUpperCase()}
                    </span>
                </div>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-zinc-50 rounded-lg transition-all text-zinc-300 hover:text-fg-muted"><X size={20} /></button>
        </div>

        {/* Content Compact */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8 bg-zinc-50/20 custom-scrollbar">
          <div className="space-y-3 px-1">
            <h3 className="text-[10px] font-bold text-fg-subtle uppercase tracking-widest flex items-center gap-2">
               <Users className="w-3.5 h-3.5" /> Turmas Atendidas
            </h3>
            <div className="flex flex-wrap gap-1.5">
                {plano.turmas.map(t => <span key={t.id} className="px-3 py-1.5 bg-white border border-zinc-100 shadow-sm rounded-lg font-bold text-fg-muted text-[10px] uppercase">{t.nome}</span>)}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <ViewSection icon={<Target size={14} className="text-accent-fg" />} title="Indicadores" content={plano.indicadores} />
              <ViewSection icon={<BookOpen size={14} className="text-success-fg" />} title="Conteúdos" content={plano.conteudos} />
              <ViewSection icon={<Layout size={14} className="text-warning-fg" />} title="Metodologia" content={plano.metodologias} />
              <ViewSection icon={<Wrench size={14} className="text-accent-fg" />} title="Recursos" content={plano.recursos} />
              <ViewSection full icon={<GraduationCap size={14} className="text-danger-fg" />} title="Avaliação" content={plano.avaliacao} />
              {plano.observacoes && <ViewSection full icon={<FileText size={14} className="text-fg-subtle" />} title="Observações" content={plano.observacoes} />}
          </div>
        </div>

        {/* Footer Compact */}
        <div className="p-4 border-t border-zinc-50 bg-white flex items-center justify-end gap-3 shrink-0">
            <button onClick={onClose} className="px-6 py-2 rounded-xl text-xs font-bold text-fg-subtle hover:bg-zinc-50 transition-all">Fechar</button>
            <button onClick={handleDownload} className="px-8 py-2 bg-zinc-900 text-white rounded-xl text-xs font-bold shadow-card hover:bg-zinc-800 transition-all flex items-center gap-2 active:scale-95">
                <Download size={14} /> Exportar (PDF)
            </button>
        </div>
      </div>
    </div>
  )
}

function ViewSection({ icon, title, content, full = false }: any) {
    return (
        <div className={`space-y-2 ${full ? 'md:col-span-2' : ''}`}>
            <label className="text-[9px] font-bold text-fg-subtle uppercase tracking-widest ml-1 flex items-center gap-1.5">
                {icon} {title}
            </label>
            <div className="w-full p-4 bg-white border border-zinc-100 rounded-lg shadow-sm text-xs font-medium text-fg-muted leading-relaxed whitespace-pre-wrap">
                {content}
            </div>
        </div>
    )
}
