"use client"

import { useRouter, useSearchParams, usePathname } from "next/navigation"
import { Search, GraduationCap, Users, FilterX } from "lucide-react"
import { useCallback, useState, useEffect, useTransition } from "react"
import { useDebounce } from "use-debounce"
import { Loader2 } from "lucide-react"

interface FilterProps {
  cursos: { id: string; nome: string }[]
  turmas: { id: string; nome: string; cursoId: string | null; turno: string | null; curso?: string | null; serie?: string | null }[]
  totalResults: number
}

export default function EstudantesFilter({ cursos, turmas, totalResults }: FilterProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [search, setSearch] = useState(searchParams.get("search") || "")
  const [cursoId, setCursoId] = useState(searchParams.get("cursoId") || "")
  const [turno, setTurno] = useState(searchParams.get("turno") || "")
  const [serie, setSerie] = useState(searchParams.get("serie") || "")
  const [turmaId, setTurmaId] = useState(searchParams.get("turmaId") || "")
  const [isPending, startTransition] = useTransition()
  
  // Debounce search
  const [debouncedSearch] = useDebounce(search, 300)

  // Filter available classes based on selected course and shift
  // Updated to handle hybrid course IDs (UUID or Legacy Name)
  const filteredTurmas = turmas.filter(t => {
    const matchCurso = cursoId 
      ? (t.cursoId === cursoId || t.curso === cursoId) 
      : true
    const matchTurno = turno ? t.turno === turno : true
    const matchSerie = serie ? t.serie?.includes(serie) : true
    return matchCurso && matchTurno && matchSerie
  })

  // Update URL when filters change
  const createQueryString = useCallback(
    (name: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString())
      if (value) {
        params.set(name, value)
      } else {
        params.delete(name)
      }
      return params.toString()
    },
    [searchParams]
  )

  // Effect for debounced search
  useEffect(() => {
    if (debouncedSearch !== (searchParams.get("search") || "")) {
      startTransition(() => {
        router.push(`?${createQueryString("search", debouncedSearch)}`)
      })
    }
  }, [debouncedSearch, router, createQueryString, searchParams])

  const handleCursoChange = (newCursoId: string) => {
    setCursoId(newCursoId)
    setTurmaId("") 
    
    const params = new URLSearchParams(searchParams.toString())
    if (newCursoId) params.set("cursoId", newCursoId)
    else params.delete("cursoId")
    params.delete("turmaId")
    
    startTransition(() => {
      router.push(`?${params.toString()}`)
    })
  }

  const handleTurnoChange = (newTurno: string) => {
    setTurno(newTurno)
    setTurmaId("")
    
    const params = new URLSearchParams(searchParams.toString())
    if (newTurno) params.set("turno", newTurno)
    else params.delete("turno")
    params.delete("turmaId")
    
    startTransition(() => {
      router.push(`?${params.toString()}`)
    })
  }

  const handleSerieChange = (newSerie: string) => {
    setSerie(newSerie)
    setTurmaId("")
    
    const params = new URLSearchParams(searchParams.toString())
    if (newSerie) params.set("serie", newSerie)
    else params.delete("serie")
    params.delete("turmaId")
    
    startTransition(() => {
      router.push(`?${params.toString()}`)
    })
  }

  const handleTurmaChange = (newTurmaId: string) => {
    setTurmaId(newTurmaId)
    startTransition(() => {
      router.push(`?${createQueryString("turmaId", newTurmaId)}`)
    })
  }

  const handleClearFilters = () => {
    setSearch("")
    setCursoId("")
    setTurno("")
    setSerie("")
    setTurmaId("")
    startTransition(() => {
      router.push(pathname)
    })
  }

  return (
    <div className="border-b border-line-subtle px-painel py-3 md:flex md:flex-wrap md:items-center md:gap-3 md:py-2.5">
      {/* Busca + total */}
      <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center md:mb-0">
        <div className="relative flex-1 md:w-64 md:flex-none">
           <label htmlFor="estudantes-busca" className="sr-only">Buscar por nome ou matrícula</label>
           <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-fg-subtle">
             {isPending ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} strokeWidth={1.75} />}
           </div>
           <input
             id="estudantes-busca"
             type="search"
             placeholder="Buscar por nome ou matrícula..."
             className="block w-full h-9 pl-9 pr-3 border border-line rounded-lg bg-surface text-sm md:h-8 md:text-13 text-fg placeholder:text-fg-subtle transition-colors duration-150 hover:border-line-strong focus:border-accent"
             value={search}
             onChange={(e) => setSearch(e.target.value)}
           />
        </div>
        <p className="flex shrink-0 items-center gap-1.5 text-13 text-fg-muted" role="status">
           <Users size={16} strokeWidth={1.75} className="text-fg-subtle" aria-hidden />
           {isPending ? 'Buscando...' : <><span className="font-semibold tabular-nums text-fg">{totalResults}</span> {totalResults === 1 ? 'estudante' : 'estudantes'}</>}
        </p>
      </div>

      {/* Bottom Row: Filters + Clear */}
      <div className="grid grid-cols-2 gap-2 md:flex md:flex-1 md:flex-wrap md:items-center">
        {/* Curso Filter */}
        <div>
          <select
            className="block w-full h-9 pl-3 pr-8 text-sm md:h-8 md:w-auto md:text-13 text-fg bg-surface border border-line rounded-lg transition-colors duration-150 hover:border-line-strong focus:border-accent"
            value={cursoId}
            onChange={(e) => handleCursoChange(e.target.value)}
          >
            <option value="">Todos os cursos</option>
            {cursos.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </select>
        </div>

        {/* Turno Filter */}
        <div>
          <select
            className="block w-full h-9 pl-3 pr-8 text-sm md:h-8 md:w-auto md:text-13 text-fg bg-surface border border-line rounded-lg transition-colors duration-150 hover:border-line-strong focus:border-accent"
            value={turno}
            onChange={(e) => handleTurnoChange(e.target.value)}
          >
            <option value="">Todos os turnos</option>
            <option value="Matutino">Matutino</option>
            <option value="Vespertino">Vespertino</option>
            <option value="Noturno">Noturno</option>
          </select>
        </div>

        {/* Serie Filter */}
        <div>
          <select
            className="block w-full h-9 pl-3 pr-8 text-sm md:h-8 md:w-auto md:text-13 text-fg bg-surface border border-line rounded-lg transition-colors duration-150 hover:border-line-strong focus:border-accent"
            value={serie}
            onChange={(e) => handleSerieChange(e.target.value)}
          >
            <option value="">Todas as séries</option>
            <option value="1">1º Ano</option>
            <option value="2">2º Ano</option>
            <option value="3">3º Ano</option>
            <option value="4">4º Ano</option>
          </select>
        </div>

        {/* Turma Filter */}
        <div>
          <select
            className="block w-full h-9 pl-3 pr-8 text-sm md:h-8 md:w-auto md:text-13 text-fg bg-surface border border-line rounded-lg transition-colors duration-150 hover:border-line-strong focus:border-accent disabled:bg-subtle disabled:text-fg-disabled"
            value={turmaId}
            onChange={(e) => handleTurmaChange(e.target.value)}
            disabled={!cursoId && !turno && !serie && turmas.length > 50} 
          >
            <option value="">Todas as turmas</option>
            {filteredTurmas.map((t) => (
              <option key={t.id} value={t.id}>
                {t.nome}
              </option>
            ))}
          </select>
        </div>
        
        {/* Clear Button */}
        <button 
           onClick={handleClearFilters}
           className="col-span-2 flex h-9 items-center md:h-8 justify-center gap-1.5 px-3 text-13 font-medium text-fg-muted rounded-lg transition-colors duration-150 hover:bg-subtle hover:text-fg"
           title="Limpar todos os filtros"
        >
           <FilterX size={16} strokeWidth={1.75} aria-hidden />
           <span>Limpar filtros</span>
        </button>
      </div>
    </div>
  )
}
