"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Save, AlertCircle, Gavel, Loader2, ChevronDown, ChevronUp, CheckCircle2, Printer, X } from "lucide-react"
import { calcularMediaFinal, type EsquemaConfig, type EtapaDaNota, type UnidadeInput } from "@/lib/services/notas"
import { formatarFrequencia } from "@/lib/services/frequencia"

interface NotaConselho {
  id: string
  nota: number
  notaRecuperacao: number | null
  status: string
  estudanteId: string
  estudanteNome: string
  disciplinaId: string
  disciplinaNome: string
  etapas: EtapaDaNota[]
  /** frequência que vale para aprovação na disciplina; null = sem chamada */
  frequencia?: number | null
  abaixoMinimoFrequencia?: boolean
}

const STATUS_OPTIONS = [
  { value: 'APROVADO_RECUPERACAO', label: 'Aprovado na Recuperação', color: 'text-success-fg' },
  { value: 'APROVADO_CONSELHO', label: 'Aprovado pelo Conselho', color: 'text-success-fg' },
  { value: 'DEPENDENCIA', label: 'Dependência', color: 'text-fg' },
  { value: 'CONSERVADO', label: 'Conservado', color: 'text-danger-fg' }
]

export default function ConselhoClasseClient({
  turmaId,
  turmaNome,
  turmaCurso,
  turmaTurno,
  notasConselho,
  esquemaConfig,
  pesosEtapas,
  frequenciaMinima = 75
}: {
  turmaId: string
  turmaNome: string
  turmaCurso?: string | null
  turmaTurno?: string | null
  notasConselho: NotaConselho[]
  esquemaConfig: EsquemaConfig
  pesosEtapas: number[]
  frequenciaMinima?: number
}) {
  const notaMinima = esquemaConfig.notaMinimaAprovacao
  const router = useRouter()
  const [decisoes, setDecisoes] = useState<Record<string, string>>(() => {
    // Inicializar com decisões já existentes no banco
    const initial: Record<string, string> = {}
    notasConselho.forEach(n => {
      if (['APROVADO_CONSELHO', 'DEPENDENCIA', 'CONSERVADO', 'APROVADO_RECUPERACAO'].includes(n.status)) {
        initial[n.id] = n.status
      }
    })
    return initial
  })
  const [notasRec, setNotasRec] = useState<Record<string, number | null>>(() => {
    const initial: Record<string, number | null> = {}
    notasConselho.forEach(n => {
      initial[n.id] = n.notaRecuperacao
    })
    return initial
  })
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [expandedStudents, setExpandedStudents] = useState<Set<string>>(new Set())
  const [showInstructions, setShowInstructions] = useState(false)
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  
  // Média "real" para o comitê: média das unidades pelo motor (com os pesos
  // e a forma de cálculo do esquema da turma); se houver recuperação e a
  // média estiver abaixo do mínimo, simula a recuperação substituindo a
  // menor unidade. Heurística só de exibição - a decisão é do Conselho
  // (ver api/conselho-classe, que só valida o status escolhido).
  const calcularMediaReal = (n: NotaConselho) => {
    if (n.nota === -1) return 0;

    const comoUnidades = (notas: number[]): UnidadeInput[] =>
      notas.map((valor, i) => ({ esquemaUnidadeId: String(i), peso: pesosEtapas[i] ?? 1, atividades: [{ valor }] }))
    const mediaDe = (notas: number[]) => calcularMediaFinal(comoUnidades(notas), esquemaConfig).media ?? 0

    const notas = n.etapas.map(e => e.nota ?? 0);
    let media = mediaDe(notas);

    // Pegar a nota de recuperação atual (do estado ou da nota)
    const notaRecVal = notasRec[n.id] !== undefined ? notasRec[n.id] : n.notaRecuperacao;

    if (notaRecVal !== null && notas.length > 0 && media < notaMinima) {
      const iMenor = notas.indexOf(Math.min(...notas));
      if (notaRecVal > notas[iMenor]) {
        const substituidas = [...notas];
        substituidas[iMenor] = notaRecVal;
        media = mediaDe(substituidas);
      }
    }

    return media;
  }

  const toggleStudent = (id: string) => {
    const newExpanded = new Set(expandedStudents)
    if (newExpanded.has(id)) {
      newExpanded.delete(id)
    } else {
      newExpanded.add(id)
    }
    setExpandedStudents(newExpanded)
  }

  const handleDecisaoChange = (notaId: string, status: string) => {
    // Se selecionar CONSERVADO em alguma, todas as disciplinas ficam como CONSERVADA
    if (status === 'CONSERVADO') {
      const nota = notasConselho.find(n => n.id === notaId)
      if (nota) {
        const confirmacao = window.confirm(
          `Atenção: Ao definir o aluno como CONSERVADO nesta disciplina, o sistema aplicará esta decisão para TODAS as outras disciplinas deste estudante (${nota.estudanteNome}).\n\nConfirmar decisão de CONSERVADO para todo o semestre?`
        )

        if (!confirmacao) return

        // Encontrar todas as notas do mesmo estudante e aplicar o status
        const notasDoEstudante = notasConselho.filter(n => n.estudanteId === nota.estudanteId)
        
        setDecisoes(prev => {
          const next = { ...prev }
          notasDoEstudante.forEach(n => {
            next[n.id] = 'CONSERVADO'
          })
          return next
        })
        return
      }
    }

    setDecisoes(prev => ({
      ...prev,
      [notaId]: status
    }))
  }

  const handleNotaRecChange = (notaId: string, valor: string) => {
    const num = valor === '' ? null : parseFloat(valor.replace(',', '.'))
    
    setNotasRec(prev => ({
      ...prev,
      [notaId]: isNaN(num as number) ? (valor === '' ? null : prev[notaId]) : num
    }))

    // Se o valor digitado ou a média resultante for >= 5, garantir que o status seja atualizado no estado tbm
    setTimeout(() => {
      const nota = notasConselho.find(n => n.id === notaId)
      if (nota) {
        const media = calcularMediaReal(nota)
        if (media >= notaMinima && !nota.abaixoMinimoFrequencia) {
          setDecisoes(prev => ({
            ...prev,
            [notaId]: 'APROVADO_RECUPERACAO'
          }))
        }
      }
    }, 0)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setShowConfirmModal(true)
  }

  const handleConfirmSave = async () => {
    setLoading(true)
    setShowConfirmModal(false)
    setMessage(null)

    try {
      // Coletar todas as decisões, priorizando a regra de média >= 5
      const decisoesArray = notasConselho.map(n => {
        const media = calcularMediaReal(n)
        const notaRecValue = notasRec[n.id]
        let statusFinal = decisoes[n.id] || n.status

        // Abaixo da frequência mínima a nota não aprova sozinha: vale a decisão do conselho
        if (media >= notaMinima && !n.abaixoMinimoFrequencia) {
          statusFinal = 'APROVADO_RECUPERACAO'
        }

        return {
          notaId: n.id,
          novoStatus: statusFinal,
          novaNotaRec: notaRecValue
        }
      }).filter(item => {
        // Enviar apenas o que mudou
        const original = notasConselho.find(n => n.id === item.notaId)
        return item.novoStatus !== original?.status || item.novaNotaRec !== original?.notaRecuperacao
      })

      const response = await fetch('/api/conselho-classe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ decisoes: decisoesArray })
      })

      if (response.ok) {
        setMessage({ type: 'success', text: 'Decisões do conselho salvas com sucesso!' })
        router.refresh()
        setTimeout(() => setMessage(null), 5000)
      } else {
        const error = await response.json()
        setMessage({ type: 'error', text: error.message || 'Erro ao salvar decisões' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Erro ao conectar com o servidor' })
    } finally {
      setLoading(false)
    }
  }

  const getStatusText = (status: string) => {
    const statusMap: Record<string, string> = {
      'APROVADO': 'Aprovado',
      'RECUPERACAO': 'Recuperação',
      'DESISTENTE': 'Infrequente',
      'APROVADO_RECUPERACAO': 'Aprovado na Recup.',
      'APROVADO_CONSELHO': 'Aprovado Conselho',
      'DEPENDENCIA': 'Dependência',
      'CONSERVADO': 'Conservado'
    }
    return statusMap[status] || status
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'APROVADO':
      case 'APROVADO_RECUPERACAO':
      case 'APROVADO_CONSELHO':
        return 'text-success-fg bg-success-subtle'
      case 'RECUPERACAO':
        return 'text-warning-fg bg-warning-subtle'
      case 'DEPENDENCIA':
        return 'text-fg bg-zinc-200'
      case 'CONSERVADO':
        return 'text-danger-fg bg-danger-subtle'
      default:
        return 'text-fg bg-zinc-200'
    }
  }

  const handlePrint = () => {
    const originalTitle = document.title;
    document.title = `Conselho-Classe-${turmaNome.replace(/\s+/g, '-')}`;
    window.print();
    document.title = originalTitle;
  }

  // Preparar dados para impressão em formato de tabela
  const studentsData = notasConselho.reduce((acc, nota) => {
    if (!acc[nota.estudanteId]) {
      acc[nota.estudanteId] = {
        nome: nota.estudanteNome,
        notas: []
      }
    }
    acc[nota.estudanteId].notas.push(nota)
    return acc
  }, {} as Record<string, { nome: string, notas: NotaConselho[] }>)

  // Obter lista única de disciplinas
  const disciplinas = Array.from(new Set(notasConselho.map(n => n.disciplinaNome))).sort()

  // Função para abreviar nomes de disciplinas muito longos
  const abreviarDisciplina = (nome: string) => {
    if (nome.length <= 20) return nome.toUpperCase()
    
    // Abreviações comuns
    const abreviacoes: Record<string, string> = {
      'ALGORITMOS E LÓGICA DE PROG.': 'ALGORITMOS',
      'BANCO DE DADOS': 'BD',
      'EDUCAÇÃO FÍSICA': 'ED. FÍSICA',
      'FUNDAMENTOS DA COMPUTAÇÃO': 'FUND. COMP.',
      'LÍNGUA PORTUGUESA': 'PORTUGUÊS',
      'INICIAÇÃO CIENTÍFICA': 'INIC. CIENTÍFICA',
      'MATEMÁTICA': 'MAT.',
      'SOCIOLOGIA': 'SOCIOL.'
    }
    
    // Verifica se existe abreviação específica
    const nomeUpper = nome.toUpperCase()
    if (abreviacoes[nomeUpper]) return abreviacoes[nomeUpper]
    
    // Se não, pega as primeiras palavras até 20 caracteres
    const palavras = nome.split(' ')
    let resultado = ''
    for (const palavra of palavras) {
      if ((resultado + palavra).length > 20) break
      resultado += (resultado ? ' ' : '') + palavra
    }
    return resultado.toUpperCase() || nome.substring(0, 20).toUpperCase()
  }

  return (
    <>
      {/* Estilos para impressão */}
      <style jsx global>{`
        @media print {
          @page {
            size: landscape;
            margin: 1.5cm 1cm 1.5cm 1cm;
          }
          
          body {
            background: white !important;
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
          
          .no-print {
            display: none !important;
          }
          
          .print-only {
            display: block !important;
          }
          
          .print-table {
            display: table !important;
          }
          
          /* Cabeçalho e rodapé em todas as páginas */
          
          /* Marca d'água Áxis */
          .print-watermark {
            position: fixed;
            bottom: 10mm;
            right: 10mm;
            font-size: 8px;
            color: #9ca3af;
            font-weight: 600;
            opacity: 0.5;
          }
        }
        
        .print-only {
          display: none;
        }
      `}</style>

      {/* Versão para impressão - Tabela */}
      <div className="print-only p-6 bg-white">
        {/* Marca d'água */}
        <div className="print-watermark">
          Powered by Áxis
        </div>
        
        {/* Cabeçalho e Legenda lado a lado */}
        <div className="mb-3 flex items-start justify-between gap-6">
          {/* Identificação - Esquerda */}
          <div className="flex-1">
            <p className="text-[9px] font-medium text-fg-muted mb-1 uppercase leading-tight">
              Centro Territorial de Educação Profissional do Litoral Norte e Agreste Baiano
            </p>
            <div className="flex items-center gap-2 mb-1">
              <div className="text-fg font-medium text-lg">Áxis</div>
              <div className="text-zinc-300">|</div>
              <h1 className="text-xl font-medium text-fg">Conselho de Classe Final</h1>
            </div>
            <h2 className="text-lg font-medium text-fg mb-0.5">{turmaNome}</h2>
            {turmaCurso && <p className="text-sm font-medium text-fg-muted">{turmaCurso} {turmaTurno && `- ${turmaTurno}`}</p>}
            <p className="text-xs text-fg-subtle mt-0.5">Impresso em: {new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
          </div>
          
          {/* Legenda - Direita */}
          <div className="bg-white rounded px-3 py-2 border border-zinc-300" style={{minWidth: '450px'}}>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[8px]">
              <span className="font-medium text-accent-fg text-[9px] mr-1">LEGENDA:</span>
              <div className="flex items-center gap-1">
                <span className="px-2 py-1 bg-success-subtle border border-success font-medium rounded text-success-fg text-[7px]">AR</span>
                <span className="font-medium">Aprov. Recup.</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="px-2 py-1 bg-success-subtle border border-success font-medium rounded text-success-fg text-[7px]">AC</span>
                <span className="font-medium">Aprov. Conselho</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="px-2 py-1 bg-zinc-200 border border-accent font-medium rounded text-accent-fg text-[7px]">DP</span>
                <span className="font-medium">Dependência</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="px-2 py-1 bg-danger-subtle border border-danger font-medium rounded text-danger-fg text-[7px]">CO</span>
                <span className="font-medium">Conservado</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="px-2 py-1 bg-warning-subtle border border-warning font-medium rounded text-warning-fg text-[7px]">RC</span>
                <span className="font-medium">Recuperação</span>
              </div>
            </div>
          </div>
        </div>
        
        <table className="print-table w-full border-collapse text-[9px]">
          <thead>
            <tr>
              <th className="border border-accent px-2 bg-white font-medium text-center text-[8px]" style={{minWidth: '120px', maxWidth: '120px', width: '120px', height: '100px', verticalAlign: 'middle'}}>
                <div style={{display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%'}}>
                  ESTUDANTE
                </div>
              </th>
              {disciplinas.map((disc) => (
                <th key={disc} className="border border-accent bg-white font-medium text-center" style={{minWidth: '20px', maxWidth: '20px', width: '20px', height: '100px', padding: '8px 0'}}>
                  <div style={{
                    writingMode: 'vertical-rl',
                    transform: 'rotate(180deg)',
                    fontSize: '7px',
                    fontWeight: '900',
                    letterSpacing: '0.5px',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    margin: '0 auto'
                  }}>
                    {abreviarDisciplina(disc)}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Object.entries(studentsData)
              .sort(([, a], [, b]) => a.nome.localeCompare(b.nome))
              .map(([estudanteId, data], idx) => {
                // Criar mapa de disciplina -> nota para este aluno
                const notasPorDisciplina = data.notas.reduce((acc, nota) => {
                  acc[nota.disciplinaNome] = nota
                  return acc
                }, {} as Record<string, NotaConselho>)

                return (
                  <tr key={estudanteId}>
                    <td className="border border-accent px-2 py-0.5 font-medium text-left bg-white text-[10px] leading-tight" style={{maxWidth: '120px', width: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'}}>
                      <span className="text-fg-muted mr-1 text-[8px]">{String(idx + 1).padStart(2, '0')}</span>
                      <span>{data.nome}</span>
                    </td>
                    {disciplinas.map((disc) => {
                      const nota = notasPorDisciplina[disc]
                      if (!nota) {
                        return <td key={disc} className="border border-accent px-1 py-1 text-center bg-white">-</td>
                      }
                      
                      const statusAtual = decisoes[nota.id] || nota.status
                      const notaFinal = notasRec[nota.id] !== null && notasRec[nota.id] !== undefined 
                        ? notasRec[nota.id] 
                        : nota.notaRecuperacao
                      
                      let bgColor = 'bg-white'
                      let textColor = 'text-accent-fg'
                      let statusAbrev = ''
                      
                      switch(statusAtual) {
                        case 'APROVADO_RECUPERACAO':
                          bgColor = 'bg-success-subtle'
                          textColor = 'text-success-fg'
                          statusAbrev = 'AR'
                          break
                        case 'APROVADO_CONSELHO':
                          bgColor = 'bg-success-subtle'
                          textColor = 'text-success-fg'
                          statusAbrev = 'AC'
                          break
                        case 'DEPENDENCIA':
                          bgColor = 'bg-zinc-200'
                          textColor = 'text-accent-fg'
                          statusAbrev = 'DP'
                          break
                        case 'CONSERVADO':
                          bgColor = 'bg-danger-subtle'
                          textColor = 'text-danger-fg'
                          statusAbrev = 'CO'
                          break
                        case 'RECUPERACAO':
                          bgColor = 'bg-warning-subtle'
                          textColor = 'text-warning-fg'
                          statusAbrev = 'RC'
                          break
                      }
                      
                      return (
                        <td key={disc} className={`border border-accent px-1 py-1 text-center font-medium ${bgColor} ${textColor}`}>
                          <div className="flex flex-col items-center leading-tight">
                            <span className="text-[8px] font-medium">{statusAbrev}</span>
                            {notaFinal !== null && notaFinal !== undefined && (
                              <span className="text-[10px]">{notaFinal.toFixed(1)}</span>
                            )}
                          </div>
                        </td>
                      )
                    })}
                  </tr>
                )
              })}
          </tbody>
        </table>
      </div>

    <div className="bg-white no-print">
      {/* Header Premium Estilo Resultados - Ajustado para ser Flush com o Layout */}
      <header className="mb-6 border-b border-line pb-4 no-print">
        <div className="max-w-7xl mx-auto py-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="flex items-center space-x-5">
              <Link
                href="/dashboard/conselho-classe"
                className="p-2 hover:bg-zinc-200 rounded-lg transition-colors text-fg-subtle hover:text-fg-muted"
              >
                <ArrowLeft size={20} />
              </Link>
              <div>
                <div className="flex items-center space-x-2 mb-0.5">
                  <h1 className="text-2xl font-bold text-fg tracking-tight">{turmaNome}</h1>
                  {turmaTurno && (
                    <span className="px-2.5 py-1 bg-zinc-900 text-white text-[10px] font-medium rounded-md uppercase tracking-widest leading-none">
                      {turmaTurno}
                    </span>
                  )}
                </div>
                <p className="text-base text-fg-muted font-medium">Conselho de Classe Final • {turmaCurso || 'Análise Pedagógica'}</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-32 space-y-8 no-print">
        <form onSubmit={handleSubmit}>
          {/* Mensagem */}
          {message && (
            <div className={`mb-8 p-5 rounded-xl animate-in fade-in slide-in-from-top-4 duration-300 ${
              message.type === 'success' 
                ? 'bg-success-subtle border border-success-line text-success-fg shadow-sm' 
                : 'bg-danger-subtle border border-danger-line text-danger-fg shadow-sm'
            }`}>
              <div className="flex items-center space-x-3">
                <div className={`p-1.5 rounded-xl ${message.type === 'success' ? 'bg-success' : 'bg-danger'}`}>
                  <AlertCircle className="w-5 h-5 text-white" />
                </div>
                <span className="font-medium text-sm tracking-tight">{message.text}</span>
              </div>
            </div>
          )}

          {/* Dashboard de Visão Geral */}
          <div className="mb-6 bg-white p-1.5 rounded-xl border border-zinc-300 shadow-card overflow-hidden">
            <div className="p-4">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                {/* Métricas Rápidas */}
                {(() => {
                  const studentsData = notasConselho.reduce((acc, nota) => {
                    if (!acc[nota.estudanteId]) acc[nota.estudanteId] = []
                    acc[nota.estudanteId].push(nota)
                    return acc
                  }, {} as Record<string, NotaConselho[]>)

                  const total = Object.keys(studentsData).length
                  const pendentes = Object.entries(studentsData).filter(([id, notas]) => 
                    notas.some(n => !['APROVADO_CONSELHO', 'DEPENDENCIA', 'CONSERVADO', 'APROVADO_RECUPERACAO'].includes(decisoes[n.id] || n.status))
                  ).length
                  const concluidos = total - pendentes

                  return (
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="px-3 py-1.5 bg-white rounded-xl border border-zinc-200 flex items-center space-x-2">
                        <div className="w-1 h-1 bg-zinc-400 rounded-full" />
                        <span className="text-[10px] font-medium text-fg-subtle uppercase tracking-wider">{total} Alunos</span>
                      </div>
                      <div className="px-3 py-1.5 bg-success-subtle rounded-xl border border-success-line flex items-center space-x-2">
                        <div className="w-1 h-1 bg-success rounded-full" />
                        <span className="text-[10px] font-medium text-success-fg uppercase tracking-wider">{concluidos} Concluídos</span>
                      </div>
                      <div className="px-3 py-1.5 bg-warning-subtle rounded-xl border border-warning-line flex items-center space-x-2">
                        <div className="w-1 h-1 bg-warning rounded-full animate-pulse" />
                        <span className="text-[10px] font-medium text-warning-fg uppercase tracking-wider">{pendentes} Pendentes</span>
                      </div>
                    </div>
                  )
                })()}

                {/* Botões de Ação */}
                <div className="flex items-center gap-2">
                  <button 
                    type="button"
                    onClick={handlePrint}
                    className="flex items-center space-x-2 px-4 py-2 rounded-xl text-[10px] font-medium uppercase tracking-widest transition-all bg-white text-fg-muted border border-zinc-300 hover:border-zinc-500 hover:text-fg-muted hover:bg-zinc-100"
                  >
                    <Printer className="w-3 h-3" />
                    <span>Imprimir</span>
                  </button>
                  
                  <button 
                    type="button"
                    onClick={() => setShowInstructions(!showInstructions)}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-[10px] font-medium uppercase tracking-widest transition-all ${
                      showInstructions 
                      ? 'bg-zinc-800 text-white shadow-card' 
                      : 'bg-white text-fg-subtle border border-zinc-300 hover:border-accent/25 hover:text-accent-fg font-medium'
                    }`}
                  >
                    <AlertCircle className="w-3 h-3" />
                    <span>{showInstructions ? 'Ocultar Guia' : 'Como Avaliar?'}</span>
                  </button>
                </div>
              </div>

              {/* Instruções Expansíveis */}
              {showInstructions && (
                <div className="mt-8 p-8 bg-white rounded-xl border border-zinc-200 animate-in fade-in slide-in-from-top-4 duration-300">
                  <div className="flex items-start space-x-5">
                    <div className="p-3 bg-accent rounded-lg shadow-card">
                      <Gavel className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-base font-medium text-fg tracking-tight">Guia Rápido do Conselho</h3>
                      <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-8">
                        <div className="space-y-2">
                          <span className="text-[10px] font-medium text-accent-fg uppercase tracking-widest">Passo 01</span>
                          <p className="text-xs text-fg-subtle leading-relaxed font-medium">Clique no nome do aluno para abrir a lista de matérias com pendência.</p>
                        </div>
                        <div className="space-y-2">
                          <span className="text-[10px] font-medium text-accent-fg uppercase tracking-widest">Passo 02</span>
                          <p className="text-xs text-fg-subtle leading-relaxed font-medium">Ajuste a <b>Nota Rec.</b> se necessário. Notas acima de 5.0 aprovam na hora.</p>
                        </div>
                        <div className="space-y-2">
                          <span className="text-[10px] font-medium text-accent-fg uppercase tracking-widest">Passo 03</span>
                          <p className="text-xs text-fg-subtle leading-relaxed font-medium">Defina a <b>Decisão Final</b> e use o botão <b>Gravar</b> no rodapé fixo.</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Legenda Minimalista */}
              <div className="mt-8 pt-6 border-t border-zinc-50 flex flex-wrap items-center gap-8 px-2">
                <span className="text-[10px] font-medium text-zinc-300 uppercase tracking-widest">Legenda de Estados:</span>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 rounded-full bg-success" />
                  <span className="text-[10px] font-medium text-fg-muted uppercase tracking-wider">Aprovado</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 rounded-full bg-white0" />
                  <span className="text-[10px] font-medium text-fg-muted uppercase tracking-wider">Dependência</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 rounded-full bg-danger" />
                  <span className="text-[10px] font-medium text-fg-subtle uppercase tracking-wider">Conservado</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 rounded-full bg-warning" />
                  <span className="text-[10px] font-medium text-fg-subtle uppercase tracking-wider">Recuperação</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 rounded-sm bg-warning-subtle border border-warning-line" />
                  <span className="text-[10px] font-medium text-warning-fg uppercase tracking-wider">Infrequente (INF)</span>
                </div>
              </div>
            </div>
          </div>

          {/* Listagem por Estudante */}
          <div className="space-y-6">
            {Object.entries(
              notasConselho.reduce((acc, nota) => {
                if (!acc[nota.estudanteId]) {
                  acc[nota.estudanteId] = {
                    nome: nota.estudanteNome,
                    notas: []
                  }
                }
                acc[nota.estudanteId].notas.push(nota)
                return acc
              }, {} as Record<string, { nome: string, notas: NotaConselho[] }>)
            )
            .sort(([, a], [, b]) => a.nome.localeCompare(b.nome))
            .map(([estudanteId, data]) => {
              const isExpanded = expandedStudents.has(estudanteId)
              const pendentesCount = data.notas.filter(n => 
                !['APROVADO_CONSELHO', 'DEPENDENCIA', 'CONSERVADO', 'APROVADO_RECUPERACAO', 'DESISTENTE'].includes(decisoes[n.id] || n.status)
              ).length
              const resolvidasCount = data.notas.length - pendentesCount
              const todasResolvidas = pendentesCount === 0

              // Estatísticas Estáveis (O que trouxe o aluno aqui)
              const recTotal = data.notas.filter(n => n.notaRecuperacao !== null || n.status === 'RECUPERACAO' || n.status === 'APROVADO_RECUPERACAO').length
              const levadasAoConselho = data.notas.filter(n => n.status === 'RECUPERACAO' || n.status === 'APROVADO_RECUPERACAO' || n.status === 'DESISTENTE').length

              // Estatísticas Dinâmicas (Progresso do Conselho)
              const recAprovado = data.notas.filter(n => {
                const statusFinal = decisoes[n.id] || n.status
                const notaAtual = notasRec[n.id]
                return (statusFinal === 'APROVADO_RECUPERACAO' || (notaAtual !== null && notaAtual >= notaMinima))
              }).length

              return (
                <div 
                  key={estudanteId} 
                  className={`bg-white rounded-lg shadow-sm transition-all duration-300 border ${
                    isExpanded ? 'shadow-card border-zinc-300' : 'border-zinc-200'
                  } ${
                    todasResolvidas ? 'bg-success-subtle border-success-line' : ''
                  }`}
                >
                  {/* Cabeçalho do Card (Toggle) */}
                  <button
                    type="button"
                    onClick={() => toggleStudent(estudanteId)}
                    className={`w-full px-6 py-5 flex items-center justify-between text-left transition-colors rounded-lg ${
                      isExpanded ? 'bg-white' : 'hover:bg-white/30'
                    }`}
                  >
                    <div className="flex items-center space-x-4">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-medium text-base transition-all ${
                        todasResolvidas ? 'bg-success text-white' : 'bg-zinc-200 text-fg-muted border border-zinc-300'
                      }`}>
                        {todasResolvidas ? <CheckCircle2 className="w-5 h-5" /> : data.nome.charAt(0)}
                      </div>
                      <div>
                        <h3 className={`text-base font-medium tracking-tight ${
                          todasResolvidas ? 'text-success-fg' : 'text-fg'
                        }`}>
                          {data.nome}
                        </h3>
                        {/* Status Detalhado */}
                        <div className="flex flex-wrap items-center gap-2 mt-1.5">
                          {recTotal > 0 && (
                            <span className="text-[10px] font-medium uppercase tracking-wider px-2 py-0.5 rounded-md bg-zinc-100 text-fg-muted border border-zinc-200">
                              {recTotal} {recTotal === 1 ? 'Recuperação' : 'Recuperações'} ({recAprovado} Passou)
                            </span>
                          )}
                          
                          <span className={`text-[10px] font-medium uppercase tracking-wider px-2 py-0.5 rounded-md ${
                             todasResolvidas ? 'bg-success-subtle text-success-fg border border-success-line' : 'bg-accent-subtle text-accent-fg border border-accent/25'
                          }`}>
                            {levadasAoConselho} {levadasAoConselho === 1 ? 'Matéria' : 'Matérias'} analit.
                          </span>

                          {!isExpanded && (
                             <span className="text-[10px] font-medium text-fg-subtle ml-1">
                               {resolvidasCount}/{data.notas.length} Resolvidas
                             </span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-4">
                       {todasResolvidas && !isExpanded && (
                          <div className="hidden md:flex items-center space-x-1.5 px-3 py-1 bg-success-subtle text-success-fg rounded-lg border border-success-line">
                             <CheckCircle2 className="w-3.5 h-3.5" />
                             <span className="text-[10px] font-medium uppercase tracking-wider">Concluído</span>
                          </div>
                       )}
                       <div className={`p-1.5 rounded-lg border transition-all ${isExpanded ? 'bg-white border-accent/25 text-accent-fg shadow-sm' : 'bg-white border-zinc-200 text-fg-subtle'}`}>
                         {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                       </div>
                    </div>
                  </button>

                  {/* Listagem de Disciplinas (Sanfonado) */}
                  {isExpanded && (
                    <div className="px-6 pb-6 pt-2 animate-in fade-in slide-in-from-top-2 duration-300">
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b border-zinc-200">
                               <th className="px-4 py-3 text-left text-sm font-medium text-fg-subtle uppercase tracking-widest w-10">#</th>
                              <th className="px-4 py-3 text-left text-sm font-medium text-fg-subtle uppercase tracking-widest text-nowrap">Disciplina</th>
                              <th className="px-4 py-3 text-center text-sm font-medium text-fg-subtle uppercase tracking-widest">Média Anual</th>
                              <th className="px-4 py-3 text-center text-sm font-medium text-fg-subtle uppercase tracking-widest text-nowrap">Nota Rec.</th>
                              <th className="px-4 py-3 text-left text-sm font-medium text-accent-fg uppercase tracking-widest">Decisão</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y-0">
                            {data.notas
                              .map((nota: any, originalIndex: number) => ({ ...nota, originalIndex }))
                              .sort((a: any, b: any) => {
                                const aResolvida = ['APROVADO_CONSELHO', 'DEPENDENCIA', 'CONSERVADO', 'APROVADO_RECUPERACAO'].includes(decisoes[a.id] || a.status)
                                const bResolvida = ['APROVADO_CONSELHO', 'DEPENDENCIA', 'CONSERVADO', 'APROVADO_RECUPERACAO'].includes(decisoes[b.id] || b.status)
                                if (aResolvida && !bResolvida) return 1
                                if (!aResolvida && bResolvida) return -1
                                return 0
                              })
                              .map((nota: any) => {
                                const statusValue = decisoes[nota.id] || ''
                                const notaRecVal = notasRec[nota.id] !== undefined ? (notasRec[nota.id] || null) : (nota.notaRecuperacao || null)
                                const mediaCalculada = calcularMediaReal(nota)
                                const isApproved = ((notaRecVal !== null && notaRecVal >= notaMinima) || mediaCalculada >= notaMinima) && !nota.abaixoMinimoFrequencia
                                const isResolvida = isApproved || ['APROVADO_CONSELHO', 'DEPENDENCIA', 'CONSERVADO'].includes(statusValue || nota.status)
                                
                                // Definir cores dinâmicas para o select
                                let selectBg = 'bg-white border-zinc-200 text-fg-muted'
                                let iconColor = 'text-zinc-300'
                                
                                if (statusValue.includes('APROVADO')) {
                                  selectBg = 'bg-success-subtle border-success-line text-success-fg'
                                  iconColor = 'text-success-fg'
                                } else if (statusValue === 'DEPENDENCIA') {
                                  selectBg = 'bg-zinc-100 border-zinc-200 text-fg'
                                  iconColor = 'text-fg-muted'
                                } else if (statusValue === 'CONSERVADO') {
                                  selectBg = 'bg-danger-subtle border-danger-line text-danger-fg'
                                  iconColor = 'text-danger-fg'
                                }

                                return (
                                  <tr key={nota.id} className={`group transition-all hover:bg-zinc-100/50 even:bg-white ${isResolvida ? 'opacity-70' : ''}`}>
                                     <td className="px-4 py-4 rounded-l-xl text-sm font-medium text-zinc-300">
                                      {nota.originalIndex + 1}
                                    </td>
                                    <td className="px-4 py-4">
                                      <div className="flex items-center gap-2">
                                        <div className="text-lg font-medium text-fg">
                                          {nota.disciplinaNome}
                                        </div>
                                        <div className="flex gap-1">
                                          {nota.etapas.map((etapa: EtapaDaNota, i: number) => etapa.desistente && (
                                            <span key={i} className="px-1.5 py-0.5 bg-danger-subtle text-[8px] font-medium text-danger-fg border border-danger-line rounded uppercase tracking-tighter" title={`Infrequente na Unidade ${i + 1}`}>
                                              INF U{i + 1}
                                            </span>
                                          ))}
                                          {nota.frequencia !== null && nota.frequencia !== undefined && (
                                            <span className={`px-1.5 py-0.5 text-[8px] font-medium border rounded uppercase tracking-tighter ${nota.abaixoMinimoFrequencia ? 'bg-danger-subtle text-danger-fg border-danger-line' : 'bg-zinc-50 text-fg-subtle border-zinc-200'}`} title={`Frequência mínima: ${frequenciaMinima}%`}>
                                              FREQ {formatarFrequencia(nota.frequencia)}{nota.abaixoMinimoFrequencia && ' · abaixo do mínimo'}
                                            </span>
                                          )}
                                          {nota.status === 'DESISTENTE' && !nota.etapas.some((e: EtapaDaNota) => e.desistente) && (
                                            <span className="px-1.5 py-0.5 bg-zinc-100 text-[8px] font-medium text-fg-muted border border-zinc-200 rounded uppercase tracking-tighter">
                                              INFREQUENTE
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    </td>
                                     <td className="px-4 py-4 text-center">
                                        <span className={`text-lg font-medium font-mono ${mediaCalculada < notaMinima ? 'text-danger-fg' : 'text-fg-muted'}`}>
                                          {mediaCalculada.toFixed(1)}
                                        </span>
                                    </td>
                                     <td className="px-4 py-4 text-center">
                                       <input
                                         type="text"
                                         defaultValue={notaRecVal !== null ? notaRecVal.toFixed(1) : ''}
                                         key={`${nota.id}-${notaRecVal}`}
                                         onBlur={(e) => handleNotaRecChange(nota.id, e.target.value)}
                                         disabled={isApproved}
                                         className={`w-16 h-9 text-center rounded-md text-base font-medium border outline-none transition-all ${
                                           isApproved 
                                           ? 'bg-success-subtle text-success-fg border-success-line cursor-not-allowed font-medium' 
                                           : 'bg-danger-subtle text-danger-fg border-danger-line focus:border-danger-line focus:ring-2 focus:ring-danger/30'
                                         }`}
                                         placeholder="---"
                                       />
                                     </td>
                                     <td className="px-4 py-4 rounded-r-xl text-left">
                                       <div className="relative inline-flex items-center">
                                         <select
                                           value={isApproved ? 'APROVADO_RECUPERACAO' : statusValue}
                                           onChange={(e) => handleDecisaoChange(nota.id, e.target.value)}
                                           disabled={isApproved}
                                           className={`w-[212px] h-10 px-4 pr-8 rounded-lg outline-none font-medium text-xs uppercase tracking-wider transition-all appearance-none border ${
                                             isApproved 
                                             ? 'bg-success-subtle border-success-line text-success-fg cursor-not-allowed' 
                                             : `${selectBg} cursor-pointer ${!statusValue ? 'focus:border-accent/25 focus:ring-2 focus:ring-ring' : ''}`
                                           }`}
                                         >
                                           <option value="" className="text-fg-subtle">Definir decisão...</option>
                                           <option value="APROVADO_RECUPERACAO">Aprovado na Recuperação</option>
                                           {STATUS_OPTIONS.filter(opt => opt.value !== 'APROVADO_RECUPERACAO').map((opt) => (
                                              <option key={opt.value} value={opt.value} className="text-fg font-medium">
                                                {opt.label}
                                              </option>
                                            ))}
                                          </select>
                                          <div className={`absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none ${isApproved ? 'text-success-fg' : iconColor}`}>
                                            <ChevronDown className="w-3.5 h-3.5" />
                                          </div>
                                        </div>
                                      </td>
                                  </tr>
                                )
                              })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Footer Fixo */}
          <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-xl border-t border-zinc-200 px-4 py-6 z-50 shadow-[0_-10px_40px_rgba(15,23,42,0.1)]">
            <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex items-center space-x-4">
                <div className="bg-zinc-100 p-3 rounded-lg border border-zinc-200 shadow-card">
                  <Gavel className="w-5 h-5 text-fg-muted" />
                </div>
                <div>
                   <p className="text-[10px] font-medium text-fg uppercase tracking-widest leading-none">Fechamento de Conselhos</p>
                   <p className="text-[9px] font-medium text-fg-subtle uppercase tracking-widest mt-1.5 flex items-center">
                     <span className="w-2 h-2 bg-accent rounded-full mr-2 animate-pulse" />
                     {notasConselho.length} Registros totais nesta turma
                   </p>
                </div>
              </div>
              <div className="flex items-center space-x-4 w-full md:w-auto">
                <button
                  type="submit"
                  disabled={loading || Object.keys(decisoes).length === 0}
                  className="flex-1 md:flex-none flex items-center justify-center space-x-4 bg-accent text-white px-10 py-4 rounded-xl font-medium uppercase tracking-widest hover:bg-accent transition-all shadow-card active:scale-[0.98] disabled:opacity-30 disabled:cursor-not-allowed group border-b-4 border-accent"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5 group-hover:rotate-12 transition-transform" />}
                  <span className="text-xs">{loading ? 'Sincronizando...' : 'Gravar Decisões Agora'}</span>
                </button>
              </div>
            </div>
          </div>
        </form>
        {/* Modal de Confirmação */}
        {showConfirmModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-zinc-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-300">
            <div className="bg-white rounded-xl shadow-card max-w-2xl w-full flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-300">
              <div className="p-8 border-b border-zinc-50 flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-medium text-fg uppercase tracking-tight">Revisar Decisões</h3>
                  <p className="text-xs font-medium text-fg-subtle mt-1">Confira os dados antes de consolidar no sistema</p>
                </div>
                <button 
                  type="button"
                  onClick={() => setShowConfirmModal(false)}
                  className="p-2 hover:bg-zinc-100 rounded-full transition-colors"
                >
                  <X className="w-6 h-6 text-zinc-300" />
                </button>
              </div>
              
              <div className="p-8 overflow-y-auto flex-1 custom-scrollbar">
                <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden shadow-card font-mono">
                  <table className="w-full text-left">
                    <thead className="bg-zinc-200/50 text-fg-subtle font-medium uppercase text-[10px] tracking-widest">
                      <tr>
                        <th className="px-6 py-4">Estudante / Disciplina</th>
                        <th className="px-6 py-4 text-center">Nota Rec.</th>
                        <th className="px-6 py-4 text-center">Decisão</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-50 bg-white">
                      {Object.entries(decisoes).map(([notaId, status]) => {
                        const nota = notasConselho.find(n => n.id === notaId)
                        if (!nota) return null
                        
                        const statusOpt = STATUS_OPTIONS.find(o => o.value === status)
                        const notaRecVal = notasRec[notaId]

                        return (
                          <tr key={notaId}>
                            <td className="px-6 py-4">
                              <p className="font-medium text-fg text-xs uppercase">{nota.estudanteNome}</p>
                              <p className="text-[10px] text-fg-subtle font-medium uppercase mt-0.5">{nota.disciplinaNome}</p>
                            </td>
                            <td className="px-6 py-4 text-center font-medium text-fg-muted text-xs">
                              {notaRecVal !== null && notaRecVal !== undefined ? notaRecVal.toFixed(1) : '-'}
                            </td>
                            <td className={`px-6 py-4 text-center text-[10px] font-medium uppercase tracking-widest ${statusOpt?.color || 'text-fg'}`}>
                              {statusOpt?.label || status}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="p-8 border-t border-zinc-50 flex justify-end space-x-4 bg-zinc-100/50 rounded-b-[2.5rem]">
                <button
                  type="button"
                  onClick={() => setShowConfirmModal(false)}
                  className="px-8 py-3 rounded-lg font-medium text-fg-subtle hover:bg-white transition-all text-sm uppercase tracking-widest"
                >
                  Voltar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmSave}
                  className="px-10 py-3 rounded-lg bg-accent text-white font-medium uppercase tracking-widest hover:bg-accent shadow-card transition-all flex items-center space-x-3 active:scale-95 text-xs"
                >
                  <Save className="w-4 h-4" />
                  <span>Gravar Permanentemente</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
    </>
  )
}
