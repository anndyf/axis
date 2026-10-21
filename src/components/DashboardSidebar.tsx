"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useState } from "react"
import { PanelLeftClose, PanelLeftOpen, X, Clock } from "lucide-react"
import { useSessionTimer } from "@/contexts/SessionTimerContext"
import { modulosVisiveis } from "@/lib/modules"
import { rotuloDoPapelPrincipal } from "@/lib/permissoes"
import { can, restritoADocencia, papeisDoUsuario } from "@/lib/rbac"
import CommandPalette from "@/components/CommandPalette"
import { cn } from "@/components/ui/cn"

interface User {
  name?: string | null
  email?: string | null
  isSuperuser: boolean
  isDirecao: boolean
  isStaff: boolean
  isAEE?: boolean
  isPlatformAdmin?: boolean
  papeis?: string[] | null
  permissoes?: string[] | null
}

export interface EscolaDoMenu {
  nome: string
  logoUrl?: string | null
}

const GRUPOS_ORDENADOS = ["Início", "Gestão acadêmica", "Diário e avaliações", "Ferramentas", "Configurações", "Plataforma"]

export function papelDoUsuario(user: User) {
  return rotuloDoPapelPrincipal(papeisDoUsuario(user))
}

/**
 * Marca da escola: logo (se houver) ou inicial. `escura`: sobre o menu
 * azul-marinho (logo em círculo claro com anel na cor da escola, texto branco).
 */
export function MarcaEscola({ escola, compacta, escura, subtitulo }: { escola: EscolaDoMenu; compacta?: boolean; escura?: boolean; subtitulo?: string }) {
  const tamanho = escura ? "size-9" : "size-7"
  return (
    <span className="flex min-w-0 items-center gap-2.5">
      {escola.logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={escola.logoUrl} alt="" className={cn(tamanho, "shrink-0 object-contain", escura ? "rounded-full bg-surface p-1 ring-2 ring-escola" : "rounded-md")} />
      ) : (
        <span aria-hidden className={cn(tamanho, "flex shrink-0 items-center justify-center font-semibold", escura ? "rounded-full bg-surface text-sm text-accent-fg ring-2 ring-escola" : "rounded-md bg-accent text-xs text-on-accent")}>
          {escola.nome.charAt(0).toUpperCase()}
        </span>
      )}
      {!compacta && (
        <span className="min-w-0">
          <span className={cn("block truncate text-sm font-semibold", escura ? "text-sidebar-fg" : "text-fg")}>{escola.nome}</span>
          {subtitulo && <span className={cn("block truncate text-xs", escura ? "text-sidebar-fg-subtle" : "text-fg-subtle")}>{subtitulo}</span>}
        </span>
      )}
    </span>
  )
}

/**
 * Menu lateral (modelo A): azul-marinho, rótulos de grupo pequenos, item
 * ativo em pílula translúcida com ponto. Itens e permissões vêm de src/lib/modules.ts;
 * recolhível no desktop, gaveta no celular (controlada pelo layout).
 */
export default function DashboardSidebar({
  user,
  escola,
  modulosAtivos = [],
  anoLetivo,
  isCollapsed,
  toggleCollapse,
  isMobileOpen,
  closeMobile,
  contagens = {},
}: {
  user: User
  escola: EscolaDoMenu
  modulosAtivos?: string[]
  anoLetivo?: number
  isCollapsed: boolean
  toggleCollapse: () => void
  isMobileOpen: boolean
  closeMobile: () => void
  /** mensagens não lidas e cadastros pendentes (o layout consulta) */
  contagens?: { mensagens?: number; usuarios?: number }
}) {
  const pathname = usePathname()
  const { timeLeft } = useSessionTimer()
  const [paletaAberta, setPaletaAberta] = useState(false)

  // Ctrl+K / ⌘K abre a busca rápida de qualquer tela do painel
  useEffect(() => {
    const atalho = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault()
        setPaletaAberta((a) => !a)
      }
    }
    window.addEventListener("keydown", atalho)
    return () => window.removeEventListener("keydown", atalho)
  }, [])

  // Gaveta do celular fecha ao trocar de página
  useEffect(() => { closeMobile() }, [pathname]) // eslint-disable-line react-hooks/exhaustive-deps

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60)
    const s = Math.floor(seconds % 60)
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`
  }

  // Itens: permissão do papel E (sem exigência de plano OU módulo ativo na escola)
  const badgesPorModulo: Record<string, number> = { mensagens: contagens.mensagens ?? 0, usuarios: contagens.usuarios ?? 0 }
  const menuGroups = GRUPOS_ORDENADOS.map((title) => ({
    title,
    links: modulosVisiveis(user, modulosAtivos)
      .filter((m) => m.grupo === title)
      .map((m) => ({ name: m.nome, href: m.rota, icon: m.icone, badge: badgesPorModulo[m.id] })),
  })).filter((group) => group.links.length > 0)

  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === href
    // "Lançar Notas" fica ativo em /dashboard/notas/*, menos na recuperação
    if (href === "/dashboard/notas") {
      return pathname === "/dashboard/notas" || (pathname.startsWith("/dashboard/notas/") && !pathname.startsWith("/dashboard/notas/recuperacao"))
    }
    return pathname.startsWith(href)
  }

  const recolhido = isCollapsed && !isMobileOpen
  const professor = restritoADocencia(user)

  return (
    <>
      {isMobileOpen && <div className="fixed inset-0 z-40 bg-black/40 animate-fade-in md:hidden" onClick={closeMobile} aria-hidden />}

      <aside
        aria-label="Menu principal"
        className={cn(
          // Celular: navegação pela barra inferior; o menu lateral só existe a partir de md
          "fixed inset-y-0 left-0 z-50 flex-col bg-sidebar",
          isMobileOpen ? "flex" : "hidden md:flex",
          "text-sidebar-fg print:hidden",
          "transition-[width,transform] duration-150 ease-out",
          recolhido ? "w-16" : "w-64",
          isMobileOpen ? "translate-x-0 shadow-overlay" : "-translate-x-full md:translate-x-0"
        )}
      >
        {/* Escola */}
        <div className={cn("flex h-barra shrink-0 items-center gap-2 border-b border-sidebar-line", recolhido ? "justify-center px-2" : "px-3")}>
          <Link href="/dashboard" className="min-w-0 flex-1 rounded-md" title={recolhido ? escola.nome : undefined}>
            <MarcaEscola escola={escola} compacta={recolhido} escura subtitulo="Gestão escolar" />
          </Link>
          <button type="button" onClick={closeMobile} aria-label="Fechar menu" className="rounded-full p-1.5 text-sidebar-fg-muted hover:bg-sidebar-hover hover:text-sidebar-fg md:hidden">
            <X size={16} strokeWidth={1.75} />
          </button>
        </div>

        {/* Navegação */}
        <nav className="flex-1 space-y-4 overflow-y-auto px-2.5 py-3">
          {menuGroups.map((group) => (
            <div key={group.title}>
              {!recolhido ? (
                <p className="mb-1 px-2.5 text-xs font-medium text-sidebar-fg-subtle">{group.title}</p>
              ) : (
                <div className="mx-2 mb-2 h-px bg-sidebar-line first:hidden" aria-hidden />
              )}
              <ul className="space-y-0.5">
                {group.links.map((link) => {
                  const Icon = link.icon
                  const active = isActive(link.href)
                  return (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        title={recolhido ? link.name : undefined}
                        aria-current={active ? "page" : undefined}
                        className={cn(
                          "group relative flex h-8 items-center gap-2.5 rounded-md text-13 transition-colors duration-150",
                          recolhido ? "justify-center px-0" : "px-2.5",
                          active ? "bg-sidebar-active font-medium text-sidebar-fg" : "text-sidebar-fg-muted hover:bg-sidebar-hover hover:text-sidebar-fg"
                        )}
                      >
                        <Icon size={16} strokeWidth={1.75} className={cn("shrink-0", active ? "text-sidebar-fg" : "text-sidebar-fg-subtle group-hover:text-sidebar-fg")} />
                        {!recolhido && <span className="min-w-0 flex-1 truncate">{link.name}</span>}
                        {active && !recolhido && !(link.badge && link.badge > 0) && <span aria-hidden className="size-1.5 shrink-0 rounded-full bg-sidebar-fg" />}
                        {link.badge !== undefined && link.badge > 0 && (
                          <span className={cn(
                            "rounded-full bg-surface px-1.5 text-[10px] font-semibold leading-4 text-accent-fg tabular-nums",
                            recolhido ? "absolute right-0.5 top-0.5" : "shrink-0"
                          )}>
                            {link.badge}
                            <span className="sr-only"> novos</span>
                          </span>
                        )}
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}
        </nav>

        {/* Usuário */}
        <div className="shrink-0 space-y-1 border-t border-sidebar-line p-2.5">
          {professor && !recolhido && (
            <p className={cn("flex items-center gap-1.5 px-2 text-[11px] tabular-nums", timeLeft < 300 ? "font-medium text-sidebar-fg" : "text-sidebar-fg-subtle")}>
              <Clock size={12} strokeWidth={1.75} aria-hidden /> Sessão expira em {formatTime(timeLeft)}
            </p>
          )}
          <button
            type="button"
            onClick={toggleCollapse}
            aria-label={isCollapsed ? "Expandir menu" : "Recolher menu"}
            title={isCollapsed ? "Expandir menu" : "Recolher menu"}
            className={cn("hidden h-8 w-full items-center gap-2.5 rounded-md px-2.5 text-13 text-sidebar-fg-subtle transition-colors duration-150 hover:bg-sidebar-hover hover:text-sidebar-fg md:flex", recolhido && "justify-center px-0")}
          >
            {isCollapsed ? <PanelLeftOpen size={16} strokeWidth={1.75} /> : <PanelLeftClose size={16} strokeWidth={1.75} />}
            {!recolhido && "Recolher"}
          </button>
        </div>
      </aside>

      <CommandPalette
        aberto={paletaAberta}
        onFechar={() => setPaletaAberta(false)}
        paginas={modulosVisiveis(user, modulosAtivos).map((m) => ({ nome: m.nome, rota: m.rota, grupo: m.grupo, icone: m.icone }))}
        buscarRegistros={!can(user, "aee.atender") && can(user, "estudante.ler")}
      />
    </>
  )
}
