"use client"

import { useState, useEffect } from "react"
import GabaritoProfessor from "./GabaritoProfessor"
import Link from "next/link"
import { 
  Search, 
  Save, 
  Loader2, 
  AlertCircle, 
  CheckCircle2, 
  Users, 
  BookOpen,
  ArrowLeft,
  BarChart3,
  TrendingUp,
  Target,
  FileText,
  Layers,
  X,
  Printer,
  UserPlus,
  Send,
  Info
} from "lucide-react"

import { reportarEstudanteFaltante } from "./actions"

interface Area {
  id: string
  nome: string
}

interface Turma {
  id: string
  nome: string
}

interface Area {
  id: string
  nome: string
}

interface Estudante {
  matricula: string
  nome: string
  notasSimulado: Array<{
    nota: number | null
    ausente?: boolean
    notaSegundaChamada?: number | null
    unidade: number
    updatedAt?: string
    lancadoBy?: { name: string | null, email: string }
  }>
}

export default function SimuladosClient({
  turmas,
  provas,
  areas,
  user,
  nomeEscola = 'Áxis'
}: {
  turmas: Turma[],
  provas: {id: string, titulo: string, codigo: number, turmaId: string | null, createdAt: Date, unidade: number | null, _count?: { questoes: number }}[],
  areas: Area[],
  user: any,
  nomeEscola?: string
}) {
  const [selectedTurma, setSelectedTurma] = useState("")
  const [selectedProva, setSelectedProva] = useState("")
  const [selectedArea, setSelectedArea] = useState("")
  const [selectedUnidade, setSelectedUnidade] = useState("2")
  const [loading, setLoading] = useState(false)
  const [responsavelName, setResponsavelName] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [estudantes, setEstudantes] = useState<Estudante[]>([])
  const [notasTemp, setNotasTemp] = useState<Record<string, string>>({})
  const [originalNotas, setOriginalNotas] = useState<Record<string, string>>({})
  const [ausentesTemp, setAusentesTemp] = useState<Record<string, boolean>>({})
  const [originalAusentes, setOriginalAusentes] = useState<Record<string, boolean>>({})
  const [notaSegundaChamadaTemp, setNotaSegundaChamadaTemp] = useState<Record<string, string>>({})
  const [originalNotaSegundaChamada, setOriginalNotaSegundaChamada] = useState<Record<string, string>>({})
  const [showModal, setShowModal] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [canLaunch, setCanLaunch] = useState(false)
  const [canView, setCanView] = useState(false)
  const [gabarito, setGabarito] = useState<any>(null)
  const [showGabaritoModal, setShowGabaritoModal] = useState(false)
  const [showWelcomeModal, setShowWelcomeModal] = useState(false)
  const [welcomeModalShown, setWelcomeModalShown] = useState(false)
  const [launchInfo, setLaunchInfo] = useState<{ author: string, date: string } | null>(null)

  const [showMissingStudentModal, setShowMissingStudentModal] = useState(false)
  const [submittingMissingStudent, setSubmittingMissingStudent] = useState(false)
  const [missingStudentForm, setMissingStudentForm] = useState({ turmaId: "", nome: "", matricula: "", observacao: "" })

  useEffect(() => {
    if (selectedTurma && selectedUnidade) {
       if (selectedUnidade === "2" && selectedProva) {
          loadEstudantes()
       } else if (selectedUnidade === "1" && selectedArea) {
          loadEstudantes()
       } else {
          setEstudantes([])
          setResponsavelName(null)
       }
    } else {
      setCanLaunch(user.isSuperuser || user.isDirecao)
    }
  }, [selectedTurma, selectedProva, selectedArea, selectedUnidade])

  const loadEstudantes = async () => {
    setLoading(true)
    setMessage(null)
    setResponsavelName(null)
    try {
      const qs = new URLSearchParams()
      qs.set("turmaId", selectedTurma)
      qs.set("unidade", selectedUnidade)
      if (selectedUnidade === "2") qs.set("provaId", selectedProva)
      else qs.set("areaId", selectedArea)

      const res = await fetch(`/api/simulados?${qs.toString()}`, { cache: 'no-store' })
      const data = await res.json()
      if (res.ok) {
        const { estudantes: list, canEdit, canView: viewPerm, gabarito: gabaritoData } = data
        setEstudantes(list)
        
        // Liberar digitação na 1ª unidade para Direção e Admin; para outros usuários, manter 1ª unidade fechada
        const isPrivileged = !!(user?.isSuperuser || user?.isDirecao)
        const canLaunchAllowed = isPrivileged || (canEdit && selectedUnidade !== "1")
        setCanLaunch(canLaunchAllowed)
        setCanView(viewPerm || isPrivileged)
        setGabarito(gabaritoData)
        setResponsavelName(data.responsavelName || null)
        
        if (canLaunchAllowed && (selectedUnidade === "2" || isPrivileged) && !welcomeModalShown) {
           setShowWelcomeModal(true)
           setWelcomeModalShown(true)
        }

        const initialNotas: Record<string, string> = {}
        const initialAusentes: Record<string, boolean> = {}
        const initialSegundaChamada: Record<string, string> = {}
        
        let lastUpdateInfo: { author: string, date: string } | null = null

        list.forEach((est: Estudante) => {
          if (est.notasSimulado.length > 0) {
            const nota = est.notasSimulado[0]
            initialNotas[est.matricula] = nota.nota !== null ? nota.nota.toString() : ""
            initialAusentes[est.matricula] = nota.ausente || false
            initialSegundaChamada[est.matricula] = nota.notaSegundaChamada ? nota.notaSegundaChamada.toString() : ""
            
            if (!lastUpdateInfo && nota.updatedAt && nota.lancadoBy) {
               lastUpdateInfo = {
                 author: nota.lancadoBy.name || nota.lancadoBy.email,
                 date: new Date(nota.updatedAt).toLocaleString('pt-BR')
               }
            }
          } else {
            initialNotas[est.matricula] = ""
            initialAusentes[est.matricula] = false
            initialSegundaChamada[est.matricula] = ""
          }
        })
        
        setNotasTemp(initialNotas)
        setOriginalNotas(initialNotas)
        setAusentesTemp(initialAusentes)
        setOriginalAusentes(initialAusentes)
        setNotaSegundaChamadaTemp(initialSegundaChamada)
        setOriginalNotaSegundaChamada(initialSegundaChamada)
        setLaunchInfo(lastUpdateInfo)
      } else {
        setMessage({ type: 'error', text: data.message || 'Erro ao carregar estudantes' })
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Erro de conexão' })
    } finally {
      setLoading(false)
    }
  }

  const handleNotaChange = (matricula: string, value: string) => {
    const val = value.replace(',', '.')
    if (val === "" || val.toUpperCase() === "F" || val === "-1" || (/^\d*\.?\d*$/.test(val) && parseFloat(val) <= 4)) {
      setNotasTemp(prev => ({ ...prev, [matricula]: val.toUpperCase() === "F" ? "-1" : val }))
    }
  }

  const handleAusenteChange = (matricula: string, checked: boolean) => {
    setAusentesTemp(prev => ({ ...prev, [matricula]: checked }))
    if (checked) {
      setNotasTemp(prev => ({ ...prev, [matricula]: "" }))
    }
  }

  const handleSegundaChamadaChange = (matricula: string, value: string) => {
    const val = value.replace(',', '.')
    if (val === "" || (/^\d*\.?\d*$/.test(val) && parseFloat(val) <= 10)) {
      setNotaSegundaChamadaTemp(prev => ({ ...prev, [matricula]: val }))
    }
  }

  const hasUnsavedChanges = () => {
    for (const matricula of Object.keys(notasTemp)) {
      if (
        notasTemp[matricula] !== originalNotas[matricula] ||
        ausentesTemp[matricula] !== originalAusentes[matricula] ||
        notaSegundaChamadaTemp[matricula] !== originalNotaSegundaChamada[matricula]
      ) {
        return true
      }
    }
    return false
  }

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    setShowModal(true)
  }

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    setSaving(true)
    setMessage(null)

    const notasToSave = Object.entries(notasTemp)
      .filter(([matricula]) => 
        notasTemp[matricula] !== originalNotas[matricula] || 
        ausentesTemp[matricula] !== originalAusentes[matricula] || 
        notaSegundaChamadaTemp[matricula] !== originalNotaSegundaChamada[matricula]
      )
      .map(([matricula]) => ({
        estudanteId: matricula,
        nota: notasTemp[matricula] === "" ? null : parseFloat(notasTemp[matricula]),
        ausente: ausentesTemp[matricula] || false,
        notaSegundaChamada: notaSegundaChamadaTemp[matricula] === "" ? null : parseFloat(notaSegundaChamadaTemp[matricula])
      }))

    try {
      const res = await fetch('/api/simulados', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provaId: selectedUnidade === "2" ? selectedProva : undefined,
          areaId: selectedUnidade === "1" ? selectedArea : undefined,
          unidade: selectedUnidade,
          turmaId: selectedTurma,
          notas: notasToSave
        })
      })

      if (res.ok) {
        setMessage({ type: 'success', text: 'Notas salvas com sucesso!' })
        setShowModal(false)
        setOriginalNotas({...notasTemp})
        setOriginalAusentes({...ausentesTemp})
        setOriginalNotaSegundaChamada({...notaSegundaChamadaTemp})
        
        // Remove a mensagem depois de 5 segundos
        setTimeout(() => setMessage(null), 5000)
      } else {
        const data = await res.json()
        setMessage({ type: 'error', text: data.message || 'Erro ao salvar notas' })
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Erro de conexão ao salvar' })
    } finally {
      setSaving(false)
    }
  }

  const handleReportMissingStudent = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmittingMissingStudent(true)
    setMessage(null)

    try {
      const res = await reportarEstudanteFaltante(
        missingStudentForm.turmaId, 
        missingStudentForm.nome, 
        missingStudentForm.matricula, 
        missingStudentForm.observacao
      )

      if (res.error) {
        setMessage({ type: 'error', text: res.error })
      } else {
        setMessage({ type: 'success', text: 'Chamado aberto! A secretaria irá verificar.' })
        setShowMissingStudentModal(false)
        setMissingStudentForm({ turmaId: "", nome: "", matricula: "", observacao: "" })
        setTimeout(() => setMessage(null), 5000)
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Erro ao enviar a solicitação' })
    } finally {
      setSubmittingMissingStudent(false)
    }
  }

  const filteredEstudantes = estudantes.filter(est => 
    est.nome.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const estudantesComNota = filteredEstudantes.filter(est => 
    notasTemp[est.matricula] !== "" && 
    !isNaN(parseFloat(notasTemp[est.matricula])) && 
    parseFloat(notasTemp[est.matricula]) !== -1
  )

  const stats = {
    media: estudantesComNota.length > 0 
      ? (estudantesComNota.reduce((acc, est) => acc + parseFloat(notasTemp[est.matricula]), 0) / estudantesComNota.length).toFixed(1)
      : "0.0",
    total: filteredEstudantes.length,
    aprovados: estudantesComNota.filter(est => parseFloat(notasTemp[est.matricula]) >= 2.4).length
  }

  const simuTips = [
    {
      title: "Ausência",
      description: "Marque a caixa de seleção na coluna 'Falta' caso o estudante não tenha comparecido.",
      icon: <Target className="w-5 h-5 text-slate-700" />,
      color: "orange"
    },
    {
      title: "Unidades Letivas",
      description: "Selecione entre Unidade 1 ou 2 para registrar o desempenho do simulado correspondente.",
      icon: <FileText className="w-5 h-5 text-slate-700" />,
      color: "blue"
    },
    {
      title: "Desempenho Geral",
      description: "O sistema monitora o aproveitamento da área para prever o rendimento no ENEM/Vestibulares.",
      icon: <TrendingUp className="w-5 h-5 text-emerald-600" />,
      color: "emerald"
    }
  ]

  return (
    <div className="min-h-screen bg-slate-50 print:bg-white print:min-h-0">
      {/* Header Premium Estilo Resultados - Ajustado para ser Flush com o Layout */}
      <header className="bg-white/80 backdrop-blur-xl border-b border-slate-300 sticky top-0 z-50 -mx-4 -mt-4 md:-mx-8 md:-mt-8 mb-4 px-4 sm:px-6 lg:px-8 print:hidden">
        <div className="max-w-7xl mx-auto py-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="flex items-center space-x-5">
              <Link
                href="/dashboard"
                className="p-2 hover:bg-slate-200 rounded-lg transition-colors text-slate-400 hover:text-slate-700"
              >
                <ArrowLeft size={20} />
              </Link>
              <div>
                <h1 className="text-2xl font-medium text-slate-800 tracking-tight">Simulados</h1>
                <p className="text-base text-slate-700 font-medium">Gestão de notas por áreas de conhecimento</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {(user.isSuperuser || user.isDirecao) && (
                <Link 
                  href="/dashboard/simulados/responsaveis"
                  className="flex items-center gap-2 bg-slate-900 text-white px-6 py-3 rounded-2xl font-medium hover:bg-slate-800 transition-all text-xs uppercase tracking-widest active:scale-95 shadow-xl shadow-slate-300"
                >
                  <Users size={16} /> Designar Responsáveis
                </Link>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-32 space-y-8 print:p-0 print:m-0 print:space-y-4">
        
        {/* Print Header */}
        <div className="hidden print:block border-b-2 border-slate-800 pb-4 mb-6">
           <div className="flex justify-between items-end">
              <div>
                 <h1 className="text-2xl font-bold text-slate-900 uppercase">Lista de Lançamento de Simulado</h1>
                 <p className="text-sm font-medium text-slate-600 mt-1">
                    Turma: {turmas.find(t => t.id === selectedTurma)?.nome || 'Não selecionada'} • 
                    Prova: {provas.find((p: any) => p.id === selectedProva)?.titulo || 'Não selecionada'} • 
                    Unidade: {selectedUnidade}
                 </p>
              </div>
              <div className="text-right">
                 <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Desempenho</p>
                 <p className="text-sm font-medium text-slate-800">Média: {stats.media} | Aprovados: {stats.total > 0 ? Math.round((stats.aprovados / stats.total) * 100) : 0}%</p>
              </div>
           </div>
           {launchInfo && (
              <p className="text-xs text-slate-500 mt-2 font-medium">Lançado por: {launchInfo.author} em {launchInfo.date}</p>
           )}
        </div>

        {/* Dicas Fixas - Estilo Resultados */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 print:hidden">
          {simuTips.map((tip, index) => (
             <div key={index} className="bg-white/60 border border-slate-300/60 p-5 rounded-3xl flex items-start space-x-4 hover:bg-white hover:border-slate-300 hover:shadow-xl hover:shadow-slate-300/30 transition-all group">
                <div className={`p-3 rounded-2xl bg-${tip.color}-50 text-${tip.color}-600 group-hover:bg-${tip.color}-600 group-hover:text-white transition-all shadow-inner`}>
                   {tip.icon}
                </div>
                <div>
                  <h3 className="text-sm font-medium text-slate-800 uppercase tracking-widest mb-1">{tip.title}</h3>
                  <p className="text-[11px] font-medium text-slate-400 uppercase leading-relaxed">{tip.description}</p>
                </div>
             </div>
          ))}
        </div>

        {/* Filtros Premium */}
        <div className="bg-white p-6 rounded-[2.5rem] shadow-xl shadow-slate-300/40 border border-slate-200 flex flex-wrap gap-6 items-end relative overflow-hidden print:hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-rose-50 rounded-full -mr-16 -mt-16 opacity-50 blur-3xl"></div>
            
            <div className="flex-1 min-w-[200px] space-y-2">
                <label className="text-[10px] font-medium text-slate-400 uppercase tracking-[0.2em] ml-2">Filtrar por Turma</label>
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center bg-slate-50 rounded-lg text-slate-400 group-focus-within:text-rose-600 group-focus-within:bg-rose-50 transition-all">
                    <Users size={16} />
                  </div>
                  <select
                    value={selectedTurma}
                    onChange={(e) => setSelectedTurma(e.target.value)}
                    className="w-full bg-slate-50 hover:bg-slate-200 border-none rounded-2xl pl-14 pr-6 py-4 text-sm focus:ring-2 focus:ring-rose-500 transition-all appearance-none cursor-pointer font-medium text-slate-700 shadow-inner"
                  >
                    <option value="">Selecione a Turma...</option>
                    {turmas.map((t) => <option key={t.id} value={t.id}>{t.nome}</option>)}
                  </select>
                </div>
            </div>

            <div className="flex-1 min-w-[200px] space-y-2">
                <label className="text-[10px] font-medium text-slate-400 uppercase tracking-[0.2em] ml-2">
                   {selectedUnidade === "1" ? "Área de Conhecimento" : "Prova"}
                </label>
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center bg-slate-50 rounded-lg text-slate-400 group-focus-within:text-rose-600 group-focus-within:bg-rose-50 transition-all">
                    {selectedUnidade === "1" ? <BookOpen size={16} /> : <FileText size={16} />}
                  </div>
                  
                  {selectedUnidade === "1" ? (
                    <select
                      value={selectedArea}
                      onChange={(e) => setSelectedArea(e.target.value)}
                      disabled={!selectedTurma}
                      className="w-full bg-slate-50 hover:bg-slate-200 border-none rounded-2xl pl-14 pr-6 py-4 text-sm focus:ring-2 focus:ring-rose-500 transition-all appearance-none cursor-pointer font-medium text-slate-700 shadow-inner"
                    >
                      <option value="">Selecione a Área...</option>
                      {areas.map((a) => <option key={a.id} value={a.id}>{a.nome}</option>)}
                    </select>
                  ) : (
                    <select
                      value={selectedProva}
                      onChange={(e) => setSelectedProva(e.target.value)}
                      disabled={!selectedTurma}
                      className="w-full bg-slate-50 hover:bg-slate-200 border-none rounded-2xl pl-14 pr-6 py-4 text-sm focus:ring-2 focus:ring-rose-500 transition-all appearance-none cursor-pointer font-medium text-slate-700 shadow-inner"
                    >
                      <option value="">Selecione a Prova...</option>
                      {provas.filter(p => {
                         if (p.turmaId && p.turmaId !== selectedTurma) return false;
                         if (p.unidade) return p.unidade === 2;
                         return true;
                      }).map((p) => <option key={p.id} value={p.id}>#{p.codigo} - {p.titulo}</option>)}
                    </select>
                  )}
                </div>
            </div>

                        <div className="flex-1 min-w-[200px] space-y-2">
                <label className="text-[10px] font-medium text-slate-400 uppercase tracking-[0.2em] ml-2">Unidade / Etapa</label>
                <div className="flex bg-slate-50 p-1.5 rounded-2xl shadow-inner border border-slate-100">
                  <button
                    onClick={() => setSelectedUnidade("1")}
                    className={`flex-1 py-2.5 text-sm font-medium rounded-xl transition-all ${
                      selectedUnidade === "1" ? 'bg-white text-rose-600 shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
                    }`}
                  >
                    1ª Unidade {user?.isSuperuser || user?.isDirecao ? '' : '(Fechada)'}
                  </button>
                  <button
                    onClick={() => setSelectedUnidade("2")}
                    className={`flex-1 py-2.5 text-sm font-medium rounded-xl transition-all ${
                      selectedUnidade === "2" ? 'bg-white text-rose-600 shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
                    }`}
                  >
                    2ª Unidade
                  </button>
                </div>
            </div>

            <div className="flex items-center gap-3 pb-1">
                <div className="text-center px-4 py-2 bg-slate-50 rounded-xl border border-slate-200">
                    <p className="text-[10px] font-medium text-slate-400 uppercase tracking-widest">Média</p>
                    <p className="text-lg font-black text-slate-700 leading-none mt-1">{stats.media}</p>
                </div>
                <div className="text-center px-4 py-2 bg-emerald-50 rounded-xl border border-emerald-100">
                    <p className="text-[10px] font-medium text-emerald-400 uppercase tracking-widest">Aprov.</p>
                    <p className="text-lg font-black text-emerald-700 leading-none mt-1">{stats.total > 0 ? Math.round((stats.aprovados / stats.total) * 100) : 0}%</p>
                </div>
            </div>
        </div>
        
        
        {/* Lançamento Estilo Resultados */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-300 overflow-hidden print:shadow-none print:border-none print:rounded-none">
          <div className="p-4 border-b border-slate-200 bg-slate-50/10 flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
            <div>
               <h2 className="text-lg font-medium text-slate-800 flex items-center gap-2">
                 <Users size={20} className="text-slate-400" />
                 Matriz de Avaliação Somativa
               </h2>
               <div className="mt-2">
                 {responsavelName && (
                   <span className="bg-indigo-100 text-indigo-700 text-xs px-2.5 py-1 rounded-full font-medium border border-indigo-200">
                     Lançamento: {responsavelName}
                   </span>
                 )}
                 {!responsavelName && selectedProva && (
                   <span className="bg-amber-100 text-amber-700 text-xs px-2.5 py-1 rounded-full font-medium border border-amber-200">
                     Nenhum professor designado
                   </span>
                 )}
               </div>
               {launchInfo && (
                  <p className="text-[10px] font-medium text-slate-400 uppercase tracking-widest mt-1.5 flex items-center gap-1.5">
                     <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                     Último lançamento por <span className="text-slate-600 font-bold">{launchInfo.author}</span> em {launchInfo.date}
                  </p>
               )}
            </div>
            <div className="flex items-center gap-3 w-full md:w-auto">
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
              {selectedUnidade === "2" && selectedProva && (
                <button
                  onClick={() => setShowGabaritoModal(true)}
                  className="flex items-center gap-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 px-4 py-2 rounded-lg text-sm font-medium transition-all shadow-sm border border-indigo-200"
                  title="Ver Gabarito"
                >
                  <BookOpen size={16} />
                  <span className="hidden sm:inline">Gabarito</span>
                </button>
              )}
              <button
                onClick={() => window.print()}
                className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-600 px-4 py-2 rounded-lg text-sm font-medium transition-all shadow-sm border border-slate-200"
                title="Imprimir lista"
              >
                <Printer size={16} />
                <span className="hidden sm:inline">Imprimir</span>
              </button>
            </div>
          </div>

          {message && (
            <div className={`p-3 flex items-center gap-2 border-b ${message.type === 'success' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-red-50 text-red-700 border-red-100'}`}>
              {message.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
              <span className="text-xs font-medium">{message.text}</span>
            </div>
          )}

          {selectedTurma && !loading && (
            <div className="px-4 py-3 bg-indigo-50/50 border-b border-indigo-100 flex items-center justify-between gap-4 print:hidden">
              <div className="flex items-center gap-2 text-indigo-700">
                <Info size={16} className="shrink-0" />
                <p className="text-[11px] font-bold uppercase tracking-wider">Algum aluno não está aparecendo na lista desta turma?</p>
              </div>
              <button
                onClick={() => {
                  setMissingStudentForm(p => ({ ...p, turmaId: selectedTurma }))
                  setShowMissingStudentModal(true)
                }}
                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-md shadow-indigo-200 active:scale-95 shrink-0"
              >
                <UserPlus size={14} />
                Reportar Ausência
              </button>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50 border-b border-slate-300">
                <tr>
                  <th className="px-4 py-4 w-12 text-center text-sm font-medium text-slate-400 uppercase tracking-widest border-b">#</th>
                  <th className="px-6 py-4 print:py-2 print:px-2 text-sm print:text-xs font-medium text-slate-400 uppercase tracking-widest border-b print:border-slate-800">Estudante</th>
                  <th className="px-2 py-4 print:py-2 print:px-2 text-sm print:text-xs font-medium text-slate-400 uppercase tracking-widest w-24 text-center border-b print:border-slate-800">Falta</th>
                  <th className="px-4 py-4 print:py-2 print:px-2 text-sm print:text-xs font-medium text-slate-400 uppercase tracking-widest w-32 text-center border-b print:border-slate-800">Nota</th>
                  <th className="px-4 py-4 print:py-2 print:px-2 text-sm print:text-xs font-medium text-slate-400 uppercase tracking-widest w-32 text-center border-b print:border-slate-800">2ª Chamada</th>
                  <th className="px-6 py-4 print:py-2 print:px-2 text-sm print:text-xs font-medium text-slate-400 uppercase tracking-widest text-center border-b print:border-slate-800">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-16 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <Loader2 className="w-8 h-8 text-slate-700 animate-spin" />
                        <p className="text-slate-400 text-xs font-medium uppercase tracking-widest animate-pulse">Sincronizando...</p>
                      </div>
                    </td>
                  </tr>
                ) : filteredEstudantes.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-16 text-center text-slate-300">
                      <BarChart3 className="w-12 h-12 opacity-20 mx-auto mb-3" />
                      <p className="text-xs font-medium uppercase tracking-widest">Selecione os filtros para iniciar</p>
                    </td>
                  </tr>
                ) : (
                  filteredEstudantes.map((est, index) => {
                    const isFalta = ausentesTemp[est.matricula] || false
                    const notaNum = isFalta ? -1 : parseFloat(notasTemp[est.matricula])
                    const nota2 = notaSegundaChamadaTemp[est.matricula] ? parseFloat(notaSegundaChamadaTemp[est.matricula]) : -1
                    
                    // A nota final considerada para status será a 2a chamada se existir e for maior que 0 (ou só se existir)
                    const notaEfetiva = nota2 >= 0 ? nota2 : notaNum
                    
                    const isAltaPerformance = notaEfetiva > 3.5
                    const isNaMedia = notaEfetiva >= 2.4 && notaEfetiva <= 3.5
                    const hasNota = notasTemp[est.matricula] !== "" || isFalta
                    
                    const notaUnsaved = notasTemp[est.matricula] !== originalNotas[est.matricula]
                    const ausenteUnsaved = ausentesTemp[est.matricula] !== originalAusentes[est.matricula]
                    const segundaChamadaUnsaved = notaSegundaChamadaTemp[est.matricula] !== originalNotaSegundaChamada[est.matricula]

                    return (
                      <tr key={est.matricula} className="hover:bg-slate-50 transition-colors print:border-b print:border-slate-200">
                         <td className="px-4 py-3.5 text-center text-sm font-bold text-slate-400">{index + 1}</td>
                         <td className="px-6 py-3.5 print:py-1.5 print:px-2">
                           <div className="flex flex-col">
                             <span className="text-base print:text-sm font-medium text-slate-700 print:text-slate-900 uppercase">{est.nome}</span>
                             <span className="text-[11px] print:text-[9px] font-medium text-slate-400 tracking-widest uppercase">Matrícula: {est.matricula}</span>
                           </div>
                         </td>
                         <td className="px-2 py-3.5 text-center">
                            <label className="flex items-center justify-center cursor-pointer">
                              <input 
                                type="checkbox" 
                                checked={isFalta} 
                                onChange={(e) => handleAusenteChange(est.matricula, e.target.checked)}
                                disabled={!canLaunch}
                                className={`w-5 h-5 rounded-md border-2 border-slate-300 text-orange-500 focus:ring-orange-500 ${ausenteUnsaved ? 'ring-4 ring-orange-500/20' : ''}`}
                              />
                            </label>
                         </td>
                        <td className="px-4 py-3.5 print:py-1.5 print:px-2 text-center">
                          <div className="flex justify-center items-center gap-2">
                            <input
                              type="text"
                              value={notasTemp[est.matricula]}
                              onChange={(e) => handleNotaChange(est.matricula, e.target.value)}
                              disabled={!canLaunch || isFalta}
                               className={`w-20 text-center py-2 print:py-0 print:w-full border-2 print:border-0 rounded-xl print:rounded-none text-base print:text-sm font-medium outline-none transition-all ${
                                 isFalta ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed' :
                                 notaUnsaved ? 'border-slate-400 bg-white ring-4 ring-slate-500/5' :
                                 !hasNota ? 'border-slate-200 bg-slate-50 focus:bg-white focus:border-slate-400' :
                                 'border-slate-200 bg-slate-50 focus:border-slate-400'
                               }`}
                              placeholder="0.0"
                            />
                          </div>
                        </td>
                        <td className="px-4 py-3.5 print:py-1.5 print:px-2 text-center">
                          {isFalta ? (
                             <div className="flex justify-center items-center gap-2">
                               <input
                                 type="text"
                                 value={notaSegundaChamadaTemp[est.matricula] || ""}
                                 onChange={(e) => handleSegundaChamadaChange(est.matricula, e.target.value)}
                                 disabled={!canLaunch}
                                 className={`w-20 text-center py-2 print:py-0 print:w-full border-2 print:border-0 rounded-xl print:rounded-none text-base print:text-sm font-medium outline-none transition-all ${
                                    segundaChamadaUnsaved ? 'border-slate-400 bg-white ring-4 ring-slate-500/5' :
                                    !notaSegundaChamadaTemp[est.matricula] ? 'border-slate-200 bg-slate-50 focus:bg-white focus:border-slate-400' :
                                    'border-slate-200 bg-white text-slate-800 focus:border-slate-400'
                                 }`}
                                 placeholder="0.0"
                               />
                             </div>
                          ) : (
                             <span className="text-slate-300">-</span>
                          )}
                        </td>
                        <td className="px-6 py-3.5 print:py-1.5 print:px-2 text-center">
                          {hasNota ? (
                            <span className={`inline-flex px-3 py-1 print:px-0 print:py-0 rounded-full print:rounded-none text-[10px] print:text-[10px] font-black uppercase tracking-widest border print:border-none shadow-sm print:shadow-none print:bg-transparent print:text-slate-700 ${
                              isFalta && nota2 < 0 ? 'bg-orange-100 text-orange-700 border-orange-200' :
                              isAltaPerformance ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 
                              isNaMedia ? 'bg-slate-200 text-slate-800 border-slate-300' :
                              'bg-red-100 text-red-700 border-red-200'
                            }`}>
                              {isFalta && nota2 < 0 ? 'Faltou' : isAltaPerformance ? 'Alta Performance' : isNaMedia ? 'Na Média' : 'Abaixo da Média'}
                            </span>
                          ) : (
                            <span className="text-slate-300 text-[10px] font-medium uppercase tracking-widest italic opacity-50">Não Lançado</span>
                          )}
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>

          {filteredEstudantes.length > 0 && canLaunch && (
            <div className="p-5 bg-slate-50 border-t border-slate-200 flex justify-end items-center gap-4 print:hidden">
               <div className="hidden md:block">
                  <p className="text-[11px] font-medium text-slate-400 uppercase tracking-widest">Verifique se as notas são de 0.0 a 4.0 antes de salvar.</p>
               </div>
               <button
                 onClick={handleSubmit}
                 disabled={saving || !hasUnsavedChanges()}
                  className="w-full md:w-auto flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-8 py-3 rounded-2xl font-medium text-xs shadow-xl shadow-slate-300 transition-all active:scale-95 disabled:opacity-50"
               >
                 {saving ? <Loader2 className="w-4 h-4 animate-spin text-white" /> : <Save size={16} />}
                 {saving ? 'SINCRONIZANDO...' : 'SALVAR RESULTADO'}
               </button>
            </div>
          )}
        </div>
      </main>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200 border border-white">
            <div className="px-6 py-5 border-b border-slate-200 flex justify-between items-center bg-slate-50">
              <div className="flex items-center gap-3">
                 <div className="w-10 h-10 bg-slate-600 text-white rounded-xl flex items-center justify-center shadow-lg shadow-slate-300"><Save size={20}/></div>
                  <div>
                     <h3 className="text-lg font-medium text-slate-800 uppercase tracking-tight">Consolidar Dados</h3>
                    <p className="text-xs font-medium text-slate-400 uppercase tracking-widest">Revise as alterações do Simulado</p>
                  </div>
              </div>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-slate-300 rounded-xl transition-all"><X size={20}/></button>
            </div>
            <div className="p-6 max-h-[60vh] overflow-y-auto space-y-3 bg-slate-50/20 custom-scrollbar">
              {estudantes.filter(e => notasTemp[e.matricula] !== originalNotas[e.matricula]).map((est, i) => (
                 <div key={i} className="flex items-center justify-between bg-white p-3 rounded-2xl border border-slate-200 shadow-sm">
                   <span className="text-sm font-medium text-slate-700 uppercase truncate pr-4">{est.nome}</span>
                   <div className="flex gap-2">
                      <span className="text-[11px] font-medium bg-slate-50 text-slate-700 px-2.5 py-1 rounded-lg border border-slate-200">
                        Nova Nota: {notasTemp[est.matricula] || '0.0'}
                      </span>
                   </div>
                </div>
              ))}
            </div>
            <div className="p-6 border-t border-slate-200 bg-white">
              <div className="flex justify-end gap-3 w-full">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-6 py-3 rounded-xl font-medium text-slate-600 hover:bg-slate-200 transition-all uppercase tracking-widest text-xs flex-1 md:flex-none text-center"
                >
                  Continuar Editando
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="px-8 py-3 bg-slate-600 text-white rounded-xl font-medium hover:bg-slate-700 transition-all shadow-xl shadow-slate-300 flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 uppercase tracking-widest text-xs flex-1 md:flex-none"
                >
                  {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                  {saving ? 'Confirmando...' : 'Confirmar e Salvar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      
      
      {/* Modal de Boas Vindas */}
      {showWelcomeModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200 text-center">
            <div className="p-8 pt-10">
              <div className="w-20 h-20 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner border border-indigo-100">
                 <CheckCircle2 size={40} />
              </div>
              <h3 className="text-2xl font-medium text-slate-800 tracking-tight mb-2">Área de Lançamento</h3>
              <p className="text-sm text-slate-500 leading-relaxed">
                Você foi designado(a) como <strong>Responsável</strong> pela correção e lançamento das notas do Simulado desta turma na {selectedUnidade}ª Unidade.
              </p>
            </div>
            <div className="p-6 bg-slate-50 border-t border-slate-100">
              <button
                onClick={() => setShowWelcomeModal(false)}
                className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold uppercase tracking-widest text-xs transition-all shadow-xl shadow-indigo-200 active:scale-95"
              >
                Ciente, iniciar lançamentos
              </button>
            </div>
          </div>
        </div>
      )}

            {/* Modal do Gabarito Professor */}
      {showGabaritoModal && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200 relative p-4 custom-scrollbar">
            <button 
              onClick={() => setShowGabaritoModal(false)}
              className="absolute top-6 right-6 p-2 bg-slate-100 hover:bg-slate-200 rounded-full transition-colors z-10 print:hidden"
            >
              <X size={24} className="text-slate-600" />
            </button>
            
            <div className="print:m-0 print:p-0">
               <GabaritoProfessor
                  titulo={provas.find((p: any) => p.id === selectedProva)?.titulo || 'Simulado'}
                  questoes={gabarito || []}
                  maxNota={4.0}
                  nomeEscola={nomeEscola}
                />
            </div>
          </div>
        </div>
      )}
      {showGabaritoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-5 border-b border-slate-200 flex justify-between items-center bg-slate-50">
              <h3 className="text-lg font-medium text-slate-800 flex items-center gap-2">
                <Target size={20} className="text-indigo-500"/>
                Gabarito da Prova
              </h3>
              <button onClick={() => setShowGabaritoModal(false)} className="p-2 hover:bg-slate-200 rounded-xl transition-all"><X size={20}/></button>
            </div>
            <div className="p-6 max-h-[60vh] overflow-y-auto space-y-3 custom-scrollbar">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50 border-b border-slate-300">
                  <tr>
                    <th className="px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-widest border-b">Q.</th>
                    <th className="px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-widest border-b">Disciplina</th>
                    <th className="px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-widest border-b text-center">Correta</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {gabarito?.map((q: any) => (
                    <tr key={q.numero} className="hover:bg-slate-50">
                      <td className="px-4 py-3 text-sm font-bold text-slate-700">{q.numero}</td>
                      <td className="px-4 py-3 text-xs font-medium text-slate-500 uppercase">{q.disciplina}</td>
                      <td className="px-4 py-3 text-sm font-black text-emerald-600 text-center">{q.correta}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Modal para Estudante Faltando */}
      {showMissingStudentModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-indigo-500" />
                Reportar Ausência
              </h3>
              <button onClick={() => setShowMissingStudentModal(false)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-full transition-all">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleReportMissingStudent} className="p-6 space-y-4">
              <p className="text-sm text-slate-500 mb-6">
                Informe os dados abaixo para que a secretaria possa cadastrar o aluno corretamente.
              </p>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-1">Turma do Estudante *</label>
                <select
                  required
                  value={missingStudentForm.turmaId}
                  onChange={e => setMissingStudentForm(p => ({ ...p, turmaId: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-slate-700 appearance-none"
                >
                  <option value="" disabled>Selecione a turma...</option>
                  {turmas.map(t => (
                    <option key={t.id} value={t.id}>{t.nome}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-1">Nome Completo do Estudante *</label>
                <input
                  type="text"
                  required
                  value={missingStudentForm.nome}
                  onChange={e => setMissingStudentForm(p => ({ ...p, nome: e.target.value }))}
                  placeholder="Ex: João Silva Souza"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-slate-700"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-1">Matrícula *</label>
                <input
                  type="text"
                  required
                  value={missingStudentForm.matricula}
                  onChange={e => setMissingStudentForm(p => ({ ...p, matricula: e.target.value }))}
                  placeholder="Informe a matrícula"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-slate-700"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-1">Motivo da Solicitação *</label>
                <textarea
                  required
                  value={missingStudentForm.observacao}
                  onChange={e => setMissingStudentForm(p => ({ ...p, observacao: e.target.value }))}
                  placeholder="Ex: Aluno novo, não consta no sistema."
                  rows={2}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-slate-700 resize-none"
                />
                
                {/* Sugestões de Motivos */}
                <div className="flex flex-wrap gap-2 mt-2">
                  {[
                    "Aluno novo na turma",
                    "Transferência interna",
                    "Remanejamento",
                    "Erro no cadastro",
                    "Matrícula recente"
                  ].map((motivo) => (
                    <button
                      key={motivo}
                      type="button"
                      onClick={() => setMissingStudentForm(p => ({ ...p, observacao: motivo }))}
                      className="text-[9px] font-bold bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 text-slate-500 px-2.5 py-1.5 rounded-lg border border-slate-200 hover:border-indigo-200 transition-all cursor-pointer"
                    >
                      {motivo}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowMissingStudentModal(false)}
                  className="flex-1 py-3 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submittingMissingStudent}
                  className="flex-1 py-3 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-200 disabled:opacity-50"
                >
                  {submittingMissingStudent ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  Enviar Solicitação
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  )
}
