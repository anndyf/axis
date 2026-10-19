"use client"

import { useState } from "react"
import { Users, BookOpen, ChevronDown, ChevronUp, AlertCircle, FileText, X } from "lucide-react"
import type { EtapaDaNota } from "@/lib/services/notas"
import { formatarFrequencia } from "@/lib/services/frequencia"

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
      case 'APROVADO': return 'text-green-700 bg-green-100'
      case 'RECUPERACAO': return 'text-orange-700 bg-orange-100'
      case 'DESISTENTE': return 'text-slate-800 bg-slate-200'
      case 'REPROVADO': return 'text-red-700 bg-red-100'
      default: return 'text-slate-600 bg-slate-100'
    }
  }

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      
      {/* Botão para Modal de Professores */}
      <div className="flex justify-end mb-6">
        <button
          onClick={() => setShowProfessorsModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg font-semibold transition-colors border border-indigo-200 shadow-sm"
        >
          <Users className="w-5 h-5" />
          Ver Professores da Turma
        </button>
      </div>

      {/* Estatísticas - Apenas para Direção/Superuser */}
      {!isProfessorOnly && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-slate-100 border border-slate-300 rounded-xl p-6">
            <p className="text-sm text-slate-800 mb-1">Total de Estudantes</p>
            <p className="text-3xl font-medium text-blue-900">{totalEstudantes}</p>
          </div>
          <div className="bg-green-50 border border-green-200 rounded-xl p-6">
            <p className="text-sm text-green-700 mb-1">Aprovados</p>
            <p className="text-3xl font-medium text-green-900">{totalAprovados}</p>
          </div>
          <div className="bg-orange-50 border border-orange-200 rounded-xl p-6">
            <p className="text-sm text-orange-700 mb-1">Em Recuperação</p>
            <p className="text-3xl font-medium text-orange-900">{totalRecuperacao}</p>
          </div>
          <div className="bg-slate-100 border border-slate-300 rounded-xl p-6">
            <p className="text-sm text-slate-800 mb-1">Desistentes</p>
            <p className="text-3xl font-medium text-blue-900">{totalDesistentes}</p>
          </div>
        </div>
      )}

      {isProfessorOnly && (
        <div className="mb-8 p-6 bg-blue-50 border border-blue-200 rounded-2xl flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-blue-900">Contagem de Alunos</h2>
            <p className="text-sm text-blue-700">Total de estudantes matriculados nesta turma</p>
          </div>
          <div className="text-4xl font-black text-blue-900 pr-4">
            {totalEstudantes}
          </div>
        </div>
      )}

      {/* Lista de Estudantes (Accordion) */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-300 overflow-hidden">
        <div className="px-6 py-4 bg-gradient-to-r from-slate-50 to-slate-50 border-b border-slate-300">
          <h3 className="text-lg font-medium text-blue-900">
            {isProfessorOnly ? 'Estudantes Matriculados' : 'Desempenho Detalhado dos Estudantes'}
          </h3>
        </div>

        {turma.estudantes.length === 0 ? (
          <div className="p-12 text-center">
            <FileText className="w-16 h-16 text-blue-400 mx-auto mb-4" />
            <p className="text-slate-700">Nenhum estudante cadastrado nesta turma</p>
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
              let statusColor = 'text-slate-800 bg-slate-200'

              if (desistente) {
                statusText = 'Desistente'
                statusColor = 'text-slate-800 bg-slate-200'
              } else if (recuperacao > 0) {
                statusText = 'Recuperação'
                statusColor = 'text-orange-700 bg-orange-100'
              } else if (aprovadas === totalDisciplinas && totalDisciplinas > 0) {
                statusText = 'Aprovado'
                statusColor = 'text-green-700 bg-green-100'
              }

              const isExpanded = expandedStudent === estudante.matricula

              return (
                <div key={estudante.matricula} className="border-b border-slate-200 last:border-b-0">
                  {/* Accordion Header */}
                  <div 
                    onClick={() => toggleStudent(estudante.matricula)}
                    className={`flex items-center justify-between p-4 cursor-pointer hover:bg-slate-50 transition-colors ${isExpanded ? 'bg-slate-50' : ''}`}
                  >
                    <div className="flex items-center gap-4 flex-1">
                      <span className="text-xs font-bold text-slate-400 w-6">{index + 1}</span>
                      <div className="w-10 h-10 bg-slate-800 rounded-2xl flex items-center justify-center text-white font-bold shadow-md shrink-0">
                        {estudante.nome.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-bold text-slate-800 uppercase tracking-tight">
                          {estudante.nome}
                        </div>
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                          {estudante.matricula}
                        </div>
                      </div>
                    </div>
                    
                    {!isProfessorOnly && (
                      <div className="flex items-center gap-6 pr-4 hidden md:flex">
                        <div className="text-center">
                          <p className="text-[10px] font-bold text-slate-400 uppercase">Média Geral</p>
                          <span className="text-sm font-bold text-slate-700">{media}</span>
                        </div>
                        {frequencia && (() => {
                          const f = frequencia.porAluno[estudante.id]?.geral
                          return (
                            <div className="text-center" title={f ? `${f.faltas} faltas em ${f.aulas} aulas` : undefined}>
                              <p className="text-[10px] font-bold text-slate-400 uppercase">Frequência</p>
                              <span className={`text-sm font-bold ${f?.percentual != null && f.percentual < frequencia.minimo ? 'text-rose-600' : 'text-slate-700'}`}>
                                {formatarFrequencia(f?.percentual ?? null)}
                              </span>
                            </div>
                          )
                        })()}
                        <div className="text-center w-24">
                          <span className={`px-3 py-1 inline-flex text-xs leading-5 font-bold rounded-full ${statusColor} uppercase tracking-widest`}>
                            {statusText}
                          </span>
                        </div>
                      </div>
                    )}
                    
                    <div className="text-slate-400 p-2">
                      {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                    </div>
                  </div>

                  {/* Accordion Body (Detalhamento por Disciplina) */}
                  {isExpanded && !isProfessorOnly && (
                    <div className="p-4 bg-slate-50/80 border-t border-slate-100">
                      {estudante.notas.length === 0 ? (
                        <div className="text-center py-4 text-sm text-slate-500 flex items-center justify-center gap-2">
                          <AlertCircle className="w-4 h-4" /> Nenhuma nota lançada para este estudante ainda.
                        </div>
                      ) : (
                        <div className="overflow-x-auto rounded-lg border border-slate-200">
                          <table className="w-full text-sm">
                            <thead className="bg-slate-100 text-slate-600">
                              <tr>
                                <th className="px-4 py-2 text-left font-semibold">Disciplina</th>
                                {nomesEtapas.map((nome: string) => (
                                  <th key={nome} className="px-4 py-2 text-center font-semibold">{nome}</th>
                                ))}
                                <th className="px-4 py-2 text-center font-semibold text-blue-800">Média</th>
                                <th className="px-4 py-2 text-center font-semibold">Recup.</th>
                                {frequencia && <th className="px-4 py-2 text-center font-semibold">Freq.</th>}
                                <th className="px-4 py-2 text-center font-semibold">Status</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 bg-white">
                              {turma.disciplinas.map((disc: any) => {
                                const nota = estudante.notas.find((n: any) => n.disciplinaId === disc.id)
                                
                                if (!nota) return (
                                  <tr key={disc.id} className="text-slate-400">
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
                                  <tr key={disc.id} className="text-slate-700 hover:bg-slate-50">
                                    <td className="px-4 py-2 font-semibold text-slate-800">{disc.nome}</td>
                                    {nota.etapas.map((etapa: EtapaDaNota, i: number) => (
                                      <td key={i} className="px-4 py-2 text-center">{etapa.nota?.toFixed(1) ?? '-'}</td>
                                    ))}
                                    <td className="px-4 py-2 text-center font-bold text-blue-900">{nota.nota?.toFixed(1) ?? '-'}</td>
                                    <td className="px-4 py-2 text-center">{nota.notaRecuperacao?.toFixed(1) ?? '-'}</td>
                                    {frequencia && (() => {
                                      const p = frequencia.porAluno[estudante.id]?.porDisciplina[disc.id]?.percentual ?? null
                                      return <td className={`px-4 py-2 text-center ${p !== null && p < frequencia.minimo ? 'text-rose-600 font-semibold' : ''}`}>{formatarFrequencia(p)}</td>
                                    })()}
                                    <td className="px-4 py-2 text-center">
                                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${getStatusColor(nota.status)}`}>
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
                    <div className="p-4 bg-slate-50/80 border-t border-slate-100 text-center text-sm text-slate-500">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <div>
                <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                  <BookOpen className="w-6 h-6 text-indigo-600" />
                  Corpo Docente da Turma
                </h3>
                <p className="text-sm text-slate-500 mt-1">{turma.nome}</p>
              </div>
              <button 
                onClick={() => setShowProfessorsModal(false)}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto">
              {professoresList.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  <Users className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                  <p>Nenhum professor vinculado às disciplinas desta turma.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {professoresList.map(prof => (
                    <div key={prof.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50 hover:bg-white hover:border-indigo-200 transition-colors shadow-sm">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold shrink-0">
                          {prof.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <h4 className="font-semibold text-slate-800 text-sm leading-tight">{prof.name}</h4>
                          <p className="text-xs text-slate-500 mt-0.5">{prof.email}</p>
                          <div className="mt-2 flex flex-wrap gap-1">
                            {prof.disciplinas.map((d: string) => (
                              <span key={d} className="px-2 py-0.5 bg-indigo-50 text-indigo-700 text-[10px] font-bold uppercase rounded border border-indigo-100">
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
            
            <div className="p-4 border-t border-slate-100 bg-slate-50 rounded-b-2xl flex justify-end">
              <button
                onClick={() => setShowProfessorsModal(false)}
                className="px-6 py-2 bg-slate-800 text-white font-medium rounded-lg hover:bg-slate-700 transition-colors"
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
