"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { ArrowLeft, Download, CheckCircle2, FileText, GraduationCap, AlertTriangle, TrendingDown, Info, Printer } from "lucide-react"
import TeacherTipsModal from "@/components/TeacherTipsModal"
import { buttonClasses } from "@/components/ui"
import { analyzeRisk } from "@/lib/risk-analysis"
import type { EtapaDaNota } from "@/lib/services/notas"

interface Disciplina {
  id: string
  nome: string
}

interface NotaResultado {
  id: string
  nota: number
  etapas: EtapaDaNota[]
  notaRecuperacao: number | null
  status: string
  estudanteId: string
  estudanteNome: string
  disciplinaId: string
  disciplinaNome: string
}

// "UNIDADE_N" (N a partir de 1) = etapa N do esquema da turma; mesmo formato do ?unit= do PDF
type UnitOption = 'FINAL' | `UNIDADE_${number}`

export default function ResultadosTurmaClient({
  turmaId,
  turmaNome,
  disciplinas,
  initialNotas,
  initialEstudantes,
  nomesEtapas,
  numUnidades = 3,
  notaMinimaAprovacao = 5
}: {
  turmaId: string
  turmaNome: string
  disciplinas: Disciplina[]
  initialNotas: NotaResultado[]
  initialEstudantes?: { matricula: string, nome: string }[]
  nomesEtapas: string[]
  numUnidades?: number
  notaMinimaAprovacao?: number
}) {
  const [selectedUnit, setSelectedUnit] = useState<UnitOption>('FINAL')
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null)

  const abreviarNome = (nome: string) => {
    const nomeUpper = nome.toUpperCase()
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
    if (nome.length > 25) {
      return nome.substring(0, 22) + '...'
    }
    return nome
  }

  const getStatusConfig = (status: string, notaValue?: number) => {
    // Se for modo numérico (Unidades)
    if (status === 'NUMERIC') {
        if (notaValue === undefined || notaValue === null) return { color: 'text-zinc-300', text: 'font-normal', label: '-' }
        if (notaValue >= notaMinimaAprovacao) return { color: 'text-success-fg', text: 'font-medium', label: notaValue.toFixed(1) }
        return { color: 'text-danger-fg', text: 'font-medium', label: notaValue.toFixed(1) }
    }

    // Modo Status (Final)
    switch (status) {
      case 'AP':
      case 'APROVADO':
        return { color: 'bg-success-subtle border border-success-line', text: 'text-success-fg', label: 'AP' }
      case 'RC':
      case 'RECUPERACAO':
      case 'RECU_FINAL':
        return { color: 'bg-warning-subtle border border-warning-line', text: 'text-warning-fg', label: 'RC' }
      case 'AR':
      case 'APROVADO_RECUPERACAO':
        return { color: 'bg-success-subtle border border-success-line', text: 'text-success-fg', label: 'AR' }
      case 'AC':
      case 'APROVADO_CONSELHO':
      case 'CONSELHO':
        return { color: 'bg-subtle border border-line-strong', text: 'text-fg', label: 'AC' }
      case 'DP':
      case 'DEPENDENCIA':
        return { color: 'bg-danger-subtle border border-danger-line', text: 'text-danger-fg', label: 'DP' }
      case 'DS':
      case 'DESISTENTE':
        return { color: 'bg-warning-subtle border border-warning-line', text: 'text-warning-fg', label: 'INF' }
      case 'CO':
      case 'CONSERVADO':
        return { color: 'bg-danger-subtle border border-danger-line', text: 'text-danger-fg', label: 'CO' }
      default:
        return { color: 'bg-zinc-200', text: 'text-fg-subtle', label: '-' }
    }
  }

  const renderCellContent = (n: NotaResultado | undefined) => {
    if (!n) return <span className="text-zinc-300">/</span>

    if (selectedUnit === 'FINAL') {
        let label = '-'
        let statusKey = n.status

        // Lógica de exibição do status
        const isPositive = n.nota >= notaMinimaAprovacao
        if (n.status === 'APROVADO' || isPositive) { statusKey = 'APROVADO'; label = 'AP'; }
        else if (n.status === 'RECU_FINAL' || !isPositive) { statusKey = 'RECUPERACAO'; label = 'RC'; }
        
        if (n.status === 'CONSELHO') { statusKey = 'CONSELHO'; label = 'AC'; }
        
        const config = getStatusConfig(statusKey)
        
        if (n.status === 'DESISTENTE') {
            if (n.nota !== null && n.nota !== undefined) {
                 return (
                     <div className="flex flex-col items-center justify-center gap-[1px]" title="Infrequente (Desistente)">
                         <span className={`w-5 h-5 rounded flex items-center justify-center text-xs font-medium ${config.color} ${config.text} shadow-sm`}>{label}</span>
                         <span className="text-[7px] font-semibold bg-warning-subtle text-warning-fg px-1 rounded">INF</span>
                     </div>
                 )
            }
            return (
                 <div className="flex items-center justify-center h-full w-full" title="Infrequente (Desistente)">
                    <span className="text-xs font-semibold bg-warning-subtle text-warning-fg px-2 py-0.5 rounded border border-warning-line">INF</span>
                 </div>
            )
        }

        return (
            <span className={`w-5 h-5 rounded flex items-center justify-center text-xs font-medium ${config.color} ${config.text} shadow-sm`}>
              {label}
            </span>
        )
    }

    // Lógica para Unidades
    // (o modo FINAL já retornou acima)
    const etapa = n.etapas[Number(selectedUnit.replace('UNIDADE_', '')) - 1]
    const value: number | null | undefined = etapa?.nota
    const isDesistente = !!etapa?.desistente
    
    if (isDesistente) {
        if (value !== null && value !== undefined) {
             const config = getStatusConfig('NUMERIC', value)
             return (
                 <div className="flex flex-col items-center justify-center gap-0.5" title="Infrequente nesta unidade">
                     <span className={`text-xs font-medium ${config.color}`}>{config.label}</span>
                     <span className="text-xs font-semibold bg-warning-subtle text-warning-fg px-1 rounded">INF</span>
                 </div>
             )
        }
        return (
             <div className="flex items-center justify-center h-full w-full" title="Infrequente nesta unidade (Sem nota)">
                <span className="text-xs font-semibold bg-warning-subtle text-warning-fg px-2 py-0.5 rounded border border-warning-line">INF</span>
             </div>
        )
    }
    
    if (value === null || value === undefined) return <span className="text-zinc-300">-</span>
    
    const config = getStatusConfig('NUMERIC', value)
    
    return (
        <span className={`text-xs ${config.color} ${config.text}`}>
            {config.label}
        </span>
    )
  }

  const matrixData = useMemo(() => {
    console.log("ResultadosClient render - initialNotas:", initialNotas?.length, "initialEstudantes:", initialEstudantes?.length);
    const estudantesMap = new Map<string, { id: string, nome: string, notas: Record<string, NotaResultado> }>()

    if (initialEstudantes && Array.isArray(initialEstudantes)) {
      initialEstudantes.forEach(est => {
        if (est && est.matricula) {
          estudantesMap.set(est.matricula, {
            id: est.matricula,
            nome: est.nome || 'Sem Nome',
            notas: {}
          })
        }
      })
    }

    if (initialNotas && Array.isArray(initialNotas)) {
      initialNotas.forEach(nota => {
        if (!nota || !nota.estudanteId) return;
        if (!estudantesMap.has(nota.estudanteId)) {
          estudantesMap.set(nota.estudanteId, {
            id: nota.estudanteId,
            nome: nota.estudanteNome || nota.estudanteId,
            notas: {}
          })
        }
        estudantesMap.get(nota.estudanteId)!.notas[nota.disciplinaId] = nota
      })
    }

    const finalArray = Array.from(estudantesMap.values()).sort((a, b) => a.nome.localeCompare(b.nome));
    console.log("Final matrixData length:", finalArray.length);
    return finalArray;
  }, [initialNotas, initialEstudantes])

  const resultTips = [
    {
      title: "Visualização Premium",
      description: "Agora você tem uma visão unificada e moderna dos resultados.",
      icon: <CheckCircle2 className="w-10 h-10 text-success-fg" />,
      color: "bg-success"
    }
  ]

  return (
    <div className="">
      <TeacherTipsModal storageKey="seen_tips_resultados_v2" title="Novo Visual de Resultados" tips={resultTips} />
      
      {/* Header Premium */}
      <header className="mb-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="flex min-w-0 items-center gap-3">
              <Link
                href="/dashboard/resultados"
                className="w-10 h-10 bg-white border border-zinc-300 rounded-xl flex items-center justify-center text-fg-muted hover:bg-zinc-50 transition-all shadow-sm hover:translate-x-[-2px]"
              >
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div>
                <div className="flex items-center space-x-2 mb-0.5">
                  <h1 className="text-2xl font-semibold tracking-tight text-fg">Resultado — {turmaNome}</h1>
                </div>
                <p className="text-xs font-medium text-fg-subtle flex items-center">
                  <span className="text-fg-muted mr-2 font-medium">{turmaNome}</span>
                  • Relatório de Notas • {selectedUnit.replace('UNIDADE_', 'Unidade ').replace('FINAL', 'Final')}
                </p>
              </div>
            </div>
            
            <div className="flex flex-wrap items-center gap-3">
              <div role="group" aria-label="Visualização" className="flex items-center gap-0.5 rounded-lg border border-line bg-subtle p-0.5">
                {[
                  { id: 'FINAL', label: 'Status', icon: CheckCircle2 },
                  ...nomesEtapas.map((_, i) => ({ id: `UNIDADE_${i + 1}`, label: `Und ${i + 1}`, icon: FileText }))
                ].map((item) => {
                  const Icon = item.icon
                  const active = selectedUnit === item.id
                  return (
                    <button
                      key={item.id}
                      onClick={() => setSelectedUnit(item.id as UnitOption)}
                      aria-pressed={active}
                      className={`flex h-8 items-center gap-1.5 rounded-md px-3 text-13 font-medium transition-colors duration-150 ${
                        active
                        ? 'bg-surface text-fg shadow-card'
                        : 'text-fg-muted hover:text-fg'
                      }`}
                    >
                      <Icon size={16} strokeWidth={1.75} className={active ? 'text-accent' : 'text-fg-subtle'} />
                      <span className="">{item.label}</span>
                    </button>
                  )
                })}
              </div>

              <a
                href={`/api/relatorio/resultados/${turmaId}/pdf?unit=${selectedUnit}`}
                target="_blank"
                rel="noopener noreferrer"
                className={buttonClasses({ variant: 'secondary' })}
              >
                <Download size={16} strokeWidth={1.75} />
                <span>PDF</span>
              </a>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Compact Summary & Legend Row */}
        <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4 mb-6 bg-white p-4 rounded-lg border border-zinc-300 shadow-sm">
          {/* Metrics */}
          <div className="flex items-center space-x-6 px-2">
            <div>
               <p className="text-xs font-medium text-fg-subtle">Estudantes</p>
               <p className="text-2xl font-medium text-black leading-none">{matrixData.length}</p>
            </div>
            <div className="w-px h-8 bg-zinc-200" />
            <div>
               <p className="text-xs font-medium text-fg-subtle">Disciplinas</p>
               <p className="text-2xl font-medium text-black leading-none">{disciplinas.length}</p>
            </div>
          </div>

          {/* Compact Legend */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
             {[
               { id: 'AP', label: 'Aprovado', color: 'bg-success-subtle border border-success-line', text: 'text-success-fg' },
               { id: 'RC', label: 'Recup', color: 'bg-warning-subtle border border-warning-line', text: 'text-warning-fg' },
               { id: 'AR', label: 'Apr.Rec', color: 'bg-success-subtle border border-success-line', text: 'text-success-fg' },
               { id: 'AC', label: 'Conselho', color: 'bg-subtle border border-line-strong', text: 'text-fg' },
               { id: 'DP', label: 'Dep', color: 'bg-danger-subtle border border-danger-line', text: 'text-danger-fg' },
               { id: 'INF', badge: 'INF', label: 'Infrequente', color: 'bg-warning-subtle border border-warning-line', text: 'text-warning-fg' }
             ].map((item) => (
               <div key={item.id} className="flex items-center space-x-1.5" title={item.label}>
                 <span className={`w-5 h-5 rounded flex items-center justify-center text-xs font-medium ${item.color} ${(item as any).text || 'text-white'}`}>
                   {(item as any).badge || item.id}
                 </span>
                 <span className="text-xs font-medium text-fg-muted">{item.label}</span>
               </div>
             ))}
          </div>
        </div>

        {/* Ultra Compact Matriz */}
        <div className="bg-white rounded-lg shadow-card border border-zinc-200 overflow-hidden relative">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-zinc-50/80 border-b border-zinc-300">
                  <th className="px-2 py-2 text-center text-xs font-medium text-fg-subtle uppercase sticky left-0 bg-zinc-50/95 backdrop-blur z-20 w-10 border-r border-zinc-300">
                    #
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-black uppercase sticky left-8 bg-white z-30 min-w-[250px] border-r border-zinc-300 shadow-[2px_0_5px_rgba(0,0,0,0.05)] whitespace-nowrap">
                    Estudante
                  </th>
                  {disciplinas.map((disc) => (
                    <th key={disc.id} className="w-11 min-w-[2.75rem] max-w-[2.75rem] px-0 py-2 align-bottom h-24 border-r border-zinc-200 last:border-0">
                      <div className="flex items-center justify-center h-full w-full">
                        <span className="text-xs font-medium text-fg-muted [writing-mode:vertical-rl] rotate-180 whitespace-nowrap overflow-hidden text-ellipsis max-h-[85px]">
                          {abreviarNome(disc.nome)}
                        </span>
                      </div>
                    </th>
                  ))}
                  <th className="w-24 px-2 py-2 text-center text-xs font-medium text-fg-muted uppercase sticky right-0 bg-zinc-50/95 backdrop-blur z-20 border-l border-zinc-300">
                    Risco
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200">
                {matrixData.length === 0 ? (
                  <tr>
                    <td colSpan={disciplinas.length + 3} className="py-12 text-center text-fg-subtle font-medium text-xs">
                       Nenhum estudante nesta turma.
                    </td>
                  </tr>
                ) : (
                  matrixData.map((estudante, idx) => {
                    const notasDoAluno = disciplinas.map(d => estudante.notas[d.id])
                    
                    // Cálculo de Risco IA
                    let worstRisk: any = { level: 'NONE' };
                    for (const n of notasDoAluno) {
                        if (n) {
                            const analysis = analyzeRisk(n.etapas.map(e => e.nota), numUnidades, notaMinimaAprovacao);
                            if (worstRisk.level === 'NONE' || 
                               (analysis.level === 'CRITICAL') || 
                               (analysis.level === 'HIGH' && worstRisk.level !== 'CRITICAL') ||
                               (analysis.level === 'MEDIUM' && (worstRisk.level !== 'CRITICAL' && worstRisk.level !== 'HIGH'))) {
                              worstRisk = analysis;
                            }
                        }
                    }

                    const isEven = idx % 2 === 0
                    const isSelected = selectedStudentId === estudante.id
                    
                    let rowBg = isEven ? 'bg-white' : 'bg-zinc-50'
                    if (isSelected) rowBg = '!bg-warning-subtle'
                    
                    return (
                      <tr 
                        key={estudante.id} 
                        onClick={() => setSelectedStudentId(isSelected ? null : estudante.id)}
                        className={`group hover:bg-zinc-50 transition-colors cursor-pointer ${rowBg}`}
                      >
                        <td className={`h-9 px-1 text-center text-xs font-medium text-fg-subtle sticky left-0 group-hover:bg-zinc-50 transition-colors z-10 border-r border-zinc-200 ${rowBg}`}>
                          {(idx + 1).toString().padStart(2, '0')}
                        </td>
                        <td className={`h-9 px-3 text-sm font-medium text-black sticky left-8 z-20 border-r border-zinc-300 shadow-[2px_0_5px_rgba(0,0,0,0.05)] whitespace-nowrap min-w-[250px] bg-white`}>
                           {estudante.nome.toUpperCase()}
                        </td>
                        {disciplinas.map((disc) => (
                          <td key={disc.id} className="w-11 min-w-[2.75rem] max-w-[2.75rem] h-9 px-0 text-center border-r border-zinc-50 last:border-0">
                            <div className="flex items-center justify-center w-full h-full">
                              {renderCellContent(estudante.notas[disc.id])}
                            </div>
                          </td>
                        ))}
                        <td className={`h-9 px-2 text-center sticky right-0 bg-white border-l border-zinc-200 group-hover:bg-zinc-50 transition-colors z-10 ${rowBg}`}>
                           <div className={`
                             inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border transition-all
                             ${worstRisk.level === 'CRITICAL' ? 'bg-danger-subtle border-danger-line' : 
                               worstRisk.level === 'HIGH' ? 'bg-warning-subtle border-warning-line' :
                               worstRisk.level === 'MEDIUM' ? 'bg-warning-subtle border-warning-line' :
                               'bg-zinc-50 border-zinc-200'}
                           `} title={worstRisk.message}>
                             {worstRisk.level === 'CRITICAL' && <AlertTriangle size={10} className="text-danger-fg animate-pulse" />}
                             {worstRisk.level === 'HIGH' && <TrendingDown size={10} className="text-warning-fg" />}
                             {worstRisk.level === 'MEDIUM' && <Info size={10} className="text-warning-fg" />}
                             
                             <span className={`text-xs font-medium ${worstRisk.color || 'text-fg-subtle'}`}>
                               {worstRisk.level === 'NONE' ? '-' : 
                                worstRisk.level === 'CRITICAL' ? 'Crítico' :
                                worstRisk.level === 'HIGH' ? 'Alto' :
                                worstRisk.level === 'MEDIUM' ? 'Médio' : 'Baixo'}
                             </span>
                           </div>
                        </td>
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
