"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { ArrowLeft, Users, Search, Filter, Info, ListFilter, CheckCircle2 } from "lucide-react"
import TeacherTipsModal from "@/components/TeacherTipsModal"

export default function ResultadosClient({ turmas }: { turmas: any[] }) {

  // Filtros
  const [filterCurso, setFilterCurso] = useState("")
  const [filterTurno, setFilterTurno] = useState("")
  const [filterNome, setFilterNome] = useState("")

  // Deriva opções únicas
  const uniqueCursos = useMemo(() => Array.from(new Set(turmas.map(t => t.curso).filter(Boolean))), [turmas])
  const uniqueTurnos = useMemo(() => Array.from(new Set(turmas.map(t => t.turno).filter(Boolean))), [turmas])

  // Lógica de filtragem
  const filteredTurmas = useMemo(() => {
    return turmas.filter(t => {
      const matchCurso = filterCurso ? t.curso === filterCurso : true
      const matchTurno = filterTurno ? t.turno === filterTurno : true
      const matchNome = filterNome ? t.nome.toLowerCase().includes(filterNome.toLowerCase()) : true
      return matchCurso && matchTurno && matchNome
    })
  }, [turmas, filterCurso, filterTurno, filterNome])

  return (
    <div className="">


      {/* Header Premium Estilo Resultados - Ajustado para ser Flush com o Layout */}
      <header className="mb-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="flex min-w-0 items-center gap-3">
              <Link
                href="/dashboard"
                aria-label="Voltar" className="hidden sm:inline-flex p-1.5 rounded-md text-fg-subtle transition-colors duration-150 hover:bg-subtle hover:text-fg"
              >
                <ArrowLeft size={16} strokeWidth={1.75} />
              </Link>
              <div>
                <h1 className="text-2xl font-semibold tracking-tight text-fg">Resultados da Turma</h1>
                <p className="text-sm text-fg-muted">Visualizar desempenho por unidade e resultados finais</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-32 space-y-8">
        
        {/* Dica de Uso */}
        <div className="bg-zinc-100 border border-zinc-200 rounded-lg p-5 flex items-start gap-4">
          <div className="bg-white p-2 rounded-xl shadow-sm border border-zinc-200 flex-shrink-0 text-fg-subtle">
            <Info className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-bold text-fg mb-1">Dica de Monitoramento</h3>
            <p className="text-sm text-fg-muted font-medium leading-relaxed">
              Acesse aqui a visão consolidada de todas as turmas. Esta seção é responsável por gerar os mapas de desempenho, detalhando as notas por unidades e o status acadêmico completo das turmas. Utilize os filtros para localizar a turma desejada e acesse o cartão correspondente para explorar os dados ou gerar relatórios em PDF.
            </p>
          </div>
        </div>

        {/* Filtros Premium */}
        <div className="bg-white p-6 rounded-xl shadow-card border border-zinc-200 flex flex-wrap gap-6 items-end relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-zinc-100 rounded-full -mr-16 -mt-16 opacity-50 blur-3xl"></div>
            
            <div className="flex-1 min-w-[200px] space-y-2">
                <label className="text-xs font-medium text-fg-subtle ml-2">Curso</label>
                <select 
                    value={filterCurso}
                    onChange={(e) => setFilterCurso(e.target.value)}
                    className="w-full bg-zinc-50 hover:bg-zinc-200 border-none rounded-lg px-6 py-4 text-sm focus:ring-2 focus:ring-zinc-500 transition-all appearance-none cursor-pointer font-medium text-fg-muted shadow-card"
                >
                    <option value="">Todos os Cursos</option>
                    {uniqueCursos.map((c: any) => <option key={c} value={c}>{c}</option>)}
                </select>
            </div>

            <div className="flex-1 min-w-[200px] space-y-2">
                <label className="text-xs font-medium text-fg-subtle ml-2">Turno</label>
                <select 
                    value={filterTurno}
                    onChange={(e) => setFilterTurno(e.target.value)}
                    className="w-full bg-zinc-50 hover:bg-zinc-200 border-none rounded-lg px-6 py-4 text-sm focus:ring-2 focus:ring-zinc-500 transition-all appearance-none cursor-pointer font-medium text-fg-muted shadow-card"
                >
                    <option value="">Todos os Turnos</option>
                    {uniqueTurnos.map((t: any) => <option key={t} value={t}>{t}</option>)}
                </select>
            </div>

            <div className="flex-[2] min-w-[250px] space-y-2">
                <label className="text-xs font-medium text-fg-subtle ml-2">Pesquisar Turma</label>
                <div className="relative group">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center bg-zinc-50 rounded-lg text-fg-subtle group-focus-within:text-fg-muted group-focus-within:bg-zinc-100 transition-all">
                        <Search size={18} />
                    </div>
                    <input 
                        type="text"
                        value={filterNome}
                        onChange={(e) => setFilterNome(e.target.value)}
                        placeholder="Ex: 1º Ano, Técnico em Enfermagem..."
                        className="w-full bg-zinc-50 hover:bg-zinc-200 border-none rounded-lg pl-14 pr-6 py-4 text-sm focus:ring-2 focus:ring-zinc-500 transition-all font-medium text-fg-muted shadow-card placeholder:text-zinc-300"
                    />
                </div>
            </div>

            <div className="pb-2.5">
                <div className="flex items-center gap-2 bg-zinc-100 px-4 py-2.5 rounded-lg border border-zinc-200 shadow-sm">
                    <span className="w-2 h-2 rounded-full bg-zinc-500 animate-pulse"></span>
                    <span className="text-xs font-semibold text-fg">{filteredTurmas.length} turmas mapeadas</span>
                </div>
            </div>
        </div>

        {/* Turmas Grid Style Premium */}
        <div className="bg-white rounded-xl shadow-card border border-zinc-200 p-8">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-xs font-semibold text-fg-subtle flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-zinc-100 text-fg-muted flex items-center justify-center shadow-card">
                <Users size={16} />
              </div>
              Selecione uma Turma para Detalhes
            </h2>
          </div>
          
          {filteredTurmas.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-zinc-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <Search className="w-8 h-8 text-zinc-300" />
              </div>
              <h3 className="text-fg font-medium mb-1">Nenhuma turma encontrada</h3>
              <p className="text-fg-muted text-sm">Tente ajustar os filtros de busca.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredTurmas.map((turma) => (
                <Link
                  key={turma.id}
                  href={`/dashboard/resultados/${turma.id}`}
                  className="border border-zinc-300 rounded-lg p-4 hover:border-zinc-500 hover:bg-zinc-100 transition-all group bg-white shadow-sm hover:shadow-card h-full flex flex-col justify-between"
                >
                  <div>
                    <h3 className="font-medium text-fg mb-3 group-hover:text-fg whitespace-nowrap truncate text-base tracking-tight" title={turma.nome}>
                      {turma.nome}
                    </h3>
                    
                    <div className="space-y-1.5 text-sm text-fg-muted">
                      <div className="flex justify-between items-center">
                        <span className="text-xs uppercase font-medium text-fg-subtle truncate max-w-[60%]">{turma.curso || 'Ensino Médio'}</span>
                        {turma.turno && (
                          <span className="bg-zinc-200/50 text-fg-muted text-xs font-medium px-1.5 py-0.5 rounded border border-zinc-300/50">
                              {turma.turno}
                          </span>
                        )}
                      </div>
                      <div className="flex justify-between items-center pt-1 mt-1 border-t border-zinc-200">
                        <span className="text-xs uppercase font-medium text-fg-subtle">Estudantes</span>
                        <span className="font-medium text-fg">{turma._count.estudantes}</span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
