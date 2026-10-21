"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { Download, Filter, FileText, CheckCircle2, AlertCircle, UserMinus, Clock, MoreHorizontal, GraduationCap, Accessibility } from "lucide-react"
import type { EtapaDaNota } from "@/lib/services/notas"

// número = índice da etapa (U1, U2, ...) do esquema da turma
type ViewMode = 'STATUS' | 'MEDIA' | number

interface NotaData {
  disciplinaId: string
  nota: number
  status: string
  etapas: EtapaDaNota[]
}

interface RelatorioStatusClientProps {
  turma: {
    id: string
    nome: string
    modalidade?: string | null
    curso?: string | null
    serie?: string | null
    turno?: string | null
    disciplinas: { id: string; nome: string }[]
    estudantes: {
      matricula: string
      nome: string
      notas: NotaData[]
      aeeProfile?: { id: string } | null
    }[]
  }
  nomesEtapas: string[]
  notaMinimaAprovacao: number
}

export default function RelatorioStatusClient({ turma, nomesEtapas, notaMinimaAprovacao }: RelatorioStatusClientProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('STATUS')
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null)

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'APROVADO':
        return { color: 'bg-success', text: 'text-white', label: 'AP' }
      case 'RECUPERACAO':
        return { color: 'bg-warning', text: 'text-white', label: 'RC' }
      case 'APROVADO_RECUPERACAO':
        return { color: 'bg-success', text: 'text-white', label: 'AR' }
      case 'APROVADO_CONSELHO':
        return { color: 'bg-zinc-700', text: 'text-white', label: 'AC' }
      case 'DEPENDENCIA':
        return { color: 'bg-danger', text: 'text-white', label: 'DP' }
      case 'DESISTENTE':
        return { color: 'bg-zinc-800', text: 'text-white', label: 'DS' }
      case 'CONSERVADO':
        return { color: 'bg-zinc-400', text: 'text-white', label: 'CO' }
      default:
        return { color: 'bg-zinc-200', text: 'text-fg-subtle', label: '-' }
    }
  }

  const getNotaStyle = (nota: number | null | undefined, isDesistente = false) => {
    if (isDesistente) return 'text-fg font-medium'
    if (nota === null || nota === undefined) return 'text-zinc-300 font-normal'
    if (nota >= notaMinimaAprovacao) return 'text-success-fg font-medium'
    return 'text-danger-fg font-medium'
  }

  const abreviarNome = (nome: string) => {
    const nomeUpper = nome.toUpperCase()
    
    // Abreviações específicas solicitadas ou comuns
    const mapa: Record<string, string> = {
      'ALGORITMOS E LINGUAGEM DE PROGRAMAÇÃO': 'Algoritmos e Linguagem P.',
      'FUNDAMENTOS DA COMPUTAÇÃO': 'Fund. da Computação',
      'INICIAÇÃO CIENTÍFICA': 'Inic. Científica',
      'LÍNGUA PORTUGUESA': 'Português',
      'EDUCAÇÃO FÍSICA': 'Ed. Física',
      'BANCO DE DADOS': 'Banco de Dados',
      'EDUCAÇÃO DIGITAL E MIDIÁTICA': 'Ed. Digital e Midiática',
      'HISTÓRIA DA BAHIA': 'Hist. da Bahia',
      'FUNDAMENTOS DE ARQUITETURA DE COMPUTADORES': 'Arq. de Computadores',
      'PROJETO TECNOLOGIAS SOCIAIS': 'Tec. Sociais'
    }

    if (mapa[nomeUpper]) return mapa[nomeUpper]
    
    // Se for muito longo, truncar ou abreviar genericamente
    if (nome.length > 25) {
      return nome.substring(0, 22) + '...'
    }

    return nome
  }

  const renderCellContent = (nota: NotaData | undefined) => {
    if (!nota) return <span className="text-fg-disabled">/</span>

    if (viewMode === 'STATUS') {
      const config = getStatusConfig(nota.status)
      return (
        <span className={`w-5 h-5 rounded flex items-center justify-center text-xs font-medium ${config.color} ${config.text} shadow-sm`}>
          {config.label}
        </span>
      )
    }

    let value: number | string | null | undefined = null
    let isDesistente = false

    if (typeof viewMode === 'number') {
      const etapa = nota.etapas[viewMode]
      value = etapa?.nota
      isDesistente = !!etapa?.desistente
    } else if (viewMode === 'MEDIA') {
      value = nota.nota
      isDesistente = nota.status === 'DESISTENTE'
    }

    if (isDesistente) return <span className="text-fg font-medium text-xs">DS</span>
    if (value === null || value === undefined) return <span className="text-fg-disabled">-</span>
    
    const numValue = typeof value === 'string' ? parseFloat(value) : value
    return (
      <span className={`text-xs ${getNotaStyle(numValue)}`}>
        {numValue < 0 ? 'DS' : numValue.toFixed(1)}
      </span>
    )
  }

  return (
    <div className="">
      {/* Dentro da ficha da turma: visão (situação, unidades, final) e PDF */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-fg-muted">Situação dos estudantes por disciplina</p>
        <div className="flex flex-wrap items-center gap-3">
              <div className="bg-subtle-hover/50 p-1 rounded-lg flex items-center border border-line-strong/50 shadow-card">
                {([
                  { id: 'STATUS', label: 'Status', icon: CheckCircle2 },
                  ...nomesEtapas.map((_, i) => ({ id: i, label: `Und ${i + 1}`, icon: FileText })),
                  { id: 'MEDIA', label: 'Final', icon: GraduationCap }
                ] as { id: ViewMode; label: string; icon: typeof FileText }[]).map((item) => {
                  const Icon = item.icon
                  const active = viewMode === item.id
                  return (
                    <button
                      key={item.id}
                      title={typeof item.id === 'number' ? nomesEtapas[item.id] : undefined}
                      onClick={() => setViewMode(item.id)}
                      className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-medium transition-all ${
                        active 
                        ? 'bg-subtle border border-line text-fg shadow-card active:scale-95' 
                        : 'text-fg-muted hover:text-fg hover:bg-surface/50'
                      }`}
                    >
                      <Icon className={`w-3.5 h-3.5 ${active ? 'text-fg' : 'text-fg-subtle'}`} />
                      <span className="">{item.label}</span>
                    </button>
                  )
                })}
              </div>

              <a
                href={`/api/relatorio/status/${turma.id}/pdf`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center space-x-2 bg-surface border border-line text-fg px-5 py-2.5 rounded-lg hover:bg-subtle transition-all shadow-card active:scale-95 font-medium text-xs"
              >
                <Download className="w-4 h-4" />
                <span>PDF</span>
              </a>
            </div>
      </div>

      {/* Main Content */}
      <main className="py-6">
        {/* Compact Summary & Legend Row */}
        <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4 mb-6 bg-surface p-4 rounded-2xl border border-line-strong shadow-sm">
          {/* Metrics */}
          <div className="flex items-center space-x-6 px-2">
            <div>
               <p className="text-xs font-medium text-fg-subtle">Estudantes</p>
               <p className="text-2xl font-medium text-fg leading-none">{turma.estudantes.length}</p>
            </div>
            <div className="w-px h-8 bg-subtle-hover" />
            <div>
               <p className="text-xs font-medium text-fg-subtle">Disciplinas</p>
               <p className="text-2xl font-medium text-fg leading-none">{turma.disciplinas.length}</p>
            </div>
          </div>

          {/* Compact Legend */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
             {[
               { id: 'AP', label: 'Aprovado', color: 'bg-success' },
               { id: 'RC', label: 'Recup', color: 'bg-warning' },
               { id: 'AR', label: 'Apr.Rec', color: 'bg-success' },
               { id: 'AC', label: 'Conselho', color: 'bg-zinc-700' },
               { id: 'DP', label: 'Dep', color: 'bg-danger' },
               { id: 'DS', label: 'Desist', color: 'bg-zinc-800' },
               { id: 'DS_U', badge: 'DS', label: 'Unid. Des', color: 'bg-white border border-zinc-300', text: 'text-black' }
             ].map((item) => (
               <div key={item.id} className="flex items-center space-x-1.5" title={item.label}>
                 <span className={`w-5 h-5 rounded flex items-center justify-center text-xs font-medium ${item.color} ${item.text || 'text-white'}`}>
                   {item.badge || item.id}
                 </span>
                 <span className="text-xs font-medium text-fg-muted">{item.label}</span>
               </div>
             ))}
          </div>
        </div>

        {/* Ultra Compact Matriz */}
        <div className="bg-surface rounded-2xl shadow-card border border-line overflow-hidden relative">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-canvas/80 border-b border-line-strong">
                  <th className="px-2 py-2 text-center text-xs font-medium text-fg-subtle sticky left-0 bg-canvas/95 backdrop-blur z-20 w-10 border-r border-line-strong">
                    #
                  </th>
                  <th className="px-1.5 py-2 text-left text-xs font-medium text-fg sticky left-10 bg-canvas/95 backdrop-blur z-20 w-[1%] border-r border-line-strong shadow-[2px_0_5px_rgba(0,0,0,0.02)] whitespace-nowrap">
                    Estudante
                  </th>
                  {turma.disciplinas.map((disc) => (
                    <th key={disc.id} className="w-9 min-w-[2.25rem] max-w-[2.25rem] px-0 py-2 align-bottom h-24 border-r border-line last:border-0">
                      <div className="flex items-center justify-center h-full w-full">
                        <span className="text-xs font-medium text-fg-muted [writing-mode:vertical-rl] rotate-180 whitespace-nowrap overflow-hidden text-ellipsis max-h-[85px]">
                          {abreviarNome(disc.nome)}
                        </span>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {turma.estudantes.length === 0 ? (
                  <tr>
                    <td colSpan={turma.disciplinas.length + 2} className="py-12 text-center text-fg-subtle font-medium text-xs">
                       Nenhum estudante nesta turma.
                    </td>
                  </tr>
                ) : (
                  turma.estudantes.map((estudante, idx) => {
                    const notasMap = new Map(estudante.notas.map(n => [n.disciplinaId, n]))
                    const isEven = idx % 2 === 0
                    const isSelected = selectedStudentId === estudante.matricula
                    
                    let rowBg = isEven ? 'bg-white' : 'bg-zinc-50'
                    if (isSelected) rowBg = '!bg-warning-subtle'
                    
                    return (
                      <tr 
                        key={estudante.matricula} 
                        onClick={() => setSelectedStudentId(isSelected ? null : estudante.matricula)}
                        className={`group hover:bg-canvas transition-colors cursor-pointer ${rowBg}`}
                      >
                        <td className={`h-9 px-1 text-center text-xs font-medium text-fg-subtle sticky left-0 group-hover:bg-canvas transition-colors z-10 border-r border-line ${rowBg}`}>
                          {(idx + 1).toString().padStart(2, '0')}
                        </td>
                        <td className={`h-9 px-1.5 text-sm tracking-tight font-medium text-fg sticky left-10 group-hover:bg-canvas transition-colors z-10 border-r border-line-strong shadow-[2px_0_5px_rgba(0,0,0,0.02)] whitespace-nowrap ${rowBg}`}>
                           <div className="flex items-center gap-1.5">
                              {estudante.nome}
                              {estudante.aeeProfile && (
                                <Link 
                                  href={`/dashboard/aee/${estudante.matricula}`}
                                  className="text-accent-fg hover:text-accent-fg transition-colors"
                                  title="Ficha AEE"
                                >
                                  <Accessibility className="w-3.5 h-3.5" />
                                </Link>
                              )}
                           </div>
                        </td>
                        {turma.disciplinas.map((disc) => (
                          <td key={disc.id} className="w-9 min-w-[2.25rem] max-w-[2.25rem] h-9 px-0 text-center border-r border-line-subtle last:border-0">
                            <div className="flex items-center justify-center w-full h-full">
                              {renderCellContent(notasMap.get(disc.id))}
                            </div>
                          </td>
                        ))}
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  )
}
