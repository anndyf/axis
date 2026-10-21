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
import { can } from "@/lib/rbac"

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
      setCanLaunch(can(user, 'simulado.gerenciar'))
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
        const isPrivileged = can(user, 'simulado.gerenciar')
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
      icon: <Target className="w-5 h-5 text-fg-muted" />,
      color: "orange"
    },
    {
      title: "Unidades Letivas",
      description: "Selecione entre Unidade 1 ou 2 para registrar o desempenho do simulado correspondente.",
      icon: <FileText className="w-5 h-5 text-fg-muted" />,
      color: "blue"
    },
    {
      title: "Desempenho Geral",
      description: "O sistema monitora o aproveitamento da área para prever o rendimento no ENEM/Vestibulares.",
      icon: <TrendingUp className="w-5 h-5 text-success-fg" />,
      color: "emerald"
    }
  ]

  return (
    <div className="print:bg-surface print:min-h-0">
      {/* Header Premium Estilo Resultados - Ajustado para ser Flush com o Layout */}
      <header className="mb-6 border-b border-line pb-4 print:hidden">
        <div className="py-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex items-center space-x-5">
              <Link
                href="/dashboard"
                className="p-2 hover:bg-subtle-hover rounded-lg transition-colors text-fg-subtle hover:text-fg-muted"
              >
                <ArrowLeft size={20} />
              </Link>
              <div>
                <h1 className="text-2xl font-medium text-fg tracking-tight">Simulados</h1>
                <p className="text-base text-fg-muted font-medium">Gestão de notas por áreas de conhecimento</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {can(user, 'simulado.gerenciar') && (
                <Link 
                  href="/dashboard/simulados/responsaveis"
                  className="flex items-center gap-2 bg-accent text-on-accent px-4 py-3 rounded-lg font-medium hover:bg-accent-hover transition-all text-xs"
                >
                  <Users size={16} /> Designar Responsáveis
                </Link>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="pt-4 pb-32 space-y-5 print:p-0 print:m-0 print:space-y-4">
        
        {/* Print Header */}
        <div className="hidden print:block border-b-2 border-zinc-800 pb-4 mb-6">
           <div className="flex justify-between items-end">
              <div>
                 <h1 className="text-2xl font-bold text-fg">Lista de Lançamento de Simulado</h1>
                 <p className="text-sm font-medium text-fg-muted mt-1">
                    Turma: {turmas.find(t => t.id === selectedTurma)?.nome || 'Não selecionada'} • 
                    Prova: {provas.find((p: any) => p.id === selectedProva)?.titulo || 'Não selecionada'} • 
                    Unidade: {selectedUnidade}
                 </p>
              </div>
              <div className="text-right">
                 <p className="text-xs font-bold text-fg-subtle">Desempenho</p>
                 <p className="text-sm font-medium text-fg">Média: {stats.media} | Aprovados: {stats.total > 0 ? Math.round((stats.aprovados / stats.total) * 100) : 0}%</p>
              </div>
           </div>
           {launchInfo && (
              <p className="text-xs text-fg-subtle mt-2 font-medium">Lançado por: {launchInfo.author} em {launchInfo.date}</p>
           )}
        </div>

        {/* Dicas Fixas - Estilo Resultados */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 print:hidden">
          {simuTips.map((tip, index) => (
             <div key={index} className="bg-surface border border-line p-4 rounded-2xl flex items-start gap-3">
                <div className={`shrink-0 p-3 rounded-lg bg-subtle text-fg-muted transition-all`}>
                   {tip.icon}
                </div>
                <div className="min-w-0 break-words">
                  <h3 className="text-sm font-medium text-fg mb-1">{tip.title}</h3>
                  <p className="text-xs font-medium text-fg-subtle leading-relaxed">{tip.description}</p>
                </div>
             </div>
          ))}
        </div>

        {/* Filtros Premium */}
        <div className="bg-surface p-4 rounded-xl border border-line flex flex-wrap gap-4 items-end relative overflow-hidden print:hidden">
            
            <div className="flex-1 min-w-[200px] space-y-2">
                <label className="text-xs font-medium text-fg-subtle ml-2">Filtrar por Turma</label>
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center bg-canvas rounded-lg text-fg-subtle group-focus-within:text-danger-fg group-focus-within:bg-danger-subtle transition-all">
                    <Users size={16} />
                  </div>
                  <select
                    value={selectedTurma}
                    onChange={(e) => setSelectedTurma(e.target.value)}
                    className="w-full bg-canvas hover:bg-subtle-hover border-none rounded-lg pl-14 pr-6 py-4 text-sm focus:ring-2 focus:ring-danger/30 transition-all appearance-none cursor-pointer font-medium text-fg-muted"
                  >
                    <option value="">Selecione a Turma...</option>
                    {turmas.map((t) => <option key={t.id} value={t.id}>{t.nome}</option>)}
                  </select>
                </div>
            </div>

            <div className="flex-1 min-w-[200px] space-y-2">
                <label className="text-xs font-medium text-fg-subtle ml-2">
                   {selectedUnidade === "1" ? "Área de Conhecimento" : "Prova"}
                </label>
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center bg-canvas rounded-lg text-fg-subtle group-focus-within:text-danger-fg group-focus-within:bg-danger-subtle transition-all">
                    {selectedUnidade === "1" ? <BookOpen size={16} /> : <FileText size={16} />}
                  </div>
                  
                  {selectedUnidade === "1" ? (
                    <select
                      value={selectedArea}
                      onChange={(e) => setSelectedArea(e.target.value)}
                      disabled={!selectedTurma}
                      className="w-full bg-canvas hover:bg-subtle-hover border-none rounded-lg pl-14 pr-6 py-4 text-sm focus:ring-2 focus:ring-danger/30 transition-all appearance-none cursor-pointer font-medium text-fg-muted"
                    >
                      <option value="">Selecione a Área...</option>
                      {areas.map((a) => <option key={a.id} value={a.id}>{a.nome}</option>)}
                    </select>
                  ) : (
                    <select
                      value={selectedProva}
                      onChange={(e) => setSelectedProva(e.target.value)}
                      disabled={!selectedTurma}
                      className="w-full bg-canvas hover:bg-subtle-hover border-none rounded-lg pl-14 pr-6 py-4 text-sm focus:ring-2 focus:ring-danger/30 transition-all appearance-none cursor-pointer font-medium text-fg-muted"
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
                <label className="text-xs font-medium text-fg-subtle ml-2">Unidade / Etapa</label>
                <div className="flex bg-canvas p-1.5 rounded-lg border border-line-subtle">
                  <button
                    onClick={() => setSelectedUnidade("1")}
                    className={`flex-1 py-2.5 text-sm font-medium rounded-xl transition-all ${
                      selectedUnidade === "1" ? 'bg-surface text-danger-fg shadow-sm' : 'text-fg-subtle hover:text-fg-muted hover:bg-subtle-hover/50'
                    }`}
                  >
                    1ª Unidade {can(user, 'simulado.gerenciar') ? '' : '(Fechada)'}
                  </button>
                  <button
                    onClick={() => setSelectedUnidade("2")}
                    className={`flex-1 py-2.5 text-sm font-medium rounded-xl transition-all ${
                      selectedUnidade === "2" ? 'bg-surface text-danger-fg shadow-sm' : 'text-fg-subtle hover:text-fg-muted hover:bg-subtle-hover/50'
                    }`}
                  >
                    2ª Unidade
                  </button>
                </div>
            </div>

            <div className="flex items-center gap-3 pb-1">
                <div className="text-center px-4 py-2 bg-canvas rounded-xl border border-line">
                    <p className="text-xs font-medium text-fg-subtle">Média</p>
                    <p className="text-lg font-semibold text-fg-muted leading-none mt-1">{stats.media}</p>
                </div>
                <div className="text-center px-4 py-2 bg-success-subtle rounded-xl border border-success-line">
                    <p className="text-xs font-medium text-success">Aprov.</p>
                    <p className="text-lg font-semibold text-success-fg leading-none mt-1">{stats.total > 0 ? Math.round((stats.aprovados / stats.total) * 100) : 0}%</p>
                </div>
            </div>
        </div>
        
        
        {/* Lançamento Estilo Resultados */}
        <div className="bg-surface rounded-2xl border border-line-strong overflow-hidden print:shadow-none print:border-none print:rounded-none">
          <div className="p-4 border-b border-line bg-canvas/10 flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
            <div>
               <h2 className="text-lg font-medium text-fg flex items-center gap-2">
                 <Users size={20} className="text-fg-subtle" />
                 Matriz de Avaliação Somativa
               </h2>
               <div className="mt-2">
                 {responsavelName && (
                   <span className="bg-accent-subtle text-accent-fg text-xs px-2.5 py-1 rounded-full font-medium border border-accent/25">
                     Lançamento: {responsavelName}
                   </span>
                 )}
                 {!responsavelName && selectedProva && (
                   <span className="bg-warning-subtle text-warning-fg text-xs px-2.5 py-1 rounded-full font-medium border border-warning-line">
                     Nenhum professor designado
                   </span>
                 )}
               </div>
               {launchInfo && (
                  <p className="text-xs font-medium text-fg-subtle mt-1.5 flex items-center gap-1.5">
                     <span className="w-1.5 h-1.5 rounded-full bg-success"></span>
                     Último lançamento por <span className="text-fg-muted font-bold">{launchInfo.author}</span> em {launchInfo.date}
                  </p>
               )}
            </div>
            <div className="flex items-center gap-3 w-full md:w-auto">
              <div className="relative max-w-xs w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-fg-subtle" />
                <input
                  type="text"
                  placeholder="Filtrar por nome..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-surface border border-line-strong rounded-lg pl-9 pr-4 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-500/10 focus:border-zinc-400 transition-all"
                />
              </div>
              {selectedUnidade === "2" && selectedProva && (
                <button
                  onClick={() => setShowGabaritoModal(true)}
                  className="flex items-center gap-2 bg-accent-subtle hover:bg-accent-subtle text-accent-fg px-4 py-2 rounded-lg text-sm font-medium transition-all border border-accent/25"
                  title="Ver Gabarito"
                >
                  <BookOpen size={16} />
                  <span className="hidden sm:inline">Gabarito</span>
                </button>
              )}
              <button
                onClick={() => window.print()}
                className="flex items-center gap-2 bg-subtle hover:bg-subtle-hover text-fg-muted px-4 py-2 rounded-lg text-sm font-medium transition-all border border-line"
                title="Imprimir lista"
              >
                <Printer size={16} />
                <span className="hidden sm:inline">Imprimir</span>
              </button>
            </div>
          </div>

          {message && (
            <div className={`p-3 flex items-center gap-2 border-b ${message.type === 'success' ? 'bg-success-subtle text-success-fg border-success-line' : 'bg-danger-subtle text-danger-fg border-danger-line'}`}>
              {message.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
              <span className="text-xs font-medium">{message.text}</span>
            </div>
          )}

          {selectedTurma && !loading && (
            <div className="px-4 py-3 bg-accent-subtle border-b border-accent/25 flex items-center justify-between gap-4 print:hidden">
              <div className="flex items-center gap-2 text-accent-fg">
                <Info size={16} className="shrink-0" />
                <p className="text-xs font-bold">Algum aluno não está aparecendo na lista desta turma?</p>
              </div>
              <button
                onClick={() => {
                  setMissingStudentForm(p => ({ ...p, turmaId: selectedTurma }))
                  setShowMissingStudentModal(true)
                }}
                className="flex items-center gap-2 bg-accent hover:bg-accent-hover text-on-accent px-4 py-2 rounded-xl text-xs font-semibold transition-all shrink-0"
              >
                <UserPlus size={14} />
                Reportar Ausência
              </button>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-canvas border-b border-line-strong">
                <tr>
                  <th className="px-4 py-4 w-12 text-center text-sm font-medium text-fg-subtle border-b">#</th>
                  <th className="px-4 py-4 print:py-2 print:px-2 text-sm print:text-xs font-medium text-fg-subtle border-b print:border-zinc-800">Estudante</th>
                  <th className="px-2 py-4 print:py-2 print:px-2 text-sm print:text-xs font-medium text-fg-subtle w-24 text-center border-b print:border-zinc-800">Falta</th>
                  <th className="px-4 py-4 print:py-2 print:px-2 text-sm print:text-xs font-medium text-fg-subtle w-32 text-center border-b print:border-zinc-800">Nota</th>
                  <th className="px-4 py-4 print:py-2 print:px-2 text-sm print:text-xs font-medium text-fg-subtle w-32 text-center border-b print:border-zinc-800">2ª Chamada</th>
                  <th className="px-4 py-4 print:py-2 print:px-2 text-sm print:text-xs font-medium text-fg-subtle text-center border-b print:border-zinc-800">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-16 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <Loader2 className="w-8 h-8 text-fg-muted animate-spin" />
                        <p className="text-fg-subtle text-xs font-medium">Sincronizando...</p>
                      </div>
                    </td>
                  </tr>
                ) : filteredEstudantes.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-16 text-center text-fg-disabled">
                      <BarChart3 className="w-12 h-12 opacity-20 mx-auto mb-3" />
                      <p className="text-xs font-medium">Selecione os filtros para iniciar</p>
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
                      <tr key={est.matricula} className="hover:bg-canvas transition-colors print:border-b print:border-line">
                         <td className="px-4 py-3.5 text-center text-sm font-bold text-fg-subtle">{index + 1}</td>
                         <td className="px-4 py-3.5 print:py-1.5 print:px-2">
                           <div className="flex flex-col">
                             <span className="text-base print:text-sm font-medium text-fg-muted print:text-fg">{est.nome}</span>
                             <span className="text-xs print:text-xs font-medium text-fg-subtle">Matrícula: {est.matricula}</span>
                           </div>
                         </td>
                         <td className="px-2 py-3.5 text-center">
                            <label className="flex items-center justify-center cursor-pointer">
                              <input 
                                type="checkbox" 
                                checked={isFalta} 
                                onChange={(e) => handleAusenteChange(est.matricula, e.target.checked)}
                                disabled={!canLaunch}
                                className={`w-5 h-5 rounded-md border-2 border-line-strong text-warning-fg focus:ring-warning/30 ${ausenteUnsaved ? 'ring-4 ring-warning/30' : ''}`}
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
                               className={`w-12 text-center py-2 print:py-0 print:w-full border-2 print:border-0 rounded-xl print:rounded-none text-base print:text-sm font-medium outline-none transition-all ${
                                 isFalta ? 'bg-subtle text-fg-subtle border-line cursor-not-allowed' :
                                 notaUnsaved ? 'border-zinc-400 bg-surface ring-4 ring-zinc-500/5' :
                                 !hasNota ? 'border-line bg-canvas focus:bg-surface focus:border-zinc-400' :
                                 'border-line bg-canvas focus:border-zinc-400'
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
                                 className={`w-12 text-center py-2 print:py-0 print:w-full border-2 print:border-0 rounded-xl print:rounded-none text-base print:text-sm font-medium outline-none transition-all ${
                                    segundaChamadaUnsaved ? 'border-zinc-400 bg-surface ring-4 ring-zinc-500/5' :
                                    !notaSegundaChamadaTemp[est.matricula] ? 'border-line bg-canvas focus:bg-surface focus:border-zinc-400' :
                                    'border-line bg-surface text-fg focus:border-zinc-400'
                                 }`}
                                 placeholder="0.0"
                               />
                             </div>
                          ) : (
                             <span className="text-fg-disabled">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3.5 print:py-1.5 print:px-2 text-center">
                          {hasNota ? (
                            <span className={`inline-flex px-3 py-1 print:px-0 print:py-0 rounded-full print:rounded-none text-xs print:text-xs font-semibold border print:border-none print:shadow-none print:bg-transparent print:text-fg-muted ${
                              isFalta && nota2 < 0 ? 'bg-warning-subtle text-warning-fg border-warning-line' :
                              isAltaPerformance ? 'bg-success-subtle text-success-fg border-success-line' : 
                              isNaMedia ? 'bg-subtle-hover text-fg border-line-strong' :
                              'bg-danger-subtle text-danger-fg border-danger-line'
                            }`}>
                              {isFalta && nota2 < 0 ? 'Faltou' : isAltaPerformance ? 'Alta Performance' : isNaMedia ? 'Na Média' : 'Abaixo da Média'}
                            </span>
                          ) : (
                            <span className="text-fg-disabled text-xs font-medium italic opacity-50">Não Lançado</span>
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
            <div className="p-5 bg-canvas border-t border-line flex justify-end items-center gap-4 print:hidden">
               <div className="hidden md:block">
                  <p className="text-xs font-medium text-fg-subtle">Verifique se as notas são de 0.0 a 4.0 antes de salvar.</p>
               </div>
               <button
                 onClick={handleSubmit}
                 disabled={saving || !hasUnsavedChanges()}
                  className="w-full md:w-auto flex items-center justify-center gap-2 bg-accent hover:bg-accent-hover text-on-accent px-4 py-3 rounded-lg font-medium text-xs transition-all disabled:opacity-50"
               >
                 {saving ? <Loader2 className="w-4 h-4 animate-spin text-white" /> : <Save size={16} />}
                 {saving ? 'SINCRONIZANDO...' : 'SALVAR RESULTADO'}
               </button>
            </div>
          )}
        </div>
      </main>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-surface rounded-xl shadow-overlay w-full max-w-lg overflow-hidden animate-pop-in border border-white">
            <div className="px-4 py-2.5 border-b border-line flex justify-between items-center bg-canvas">
              <div className="flex items-center gap-3">
                 <div className="w-10 h-10 bg-zinc-600 text-white rounded-xl flex items-center justify-center"><Save size={20}/></div>
                  <div>
                     <h3 className="text-lg font-medium text-fg">Consolidar Dados</h3>
                    <p className="text-xs font-medium text-fg-subtle">Revise as alterações do Simulado</p>
                  </div>
              </div>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-zinc-300 rounded-xl transition-all"><X size={20}/></button>
            </div>
            <div className="p-4 max-h-[60vh] overflow-y-auto space-y-3 bg-canvas/20 custom-scrollbar">
              {estudantes.filter(e => notasTemp[e.matricula] !== originalNotas[e.matricula]).map((est, i) => (
                 <div key={i} className="flex items-center justify-between bg-surface p-3 rounded-2xl border border-line">
                   <span className="text-sm font-medium text-fg-muted truncate pr-4">{est.nome}</span>
                   <div className="flex gap-2">
                      <span className="text-xs font-medium bg-canvas text-fg-muted px-2.5 py-1 rounded-lg border border-line">
                        Nova Nota: {notasTemp[est.matricula] || '0.0'}
                      </span>
                   </div>
                </div>
              ))}
            </div>
            <div className="p-4 border-t border-line bg-surface">
              <div className="flex justify-end gap-3 w-full">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-3 rounded-xl font-medium text-fg-muted hover:bg-subtle-hover transition-all text-xs flex-1 md:flex-none text-center"
                >
                  Continuar Editando
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="px-4 py-3 bg-zinc-600 text-white rounded-xl font-medium hover:bg-zinc-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50 text-xs flex-1 md:flex-none"
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
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-zinc-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-surface rounded-xl shadow-overlay w-full max-w-md overflow-hidden animate-pop-in text-center">
            <div className="p-4 pt-10">
              <div className="w-12 h-12 bg-accent-subtle text-accent-fg rounded-full flex items-center justify-center mx-auto mb-6 border border-accent/25">
                 <CheckCircle2 size={40} />
              </div>
              <h3 className="text-2xl font-medium text-fg tracking-tight mb-2">Área de Lançamento</h3>
              <p className="text-sm text-fg-subtle leading-relaxed">
                Você foi designado(a) como <strong>Responsável</strong> pela correção e lançamento das notas do Simulado desta turma na {selectedUnidade}ª Unidade.
              </p>
            </div>
            <div className="p-4 bg-canvas border-t border-line-subtle">
              <button
                onClick={() => setShowWelcomeModal(false)}
                className="w-full py-3.5 bg-accent hover:bg-accent-hover text-on-accent rounded-xl font-bold text-xs transition-all"
              >
                Ciente, iniciar lançamentos
              </button>
            </div>
          </div>
        </div>
      )}

            {/* Modal do Gabarito Professor */}
      {showGabaritoModal && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-zinc-900/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-surface rounded-lg shadow-overlay w-full max-w-5xl max-h-[90vh] overflow-y-auto animate-pop-in relative p-4 custom-scrollbar">
            <button 
              onClick={() => setShowGabaritoModal(false)}
              className="absolute top-6 right-6 p-2 bg-subtle hover:bg-subtle-hover rounded-full transition-colors z-10 print:hidden"
            >
              <X size={24} className="text-fg-muted" />
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-surface rounded-xl shadow-overlay w-full max-w-xl overflow-hidden animate-pop-in">
            <div className="px-4 py-2.5 border-b border-line flex justify-between items-center bg-canvas">
              <h3 className="text-lg font-medium text-fg flex items-center gap-2">
                <Target size={20} className="text-accent-fg"/>
                Gabarito da Prova
              </h3>
              <button onClick={() => setShowGabaritoModal(false)} className="p-2 hover:bg-subtle-hover rounded-xl transition-all"><X size={20}/></button>
            </div>
            <div className="p-4 max-h-[60vh] overflow-y-auto space-y-3 custom-scrollbar">
              <table className="w-full text-left border-collapse">
                <thead className="bg-canvas border-b border-line-strong">
                  <tr>
                    <th className="px-4 py-3 text-xs font-medium text-fg-subtle border-b">Q.</th>
                    <th className="px-4 py-3 text-xs font-medium text-fg-subtle border-b">Disciplina</th>
                    <th className="px-4 py-3 text-xs font-medium text-fg-subtle border-b text-center">Correta</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line-subtle">
                  {gabarito?.map((q: any) => (
                    <tr key={q.numero} className="hover:bg-canvas">
                      <td className="px-4 py-3 text-sm font-bold text-fg-muted">{q.numero}</td>
                      <td className="px-4 py-3 text-xs font-medium text-fg-subtle">{q.disciplina}</td>
                      <td className="px-4 py-3 text-sm font-semibold text-success-fg text-center">{q.correta}</td>
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
        <div className="fixed inset-0 bg-zinc-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-fade-in">
          <div className="bg-surface rounded-xl shadow-overlay max-w-md w-full overflow-hidden animate-pop-in">
            <div className="p-4 border-b border-line-subtle flex justify-between items-center bg-canvas">
              <h3 className="text-xl font-bold text-fg flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-accent-fg" />
                Reportar Ausência
              </h3>
              <button onClick={() => setShowMissingStudentModal(false)} className="p-2 text-fg-subtle hover:text-fg-muted hover:bg-subtle-hover rounded-full transition-all">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleReportMissingStudent} className="p-4 space-y-4">
              <p className="text-sm text-fg-subtle mb-6">
                Informe os dados abaixo para que a secretaria possa cadastrar o aluno corretamente.
              </p>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-fg-subtle ml-1">Turma do Estudante *</label>
                <select
                  required
                  value={missingStudentForm.turmaId}
                  onChange={e => setMissingStudentForm(p => ({ ...p, turmaId: e.target.value }))}
                  className="w-full bg-canvas border border-line rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-ring focus:border-accent outline-none transition-all text-fg-muted appearance-none"
                >
                  <option value="" disabled>Selecione a turma...</option>
                  {turmas.map(t => (
                    <option key={t.id} value={t.id}>{t.nome}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-fg-subtle ml-1">Nome Completo do Estudante *</label>
                <input
                  type="text"
                  required
                  value={missingStudentForm.nome}
                  onChange={e => setMissingStudentForm(p => ({ ...p, nome: e.target.value }))}
                  placeholder="Ex: João Silva Souza"
                  className="w-full bg-canvas border border-line rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-ring focus:border-accent outline-none transition-all text-fg-muted"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-fg-subtle ml-1">Matrícula *</label>
                <input
                  type="text"
                  required
                  value={missingStudentForm.matricula}
                  onChange={e => setMissingStudentForm(p => ({ ...p, matricula: e.target.value }))}
                  placeholder="Informe a matrícula"
                  className="w-full bg-canvas border border-line rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-ring focus:border-accent outline-none transition-all text-fg-muted"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-fg-subtle ml-1">Motivo da Solicitação *</label>
                <textarea
                  required
                  value={missingStudentForm.observacao}
                  onChange={e => setMissingStudentForm(p => ({ ...p, observacao: e.target.value }))}
                  placeholder="Ex: Aluno novo, não consta no sistema."
                  rows={2}
                  className="w-full bg-canvas border border-line rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-ring focus:border-accent outline-none transition-all text-fg-muted resize-none"
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
                      className="text-xs font-bold bg-subtle hover:bg-accent-subtle hover:text-accent-fg text-fg-subtle px-2.5 py-1.5 rounded-lg border border-line hover:border-accent/25 transition-all cursor-pointer"
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
                  className="flex-1 py-3 text-sm font-medium text-fg-muted bg-subtle hover:bg-subtle-hover rounded-xl transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submittingMissingStudent}
                  className="flex-1 py-3 text-sm font-medium text-on-accent bg-accent hover:bg-accent-hover rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50"
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
