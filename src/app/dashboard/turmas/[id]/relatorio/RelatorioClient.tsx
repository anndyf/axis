"use client"

import { useState } from "react"
import { Users, BookOpen, ChevronDown, ChevronUp, AlertCircle, FileText, X } from "lucide-react"
import type { EtapaDaNota } from "@/lib/services/notas"
import { formatarFrequencia } from "@/lib/services/frequencia"
import { Avatar, Button, Stat } from "@/components/ui"

export default function RelatorioClient({
  turma,
  nomesEtapas,
  totalEstudantes,
  totalDisciplinas,
  totalAprovados,
  totalRecuperacao,
  totalDesistentes,
  isProfessorOnly,
  frequencia = null
}: any) {
  const [expandedStudent, setExpandedStudent] = useState<string | null>(null)
  const [showProfessorsModal, setShowProfessorsModal] = useState(false)

  // Extrair e deduplicar professores
  const professoresMap = new Map()
  turma.disciplinas.forEach((disciplina: any) => {
    disciplina.usuariosPermitidos?.forEach((prof: any) => {
      if (!professoresMap.has(prof.id)) {
        professoresMap.set(prof.id, {
          id: prof.id,
          name: prof.name,
          email: prof.email,
          disciplinas: [disciplina.nome]
        })
      } else {
        const existing = professoresMap.get(prof.id)
        if (!existing.disciplinas.includes(disciplina.nome)) {
          existing.disciplinas.push(disciplina.nome)
        }
      }
    })
  })
  const professoresList = Array.from(professoresMap.values()).sort((a, b) => a.name.localeCompare(b.name))

  const toggleStudent = (matricula: string) => {
    setExpandedStudent(expandedStudent === matricula ? null : matricula)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'APROVADO': return 'text-success-fg bg-success-subtle'
      case 'RECUPERACAO': return 'text-warning-fg bg-warning-subtle'
      case 'DESISTENTE': return 'text-fg bg-zinc-200'
      case 'REPROVADO': return 'text-danger-fg bg-danger-subtle'
      default: return 'text-fg-muted bg-zinc-100'
    }
  }

  return (
    <main className="">

      {/* Botão para Modal de Professores */}
      <div className="mb-4 flex justify-end">
        <Button variant="secondary" onClick={() => setShowProfessorsModal(true)}>
          <Users size={16} strokeWidth={1.75} />
          Professores da turma
        </Button>
      </div>

      {/* Estatísticas - Apenas para Direção/Superuser */}
      {!isProfessorOnly && (
        <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Stat label="Estudantes" value={totalEstudantes} />
          <Stat label="Aprovados" value={totalAprovados} />
          <Stat label="Em recuperação" value={totalRecuperacao} />
          <Stat label="Desistentes" value={totalDesistentes} />
        </div>
      )}

      {isProfessorOnly && (
        <div className="mb-6 max-w-xs">
          <Stat label="Estudantes matriculados" value={totalEstudantes} />
        </div>
      )}

      {/* Lista de Estudantes (Accordion) */}
      <div className="bg-surface rounded-xl border border-line-strong overflow-hidden">
        <div className="px-4 py-4 bg-canvas border-b border-line-strong">
          <h3 className="text-lg font-medium text-fg">
            {isProfessorOnly ? 'Estudantes Matriculados' : 'Desempenho Detalhado dos Estudantes'}
          </h3>
        </div>

        {turma.estudantes.length === 0 ? (
          <div className="p-12 text-center">
            <FileText className="w-16 h-16 text-accent mx-auto mb-4" />
            <p className="text-fg-muted">Nenhum estudante cadastrado nesta turma</p>
          </div>
        ) : (
          <div className="flex flex-col">
            {turma.estudantes.map((estudante: any, index: number) => {
              const aprovadas = estudante.notas.filter((n: any) => n.status === 'APROVADO').length
              const recuperacao = estudante.notas.filter((n: any) => n.status === 'RECUPERACAO').length
              const desistente = estudante.notas.some((n: any) => n.status === 'DESISTENTE')
              const media = estudante.notas.length > 0
                ? (estudante.notas.reduce((acc: number, n: any) => acc + n.nota, 0) / estudante.notas.length).toFixed(2)
                : '0.00'

              let statusText = 'Pendente'
              let statusColor = 'text-fg bg-zinc-200'

              if (desistente) {
                statusText = 'Desistente'
                statusColor = 'text-fg bg-zinc-200'
              } else if (recuperacao > 0) {
                statusText = 'Recuperação'
                statusColor = 'text-warning-fg bg-warning-subtle'
              } else if (aprovadas === totalDisciplinas && totalDisciplinas > 0) {
                statusText = 'Aprovado'
                statusColor = 'text-success-fg bg-success-subtle'
              }

              const isExpanded = expandedStudent === estudante.matricula

              return (
                <div key={estudante.matricula} className="border-b border-line last:border-b-0">
                  {/* Accordion Header */}
                  <div 
                    onClick={() => toggleStudent(estudante.matricula)}
                    className={`flex items-center justify-between p-4 cursor-pointer hover:bg-canvas transition-colors ${isExpanded ? 'bg-canvas' : ''}`}
                  >
                    <div className="flex items-center gap-4 flex-1">
                      <span className="text-xs font-bold text-fg-subtle w-6">{index + 1}</span>
                      <Avatar nome={estudante.nome} />
                      <div className="flex-1">
                        <div className="text-sm font-bold text-fg">
                          {estudante.nome}
                        </div>
                        <div className="text-xs font-bold text-fg-subtle mt-0.5">
                          {estudante.matricula}
                        </div>
                      </div>
                    </div>
                    
                    {!isProfessorOnly && (
                      <div className="flex items-center gap-4 pr-4 hidden md:flex">
                        <div className="text-center">
                          <p className="text-xs font-bold text-fg-subtle">Média geral</p>
                          <span className="text-sm font-bold text-fg-muted">{media}</span>
                        </div>
                        {frequencia && (() => {
                          const f = frequencia.porAluno[estudante.id]?.geral
                          return (
                            <div className="text-center" title={f ? `${f.faltas} faltas em ${f.aulas} aulas` : undefined}>
                              <p className="text-xs font-bold text-fg-subtle">Frequência</p>
                              <span className={`text-sm font-bold ${f?.percentual != null && f.percentual < frequencia.minimo ? 'text-danger-fg' : 'text-fg-muted'}`}>
                                {formatarFrequencia(f?.percentual ?? null)}
                              </span>
                            </div>
                          )
                        })()}
                        <div className="text-center w-24">
                          <span className={`px-3 py-1 inline-flex text-xs leading-5 font-bold rounded-full ${statusColor}`}>
                            {statusText}
                          </span>
                        </div>
                      </div>
                    )}
                    
                    <div className="text-fg-subtle p-2">
                      {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                    </div>
                  </div>

                  {/* Accordion Body (Detalhamento por Disciplina) */}
                  {isExpanded && !isProfessorOnly && (
                    <div className="p-4 bg-canvas/80 border-t border-line-subtle">
                      {estudante.notas.length === 0 ? (
                        <div className="text-center py-4 text-sm text-fg-subtle flex items-center justify-center gap-2">
                          <AlertCircle className="w-4 h-4" /> Nenhuma nota lançada para este estudante ainda.
                        </div>
                      ) : (
                        <div className="overflow-x-auto rounded-lg border border-line">
                          <table className="w-full text-sm">
                            <thead className="bg-subtle text-fg-muted">
                              <tr>
                                <th className="px-4 py-2 text-left font-semibold">Disciplina</th>
                                {nomesEtapas.map((nome: string) => (
                                  <th key={nome} className="px-4 py-2 text-center font-semibold">{nome}</th>
                                ))}
                                <th className="px-4 py-2 text-center font-semibold text-accent-fg">Média</th>
                                <th className="px-4 py-2 text-center font-semibold">Recup.</th>
                                {frequencia && <th className="px-4 py-2 text-center font-semibold">Freq.</th>}
                                <th className="px-4 py-2 text-center font-semibold">Status</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-line bg-surface">
                              {turma.disciplinas.map((disc: any) => {
                                const nota = estudante.notas.find((n: any) => n.disciplinaId === disc.id)
                                
                                if (!nota) return (
                                  <tr key={disc.id} className="text-fg-subtle">
                                    <td className="px-4 py-2 font-medium">{disc.nome}</td>
                                    {nomesEtapas.map((nome: string) => (
                                      <td key={nome} className="px-4 py-2 text-center">-</td>
                                    ))}
                                    <td className="px-4 py-2 text-center">-</td>
                                    <td className="px-4 py-2 text-center">-</td>
                                    {frequencia && <td className="px-4 py-2 text-center">{formatarFrequencia(frequencia.porAluno[estudante.id]?.porDisciplina[disc.id]?.percentual ?? null)}</td>}
                                    <td className="px-4 py-2 text-center text-xs">Pendente</td>
                                  </tr>
                                )

                                return (
                                  <tr key={disc.id} className="text-fg-muted hover:bg-canvas">
                                    <td className="px-4 py-2 font-semibold text-fg">{disc.nome}</td>
                                    {nota.etapas.map((etapa: EtapaDaNota, i: number) => (
                                      <td key={i} className="px-4 py-2 text-center">{etapa.nota?.toFixed(1) ?? '-'}</td>
                                    ))}
                                    <td className="px-4 py-2 text-center font-bold text-accent-fg">{nota.nota?.toFixed(1) ?? '-'}</td>
                                    <td className="px-4 py-2 text-center">{nota.notaRecuperacao?.toFixed(1) ?? '-'}</td>
                                    {frequencia && (() => {
                                      const p = frequencia.porAluno[estudante.id]?.porDisciplina[disc.id]?.percentual ?? null
                                      return <td className={`px-4 py-2 text-center ${p !== null && p < frequencia.minimo ? 'text-danger-fg font-semibold' : ''}`}>{formatarFrequencia(p)}</td>
                                    })()}
                                    <td className="px-4 py-2 text-center">
                                      <span className={`px-2 py-0.5 rounded text-xs font-bold ${getStatusColor(nota.status)}`}>
                                        {nota.status}
                                      </span>
                                    </td>
                                  </tr>
                                )
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {isExpanded && isProfessorOnly && (
                    <div className="p-4 bg-canvas/80 border-t border-line-subtle text-center text-sm text-fg-subtle">
                      O detalhamento de notas não está disponível para o seu perfil nesta visualização.
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Modal Professores */}
      {showProfessorsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-surface rounded-lg shadow-overlay w-full max-w-2xl max-h-[85vh] flex flex-col animate-pop-in">
            <div className="flex items-center justify-between p-4 border-b border-line-subtle">
              <div>
                <h3 className="text-xl font-bold text-fg flex items-center gap-2">
                  <BookOpen className="w-6 h-6 text-accent-fg" />
                  Corpo docente da turma
                </h3>
                <p className="text-sm text-fg-subtle mt-1">{turma.nome}</p>
              </div>
              <button 
                onClick={() => setShowProfessorsModal(false)}
                className="p-2 text-fg-subtle hover:text-fg-muted hover:bg-subtle rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-4 overflow-y-auto">
              {professoresList.length === 0 ? (
                <div className="text-center py-4 text-fg-subtle">
                  <Users className="w-12 h-12 mx-auto text-fg-disabled mb-3" />
                  <p>Nenhum professor vinculado às disciplinas desta turma.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {professoresList.map(prof => (
                    <div key={prof.id} className="p-4 rounded-xl border border-line bg-canvas hover:bg-surface hover:border-accent/25 transition-colors">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-full bg-accent-subtle flex items-center justify-center text-accent-fg font-bold shrink-0">
                          {prof.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <h4 className="font-semibold text-fg text-sm leading-tight">{prof.name}</h4>
                          <p className="text-xs text-fg-subtle mt-0.5">{prof.email}</p>
                          <div className="mt-2 flex flex-wrap gap-1">
                            {prof.disciplinas.map((d: string) => (
                              <span key={d} className="px-2 py-0.5 bg-accent-subtle text-accent-fg text-xs font-bold rounded border border-accent/25">
                                {d}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div className="p-4 border-t border-line-subtle bg-canvas rounded-b-2xl flex justify-end">
              <button
                onClick={() => setShowProfessorsModal(false)}
                className="px-4 py-2 bg-zinc-800 text-white font-medium rounded-lg hover:bg-zinc-700 transition-colors"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

    </main>
  )
}
