"use client"

import { useState, useEffect, Fragment } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button, EmptyState, PageHeader, buttonClasses } from "@/components/ui"
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
  Printer,
  Info,
  ChevronDown
} from "lucide-react"
import { calcularNotaUnidade, calcularMediaFinal, paraEsquemaConfig, type EsquemaConfig, type UnidadeInput, type FormaCalculo } from "@/lib/services/notas"

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
  notaMaxima: number
  peso: number
}

interface EsquemaUnidade {
  id: string
  ordem: number
  nome: string
  peso: number
  formaCalculo: FormaCalculo
  divisor: number | null
  atividades: EsquemaAtividade[]
}

interface EsquemaInfo {
  id: string
  notaMinimaAprovacao: number
  recuperacaoUnidadeAtiva: boolean
  modoRecuperacaoUnidade: string | null
  recuperacaoFinalAtiva: boolean
  modoRecuperacaoFinal: string | null
  formaCalculoFinal: FormaCalculo
  divisorFinal: number | null
  notaMinimaExameFinal: number | null
  casasDecimais: number
  definicaoAtividades?: 'ESCOLA' | 'PROFESSOR'
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
  estudantes,
  disciplinaInicial = "",
}: {
  turmaId: string
  turmaNome: string
  disciplinas: Disciplina[]
  estudantes: Estudante[]
  disciplinaInicial?: string
}) {
  const router = useRouter()
  const [disciplinaSelecionada, setDisciplinaSelecionada] = useState(disciplinaInicial)
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

  const esquemaConfig: EsquemaConfig | null = esquema ? paraEsquemaConfig({
    ...esquema,
    numUnidades: esquema.unidades.length,
    modoRecuperacaoUnidade: esquema.modoRecuperacaoUnidade as any,
    modoRecuperacaoFinal: esquema.modoRecuperacaoFinal as any,
  }) : null
  const casas = esquema?.casasDecimais ?? 1

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

  // Teclado do celular (inputMode="decimal") pode mandar vírgula: vira ponto
  const onNota = (estudanteId: string, unidadeId: string, atividadeId: string, valor: string, max?: number) =>
    handleAtividadeChange(estudanteId, unidadeId, atividadeId, valor.replace(',', '.'), max)

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

  // Mesmo mínimo usado na cor da média (antes o subtotal usava 5 fixo)
  const minimoAprovacao = esquema?.notaMinimaAprovacao ?? 5

  const calcularSubtotalUnidade = (estudanteId: string, unidade: EsquemaUnidade): number | null => {
    const estado = notas[estudanteId]?.[unidade.id]
    if (!estado) return null
    return calcularNotaUnidade(unidade.atividades.map(a => ({
      peso: a.peso,
      valor: estado.atividades[a.id] !== '' ? parseFloat(estado.atividades[a.id]) : null
    })), unidade.formaCalculo, unidade.divisor, casas)
  }

  const calcularMedia = (estudanteId: string): { texto: string, valor: number | null } => {
    if (!esquema || !esquemaConfig) return { texto: '-', valor: null }
    const estado = notas[estudanteId]
    if (!estado) return { texto: '-', valor: null }

    const todasDesistentes = esquema.unidades.every(u => estado[u.id]?.isDesistente)
    if (todasDesistentes) return { texto: 'DE', valor: null }

    const unidadesInput: UnidadeInput[] = esquema.unidades.map(u => ({
      esquemaUnidadeId: u.id,
      peso: u.peso,
      formaCalculo: u.formaCalculo,
      divisor: u.divisor,
      atividades: u.atividades.map(a => ({
        peso: a.peso,
        valor: estado[u.id]?.atividades[a.id] !== '' && estado[u.id]?.atividades[a.id] !== undefined
          ? parseFloat(estado[u.id].atividades[a.id])
          : null
      }))
    }))
    const resultado = calcularMediaFinal(unidadesInput, esquemaConfig)
    if (resultado.media === null) return { texto: '-', valor: null }
    return { texto: resultado.media.toFixed(casas), valor: resultado.media }
  }

  const getStatusColor = (media: { texto: string, valor: number | null }) => {
    if (media.texto === 'DE') return 'text-fg-subtle'
    if (media.texto === '-') return 'text-zinc-300'
    return (media.valor ?? 0) >= (esquema?.notaMinimaAprovacao ?? 5) ? 'text-success-fg' : 'text-danger-fg'
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
      icon: <FileText className="w-5 h-5 text-success-fg" />,
      color: "emerald"
    },
    {
      title: "Status de Aluno",
      description: "Marque como infrequente aquele aluno que não frequenta ou só apareceu para fazer a prova, clicando no ícone lateral (👥).",
      icon: <UserMinus className="w-5 h-5 text-fg-muted" />,
      color: "blue"
    },
    {
      title: "Acompanhamento",
      description: "Médias abaixo do mínimo de aprovação da turma são destacadas em vermelho para intervenção pedagógica.",
      icon: <TrendingUp className="w-5 h-5 text-warning-fg" />,
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
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title={disciplinaSelecionada ? selectedDiscName : "Lançar notas"}
        description={`Turma ${turmaNome}`}
        actions={
          <>
            <Link href="/dashboard/notas" className={buttonClasses({ variant: "ghost", className: "max-md:hidden" })}><ArrowLeft size={16} strokeWidth={1.75} /> Turmas</Link>
            {disciplinaSelecionada && (
              <a
                href={`/api/relatorio/turma/${turmaId}/disciplina/${disciplinaSelecionada}/pdf`}
                target="_blank"
                rel="noopener noreferrer"
                className={buttonClasses({ variant: "secondary" })}
                title="Imprimir o mapa de notas desta disciplina"
              >
                <Printer size={16} strokeWidth={1.75} /> <span className="hidden md:inline">Imprimir mapa</span>
              </a>
            )}
            {hasUnsavedChanges() && (
              <Button onClick={handleSubmit} loading={saving} className="hidden md:inline-flex">
                {!saving && <Save size={16} strokeWidth={1.75} />} {saving ? "Salvando…" : "Salvar notas"}
              </Button>
            )}
          </>
        }
      />

      <main className="space-y-6">

        {/* Dicas de uso: recolhidas para não competir com a tabela */}
        <details className="group rounded-2xl border border-line bg-surface shadow-card">
          <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 text-13 font-medium text-fg-muted hover:text-fg">
            <Info size={16} strokeWidth={1.75} className="text-fg-subtle" aria-hidden /> Como funciona o lançamento
            <ChevronDown size={14} strokeWidth={1.75} className="ml-auto transition-transform duration-150 group-open:rotate-180" aria-hidden />
          </summary>
          <ul className="grid gap-4 border-t border-line-subtle px-4 py-4 md:grid-cols-3">
            {launchTips.map((tip, index) => (
              <li key={index} className="flex gap-3">
                <span className="mt-0.5 text-fg-subtle [&_svg]:size-4">{tip.icon}</span>
                <div>
                  <p className="text-13 font-medium text-fg">{tip.title}</p>
                  <p className="text-13 text-fg-muted">{tip.description}</p>
                </div>
              </li>
            ))}
          </ul>
        </details>

        {/* Filtros Estilo Simulados */}
        <div className="bg-surface p-5 rounded-2xl shadow-sm border border-line flex flex-wrap gap-5 items-end">
            <div className="flex-1 min-w-[min(100%,300px)] space-y-1.5">
                <label className="text-sm font-medium text-fg-subtle ml-1">Disciplina</label>
                <div className="relative">
                  <GraduationCap className="absolute left-4 top-1/2 -translate-y-1/2 text-fg-subtle" size={16} />
                  <select
                    value={disciplinaSelecionada}
                    onChange={(e) => setDisciplinaSelecionada(e.target.value)}
                    className="w-full bg-canvas border-none rounded-xl pl-11 pr-4 py-3 text-base focus:ring-2 focus:ring-zinc-500 transition-all font-medium appearance-none cursor-pointer"
                  >
                    <option value="">Selecione a disciplina para lançamento...</option>
                    {disciplinas.map((disc) => <option key={disc.id} value={disc.id}>{disc.nome}</option>)}
                  </select>
                </div>
            </div>

            <div className="hidden lg:flex items-center gap-3 pb-1 border-l pl-5 border-line flex-1">
               <div className="bg-warning-subtle p-2.5 rounded-xl text-warning-fg border border-warning-line"><UserMinus size={18}/></div>
               <p className="text-xs text-fg-muted leading-tight font-medium max-w-[450px]">
                 <strong className="text-fg-muted">Aluno sem nota?</strong> Marque como <strong className="text-fg-muted">Infrequente</strong> aquele aluno que não frequenta ou só apareceu para fazer a prova, clicando no ícone <span className="inline-flex mx-1 p-1 bg-surface border border-line-strong rounded text-fg-subtle"><UserMinus size={10}/></span> ao lado da nota para não afetar cálculos indevidos.
               </p>
            </div>
        </div>

        {/* Lançamento Estilo Simulados */}
        <div className="bg-surface rounded-2xl shadow-sm border border-line-strong overflow-hidden">
          <div className="p-4 border-b border-line bg-canvas/10 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-medium text-fg flex items-center gap-2">
              <Users size={20} className="text-fg-subtle" />
              <span className="hidden md:inline">Matriz de Rendimento Acadêmico</span><span className="md:hidden">Alunos</span>
            </h2>
            <div className="relative w-full md:max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-fg-subtle" />
              <input
                type="text"
                placeholder="Filtrar por nome..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-surface border border-line-strong rounded-lg pl-9 pr-4 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-500/10 focus:border-zinc-400 transition-all shadow-sm"
              />
            </div>
          </div>

          {message && (
            <div className={`p-3 flex items-center gap-2 border-b ${message.type === 'success' ? 'bg-success-subtle text-success-fg border-success-line' : 'bg-danger-subtle text-danger-fg border-danger-line'}`}>
              {message.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
              <span className="text-sm font-medium">{message.text}</span>
            </div>
          )}

          {esquema?.definicaoAtividades === 'PROFESSOR' && disciplinaSelecionada && (
            <div className="p-3 flex flex-wrap items-center gap-2 border-b bg-accent-subtle text-accent-fg border-accent/25 text-sm">
              <AlertCircle size={16} />
              <span>
                Nesta turma o professor define as avaliações de cada unidade.
                {esquema.unidades.some(u => u.atividades.length === 0) && ' Unidades sem avaliação ainda não recebem nota.'}
              </span>
              <Link href={`/dashboard/notas/avaliacoes?disciplina=${disciplinaSelecionada}`} className="font-medium underline">Minhas avaliações</Link>
            </div>
          )}

          <div className="hidden overflow-x-auto md:block">
            <table className="w-full text-left">
              <thead className="bg-canvas border-b border-line-strong">
                {esquema && !isSimples ? (
                  <>
                    <tr>
                      <th rowSpan={2} className="px-6 py-4 text-xs font-medium text-fg-subtle w-12 text-center align-bottom">#</th>
                      <th rowSpan={2} className="px-6 py-4 text-xs font-medium text-fg-subtle align-bottom">Estudante</th>
                      {esquema.unidades.map(u => (
                        <th key={u.id} colSpan={u.atividades.length + 1} className="px-4 py-2 text-xs font-medium text-fg-subtle text-center border-l border-line">
                          {u.nome}
                        </th>
                      ))}
                      <th rowSpan={2} className="px-6 py-4 text-xs font-medium text-fg-subtle w-24 text-center align-bottom">Média</th>
                    </tr>
                    <tr>
                      {esquema.unidades.map(u => (
                        <Fragment key={u.id}>
                          {u.atividades.map(a => (
                            <th key={a.id} className="px-2 py-2 text-xs font-medium text-fg-subtle text-center border-l border-line-subtle w-20">
                              {a.nome} <span className="text-fg-disabled">({a.notaMaxima})</span>
                            </th>
                          ))}
                          <th key={`${u.id}-subtotal`} className="px-2 py-2 text-xs font-bold text-fg-subtle text-center bg-subtle/60 w-16">
                            Subtotal
                          </th>
                        </Fragment>
                      ))}
                    </tr>
                  </>
                ) : (
                  <tr>
                    <th className="px-6 py-4 text-xs font-medium text-fg-subtle w-12 text-center">#</th>
                    <th className="px-6 py-4 text-xs font-medium text-fg-subtle">Estudante</th>
                    {(esquema?.unidades ?? []).map(u => (
                      <th key={u.id} className="px-4 py-4 text-xs font-medium text-fg-subtle w-32 text-center">{u.nome}</th>
                    ))}
                    <th className="px-6 py-4 text-xs font-medium text-fg-subtle w-24 text-center">Média</th>
                  </tr>
                )}
              </thead>
              <tbody className="divide-y divide-line/80">
                {loading ? (
                   <tr>
                     <td colSpan={totalColunas} className="px-6 py-16 text-center">
                       <div className="flex flex-col items-center gap-2">
                         <Loader2 className="w-8 h-8 text-fg-muted animate-spin" />
                         <p className="text-fg-subtle text-sm font-medium animate-pulse">Sincronizando...</p>
                       </div>
                     </td>
                   </tr>
                ) : !disciplinaSelecionada ? (
                   <tr>
                      <td colSpan={totalColunas}>
                        <EmptyState icon={BarChart2} title="Escolha a disciplina" description="Selecione a disciplina acima para abrir a tabela de notas da turma." />
                      </td>
                   </tr>
                ) : filteredEstudantes.length === 0 ? (
                   <tr>
                      <td colSpan={totalColunas}>
                        <EmptyState icon={Search} title="Nenhum estudante encontrado" description="Confira o filtro por nome." />
                      </td>
                   </tr>
                ) : (
                  filteredEstudantes.map((estudante, index) => {
                    const estado = notas[estudante.matricula] || estadoVazio(esquema)
                    const media = calcularMedia(estudante.matricula)
                    const isDesistenteGeral = statusMap[estudante.matricula] === 'DESISTENTE'

                    return (
                      <tr key={estudante.matricula} className={`hover:bg-canvas transition-colors ${isDesistenteGeral ? 'bg-warning-subtle grayscale-[0.5]' : ''}`}>
                        <td className="px-6 py-4 text-sm text-fg-subtle font-medium text-center">{index + 1}</td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col relative group/name">
                             <div className="flex items-center gap-2">
                                <span className={`text-base font-medium ${isDesistenteGeral ? 'text-warning-fg' : 'text-fg-muted'}`}>{estudante.nome}</span>
                                {estudante.aeeProfile && (
                                   <Link
                                     href={`/dashboard/aee/${estudante.matricula}`}
                                     className={`p-1.5 rounded-full border-2 transition-all flex items-center justify-center hover:scale-110 active:scale-95 ${
                                       estudante.aeeProfile.acknowledgements.length > 0
                                       ? 'bg-success-subtle border-success text-success-fg'
                                       : 'bg-warning-subtle border-warning text-warning-fg animate-pulse'
                                     }`}
                                     title={estudante.aeeProfile.acknowledgements.length > 0 ? "Ficha AEE: Lida" : "Ficha AEE: LEITURA PENDENTE!"}
                                   >
                                      <Accessibility className="w-4 h-4" />
                                   </Link>
                                )}
                             </div>
                            <span className="text-xs font-medium text-fg-subtle">Matrícula: {estudante.matricula}</span>
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
                                    type="number" step="0.1" inputMode="decimal"
                                    value={val}
                                    onChange={(e) => atividade && handleAtividadeChange(estudante.matricula, u.id, atividade.id, e.target.value, atividade.notaMaxima)}
                                    className={`w-14 h-9 text-center border-2 rounded-xl text-base font-medium transition-all outline-none ${
                                      unidadeEstado.isDesistente ? 'bg-warning-subtle border-warning-line text-warning-fg' :
                                      isModified ? 'border-zinc-400 bg-surface ring-4 ring-zinc-500/5' : 'border-line bg-canvas focus:bg-surface focus:border-zinc-400'
                                    }`}
                                    placeholder="0.0"
                                  />
                                  <button
                                      type="button"
                                      onClick={() => handleDesistenteChange(estudante.matricula, u.id, !unidadeEstado.isDesistente)}
                                      className={`absolute -right-3 -bottom-2 p-1.5 rounded-full transition-all shadow-sm flex items-center justify-center ${
                                          unidadeEstado.isDesistente
                                          ? 'bg-warning-subtle text-warning-fg scale-100 z-10 ring-2 ring-white'
                                          : 'bg-surface text-fg-disabled hover:text-warning-fg hover:bg-warning-subtle scale-100 opacity-60 hover:opacity-100 group-hover:opacity-100 border border-line-strong z-10'
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
                                  <td key={a.id} className="px-2 py-4 text-center border-l border-line-subtle">
                                    <div className="flex flex-col items-center gap-1.5 group relative">
                                      <input
                                        type="number" step="0.1" inputMode="decimal"
                                        value={val}
                                        onChange={(e) => handleAtividadeChange(estudante.matricula, u.id, a.id, e.target.value, a.notaMaxima)}
                                        className={`w-14 h-9 text-center border-2 rounded-xl text-sm font-medium transition-all outline-none ${
                                          unidadeEstado.isDesistente ? 'bg-warning-subtle border-warning-line text-warning-fg' :
                                          isModified ? 'border-zinc-400 bg-surface ring-4 ring-zinc-500/5' : 'border-line bg-canvas focus:bg-surface focus:border-zinc-400'
                                        }`}
                                        placeholder="0.0"
                                      />
                                      {ai === 0 && (
                                        <button
                                            type="button"
                                            onClick={() => handleDesistenteChange(estudante.matricula, u.id, !unidadeEstado.isDesistente)}
                                            className={`absolute -right-3 -bottom-2 p-1.5 rounded-full transition-all shadow-sm flex items-center justify-center ${
                                                unidadeEstado.isDesistente
                                                ? 'bg-warning-subtle text-warning-fg scale-100 z-10 ring-2 ring-white'
                                                : 'bg-surface text-fg-disabled hover:text-warning-fg hover:bg-warning-subtle scale-100 opacity-60 hover:opacity-100 group-hover:opacity-100 border border-line-strong z-10'
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
                              <td key={`${u.id}-subtotal`} className="px-2 py-4 text-center bg-canvas/60">
                                <span className={`text-sm font-bold ${subtotal !== null && subtotal < minimoAprovacao ? 'text-danger-fg' : 'text-fg-muted'}`}>
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

          {/* Celular: um cartão por aluno, teclado numérico e salvar fixo no rodapé */}
          <div className="md:hidden">
            {loading ? (
              <div className="flex flex-col items-center gap-2 px-4 py-12"><Loader2 className="size-8 animate-spin text-fg-muted" /><p className="text-sm text-fg-subtle">Carregando notas...</p></div>
            ) : !disciplinaSelecionada ? (
              <EmptyState icon={BarChart2} title="Escolha a disciplina" description="Selecione a disciplina acima para lançar as notas da turma." />
            ) : filteredEstudantes.length === 0 ? (
              <EmptyState icon={Search} title="Nenhum estudante encontrado" description="Confira o filtro por nome." />
            ) : (
              <ul className="space-y-3 p-3 pb-28">
                {filteredEstudantes.map((estudante) => {
                  const estado = notas[estudante.matricula] || estadoVazio(esquema)
                  const media = calcularMedia(estudante.matricula)
                  return (
                    <li key={estudante.matricula} className="rounded-2xl border border-line bg-surface p-4">
                      <div className="flex items-start gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="flex flex-wrap items-center gap-2 break-words text-base font-medium text-fg">
                            {estudante.nome}
                            {estudante.aeeProfile && (
                              <Link href={`/dashboard/aee/${estudante.matricula}`} aria-label={estudante.aeeProfile.acknowledgements.length > 0 ? "Ficha AEE (lida)" : "Ficha AEE: leitura pendente"} className={`flex size-8 items-center justify-center rounded-full border-2 ${estudante.aeeProfile.acknowledgements.length > 0 ? 'border-success bg-success-subtle text-success-fg' : 'border-warning bg-warning-subtle text-warning-fg'}`}>
                                <Accessibility className="size-4" />
                              </Link>
                            )}
                          </p>
                          <p className="font-mono text-xs text-fg-subtle">{estudante.matricula}</p>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="text-xs text-fg-subtle">Média</p>
                          <p className={`text-lg font-semibold tabular-nums ${getStatusColor(media)}`}>{media.texto}</p>
                        </div>
                      </div>
                      <div className="mt-3 space-y-3">
                        {(esquema?.unidades ?? []).map((u) => {
                          const ue = estado[u.id] || { isDesistente: false, atividades: {} }
                          const subtotal = isSimples ? null : calcularSubtotalUnidade(estudante.matricula, u)
                          return (
                            <fieldset key={u.id} className={`rounded-xl p-3 ${ue.isDesistente ? 'bg-warning-subtle' : 'bg-subtle'}`}>
                              <legend className="sr-only">{u.nome}</legend>
                              <div className="flex items-center gap-2">
                                <span className="min-w-0 flex-1 text-13 font-medium text-fg">{u.nome}</span>
                                {subtotal !== null && <span className={`text-13 font-semibold tabular-nums ${subtotal < minimoAprovacao ? 'text-danger-fg' : 'text-fg-muted'}`}>Subtotal {subtotal.toFixed(1)}</span>}
                                <button
                                  type="button"
                                  aria-pressed={ue.isDesistente}
                                  onClick={() => handleDesistenteChange(estudante.matricula, u.id, !ue.isDesistente)}
                                  className={`flex min-h-9 items-center gap-1 rounded-full px-3 text-xs font-medium ${ue.isDesistente ? 'bg-surface text-warning-fg' : 'text-fg-subtle'}`}
                                >
                                  <UserMinus size={14} aria-hidden /> Infrequente
                                </button>
                              </div>
                              {u.atividades.length === 0 ? (
                                <p className="mt-1 text-xs text-fg-subtle">Sem avaliação nesta unidade.</p>
                              ) : (
                                <div className="mt-2 grid grid-cols-[repeat(auto-fill,minmax(6.5rem,1fr))] gap-2">
                                  {u.atividades.map((a) => {
                                    const val = ue.atividades[a.id] ?? ''
                                    const orig = originalNotas[estudante.matricula]?.[u.id]?.atividades[a.id] ?? ''
                                    return (
                                      <label key={a.id} className="block">
                                        <span className="block truncate text-xs text-fg-subtle" title={a.nome}>{isSimples ? 'Nota' : a.nome} <span className="text-fg-disabled">(até {a.notaMaxima})</span></span>
                                        <input
                                          type="text"
                                          inputMode="decimal"
                                          autoComplete="off"
                                          value={val}
                                          onChange={(e) => onNota(estudante.matricula, u.id, a.id, e.target.value, a.notaMaxima)}
                                          aria-label={`${u.nome}, ${a.nome}: nota de ${estudante.nome}`}
                                          className={`mt-1 h-11 w-full rounded-lg border px-3 text-center text-base font-medium tabular-nums outline-none focus:border-accent focus:ring-3 focus:ring-ring/40 ${val !== orig && !saving ? 'border-accent bg-surface' : 'border-transparent bg-surface'}`}
                                          placeholder="—"
                                        />
                                      </label>
                                    )
                                  })}
                                </div>
                              )}
                            </fieldset>
                          )
                        })}
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
            {disciplinaSelecionada && filteredEstudantes.length > 0 && (
              <div className="fixed inset-x-0 bottom-[var(--barra-inferior)] z-30 border-t border-line bg-surface/95 px-4 pt-2 pb-3 backdrop-blur">
                <p className="mb-2 text-center text-13 text-fg-muted" aria-live="polite">{hasUnsavedChanges() ? 'Há notas alteradas sem salvar' : 'Nenhuma alteração'}</p>
                <Button onClick={handleSubmit} loading={saving} disabled={!hasUnsavedChanges()} className="h-12 w-full text-base">
                  {!saving && <Save size={18} strokeWidth={1.75} />} {saving ? 'Salvando…' : 'Salvar notas'}
                </Button>
              </div>
            )}
          </div>

          {disciplinaSelecionada && filteredEstudantes.length > 0 && (
            <div className="hidden p-5 bg-canvas border-t border-line md:flex justify-end items-center gap-4">
              <div className="hidden md:block">
                 <p className="text-xs font-medium text-fg-subtle">Confira todas as notas antes de salvar o fechamento.</p>
              </div>
               <button
                onClick={handleSubmit}
                disabled={saving || !hasUnsavedChanges()}
                className="flex items-center gap-2 bg-accent hover:bg-accent-hover text-on-accent px-8 py-3 rounded-lg font-medium text-sm shadow-card transition-all active:scale-95 disabled:opacity-50"
              >
                {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save size={18} />}
                {saving ? 'SINCRONIZANDO...' : 'SALVAR NOTAS'}
              </button>
            </div>
          )}
        </div>
      </main>

      {showModal && esquema && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-surface rounded-xl shadow-overlay w-full max-w-lg overflow-hidden animate-pop-in border border-white">
            <div className="px-6 py-5 border-b border-line flex justify-between items-center bg-canvas">
              <div className="flex items-center gap-3">
                 <div className="w-10 h-10 bg-zinc-600 text-white rounded-xl flex items-center justify-center shadow-card"><Save size={20}/></div>
                  <div>
                     <h3 className="text-lg font-medium text-fg">Consolidar Dados</h3>
                    <p className="text-xs font-medium text-fg-subtle">Revise as alterações da turma</p>
                  </div>
              </div>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-zinc-300 rounded-xl transition-all"><X size={20}/></button>
            </div>
            <div className="p-6 max-h-[60vh] overflow-y-auto space-y-3 bg-canvas/20 custom-scrollbar">
              {estudantes.filter(e => JSON.stringify(notas[e.matricula]) !== JSON.stringify(originalNotas[e.matricula] || {})).map((est, i) => (
                 <div key={i} className="flex items-center justify-between bg-surface p-3 rounded-2xl border border-line shadow-sm">
                   <span className="text-sm font-medium text-fg-muted truncate pr-4">{est.nome}</span>
                   <div className="flex gap-2 flex-wrap justify-end">
                       {esquema.unidades.map(u => {
                        const subtotal = calcularSubtotalUnidade(est.matricula, u)
                        const estadoAtual = notas[est.matricula]?.[u.id]
                        const estadoOriginal = originalNotas[est.matricula]?.[u.id]
                        if (JSON.stringify(estadoAtual) === JSON.stringify(estadoOriginal)) return null
                        return (
                          <span key={u.id} className="text-xs font-medium bg-canvas text-fg-muted px-2.5 py-1 rounded-lg border border-line">
                            {u.nome}: {subtotal !== null ? subtotal.toFixed(1) : '0'} {estadoAtual?.isDesistente && <span className="text-warning-fg ml-1">(INF)</span>}
                          </span>
                        )
                      })}
                   </div>
                </div>
              ))}
            </div>
            <div className="px-6 py-5 bg-canvas border-t border-line flex gap-4">
              <button onClick={() => setShowModal(false)} className="flex-1 py-3 text-sm font-medium text-fg-subtle hover:bg-surface rounded-lg transition-all">Cancelar</button>
              <button onClick={confirmSave} className="flex-1 py-3 bg-zinc-600 text-white text-sm font-medium rounded-lg shadow-card hover:bg-zinc-700 transition-all active:scale-95">Confirmar e Gravar</button>
            </div>
          </div>
        </div>
      )}

      {feedbackModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-surface rounded-[32px] shadow-overlay w-full max-w-sm overflow-hidden p-8 flex flex-col items-center text-center animate-pop-in border border-line-subtle">
            {feedbackModal.type === 'success' ? (
              <div className="w-16 h-16 bg-success-subtle text-success-fg rounded-full flex items-center justify-center mb-5 ring-8 ring-success/30">
                <CheckCircle2 size={36} className="animate-bounce" />
              </div>
            ) : (
              <div className="w-16 h-16 bg-danger-subtle text-danger-fg rounded-full flex items-center justify-center mb-5 ring-8 ring-danger/30">
                <AlertCircle size={36} className="animate-pulse" />
              </div>
            )}

            <h3 className="text-xl font-bold text-fg mb-2">
              {feedbackModal.type === 'success' ? 'Salvo com Sucesso!' : 'Ocorreu um Erro'}
            </h3>

            <p className="text-sm text-fg-subtle leading-relaxed mb-6">
              {feedbackModal.text}
            </p>

            <button
              onClick={() => setFeedbackModal(null)}
              className={`w-full py-3.5 rounded-lg font-semibold text-sm transition-all active:scale-95 shadow-card ${
                feedbackModal.type === 'success'
                  ? 'bg-accent text-on-accent hover:bg-accent-hover '
                  : 'bg-danger text-on-accent hover:bg-danger '
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
