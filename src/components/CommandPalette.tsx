"use client"

import { useEffect, useId, useMemo, useRef, useState, type ComponentType } from "react"
import { createPortal } from "react-dom"
import { useRouter } from "next/navigation"
import { Search, Users, GraduationCap, CornerDownLeft, Loader2 } from "lucide-react"
import { buscarNaPaleta, type ResultadoPaleta } from "@/app/dashboard/paleta/actions"
import { combina } from "@/lib/services/busca"
import { cn } from "@/components/ui/cn"

export interface PaginaPaleta {
  nome: string
  rota: string
  grupo: string
  icone: ComponentType<{ size?: number; strokeWidth?: number; className?: string }>
}

interface Item {
  id: string
  grupo: string
  titulo: string
  detalhe?: string
  href: string
  icone: PaginaPaleta["icone"]
}

const VAZIO: ResultadoPaleta = { turmas: [], estudantes: [] }

/**
 * Paleta de comandos (Ctrl+K / ⌘K): páginas que o usuário pode abrir e, para a
 * gestão, turmas e estudantes da escola (busca no servidor, escola da sessão).
 */
export default function CommandPalette({ aberto, onFechar, paginas, buscarRegistros }: {
  aberto: boolean
  onFechar: () => void
  paginas: PaginaPaleta[]
  buscarRegistros: boolean
}) {
  const router = useRouter()
  const [termo, setTermo] = useState("")
  const [ativo, setAtivo] = useState(0)
  const [registros, setRegistros] = useState<ResultadoPaleta>(VAZIO)
  const [buscando, setBuscando] = useState(false)
  const entrada = useRef<HTMLInputElement>(null)
  const lista = useRef<HTMLUListElement>(null)
  const pedido = useRef(0)
  const listaId = useId()

  // Abre limpo e com o foco na busca
  useEffect(() => {
    if (!aberto) return
    setTermo("")
    setAtivo(0)
    setRegistros(VAZIO)
    requestAnimationFrame(() => entrada.current?.focus())
  }, [aberto])

  // Turmas e estudantes: só gestão, a partir de 2 letras, com pequena espera
  useEffect(() => {
    if (!aberto || !buscarRegistros || termo.trim().length < 2) {
      setRegistros(VAZIO)
      setBuscando(false)
      return
    }
    const meu = ++pedido.current
    setBuscando(true)
    const t = setTimeout(() => {
      buscarNaPaleta(termo)
        .then((r) => { if (pedido.current === meu) setRegistros(r) })
        .catch(() => { if (pedido.current === meu) setRegistros(VAZIO) })
        .finally(() => { if (pedido.current === meu) setBuscando(false) })
    }, 200)
    return () => clearTimeout(t)
  }, [termo, aberto, buscarRegistros])

  const itens = useMemo<Item[]>(() => {
    const pags = paginas
      .filter((p) => combina(`${p.nome} ${p.grupo}`, termo))
      .map((p) => ({ id: `p-${p.rota}`, grupo: "Páginas", titulo: p.nome, detalhe: p.grupo, href: p.rota, icone: p.icone }))
    const turmas = registros.turmas.map((t) => ({ id: `t-${t.id}`, grupo: "Turmas", titulo: t.nome, detalhe: t.curso ?? undefined, href: `/dashboard/turmas/${t.id}/relatorio`, icone: Users }))
    const estudantes = registros.estudantes.map((e) => ({ id: `e-${e.matricula}`, grupo: "Estudantes", titulo: e.nome, detalhe: `${e.matricula} · ${e.turma}`, href: `/dashboard/estudantes/${encodeURIComponent(e.matricula)}/boletim`, icone: GraduationCap }))
    return [...pags, ...turmas, ...estudantes]
  }, [paginas, termo, registros])

  useEffect(() => { setAtivo((a) => Math.min(a, Math.max(itens.length - 1, 0))) }, [itens.length])

  // Item ativo sempre visível
  useEffect(() => {
    lista.current?.querySelector<HTMLElement>(`[data-indice="${ativo}"]`)?.scrollIntoView({ block: "nearest" })
  }, [ativo])

  if (!aberto || typeof document === "undefined") return null

  const abrir = (item?: Item) => {
    if (!item) return
    onFechar()
    router.push(item.href)
  }

  const teclas = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setAtivo((a) => (itens.length ? (a + 1) % itens.length : 0)) }
    else if (e.key === "ArrowUp") { e.preventDefault(); setAtivo((a) => (itens.length ? (a - 1 + itens.length) % itens.length : 0)) }
    else if (e.key === "Enter") { e.preventDefault(); abrir(itens[ativo]) }
    else if (e.key === "Escape") { e.preventDefault(); onFechar() }
    else if (e.key === "Tab") e.preventDefault() // foco fica na busca
  }

  let grupoAnterior = ""

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-start justify-center px-4 pt-[12vh]">
      <div aria-hidden className="absolute inset-0 bg-black/40 animate-fade-in" onClick={onFechar} />
      <div role="dialog" aria-modal="true" aria-label="Busca rápida" className="relative w-full max-w-xl overflow-hidden rounded-xl border border-line bg-elevated shadow-overlay animate-pop-in">
        <div className="flex items-center gap-2 border-b border-line px-4">
          {buscando ? <Loader2 size={16} strokeWidth={1.75} className="shrink-0 animate-spin text-fg-subtle" aria-hidden /> : <Search size={16} strokeWidth={1.75} className="shrink-0 text-fg-subtle" aria-hidden />}
          <input
            ref={entrada}
            value={termo}
            onChange={(e) => { setTermo(e.target.value); setAtivo(0) }}
            onKeyDown={teclas}
            role="combobox"
            aria-expanded="true"
            aria-controls={listaId}
            aria-activedescendant={itens[ativo] ? `${listaId}-${ativo}` : undefined}
            aria-autocomplete="list"
            placeholder={buscarRegistros ? "Buscar página, turma ou estudante..." : "Buscar página..."}
            className="h-12 min-w-0 flex-1 bg-transparent text-sm text-fg outline-none placeholder:text-fg-subtle focus-visible:outline-none"
          />
          <kbd className="hidden rounded border border-line px-1.5 font-mono text-xs text-fg-subtle sm:inline">Esc</kbd>
        </div>

        <ul ref={lista} id={listaId} role="listbox" aria-label="Resultados" className="max-h-[50vh] overflow-y-auto p-1">
          {itens.length === 0 && (
            <li className="px-3 py-8 text-center text-13 text-fg-subtle">
              {buscando ? "Buscando..." : "Nada encontrado."}
            </li>
          )}
          {itens.map((item, i) => {
            const cabecalho = item.grupo !== grupoAnterior
            grupoAnterior = item.grupo
            const Icone = item.icone
            return (
              <li key={item.id} role="presentation">
                {cabecalho && <p role="presentation" className="px-3 pt-2 pb-1 text-xs font-medium text-fg-subtle">{item.grupo}</p>}
                <div
                  id={`${listaId}-${i}`}
                  role="option"
                  aria-selected={i === ativo}
                  data-indice={i}
                  onMouseMove={() => setAtivo(i)}
                  onClick={() => abrir(item)}
                  className={cn("flex h-9 cursor-pointer items-center gap-2.5 rounded-md px-3 text-13", i === ativo ? "bg-subtle text-fg" : "text-fg-muted")}
                >
                  <Icone size={16} strokeWidth={1.75} className="shrink-0 text-fg-subtle" />
                  <span className="truncate font-medium text-fg">{item.titulo}</span>
                  {item.detalhe && <span className="truncate text-xs text-fg-subtle">{item.detalhe}</span>}
                  {i === ativo && <CornerDownLeft size={14} strokeWidth={1.75} className="ml-auto shrink-0 text-fg-subtle" aria-hidden />}
                </div>
              </li>
            )
          })}
        </ul>
      </div>
    </div>,
    document.body
  )
}
