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
    <div className="p-6 border-b border-zinc-300">
      {/* Top Row: Stats + Search */}
      <div className="flex flex-col md:flex-row gap-4 mb-4">
        {/* Total Card */}
        <div className="flex-shrink-0 bg-zinc-700 text-white rounded-lg px-6 py-3 flex items-center space-x-4 shadow-sm min-w-[200px]">
           <div className="p-2 bg-white/20 rounded-lg">
             {isPending ? (
               <Loader2 className="w-5 h-5 text-white animate-spin" />
             ) : (
               <Users className="w-5 h-5 text-white" />
             )}
           </div>
           <div>
             <p className="text-xs font-medium text-zinc-200 uppercase tracking-widest">
               {isPending ? 'Buscando...' : 'Total Encontrado'}
             </p>
             <p className="text-2xl font-medium leading-none">
               {isPending ? '--' : totalResults}
             </p>
           </div>
        </div>

        {/* Search Input */}
        <div className="flex-1 relative">
           <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
             {isPending ? (
               <Loader2 className="h-6 w-6 text-fg-subtle animate-spin" />
             ) : (
               <Search className="h-6 w-6 text-fg-subtle" />
             )}
           </div>
           <input
             type="text"
             placeholder="Buscar por nome ou matrícula..."
             className="block w-full pl-12 pr-4 py-4 h-full border border-zinc-300 rounded-lg leading-5 bg-zinc-50 placeholder-zinc-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-zinc-500/20 focus:border-zinc-500 sm:text-lg transition-all"
             value={search}
             onChange={(e) => setSearch(e.target.value)}
           />
        </div>
      </div>
      
      {/* Bottom Row: Filters + Clear */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {/* Curso Filter */}
        <div>
          <select
            className="block w-full pl-3 pr-10 py-2.5 text-sm border-zinc-300 focus:outline-none focus:ring-zinc-500 focus:border-zinc-500 rounded-lg"
            value={cursoId}
            onChange={(e) => handleCursoChange(e.target.value)}
          >
            <option value="">Cursos</option>
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
            className="block w-full pl-3 pr-10 py-2.5 text-sm border-zinc-300 focus:outline-none focus:ring-zinc-500 focus:border-zinc-500 rounded-lg"
            value={turno}
            onChange={(e) => handleTurnoChange(e.target.value)}
          >
            <option value="">Turnos</option>
            <option value="Matutino">Matutino</option>
            <option value="Vespertino">Vespertino</option>
            <option value="Noturno">Noturno</option>
          </select>
        </div>

        {/* Serie Filter */}
        <div>
          <select
            className="block w-full pl-3 pr-10 py-2.5 text-sm border-zinc-300 focus:outline-none focus:ring-zinc-500 focus:border-zinc-500 rounded-lg"
            value={serie}
            onChange={(e) => handleSerieChange(e.target.value)}
          >
            <option value="">Séries</option>
            <option value="1">1º Ano</option>
            <option value="2">2º Ano</option>
            <option value="3">3º Ano</option>
            <option value="4">4º Ano</option>
          </select>
        </div>

        {/* Turma Filter */}
        <div>
          <select
            className="block w-full pl-3 pr-10 py-2.5 text-sm border-zinc-300 focus:outline-none focus:ring-zinc-500 focus:border-zinc-500 rounded-lg disabled:bg-zinc-50 disabled:text-fg-subtle"
            value={turmaId}
            onChange={(e) => handleTurmaChange(e.target.value)}
            disabled={!cursoId && !turno && !serie && turmas.length > 50} 
          >
            <option value="">Turmas</option>
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
           className="flex items-center justify-center space-x-2 px-4 py-2 bg-zinc-200 hover:bg-zinc-300 text-fg-muted rounded-lg transition-colors font-medium border border-zinc-300"
           title="Limpar todos os filtros"
        >
           <FilterX className="w-4 h-4" />
           <span>Limpar</span>
        </button>
      </div>
    </div>
  )
}
