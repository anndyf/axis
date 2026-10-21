"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { Users, Search, Info } from "lucide-react"
import { CabecalhoPagina } from "@/components/ui"
import ListaDeTurmas from "@/components/listas/ListaDeTurmas"

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


      <CabecalhoPagina
        titulo="Resultados"
        descricao="Desempenho por unidade e resultado final de cada turma."
        dados={[{ rotulo: "Turmas", valor: turmas.length }]}
      />

      <ListaDeTurmas
        turmas={turmas.map((t) => ({ id: t.id, nome: t.nome, curso: t.curso || "Ensino médio", turno: t.turno, estudantes: t._count?.estudantes }))}
        href={(t) => `/dashboard/resultados/${t.id}`}
        nomeExportacao="Resultados - turmas"
        acaoLinha="Ver resultados"
      />

      {/* Main Content */}
      <main className="space-y-4 pt-2 pb-8 md:hidden">
        
        {/* Dica de Uso */}
        <div className="hidden bg-subtle border border-line rounded-lg p-5 items-start gap-4 md:flex">
          <div className="bg-surface p-2 rounded-xl border border-line flex-shrink-0 text-fg-subtle">
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
        <div className="bg-surface p-4 rounded-2xl border border-line flex flex-wrap gap-4 items-end relative overflow-hidden md:p-4 md:gap-4">
            
            <div className="flex-1 min-w-[min(100%,200px)] space-y-2">
                <label className="text-xs font-medium text-fg-subtle ml-2">Curso</label>
                <select 
                    value={filterCurso}
                    onChange={(e) => setFilterCurso(e.target.value)}
                    className="w-full bg-canvas hover:bg-subtle-hover border-none rounded-lg px-4 py-3 text-base md:px-4 md:py-4 md:text-sm focus:ring-2 focus:ring-zinc-500 transition-all appearance-none cursor-pointer font-medium text-fg-muted"
                >
                    <option value="">Todos os Cursos</option>
                    {uniqueCursos.map((c: any) => <option key={c} value={c}>{c}</option>)}
                </select>
            </div>

            <div className="flex-1 min-w-[min(100%,200px)] space-y-2">
                <label className="text-xs font-medium text-fg-subtle ml-2">Turno</label>
                <select 
                    value={filterTurno}
                    onChange={(e) => setFilterTurno(e.target.value)}
                    className="w-full bg-canvas hover:bg-subtle-hover border-none rounded-lg px-4 py-3 text-base md:px-4 md:py-4 md:text-sm focus:ring-2 focus:ring-zinc-500 transition-all appearance-none cursor-pointer font-medium text-fg-muted"
                >
                    <option value="">Todos os Turnos</option>
                    {uniqueTurnos.map((t: any) => <option key={t} value={t}>{t}</option>)}
                </select>
            </div>

            <div className="flex-[2] min-w-[min(100%,250px)] space-y-2">
                <label className="text-xs font-medium text-fg-subtle ml-2">Pesquisar Turma</label>
                <div className="relative group">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center bg-canvas rounded-lg text-fg-subtle group-focus-within:text-fg-muted group-focus-within:bg-subtle transition-all">
                        <Search size={18} />
                    </div>
                    <input 
                        type="text"
                        value={filterNome}
                        onChange={(e) => setFilterNome(e.target.value)}
                        placeholder="Ex: 1º Ano, Técnico em Enfermagem..."
                        className="w-full bg-canvas hover:bg-subtle-hover border-none rounded-lg pl-14 pr-4 py-3 text-base md:pr-6 md:py-4 md:text-sm focus:ring-2 focus:ring-zinc-500 transition-all font-medium text-fg-muted placeholder:text-fg-disabled"
                    />
                </div>
            </div>

            <div className="pb-2.5">
                <div className="flex items-center gap-2 bg-subtle px-4 py-2.5 rounded-lg border border-line">
                    <span className="w-2 h-2 rounded-full bg-zinc-500"></span>
                    <span className="text-xs font-semibold text-fg">{filteredTurmas.length} turmas mapeadas</span>
                </div>
            </div>
        </div>

        {/* Turmas Grid Style Premium */}
        <div className="md:bg-surface md:rounded-xl md: md:border md:border-line md:p-4">
          <div className="flex items-center justify-between mb-3 md:mb-4">
            <h2 className="text-xs font-semibold text-fg-subtle flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-subtle text-fg-muted flex items-center justify-center">
                <Users size={16} />
              </div>
              Selecione uma Turma para Detalhes
            </h2>
          </div>
          
          {filteredTurmas.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-canvas rounded-full flex items-center justify-center mx-auto mb-4">
                <Search className="w-8 h-8 text-fg-disabled" />
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
                  className="min-h-11 border border-line-strong rounded-2xl p-4 hover:border-zinc-500 hover:bg-subtle transition-all group bg-surface hover: h-full flex flex-col justify-between"
                >
                  <div>
                    <h3 className="font-semibold text-fg mb-2 break-words text-base tracking-tight">
                      {turma.nome}
                    </h3>
                    
                    <div className="space-y-1.5 text-sm text-fg-muted">
                      <div className="flex justify-between items-start gap-2">
                        <span className="min-w-0 break-words text-xs font-medium text-fg-subtle">{turma.curso || 'Ensino Médio'}</span>
                        {turma.turno && (
                          <span className="bg-subtle-hover/50 text-fg-muted text-xs font-medium px-1.5 py-0.5 rounded border border-line-strong/50 shrink-0">
                              {turma.turno}
                          </span>
                        )}
                      </div>
                      <div className="flex justify-between items-center pt-1 mt-1 border-t border-line">
                        <span className="text-xs font-medium text-fg-subtle">Estudantes</span>
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
