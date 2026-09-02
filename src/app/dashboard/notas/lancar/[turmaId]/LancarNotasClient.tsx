"use client"

import { useState, useEffect, Fragment } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  ArrowLeft,
  Save,
  AlertCircle,
  UserMinus,
  X,
  CheckCircle2,
  GraduationCap,
  Users,
  FileText,
  BarChart2,
  TrendingUp,
  Search,
  Loader2,
  Accessibility,
  Printer
} from "lucide-react"
import { calcularNotaUnidade, calcularMediaFinal, type EsquemaConfig, type UnidadeInput } from "@/lib/services/notas"

interface Estudante {
  matricula: string
  nome: string
  aeeProfile?: {
    id: string
    acknowledgements: any[]
  } | null
}

interface Disciplina {
  id: string
  nome: string
}

interface EsquemaAtividade {
  id: string
  ordem: number
  nome: string
  peso: number
}

interface EsquemaUnidade {
  id: string
  ordem: number
  nome: string
  atividades: EsquemaAtividade[]
}

interface EsquemaInfo {
  id: string
  notaMinimaAprovacao: number
  recuperacaoUnidadeAtiva: boolean
  modoRecuperacaoUnidade: string | null
  recuperacaoFinalAtiva: boolean
  modoRecuperacaoFinal: string | null
  unidades: EsquemaUnidade[]
}

interface UnidadeNotaState {
  isDesistente: boolean
  atividades: Record<string, string>
}

type NotaState = Record<string, UnidadeNotaState> // chave: esquemaUnidadeId

function estadoVazio(esquema: EsquemaInfo | null): NotaState {
  if (!esquema) return {}
  const estado: NotaState = {}
  for (const u of esquema.unidades) {
    const atividades: Record<string, string> = {}
    for (const a of u.atividades) atividades[a.id] = ''
    estado[u.id] = { isDesistente: false, atividades }
  }
  return estado
}

export default function LancarNotasTurmaClient({
  turmaId,
  turmaNome,
  disciplinas,
  estudantes
}: {
  turmaId: string
  turmaNome: string
  disciplinas: Disciplina[]
  estudantes: Estudante[]
}) {
  const router = useRouter()
  const [disciplinaSelecionada, setDisciplinaSelecionada] = useState("")
  const [esquema, setEsquema] = useState<EsquemaInfo | null>(null)
  const [statusMap, setStatusMap] = useState<Record<string, string>>({})
  const [notas, setNotas] = useState<Record<string, NotaState>>({})
  const [originalNotas, setOriginalNotas] = useState<Record<string, NotaState>>({})
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [feedbackModal, setFeedbackModal] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [searchTerm, setSearchTerm] = useState("")

  const esquemaConfig: EsquemaConfig | null = esquema ? {
    numUnidades: esquema.unidades.length,
    notaMinimaAprovacao: esquema.notaMinimaAprovacao,
    recuperacaoUnidadeAtiva: esquema.recuperacaoUnidadeAtiva,
    modoRecuperacaoUnidade: esquema.modoRecuperacaoUnidade as any,
    recuperacaoFinalAtiva: esquema.recuperacaoFinalAtiva,
    modoRecuperacaoFinal: esquema.modoRecuperacaoFinal as any,
  } : null

  // Esquema legado (1 atividade por unidade) renderiza como uma tabela
  // simples - 1 input por unidade, sem sub-colunas de atividade nem coluna
  // de subtotal separada (o subtotal É o próprio valor da única atividade).
  const isSimples = esquema ? esquema.unidades.every(u => u.atividades.length === 1) : true

  const hasUnsavedChanges = () => {
    return JSON.stringify(notas) !== JSON.stringify(originalNotas)
  }

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges()) { e.preventDefault(); e.returnValue = ""; }
    }
    window.addEventListener("beforeunload", handleBeforeUnload)
    return () => window.removeEventListener("beforeunload", handleBeforeUnload)
  }, [notas, originalNotas])

  const handleAtividadeChange = (estudanteId: string, unidadeId: string, atividadeId: string, valor: string, max: number = 10) => {
    if (valor !== '') {
      if (valor.includes('.')) { const parts = valor.split('.'); if (parts[1].length > 1) return; }
      const num = parseFloat(valor); if (num > max || num < 0) return;
    }
    setNotas(prev => {
      const base = prev[estudanteId] || estadoVazio(esquema)
      const unidadeBase = base[unidadeId] || { isDesistente: false, atividades: {} }
      return {
        ...prev,
        [estudanteId]: {
          ...base,
          [unidadeId]: {
            ...unidadeBase,
            atividades: { ...unidadeBase.atividades, [atividadeId]: valor }
          }
        }
      }
    })
  }

  const handleDesistenteChange = (estudanteId: string, unidadeId: string, checked: boolean) => {
    setNotas(prev => {
      const base = prev[estudanteId] || estadoVazio(esquema)
      const unidadeBase = base[unidadeId] || { isDesistente: false, atividades: {} }
      return {
        ...prev,
        [estudanteId]: {
          ...base,
          [unidadeId]: { ...unidadeBase, isDesistente: checked }
        }
      }
    })
  }

  const calcularSubtotalUnidade = (estudanteId: string, unidade: EsquemaUnidade): number | null => {
    const estado = notas[estudanteId]?.[unidade.id]
    if (!estado) return null
    return calcularNotaUnidade(unidade.atividades.map(a => ({
      peso: a.peso,
      valor: estado.atividades[a.id] !== '' ? parseFloat(estado.atividades[a.id]) : null
    })))
  }

  const calcularMedia = (estudanteId: string): { texto: string, valor: number | null } => {
    if (!esquema || !esquemaConfig) return { texto: '-', valor: null }
    const estado = notas[estudanteId]
    if (!estado) return { texto: '-', valor: null }

    const todasDesistentes = esquema.unidades.every(u => estado[u.id]?.isDesistente)
    if (todasDesistentes) return { texto: 'DE', valor: null }

    const unidadesInput: UnidadeInput[] = esquema.unidades.map(u => ({
      esquemaUnidadeId: u.id,
      atividades: u.atividades.map(a => ({
        peso: a.peso,
        valor: estado[u.id]?.atividades[a.id] !== '' && estado[u.id]?.atividades[a.id] !== undefined
          ? parseFloat(estado[u.id].atividades[a.id])
          : null
      }))
    }))
    const resultado = calcularMediaFinal(unidadesInput, esquemaConfig)
    if (resultado.media === null) return { texto: '-', valor: null }
    return { texto: resultado.media.toFixed(1), valor: resultado.media }
  }

  const getStatusColor = (media: { texto: string, valor: number | null }) => {
    if (media.texto === 'DE') return 'text-slate-400'
    if (media.texto === '-') return 'text-slate-300'
    return (media.valor ?? 0) >= (esquema?.notaMinimaAprovacao ?? 5) ? 'text-emerald-600' : 'text-rose-600'
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault(); if (!disciplinaSelecionada) { setMessage({ type: 'error', text: 'Selecione uma disciplina' }); return; }
    setShowModal(true);
  }

  const confirmSave = async () => {
    setSaving(true); setMessage(null); setShowModal(false);
    try {
      const changedEntries = Object.entries(notas).filter(([id, d]) => JSON.stringify(d) !== JSON.stringify(originalNotas[id] || {}));
      const notasArray = changedEntries.map(([estudanteId, data]) => ({
        estudanteId,
        disciplinaId: disciplinaSelecionada,
        unidades: Object.entries(data).map(([esquemaUnidadeId, u]) => ({
          esquemaUnidadeId,
          isDesistente: u.isDesistente,
          atividades: Object.entries(u.atividades).map(([esquemaAtividadeId, valor]) => ({ esquemaAtividadeId, valor: valor === '' ? null : valor }))
        }))
      }));
      const response = await fetch('/api/notas/lancar', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ notas: notasArray }) });
      if (response.ok) {
        setOriginalNotas(JSON.parse(JSON.stringify(notas)));
        setFeedbackModal({
          type: 'success',
          text: `As notas de ${selectedDiscName || 'disciplina'} da turma ${turmaNome} foram salvas com sucesso no banco de dados!`
        });
        router.refresh();
      }
      else {
        const error = await response.json();
        setFeedbackModal({
          type: 'error',
          text: error.message || 'Ocorreu um erro ao tentar salvar as notas. Verifique as informações.'
        });
      }
    } catch (error) {
      setFeedbackModal({
        type: 'error',
        text: 'Erro de conexão com o servidor. Verifique sua conexão com a internet.'
      });
    } finally { setSaving(false) }
  }

  useEffect(() => {
    if (disciplinaSelecionada) {
      setLoading(true)
      fetch(`/api/notas/turma/${turmaId}/disciplina/${disciplinaSelecionada}`)
        .then(res => res.json())
        .then((data: { esquema: EsquemaInfo, notas: any[] }) => {
          setEsquema(data.esquema)
          const dict: Record<string, NotaState> = {}
          const status: Record<string, string> = {}
          if (Array.isArray(data.notas)) {
            data.notas.forEach((n) => {
              status[n.estudanteId] = n.status
              const estadoUnidades: NotaState = estadoVazio(data.esquema)
              for (const u of n.unidades) {
                if (!estadoUnidades[u.esquemaUnidadeId]) continue
                estadoUnidades[u.esquemaUnidadeId].isDesistente = !!u.isDesistente
                for (const a of u.atividades) {
                  estadoUnidades[u.esquemaUnidadeId].atividades[a.esquemaAtividadeId] = a.valor !== null && a.valor !== undefined ? String(a.valor) : ''
                }
              }
              dict[n.estudanteId] = estadoUnidades
            })
          }
          setStatusMap(status)
          setNotas(dict); setOriginalNotas(JSON.parse(JSON.stringify(dict)))
        }).finally(() => setLoading(false))
    }
  }, [disciplinaSelecionada, turmaId])

  const selectedDiscName = disciplinas.find(d => d.id === disciplinaSelecionada)?.nome

  const launchTips = [
    {
      title: "Lançamento Ágil",
      description: "As notas são salvas por unidade e a média é calculada em tempo real.",
      icon: <FileText className="w-5 h-5 text-emerald-600" />,
      color: "emerald"
    },
    {
      title: "Status de Aluno",
      description: "Marque como infrequente aquele aluno que não frequenta ou só apareceu para fazer a prova, clicando no ícone lateral (👥).",
      icon: <UserMinus className="w-5 h-5 text-slate-700" />,
      color: "blue"
    },
    {
      title: "Acompanhamento",
      description: "Médias abaixo de 5.0 são destacadas em vermelho para intervenção pedagógica.",
      icon: <TrendingUp className="w-5 h-5 text-orange-600" />,
      color: "orange"
    }
  ]

  const filteredEstudantes = estudantes.filter(est =>
    est.nome.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const totalColunas = esquema
    ? 3 + esquema.unidades.reduce((acc, u) => acc + (isSimples ? 1 : u.atividades.length + 1), 0)
    : 6

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header Estilo Simulados - Ajustado para ser Flush com o Layout */}
      <header className="bg-white shadow-sm border-b border-slate-300 sticky top-0 z-50 -mx-4 -mt-4 md:-mx-8 md:-mt-8 mb-4 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link href="/dashboard/notas" className="p-2 hover:bg-slate-200 rounded-lg transition-colors text-slate-400 hover:text-slate-700">
                <ArrowLeft size={20}/>
              </Link>
              <div>
                <h1 className="text-2xl font-medium text-slate-800 tracking-tight">
                  {disciplinaSelecionada ? selectedDiscName : "Lançar Notas"}
                </h1>
                <p className="text-base text-slate-700 font-medium">{disciplinaSelecionada ? `Turma: ${turmaNome}` : `Turma Selecionada: ${turmaNome}`}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {disciplinaSelecionada && (
                <a
                  href={`/api/relatorio/turma/${turmaId}/disciplina/${disciplinaSelecionada}/pdf`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 bg-white text-slate-700 px-4 py-2.5 rounded-xl font-bold border border-slate-200 hover:bg-slate-50 transition-all text-xs active:scale-95 shadow-sm"
                  title="Imprimir Mapa de Notas desta Disciplina"
                >
                  <Printer size={16} />
                  <span className="hidden md:inline">IMPRIMIR MAPA</span>
                </a>
              )}

              {hasUnsavedChanges() && (
                <button
                  onClick={handleSubmit}
                  disabled={saving}
                  className="flex items-center gap-2 bg-slate-900 border border-slate-900 text-white px-5 py-2.5 rounded-xl font-medium hover:bg-slate-800 transition-all text-sm active:scale-95 shadow-lg shadow-slate-300"
                >
                  {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save size={16} />}
                  {saving ? 'SALVANDO...' : 'SALVAR NOTAS'}
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">

        {/* Dicas Estilo Simulados */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {launchTips.map((tip, index) => (
             <div key={index} className="bg-white/60 border border-slate-300/60 p-4 rounded-2xl flex items-start space-x-4 hover:bg-white hover:border-slate-300 hover:shadow-sm transition-all">
                <div className={`p-2.5 rounded-xl bg-${tip.color}-50 text-${tip.color}-600`}>
                   {tip.icon}
                </div>
                <div>
                  <h3 className="text-base font-medium text-slate-800 mb-1">{tip.title}</h3>
                  <p className="text-sm text-slate-600 leading-relaxed">{tip.description}</p>
                </div>
             </div>
          ))}
        </div>

        {/* Filtros Estilo Simulados */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex flex-wrap gap-5 items-end">
            <div className="flex-1 min-w-[300px] space-y-1.5">
                <label className="text-sm font-medium text-slate-400 uppercase tracking-wider ml-1">Disciplina</label>
                <div className="relative">
                  <GraduationCap className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <select
                    value={disciplinaSelecionada}
                    onChange={(e) => setDisciplinaSelecionada(e.target.value)}
                    className="w-full bg-slate-50 border-none rounded-xl pl-11 pr-4 py-3 text-base focus:ring-2 focus:ring-slate-500 transition-all font-medium appearance-none cursor-pointer"
                  >
                    <option value="">Selecione a disciplina para lançamento...</option>
                    {disciplinas.map((disc) => <option key={disc.id} value={disc.id}>{disc.nome}</option>)}
                  </select>
                </div>
            </div>

            <div className="hidden lg:flex items-center gap-3 pb-1 border-l pl-5 border-slate-200 flex-1">
               <div className="bg-orange-50/50 p-2.5 rounded-xl text-orange-600 border border-orange-100/50"><UserMinus size={18}/></div>
               <p className="text-[11px] text-slate-600 leading-tight font-medium max-w-[450px]">
                 <strong className="text-slate-700">Aluno sem nota?</strong> Marque como <strong className="text-slate-700">Infrequente</strong> aquele aluno que não frequenta ou só apareceu para fazer a prova, clicando no ícone <span className="inline-flex mx-1 p-1 bg-white border border-slate-300 rounded text-slate-400"><UserMinus size={10}/></span> ao lado da nota para não afetar cálculos indevidos.
               </p>
            </div>
        </div>

        {/* Lançamento Estilo Simulados */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-300 overflow-hidden">
          <div className="p-4 border-b border-slate-200 bg-slate-50/10 flex items-center justify-between">
            <h2 className="text-lg font-medium text-slate-800 flex items-center gap-2">
              <Users size={20} className="text-slate-400" />
              Matriz de Rendimento Acadêmico
            </h2>
            <div className="relative max-w-xs w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Filtrar por nome..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg pl-9 pr-4 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-500/10 focus:border-slate-400 transition-all shadow-sm"
              />
            </div>
          </div>

          {message && (
            <div className={`p-3 flex items-center gap-2 border-b ${message.type === 'success' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-red-50 text-red-700 border-red-100'}`}>
              {message.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
              <span className="text-sm font-medium">{message.text}</span>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b border-slate-300">
                {esquema && !isSimples ? (
                  <>
                    <tr>
                      <th rowSpan={2} className="px-6 py-4 text-xs font-medium text-slate-400 uppercase tracking-widest w-12 text-center align-bottom">#</th>
                      <th rowSpan={2} className="px-6 py-4 text-xs font-medium text-slate-400 uppercase tracking-widest align-bottom">Estudante</th>
                      {esquema.unidades.map(u => (
                        <th key={u.id} colSpan={u.atividades.length + 1} className="px-4 py-2 text-xs font-medium text-slate-500 uppercase tracking-widest text-center border-l border-slate-200">
                          {u.nome}
                        </th>
                      ))}
                      <th rowSpan={2} className="px-6 py-4 text-xs font-medium text-slate-400 uppercase tracking-widest w-24 text-center align-bottom">Média</th>
                    </tr>
                    <tr>
                      {esquema.unidades.map(u => (
                        <Fragment key={u.id}>
                          {u.atividades.map(a => (
                            <th key={a.id} className="px-2 py-2 text-[10px] font-medium text-slate-400 uppercase tracking-wide text-center border-l border-slate-100 w-20">
                              {a.nome} <span className="text-slate-300">({a.peso})</span>
                            </th>
                          ))}
                          <th key={`${u.id}-subtotal`} className="px-2 py-2 text-[10px] font-bold text-slate-500 uppercase tracking-wide text-center bg-slate-100/60 w-16">
                            Subtotal
                          </th>
                        </Fragment>
                      ))}
                    </tr>
                  </>
                ) : (
                  <tr>
                    <th className="px-6 py-4 text-xs font-medium text-slate-400 uppercase tracking-widest w-12 text-center">#</th>
                    <th className="px-6 py-4 text-xs font-medium text-slate-400 uppercase tracking-widest">Estudante</th>
                    {(esquema?.unidades ?? []).map(u => (
                      <th key={u.id} className="px-4 py-4 text-xs font-medium text-slate-400 uppercase tracking-widest w-32 text-center">{u.nome}</th>
                    ))}
                    <th className="px-6 py-4 text-xs font-medium text-slate-400 uppercase tracking-widest w-24 text-center">Média</th>
                  </tr>
                )}
              </thead>
              <tbody className="divide-y divide-slate-200/80">
                {loading ? (
                   <tr>
                     <td colSpan={totalColunas} className="px-6 py-16 text-center">
                       <div className="flex flex-col items-center gap-2">
                         <Loader2 className="w-8 h-8 text-slate-700 animate-spin" />
                         <p className="text-slate-400 text-sm font-medium uppercase tracking-widest animate-pulse">Sincronizando...</p>
                       </div>
                     </td>
                   </tr>
                ) : !disciplinaSelecionada ? (
                   <tr>
                      <td colSpan={totalColunas} className="px-6 py-16 text-center text-slate-300">
                        <BarChart2 className="w-12 h-12 opacity-20 mx-auto mb-3" />
                        <p className="text-sm font-medium uppercase tracking-widest">Selecione uma disciplina para iniciar o lançamento</p>
                      </td>
                   </tr>
                ) : filteredEstudantes.length === 0 ? (
                   <tr>
                      <td colSpan={totalColunas} className="px-6 py-16 text-center text-slate-300">
                        <Search className="w-12 h-12 opacity-20 mx-auto mb-3" />
                        <p className="text-sm font-medium uppercase tracking-widest">Nenhum estudante encontrado</p>
                      </td>
                   </tr>
                ) : (
                  filteredEstudantes.map((estudante, index) => {
                    const estado = notas[estudante.matricula] || estadoVazio(esquema)
                    const media = calcularMedia(estudante.matricula)
                    const isDesistenteGeral = statusMap[estudante.matricula] === 'DESISTENTE'

                    return (
                      <tr key={estudante.matricula} className={`hover:bg-slate-50 transition-colors ${isDesistenteGeral ? 'bg-amber-50/20 grayscale-[0.5]' : ''}`}>
                        <td className="px-6 py-4 text-sm text-slate-400 font-medium text-center">{index + 1}</td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col relative group/name">
                             <div className="flex items-center gap-2">
                                <span className={`text-base font-medium uppercase ${isDesistenteGeral ? 'text-amber-700' : 'text-slate-700'}`}>{estudante.nome}</span>
                                {estudante.aeeProfile && (
                                   <Link
                                     href={`/dashboard/aee/${estudante.matricula}`}
                                     className={`p-1.5 rounded-full border-2 transition-all flex items-center justify-center hover:scale-110 active:scale-95 ${
                                       estudante.aeeProfile.acknowledgements.length > 0
                                       ? 'bg-emerald-50 border-emerald-500 text-emerald-600'
                                       : 'bg-amber-50 border-amber-500 text-amber-600 animate-pulse'
                                     }`}
                                     title={estudante.aeeProfile.acknowledgements.length > 0 ? "Ficha AEE: Lida" : "Ficha AEE: LEITURA PENDENTE!"}
                                   >
                                      <Accessibility className="w-4 h-4" />
                                   </Link>
                                )}
                             </div>
                            <span className="text-[11px] font-medium text-slate-400 tracking-widest uppercase">Matrícula: {estudante.matricula}</span>
                          </div>
                        </td>
                        {(esquema?.unidades ?? []).map((u) => {
                          const unidadeEstado = estado[u.id] || { isDesistente: false, atividades: {} }

                          if (isSimples) {
                            const atividade = u.atividades[0]
                            const val = atividade ? (unidadeEstado.atividades[atividade.id] ?? '') : ''
                            const origVal = atividade ? (originalNotas[estudante.matricula]?.[u.id]?.atividades[atividade.id] ?? '') : ''
                            const isModified = val !== origVal && !saving

                            return (
                              <td key={u.id} className="px-4 py-4 text-center">
                                <div className="flex flex-col items-center gap-1.5 group relative">
                                  <input
                                    type="number" step="0.1"
                                    value={val}
                                    onChange={(e) => atividade && handleAtividadeChange(estudante.matricula, u.id, atividade.id, e.target.value, atividade.peso)}
                                    className={`w-14 h-9 text-center border-2 rounded-xl text-base font-medium transition-all outline-none ${
                                      unidadeEstado.isDesistente ? 'bg-orange-50 border-orange-200 text-orange-600' :
                                      isModified ? 'border-slate-400 bg-white ring-4 ring-slate-500/5' : 'border-slate-200 bg-slate-50 focus:bg-white focus:border-slate-400'
                                    }`}
                                    placeholder="0.0"
                                  />
                                  <button
                                      type="button"
                                      onClick={() => handleDesistenteChange(estudante.matricula, u.id, !unidadeEstado.isDesistente)}
                                      className={`absolute -right-3 -bottom-2 p-1.5 rounded-full transition-all shadow-sm flex items-center justify-center ${
                                          unidadeEstado.isDesistente
                                          ? 'bg-orange-100 text-orange-600 scale-100 z-10 ring-2 ring-white'
                                          : 'bg-white text-slate-300 hover:text-orange-500 hover:bg-orange-50 scale-100 opacity-60 hover:opacity-100 group-hover:opacity-100 border border-slate-300 z-10'
                                      }`}
                                      title={unidadeEstado.isDesistente ? "Desmarcar infrequente" : "Marcar como Infrequente (não frequenta ou só veio fazer prova)"}
                                  >
                                      <UserMinus size={unidadeEstado.isDesistente ? 14 : 12}/>
                                  </button>
                                </div>
                              </td>
                            )
                          }

                          const subtotal = calcularSubtotalUnidade(estudante.matricula, u)

                          return (
                            <Fragment key={u.id}>
                              {u.atividades.map((a, ai) => {
                                const val = unidadeEstado.atividades[a.id] ?? ''
                                const origVal = originalNotas[estudante.matricula]?.[u.id]?.atividades[a.id] ?? ''
                                const isModified = val !== origVal && !saving

                                return (
                                  <td key={a.id} className="px-2 py-4 text-center border-l border-slate-100">
                                    <div className="flex flex-col items-center gap-1.5 group relative">
                                      <input
                                        type="number" step="0.1"
                                        value={val}
                                        onChange={(e) => handleAtividadeChange(estudante.matricula, u.id, a.id, e.target.value, a.peso)}
                                        className={`w-14 h-9 text-center border-2 rounded-xl text-sm font-medium transition-all outline-none ${
                                          unidadeEstado.isDesistente ? 'bg-orange-50 border-orange-200 text-orange-600' :
                                          isModified ? 'border-slate-400 bg-white ring-4 ring-slate-500/5' : 'border-slate-200 bg-slate-50 focus:bg-white focus:border-slate-400'
                                        }`}
                                        placeholder="0.0"
                                      />
                                      {ai === 0 && (
                                        <button
                                            type="button"
                                            onClick={() => handleDesistenteChange(estudante.matricula, u.id, !unidadeEstado.isDesistente)}
                                            className={`absolute -right-3 -bottom-2 p-1.5 rounded-full transition-all shadow-sm flex items-center justify-center ${
                                                unidadeEstado.isDesistente
                                                ? 'bg-orange-100 text-orange-600 scale-100 z-10 ring-2 ring-white'
                                                : 'bg-white text-slate-300 hover:text-orange-500 hover:bg-orange-50 scale-100 opacity-60 hover:opacity-100 group-hover:opacity-100 border border-slate-300 z-10'
                                            }`}
                                            title={unidadeEstado.isDesistente ? "Desmarcar infrequente (toda a unidade)" : "Marcar unidade como Infrequente"}
                                        >
                                            <UserMinus size={unidadeEstado.isDesistente ? 14 : 12}/>
                                        </button>
                                      )}
                                    </div>
                                  </td>
                                )
                              })}
                              <td key={`${u.id}-subtotal`} className="px-2 py-4 text-center bg-slate-50/60">
                                <span className={`text-sm font-bold ${subtotal !== null && subtotal < 5 ? 'text-rose-500' : 'text-slate-600'}`}>
                                  {subtotal !== null ? subtotal.toFixed(1) : '-'}
                                </span>
                              </td>
                            </Fragment>
                          )
                        })}
                        <td className="px-6 py-4 text-center">
                          <span className={`text-base font-medium ${getStatusColor(media)}`}>{media.texto}</span>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>

          {disciplinaSelecionada && filteredEstudantes.length > 0 && (
            <div className="p-5 bg-slate-50 border-t border-slate-200 flex justify-end items-center gap-4">
              <div className="hidden md:block">
                 <p className="text-[11px] font-medium text-slate-400 uppercase tracking-widest">Confira todas as notas antes de salvar o fechamento.</p>
              </div>
               <button
                onClick={handleSubmit}
                disabled={saving || !hasUnsavedChanges()}
                className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-8 py-3 rounded-2xl font-medium text-sm shadow-xl shadow-slate-300 transition-all active:scale-95 disabled:opacity-50"
              >
                {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save size={18} />}
                {saving ? 'SINCRONIZANDO...' : 'SALVAR NOTAS'}
              </button>
            </div>
          )}
        </div>
      </main>

      {showModal && esquema && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200 border border-white">
            <div className="px-6 py-5 border-b border-slate-200 flex justify-between items-center bg-slate-50">
              <div className="flex items-center gap-3">
                 <div className="w-10 h-10 bg-slate-600 text-white rounded-xl flex items-center justify-center shadow-lg shadow-slate-300"><Save size={20}/></div>
                  <div>
                     <h3 className="text-lg font-medium text-slate-800 uppercase tracking-tight">Consolidar Dados</h3>
                    <p className="text-xs font-medium text-slate-400 uppercase tracking-widest">Revise as alterações da turma</p>
                  </div>
              </div>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-slate-300 rounded-xl transition-all"><X size={20}/></button>
            </div>
            <div className="p-6 max-h-[60vh] overflow-y-auto space-y-3 bg-slate-50/20 custom-scrollbar">
              {estudantes.filter(e => JSON.stringify(notas[e.matricula]) !== JSON.stringify(originalNotas[e.matricula] || {})).map((est, i) => (
                 <div key={i} className="flex items-center justify-between bg-white p-3 rounded-2xl border border-slate-200 shadow-sm">
                   <span className="text-sm font-medium text-slate-700 uppercase truncate pr-4">{est.nome}</span>
                   <div className="flex gap-2 flex-wrap justify-end">
                       {esquema.unidades.map(u => {
                        const subtotal = calcularSubtotalUnidade(est.matricula, u)
                        const estadoAtual = notas[est.matricula]?.[u.id]
                        const estadoOriginal = originalNotas[est.matricula]?.[u.id]
                        if (JSON.stringify(estadoAtual) === JSON.stringify(estadoOriginal)) return null
                        return (
                          <span key={u.id} className="text-[11px] font-medium bg-slate-50 text-slate-700 px-2.5 py-1 rounded-lg border border-slate-200">
                            {u.nome}: {subtotal !== null ? subtotal.toFixed(1) : '0'} {estadoAtual?.isDesistente && <span className="text-amber-600 ml-1">(INF)</span>}
                          </span>
                        )
                      })}
                   </div>
                </div>
              ))}
            </div>
            <div className="px-6 py-5 bg-slate-50 border-t border-slate-200 flex gap-4">
              <button onClick={() => setShowModal(false)} className="flex-1 py-3 text-sm font-medium text-slate-400 hover:bg-white rounded-2xl transition-all">Cancelar</button>
              <button onClick={confirmSave} className="flex-1 py-3 bg-slate-600 text-white text-sm font-medium rounded-2xl shadow-xl shadow-slate-300 hover:bg-slate-700 transition-all active:scale-95">Confirmar e Gravar</button>
            </div>
          </div>
        </div>
      )}

      {feedbackModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-sm overflow-hidden p-8 flex flex-col items-center text-center animate-in zoom-in-95 duration-200 border border-slate-100">
            {feedbackModal.type === 'success' ? (
              <div className="w-16 h-16 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mb-5 ring-8 ring-emerald-50/50">
                <CheckCircle2 size={36} className="animate-bounce" />
              </div>
            ) : (
              <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-5 ring-8 ring-red-50/50">
                <AlertCircle size={36} className="animate-pulse" />
              </div>
            )}

            <h3 className="text-xl font-bold text-slate-800 mb-2">
              {feedbackModal.type === 'success' ? 'Salvo com Sucesso!' : 'Ocorreu um Erro'}
            </h3>

            <p className="text-sm text-slate-500 leading-relaxed mb-6">
              {feedbackModal.text}
            </p>

            <button
              onClick={() => setFeedbackModal(null)}
              className={`w-full py-3.5 rounded-2xl font-semibold text-sm transition-all active:scale-95 shadow-lg ${
                feedbackModal.type === 'success'
                  ? 'bg-slate-900 text-white hover:bg-slate-800 shadow-slate-200'
                  : 'bg-rose-600 text-white hover:bg-rose-700 shadow-rose-200'
              }`}
            >
              Entendi
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
