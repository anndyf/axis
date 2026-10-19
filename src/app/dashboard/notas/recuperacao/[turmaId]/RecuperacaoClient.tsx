"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { 
  ArrowLeft, 
  Save, 
  AlertCircle, 
  CheckCircle2, 
  X, 
  Info, 
  TrendingUp, 
  GraduationCap, 
  Users,
  Search,
  Loader2,
  TrendingDown,
  AlertTriangle
} from "lucide-react"

interface NotaRecuperacao {
  id: string
  nota: number
  status: string
  estudanteId: string
  estudanteNome: string
  disciplinaId: string
  disciplinaNome: string
  notaRecuperacao?: number | null
}

export default function RecuperacaoTurmaClient({
  turmaId,
  turmaNome,
  notasRecuperacao,
  disciplinas
}: {
  turmaId: string
  turmaNome: string
  notasRecuperacao: NotaRecuperacao[]
  disciplinas: { id: string; nome: string }[]
}) {
  const router = useRouter()
  const [disciplinaSelecionada, setDisciplinaSelecionada] = useState("")
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  
  const [notas, setNotas] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {}
    notasRecuperacao.forEach(n => { if (n.notaRecuperacao !== null && n.notaRecuperacao !== undefined) initial[n.id] = n.notaRecuperacao.toString() })
    return initial
  })

  const [originalNotas, setOriginalNotas] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {}
    notasRecuperacao.forEach(n => { if (n.notaRecuperacao !== null && n.notaRecuperacao !== undefined) initial[n.id] = n.notaRecuperacao.toString() })
    return initial
  })

  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  const hasUnsavedChanges = () => JSON.stringify(notas) !== JSON.stringify(originalNotas)

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => { if (hasUnsavedChanges()) { e.preventDefault(); e.returnValue = ""; } }
    window.addEventListener("beforeunload", handleBeforeUnload); return () => window.removeEventListener("beforeunload", handleBeforeUnload)
  }, [notas, originalNotas])

  const handleNotaChange = (notaId: string, valor: string) => setNotas(prev => ({ ...prev, [notaId]: valor }))
  const toggleNaoRealizou = (notaId: string, checked: boolean) => setNotas(prev => ({ ...prev, [notaId]: checked ? '-1' : '' }))
  const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); setShowConfirmModal(true); }

  const handleConfirmSave = async () => {
    setSaving(true); setShowConfirmModal(false); setMessage(null);
    try {
      const relevantNotaIds = new Set(notasRecuperacao.filter(n => n.disciplinaId === disciplinaSelecionada).map(n => n.id))
      const notasArray = Object.entries(notas).filter(([id]) => relevantNotaIds.has(id)).map(([notaId, val]) => ({ notaId, notaRecuperacao: parseFloat(val) })).filter(n => !isNaN(n.notaRecuperacao))
      const response = await fetch('/api/notas/recuperacao', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ notas: notasArray }) })
      if (response.ok) { setMessage({ type: 'success', text: 'Notas salvas!' }); setOriginalNotas(JSON.parse(JSON.stringify(notas))); router.refresh(); }
      else { const error = await response.json(); setMessage({ type: 'error', text: error.message || 'Erro ao salvar' }); }
    } catch (error) { setMessage({ type: 'error', text: 'Erro de conexão' }) } finally { setSaving(false) }
  }

  const disciplineObj = disciplinas.find(d => d.id === disciplinaSelecionada)

  const recuperacaoTips = [
    {
      title: "Recuperação Final",
      description: "A nota substitui o resultado final se for superior a 5.0.",
      icon: <TrendingUp className="w-5 h-5 text-danger-fg" />,
      color: "rose"
    },
    {
      title: "Alerta de Risco",
      description: "Médias críticas no conselho requerem atenção imediata.",
      icon: <AlertTriangle className="w-5 h-5 text-warning-fg" />,
      color: "orange"
    },
    {
      title: "Nota Substitutiva",
      description: "O sistema calcula automaticamente o status baseado no lançamento.",
      icon: <CheckCircle2 className="w-5 h-5 text-warning-fg" />,
      color: "amber"
    }
  ]

  const filteredNotas = notasRecuperacao.filter(n => 
    n.disciplinaId === disciplinaSelecionada && 
    n.estudanteNome.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const stats = {
    total: filteredNotas.length,
    aprovados: filteredNotas.filter(n => (parseFloat(notas[n.id]) >= 5 && notas[n.id] !== '-1')).length
  }

  return (
    <div className="">
      {/* Header Estilo Simulados */}
      <header className="mb-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <Link href="/dashboard/notas/recuperacao" aria-label="Voltar" className="hidden sm:inline-flex p-1.5 rounded-md text-fg-subtle transition-colors duration-150 hover:bg-subtle hover:text-fg">
                <ArrowLeft size={20}/>
              </Link>
              <div>
                <h1 className="text-2xl font-semibold tracking-tight text-fg">
                  {disciplinaSelecionada ? disciplineObj?.nome : "Lançar Recuperação Final"}
                </h1>
                <p className="text-sm text-fg-muted">{disciplinaSelecionada ? `Turma: ${turmaNome}` : `Turma Selecionada: ${turmaNome}`}</p>
              </div>
            </div>

            {hasUnsavedChanges() && (
              <button
                onClick={handleSubmit}
                disabled={saving}
                className="inline-flex h-9 shrink-0 items-center gap-2 rounded-md bg-accent px-3 text-sm font-medium text-on-accent transition-colors duration-150 hover:bg-accent-hover disabled:opacity-50"
              >
                {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save size={16} />}
                {saving ? 'SALVANDO...' : 'SALVAR RECUPERAÇÃO FINAL'}
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* Dicas Estilo Simulados */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {recuperacaoTips.map((tip, index) => (
             <div key={index} className="bg-surface border border-line p-4 rounded-lg flex items-start gap-3">
                <div className={`p-2.5 rounded-xl bg-subtle text-fg-muted`}>
                   {tip.icon}
                </div>
                <div>
                  <h3 className="text-base font-medium text-fg mb-1">{tip.title}</h3>
                  <p className="text-sm text-fg-muted leading-relaxed">{tip.description}</p>
                </div>
             </div>
          ))}
        </div>

        {/* Filtros Estilo Simulados */}
        <div className="bg-white p-5 rounded-lg shadow-sm border border-zinc-200 flex flex-wrap gap-5 items-end">
            <div className="flex-1 min-w-[300px] space-y-1.5">
                <label className="text-sm font-medium text-fg-subtle ml-1">Disciplina Alvo</label>
                <div className="relative">
                  <GraduationCap className="absolute left-4 top-1/2 -translate-y-1/2 text-fg-subtle" size={16} />
                  <select
                    value={disciplinaSelecionada}
                    onChange={(e) => setDisciplinaSelecionada(e.target.value)}
                    className="w-full bg-zinc-50 border-none rounded-xl pl-11 pr-4 py-3 text-base focus:ring-2 focus:ring-danger/30 transition-all font-medium appearance-none cursor-pointer"
                  >
                    <option value="">Selecione a disciplina para recuperação final...</option>
                    {disciplinas.map((disc) => <option key={disc.id} value={disc.id}>{disc.nome}</option>)}
                  </select>
                </div>
            </div>
            
            <div className="flex items-center gap-3 pb-1">
                <div className="text-center px-4 py-2 bg-danger-subtle rounded-xl border border-danger-line">
                    <p className="text-xs font-medium text-danger">Pendente</p>
                    <p className="text-base font-medium text-danger-fg leading-none mt-1">{stats.total}</p>
                </div>
                <div className="text-center px-4 py-2 bg-success-subtle rounded-xl border border-success-line">
                    <p className="text-xs font-medium text-success">Recuperado</p>
                    <p className="text-base font-medium text-success-fg leading-none mt-1">{stats.aprovados}</p>
                </div>
            </div>
        </div>

        {/* Lançamento Estilo Simulados */}
        <div className="bg-white rounded-lg shadow-sm border border-zinc-300 overflow-hidden">
          <div className="p-4 border-b border-zinc-200 bg-zinc-50/10 flex items-center justify-between">
            <h2 className="text-lg font-medium text-fg flex items-center gap-2">
               <Users size={20} className="text-fg-subtle" />
               Painel de Recuperação Final
            </h2>
            <div className="relative max-w-xs w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-fg-subtle" />
              <input
                type="text"
                placeholder="Filtrar por nome..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-white border border-zinc-300 rounded-lg pl-9 pr-4 py-2 text-sm outline-none focus:ring-2 focus:ring-danger/30 focus:border-danger transition-all shadow-sm"
              />
            </div>
          </div>

          {message && (
            <div className={`p-3 flex items-center gap-2 border-b ${message.type === 'success' ? 'bg-success-subtle text-success-fg border-success-line' : 'bg-danger-subtle text-danger-fg border-danger-line'}`}>
              {message.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
              <span className="text-sm font-medium">{message.text}</span>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-zinc-50 border-b border-zinc-300">
                <tr>
                  <th className="px-6 py-4 text-xs font-medium text-fg-subtle w-12 text-center">#</th>
                  <th className="px-6 py-4 text-xs font-medium text-fg-subtle">Estudante</th>
                  <th className="px-4 py-4 text-xs font-medium text-fg-subtle w-32 text-center">Média Anual</th>
                  <th className="px-4 py-4 text-xs font-medium text-fg-subtle w-32 text-center">Recuperação</th>
                  <th className="px-4 py-4 text-xs font-medium text-fg-subtle w-16 text-center">Faltou</th>
                  <th className="px-6 py-4 text-xs font-medium text-fg-subtle w-32 text-center">Resultado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200/80">
                {!disciplinaSelecionada ? (
                   <tr>
                      <td colSpan={6} className="px-6 py-16 text-center text-zinc-300">
                        <TrendingDown className="w-12 h-12 opacity-20 mx-auto mb-3" />
                        <p className="text-sm font-medium">Selecione uma disciplina para iniciar</p>
                      </td>
                   </tr>
                ) : filteredNotas.length === 0 ? (
                   <tr>
                      <td colSpan={6} className="px-6 py-16 text-center text-zinc-300">
                        <Search className="w-12 h-12 opacity-20 mx-auto mb-3" />
                        <p className="text-sm font-medium">Nenhum estudante sob recuperação final nesta disciplina</p>
                      </td>
                   </tr>
                ) : (
                  filteredNotas.map((nota, index) => {
                    const currentVal = notas[nota.id] || ''
                    const isFaltou = currentVal === '-1'
                    const num = parseFloat(currentVal)
                    const isModified = currentVal !== originalNotas[nota.id] && !saving

                    let status = { text: 'PENDENTE', class: 'text-zinc-300' }
                    if (currentVal) {
                      if (isFaltou) status = { text: 'DE CONSELHO', class: 'text-danger-fg bg-danger-subtle border-danger-line' }
                      else if (num >= 5) status = { text: 'APROVADO', class: 'text-success-fg bg-success-subtle border-success-line' }
                      else status = { text: 'DE CONSELHO', class: 'text-danger-fg bg-danger-subtle border-danger-line' }
                    }

                    return (
                       <tr key={nota.id} className="hover:bg-zinc-50 transition-colors">
                        <td className="px-6 py-4 text-sm text-fg-subtle font-medium text-center">{index + 1}</td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <div className="flex items-center gap-2">
                              <span className="text-base font-medium text-fg-muted">{nota.estudanteNome}</span>
                              {nota.status === 'DESISTENTE' && (
                                <span className="px-1.5 py-0.5 bg-danger-subtle text-danger-fg text-xs font-medium rounded shadow-sm border border-danger-line">DESISTENTE</span>
                              )}
                            </div>
                            <span className="text-xs font-medium text-fg-subtle">Matrícula: {nota.estudanteId}</span>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-center">
                          <span className="text-sm font-medium text-danger-fg bg-danger-subtle px-2.5 py-1 rounded-lg border border-danger-line">{nota.nota.toFixed(1)}</span>
                        </td>
                        <td className="px-4 py-4 text-center">
                          <input
                            type="number" step="0.1"
                            value={isFaltou || nota.status === 'DESISTENTE' ? '' : currentVal} 
                            disabled={isFaltou || nota.status === 'DESISTENTE'}
                            onChange={(e) => handleNotaChange(nota.id, e.target.value)}
                             className={`w-16 h-9 text-center border-2 rounded-xl text-base font-medium transition-all outline-none ${
                                 isFaltou || nota.status === 'DESISTENTE' ? 'bg-zinc-200 border-zinc-200 text-zinc-300 pointer-events-none' : 
                                 isModified ? 'border-danger bg-white ring-4 ring-danger/30 shadow-sm' : 'border-zinc-200 bg-zinc-50 focus:bg-white focus:border-danger'
                             }`}
                             placeholder={nota.status === 'DESISTENTE' ? "-" : "0.0"}
                          />
                        </td>
                        <td className="px-4 py-4 text-center">
                           <input type="checkbox" checked={isFaltou} onChange={(e) => toggleNaoRealizou(nota.id, e.target.checked)} className="w-5 h-5 text-danger-fg border-zinc-300 rounded-lg cursor-pointer transition-all active:scale-90" />
                        </td>
                        <td className="px-6 py-4 text-center">
                            <span className={`inline-block whitespace-nowrap px-3 py-1 rounded-full text-xs font-medium border ${
                              nota.status === 'DESISTENTE' ? 'text-danger-fg bg-danger-subtle border-danger-line' : status.class
                            }`}>
                             {nota.status === 'DESISTENTE' ? 'DESISTENTE' : status.text}
                           </span>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>

          {disciplinaSelecionada && filteredNotas.length > 0 && (
            <div className="p-5 bg-zinc-50 border-t border-zinc-200 flex justify-end items-center gap-4">
              <div className="hidden md:block">
                 <p className="text-xs font-medium text-fg-subtle">Confirme o lançamento para substituir a média anual automática.</p>
              </div>
               <button
                onClick={handleSubmit}
                disabled={saving || !hasUnsavedChanges()}
                className="flex items-center gap-2 bg-accent hover:bg-accent-hover text-on-accent px-8 py-3 rounded-lg font-medium text-sm shadow-card transition-all active:scale-95 disabled:opacity-50"
              >
                {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save size={18} />}
                {saving ? 'SINCRONIZANDO...' : 'SALVAR RECUPERAÇÃO FINAL'}
              </button>
            </div>
          )}
        </div>
      </main>

      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-xl shadow-overlay w-full max-w-md overflow-hidden animate-pop-in border border-white">
            <div className="px-6 py-5 border-b border-zinc-200 flex justify-between items-center bg-zinc-50">
              <div className="flex items-center gap-3">
                 <div className="w-10 h-10 bg-danger text-white rounded-xl flex items-center justify-center shadow-card"><TrendingUp size={20}/></div>
                  <div>
                    <h3 className="text-lg font-medium text-fg">Consolidar Recuperação Final</h3>
                    <p className="text-xs font-medium text-fg-subtle">Ação permanente no boletim anual</p>
                  </div>
              </div>
              <button onClick={() => setShowConfirmModal(false)} className="p-2 hover:bg-zinc-300 rounded-xl transition-all"><X size={20}/></button>
            </div>
            <div className="p-6 max-h-[50vh] overflow-y-auto space-y-2 bg-zinc-50/20 custom-scrollbar">
              {notasRecuperacao.filter(n => n.disciplinaId === disciplinaSelecionada && notas[n.id] !== originalNotas[n.id]).map(n => (
                 <div key={n.id} className="flex items-center justify-between bg-white p-3 rounded-lg border border-zinc-200 shadow-sm">
                  <span className="text-sm font-medium text-fg-muted truncate pr-4">{n.estudanteNome}</span>
                  <span className="text-sm font-medium text-danger-fg min-w-max">{notas[n.id] === '-1' ? 'FALTOU' : `NOTA: ${notas[n.id]}`}</span>
                </div>
              ))}
            </div>
             <div className="px-6 py-5 bg-zinc-50 border-t border-zinc-200 flex gap-4">
              <button onClick={() => setShowConfirmModal(false)} className="flex-1 py-3 text-sm font-medium text-fg-subtle hover:bg-white rounded-lg transition-all">Cancelar</button>
              <button onClick={handleConfirmSave} className="flex-1 py-3 bg-danger text-white text-sm font-medium rounded-lg shadow-card hover:bg-danger transition-all active:scale-95">Finalizar Envio</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
