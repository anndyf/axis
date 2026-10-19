"use client"

import Link from "next/link"
import { useEffect, useState, type ReactNode } from "react"
import { Bell, House, Menu as MenuIcon, MessageSquare, X, type LucideIcon } from "lucide-react"
import { modulosVisiveis, MODULOS } from "@/lib/modules"
import type { RbacUser } from "@/lib/rbac"
import type { ModeloPainel, PerfilPainel } from "@/lib/services/painel-perfil"
import { cn } from "@/components/ui/cn"

const GRUPOS = ["Início", "Gestão Acadêmica", "Diário e Avaliações", "Ferramentas", "Configurações"]

/** Itens da navegação inferior (modelo B, celular), por perfil; só os que o usuário pode abrir. */
const INFERIOR: Record<PerfilPainel, string[]> = {
  professor: ["chamada", "notas"],
  pedagogia: ["aee", "ocorrencias", "conselho-classe"],
  administracao: ["turmas", "usuarios", "resultados"],
}

function iniciais(nome?: string | null) {
  const p = (nome ?? "").trim().split(/\s+/).filter(Boolean)
  return p.length ? ((p[0][0] ?? "") + (p.length > 1 ? p[p.length - 1][0] : "")).toUpperCase() : "?"
}

export default function Casca({ modelo, perfil, user, nome, escola, anoLetivo, modulosAtivos, inicioHref, children }: {
  modelo: ModeloPainel
  perfil: PerfilPainel
  user: RbacUser
  nome: string
  escola: string
  anoLetivo: number
  modulosAtivos: string[]
  inicioHref: string
  children: ReactNode
}) {
  const [aberto, setAberto] = useState(false)
  useEffect(() => {
    if (!aberto) return
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setAberto(false)
    window.addEventListener("keydown", esc)
    return () => window.removeEventListener("keydown", esc)
  }, [aberto])

  const visiveis = modulosVisiveis(user, modulosAtivos)
  const grupos = GRUPOS.map((g) => ({ g, itens: visiveis.filter((m) => m.grupo === g) })).filter((x) => x.itens.length)
  const inferior = INFERIOR[perfil].map((id) => visiveis.find((m) => m.id === id)).filter((m): m is (typeof MODULOS)[number] => !!m).slice(0, 2)

  const menu = (
    <>
      <div className="flex shrink-0 items-start gap-3 border-b border-(--m-side-line) px-5 py-4">
        <span className="min-w-0 flex-1">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={modelo === "a" ? "/images/logo_axis_branco.png" : "/images/logo_axis_azul.png"} alt="Áxis" className="h-6 w-auto max-w-full" />
          <span className="mt-2 block truncate text-xs text-(--m-side-subtle)">{escola} · {anoLetivo}</span>
        </span>
        <button type="button" onClick={() => setAberto(false)} aria-label="Fechar menu" className="rounded-full p-1.5 text-(--m-side-muted) hover:bg-(--m-side-hover) lg:hidden">
          <X size={18} strokeWidth={1.75} />
        </button>
      </div>
      <nav aria-label="Menu principal" className="flex-1 space-y-5 overflow-y-auto px-3 py-4">
        {grupos.map(({ g, itens }) => (
          <div key={g}>
            <p className="mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-wider text-(--m-side-subtle)">{g}</p>
            <ul className="space-y-0.5">
              {itens.map((m) => {
                const ativo = m.id === "dashboard"
                const Icone = m.icone
                return (
                  <li key={m.id}>
                    <Link
                      href={ativo ? inicioHref : m.rota}
                      aria-current={ativo ? "page" : undefined}
                      className={cn(
                        "flex h-10 min-w-0 items-center gap-3 px-3 text-sm transition-colors duration-150",
                        modelo === "a" ? "rounded-full" : "rounded-(--m-radius-sm)",
                        ativo ? "bg-(--m-side-active) font-medium text-(--m-side-active-fg)" : "text-(--m-side-muted) hover:bg-(--m-side-hover) hover:text-(--m-side-fg)"
                      )}
                    >
                      <Icone size={16} strokeWidth={1.75} className="shrink-0" aria-hidden />
                      <span className="min-w-0 flex-1 truncate">{m.nome}</span>
                      {ativo && modelo === "a" && <span aria-hidden className="size-1.5 shrink-0 rounded-full bg-(--m-side-fg)" />}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </nav>
      <div className="flex shrink-0 items-center gap-3 border-t border-(--m-side-line) px-5 py-4">
        <span aria-hidden className="flex size-9 shrink-0 items-center justify-center rounded-full bg-(--m-side-active) text-xs font-semibold text-(--m-side-active-fg)">{iniciais(nome)}</span>
        <span className="min-w-0">
          <span className="block truncate text-13 font-medium text-(--m-side-fg)">{nome}</span>
          <span className="block truncate text-xs text-(--m-side-subtle)">{escola}</span>
        </span>
      </div>
    </>
  )

  const classeMenu = "flex flex-col bg-(--m-side-bg) border-r border-(--m-side-border)"

  return (
    <div data-pagina-modelo className={cn("modelo fixed inset-0 z-[60] overflow-y-auto bg-(--m-canvas) text-(--m-fg)", modelo === "a" ? "modelo-a" : "modelo-b")}>
      <aside className={cn(classeMenu, "fixed inset-y-0 left-0 z-10 hidden w-64 lg:flex")}>{menu}</aside>

      {aberto && (
        <div className="fixed inset-0 z-30 lg:hidden">
          <div className="absolute inset-0 bg-(--m-overlay)" onClick={() => setAberto(false)} aria-hidden />
          <aside role="dialog" aria-modal="true" aria-label="Menu" className={cn(classeMenu, "absolute inset-y-0 left-0 w-72 max-w-[85%]")}>{menu}</aside>
        </div>
      )}

      <div className="min-w-0 lg:pl-64">
        <header className={cn("sticky top-0 z-20 border-b border-(--m-line) bg-(--m-surface)", modelo === "b" && "lg:border-0 lg:bg-(--m-canvas)")}>
          <div className="mx-auto flex min-h-16 max-w-[1280px] items-center gap-3 px-4 py-3 sm:px-6 lg:px-8">
            <button type="button" onClick={() => setAberto(true)} aria-label="Abrir menu" className={cn("-ml-1 rounded-full p-2 text-(--m-fg-muted) hover:bg-(--m-subtle) lg:hidden", modelo === "b" && "hidden")}>
              <MenuIcon size={20} strokeWidth={1.75} />
            </button>
            {modelo === "a" ? (
              <div className="min-w-0 flex-1">
                <p className="truncate text-13 text-(--m-fg-subtle)">Boas-vindas de volta,</p>
                <p className="truncate text-lg font-semibold leading-tight text-(--m-fg) sm:text-xl">{nome}</p>
              </div>
            ) : (
              <div className="flex min-w-0 flex-1 items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/images/logo_axis_azul.png" alt="Áxis" className="h-5 w-auto shrink-0 lg:hidden" />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold text-(--m-fg)">{escola}</span>
                  <span className="block truncate text-xs text-(--m-fg-subtle)">Painel · ano letivo {anoLetivo}</span>
                </span>
              </div>
            )}
            <Link href="/dashboard/mensagens" aria-label="Mensagens e comunicados" className="shrink-0 rounded-full p-2 text-(--m-fg-muted) hover:bg-(--m-subtle) hover:text-(--m-fg)">
              <Bell size={20} strokeWidth={1.75} />
            </Link>
            <Link href="/dashboard/perfil" aria-label="Meu perfil" className="flex size-10 shrink-0 items-center justify-center rounded-full bg-(--m-accent) text-sm font-semibold text-(--m-on-accent)">
              {iniciais(nome)}
            </Link>
          </div>
        </header>

        <main className={cn("mx-auto max-w-[1280px] space-y-8 px-4 py-6 sm:px-6 lg:px-8 lg:py-8", modelo === "b" && "pb-28 lg:pb-8")}>{children}</main>
      </div>

      {modelo === "b" && (
        <nav aria-label="Navegação rápida" className="fixed inset-x-0 bottom-0 z-20 border-t border-(--m-line) bg-(--m-surface) pb-[env(safe-area-inset-bottom)] lg:hidden">
          <ul className="mx-auto grid max-w-md" style={{ gridTemplateColumns: `repeat(${inferior.length + 3}, minmax(0, 1fr))` }}>
            {([
              { rotulo: "Início", href: inicioHref, icone: House, ativo: true },
              ...inferior.map((m) => ({ rotulo: m.nome.split(" ")[0], href: m.rota, icone: m.icone as LucideIcon, ativo: false })),
              { rotulo: "Mensagens", href: "/dashboard/mensagens", icone: MessageSquare, ativo: false },
            ]).map((i) => (
              <li key={i.href} className="min-w-0">
                <Link href={i.href} aria-current={i.ativo ? "page" : undefined} className={cn("flex h-16 min-w-0 flex-col items-center justify-center gap-1 text-[11px] font-medium", i.ativo ? "text-(--m-accent-fg)" : "text-(--m-fg-subtle)")}>
                  <i.icone size={20} strokeWidth={1.75} aria-hidden />
                  <span className="max-w-full truncate px-1">{i.rotulo}</span>
                  <span aria-hidden className={cn("h-1 w-5 rounded-full", i.ativo ? "bg-(--m-accent)" : "bg-transparent")} />
                </Link>
              </li>
            ))}
            <li className="min-w-0">
              <button type="button" onClick={() => setAberto(true)} className="flex h-16 w-full min-w-0 flex-col items-center justify-center gap-1 text-[11px] font-medium text-(--m-fg-subtle)">
                <MenuIcon size={20} strokeWidth={1.75} aria-hidden />
                <span>Menu</span>
                <span aria-hidden className="h-1 w-5" />
              </button>
            </li>
          </ul>
        </nav>
      )}
    </div>
  )
}
