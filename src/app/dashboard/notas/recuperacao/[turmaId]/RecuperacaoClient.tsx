"use client"

import { IndicadorGravacao } from "@/components/ui"
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
  AlertTriangle, Eye } from "lucide-react"

interface NotaRecuperacao {
  id: string
  nota: number
  status: string
  estudanteId: string
  estudanteNome: string
  disciplinaId: string
  disciplinaNome: string
  notaRecuperacao?: number | null
  /** menor nota de recuperação que aprova (motor + esquema); null = nenhuma */
  notaNecessaria: number | null
}

export default function RecuperacaoTurmaClient({
  turmaId,
  turmaNome,
  notasRecuperacao,
  disciplinas,
  notaMaxima,
  disciplinasLecionadas
}: {
  turmaId: string
  turmaNome: string
  notasRecuperacao: NotaRecuperacao[]
  disciplinas: { id: string; nome: string }[]
  notaMaxima: number
  /** ids das disciplinas que o usuário leciona: só nelas grava (gestão só visualiza) */
  disciplinasLecionadas: string[]
}) {
  // Prévia: a situação final é recalculada no servidor ao salvar
  const aprova = (n: NotaRecuperacao, valor: string) =>
    valor !== '' && valor !== '-1' && n.notaNecessaria !== null && parseFloat(valor) >= n.notaNecessaria

  const router = useRouter()
  const [disciplinaSelecionada, setDisciplinaSelecionada] = useState("")
  const podeLancar = disciplinasLecionadas.includes(disciplinaSelecionada)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [salvoEm, setSalvoEm] = useState<Date | null>(null)
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
      if (response.ok) { setMessage({ type: 'success', text: 'Notas de recuperação salvas.' }); setOriginalNotas(JSON.parse(JSON.stringify(notas))); setSalvoEm(new Date()); router.refresh(); }
      else { const error = await response.json(); setMessage({ type: 'error', text: error.message || 'Não foi possível salvar. Tente novamente.' }); }
    } catch (error) { setMessage({ type: 'error', text: 'Não foi possível conectar ao servidor. Tente novamente.' }) } finally { setSaving(false) }
  }

  const disciplineObj = disciplinas.find(d => d.id === disciplinaSelecionada)

  const recuperacaoTips = [
    {
      title: "Recuperação Final",
      description: "Abaixo de cada campo aparece a nota que o aluno precisa, pela regra do esquema da turma.",
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
    aprovados: filteredNotas.filter(n => aprova(n, notas[n.id] ?? '')).length
  }

  return (
    <div className="">
      {/* Header Estilo Simulados */}
      <header className="mb-6">
        <div className="py-4">
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

            {podeLancar && hasUnsavedChanges() && (
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

      <main className="py-4 space-y-5">
        
        {/* Dicas Estilo Simulados */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {recuperacaoTips.map((tip, index) => (
             <div key={index} className="bg-surface border border-line p-4 rounded-2xl flex items-start gap-3">
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
        <div className="bg-surface p-5 rounded-2xl border border-line flex flex-wrap gap-5 items-end">
            <div className="flex-1 min-w-[300px] space-y-1.5">
                <label className="text-sm font-medium text-fg-subtle ml-1">Disciplina Alvo</label>
                <div className="relative">
                  <GraduationCap className="absolute left-4 top-1/2 -translate-y-1/2 text-fg-subtle" size={16} />
                  <select
                    value={disciplinaSelecionada}
                    onChange={(e) => setDisciplinaSelecionada(e.target.value)}
                    className="w-full bg-canvas border-none rounded-xl pl-11 pr-4 py-3 text-base focus:ring-2 focus:ring-danger/30 transition-all font-medium appearance-none cursor-pointer"
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
        <div className="bg-surface rounded-2xl border border-line-strong overflow-hidden">
          <div className="p-4 border-b border-line bg-canvas/10 flex items-center justify-between">
            <h2 className="text-lg font-medium text-fg flex items-center gap-2">
               <Users size={20} className="text-fg-subtle" />
               Painel de Recuperação Final
            </h2>
            {disciplinaSelecionada && !podeLancar && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-info-subtle px-2.5 py-0.5 text-13 text-info-fg" role="status">
                <Eye size={14} strokeWidth={1.75} aria-hidden /> Somente leitura: apenas o professor da disciplina grava
              </span>
            )}
            <div className="relative max-w-xs w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-fg-subtle" />
              <input
                type="text"
                placeholder="Filtrar por nome..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-surface border border-line-strong rounded-lg pl-9 pr-4 py-2 text-sm outline-none focus:ring-2 focus:ring-danger/30 focus:border-danger transition-all"
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
              <thead className="bg-canvas border-b border-line-strong">
                <tr>
                  <th className="px-4 py-4 text-xs font-medium text-fg-subtle w-12 text-center">#</th>
                  <th className="px-4 py-4 text-xs font-medium text-fg-subtle">Estudante</th>
                  <th className="px-4 py-4 text-xs font-medium text-fg-subtle w-32 text-center">Média Anual</th>
                  <th className="px-4 py-4 text-xs font-medium text-fg-subtle w-32 text-center">Recuperação</th>
                  <th className="px-4 py-4 text-xs font-medium text-fg-subtle w-16 text-center">Faltou</th>
                  <th className="px-4 py-4 text-xs font-medium text-fg-subtle w-32 text-center">Resultado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line/80">
                {!disciplinaSelecionada ? (
                   <tr>
                      <td colSpan={6} className="px-4 py-16 text-center text-fg-disabled">
                        <TrendingDown className="w-12 h-12 opacity-20 mx-auto mb-3" />
                        <p className="text-sm font-medium">Selecione uma disciplina para iniciar</p>
                      </td>
                   </tr>
                ) : filteredNotas.length === 0 ? (
                   <tr>
                      <td colSpan={6} className="px-4 py-16 text-center text-fg-disabled">
                        <Search className="w-12 h-12 opacity-20 mx-auto mb-3" />
                        <p className="text-sm font-medium">Nenhum estudante sob recuperação final nesta disciplina</p>
                      </td>
                   </tr>
                ) : (
                  filteredNotas.map((nota, index) => {
                    const currentVal = notas[nota.id] || ''
                    const isFaltou = currentVal === '-1'
                    const isModified = currentVal !== originalNotas[nota.id] && !saving

                    let status = { text: 'PENDENTE', class: 'text-zinc-300' }
                    if (currentVal) {
                      if (isFaltou) status = { text: 'DE CONSELHO', class: 'text-danger-fg bg-danger-subtle border-danger-line' }
                      else if (aprova(nota, currentVal)) status = { text: 'APROVADO', class: 'text-success-fg bg-success-subtle border-success-line' }
                      else status = { text: 'DE CONSELHO', class: 'text-danger-fg bg-danger-subtle border-danger-line' }
                    }

                    return (
                       <tr key={nota.id} className="hover:bg-canvas transition-colors">
                        <td className="px-4 py-4 text-sm text-fg-subtle font-medium text-center">{index + 1}</td>
                        <td className="px-4 py-4">
                          <div className="flex flex-col">
                            <div className="flex items-center gap-2">
                              <span className="text-base font-medium text-fg-muted">{nota.estudanteNome}</span>
                              {nota.status === 'DESISTENTE' && (
                                <span className="px-1.5 py-0.5 bg-danger-subtle text-danger-fg text-xs font-medium rounded border border-danger-line">DESISTENTE</span>
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
                            type="number" step="0.1" min={0} max={notaMaxima} inputMode="decimal"
                            aria-label={`Nota de recuperação de ${nota.estudanteNome}`}
                            value={isFaltou || nota.status === 'DESISTENTE' ? '' : currentVal} 
                            disabled={!podeLancar || isFaltou || nota.status === 'DESISTENTE'}
                            onChange={(e) => handleNotaChange(nota.id, e.target.value)}
                             className={`w-16 h-9 text-center border-2 rounded-xl text-base font-medium transition-all outline-none ${
                                 !podeLancar ? 'cursor-default border-transparent bg-transparent text-fg' :
                                 isFaltou || nota.status === 'DESISTENTE' ? 'bg-subtle-hover border-line text-fg-disabled pointer-events-none' : 
                                 isModified ? 'border-danger bg-surface ring-4 ring-danger/30 shadow-sm' : 'border-line bg-canvas focus:bg-surface focus:border-danger'
                             }`}
                             placeholder={nota.status === 'DESISTENTE' ? "-" : "0.0"}
                          />
                          {nota.status !== 'DESISTENTE' && nota.notaNecessaria !== null && nota.notaNecessaria > 0 && (
                            <span className="mt-1 block text-xs text-fg-subtle tabular-nums">precisa {nota.notaNecessaria.toFixed(1).replace('.', ',')}</span>
                          )}
                        </td>
                        <td className="px-4 py-4 text-center">
                           <input type="checkbox" checked={isFaltou} disabled={!podeLancar} onChange={(e) => toggleNaoRealizou(nota.id, e.target.checked)} className="w-5 h-5 text-danger-fg border-line-strong rounded-lg cursor-pointer transition-all" />
                        </td>
                        <td className="px-4 py-4 text-center">
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

          {podeLancar && disciplinaSelecionada && filteredNotas.length > 0 && (
            <div className="flex items-center justify-end gap-4 border-t border-line bg-canvas px-painel py-3">
              <IndicadorGravacao pendente={hasUnsavedChanges()} salvando={saving} salvoEm={salvoEm} className="mr-auto" />
              <div className="hidden md:block">
                 <p className="text-xs font-medium text-fg-subtle">Confirme o lançamento para substituir a média anual automática.</p>
              </div>
               <button
                onClick={handleSubmit}
                disabled={!podeLancar || saving || !hasUnsavedChanges()}
                className="flex h-9 items-center gap-2 rounded-md bg-accent px-3.5 text-sm font-medium text-on-accent transition-colors hover:bg-accent-hover disabled:opacity-50"
              >
                {saving ? <Loader2 className="size-4 animate-spin" /> : <Save size={16} strokeWidth={1.75} />}
                {saving ? 'Salvando…' : 'Salvar recuperação final'}
              </button>
            </div>
          )}
        </div>
      </main>

      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-surface rounded-xl shadow-overlay w-full max-w-md overflow-hidden animate-pop-in border border-white">
            <div className="px-4 py-2.5 border-b border-line flex justify-between items-center bg-canvas">
              <div className="flex items-center gap-3">
                 <div className="w-10 h-10 bg-danger text-white rounded-xl flex items-center justify-center"><TrendingUp size={20}/></div>
                  <div>
                    <h3 className="text-lg font-medium text-fg">Consolidar Recuperação Final</h3>
                    <p className="text-xs font-medium text-fg-subtle">Ação permanente no boletim anual</p>
                  </div>
              </div>
              <button onClick={() => setShowConfirmModal(false)} className="p-2 hover:bg-zinc-300 rounded-xl transition-all"><X size={20}/></button>
            </div>
            <div className="p-4 max-h-[50vh] overflow-y-auto space-y-2 bg-canvas/20 custom-scrollbar">
              {notasRecuperacao.filter(n => n.disciplinaId === disciplinaSelecionada && notas[n.id] !== originalNotas[n.id]).map(n => (
                 <div key={n.id} className="flex items-center justify-between bg-surface p-3 rounded-2xl border border-line">
                  <span className="text-sm font-medium text-fg-muted truncate pr-4">{n.estudanteNome}</span>
                  <span className="text-sm font-medium text-danger-fg min-w-max">{notas[n.id] === '-1' ? 'FALTOU' : `NOTA: ${notas[n.id]}`}</span>
                </div>
              ))}
            </div>
             <div className="px-4 py-2.5 bg-canvas border-t border-line flex gap-4">
              <button onClick={() => setShowConfirmModal(false)} className="flex-1 py-3 text-sm font-medium text-fg-subtle hover:bg-surface rounded-lg transition-all">Cancelar</button>
              <button onClick={handleConfirmSave} className="flex-1 py-3 bg-danger text-white text-sm font-medium rounded-lg hover:bg-danger transition-all">Finalizar Envio</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
