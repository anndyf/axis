"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useState } from "react"
import { signOut } from "next-auth/react"
import { KeyRound, LogOut, PanelLeftClose, PanelLeftOpen, UserRound, X, ChevronsUpDown, Clock, Blocks, Sun, Moon, Monitor, Search } from "lucide-react"
import { definirTema, temaValido, type Tema } from "@/lib/tema"
import { useSessionTimer } from "@/contexts/SessionTimerContext"
import { getUnreadCount } from "@/app/dashboard/mensagens/actions"
import { getPendingUsersCount } from "@/app/dashboard/usuarios/actions"
import { modulosVisiveis } from "@/lib/modules"
import { can } from "@/lib/rbac"
import CommandPalette from "@/components/CommandPalette"
import { Avatar } from "@/components/ui/Avatar"
import { Menu } from "@/components/ui/Menu"
import { cn } from "@/components/ui/cn"

interface User {
  name?: string | null
  email?: string | null
  isSuperuser: boolean
  isDirecao: boolean
  isStaff: boolean
  isAEE?: boolean
  isPlatformAdmin?: boolean
}

export interface EscolaDoMenu {
  nome: string
  logoUrl?: string | null
}

const GRUPOS_ORDENADOS = ["Início", "Gestão Acadêmica", "Diário e Avaliações", "Ferramentas", "Configurações", "Plataforma"]

export function papelDoUsuario(user: User) {
  return user.isSuperuser ? "Administrador" : user.isAEE ? "Especialista AEE" : user.isDirecao ? "Direção" : user.isStaff ? "Professor" : "Gestão escolar"
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
}: {
  user: User
  escola: EscolaDoMenu
  modulosAtivos?: string[]
  anoLetivo?: number
  isCollapsed: boolean
  toggleCollapse: () => void
  isMobileOpen: boolean
  closeMobile: () => void
}) {
  const pathname = usePathname()
  const [unreadCount, setUnreadCount] = useState(0)
  const [pendingUsersCount, setPendingUsersCount] = useState(0)
  const { timeLeft } = useSessionTimer()
  const [tema, setTema] = useState<Tema>("light")
  useEffect(() => { setTema(temaValido(document.documentElement.dataset.theme)) }, [])
  const escolherTema = (t: Tema) => { definirTema(t); setTema(t) }
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

  useEffect(() => {
    getUnreadCount().then(setUnreadCount)
    getPendingUsersCount().then(setPendingUsersCount)
    const interval = setInterval(() => {
      getUnreadCount().then(setUnreadCount)
      getPendingUsersCount().then(setPendingUsersCount)
    }, 30000)
    return () => clearInterval(interval)
  }, [])

  // Gaveta do celular fecha ao trocar de página
  useEffect(() => { closeMobile() }, [pathname]) // eslint-disable-line react-hooks/exhaustive-deps

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60)
    const s = Math.floor(seconds % 60)
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`
  }

  // Itens: permissão do papel E (sem exigência de plano OU módulo ativo na escola)
  const badgesPorModulo: Record<string, number> = { mensagens: unreadCount, usuarios: pendingUsersCount }
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
  const professor = user.isStaff && !user.isSuperuser && !user.isDirecao

  return (
    <>
      {isMobileOpen && <div className="fixed inset-0 z-40 bg-black/40 animate-fade-in md:hidden" onClick={closeMobile} aria-hidden />}

      <aside
        aria-label="Menu principal"
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex flex-col bg-sidebar text-sidebar-fg print:hidden",
          "transition-[width,transform] duration-150 ease-out",
          recolhido ? "w-16" : "w-64",
          isMobileOpen ? "translate-x-0 shadow-overlay" : "-translate-x-full md:translate-x-0"
        )}
      >
        {/* Escola */}
        <div className={cn("flex h-16 shrink-0 items-center gap-2 border-b border-sidebar-line", recolhido ? "justify-center px-2" : "px-4")}>
          <Link href="/dashboard" className="min-w-0 flex-1 rounded-md" title={recolhido ? escola.nome : undefined}>
            <MarcaEscola escola={escola} compacta={recolhido} escura subtitulo={anoLetivo ? `Ano letivo ${anoLetivo}` : "Gestão escolar"} />
          </Link>
          <button type="button" onClick={closeMobile} aria-label="Fechar menu" className="rounded-full p-1.5 text-sidebar-fg-muted hover:bg-sidebar-hover hover:text-sidebar-fg md:hidden">
            <X size={16} strokeWidth={1.75} />
          </button>
        </div>

        {/* Busca rápida */}
        <div className={cn("shrink-0 px-3 pt-4", recolhido && "flex justify-center")}>
          <button
            type="button"
            onClick={() => setPaletaAberta(true)}
            aria-label="Busca rápida (Ctrl+K)"
            title={recolhido ? "Busca rápida (Ctrl+K)" : undefined}
            className={cn(
              "flex h-9 items-center gap-2 rounded-full bg-sidebar-hover text-13 text-sidebar-fg-muted transition-colors duration-150 hover:bg-sidebar-active hover:text-sidebar-fg",
              recolhido ? "w-9 justify-center" : "w-full px-3"
            )}
          >
            <Search size={14} strokeWidth={1.75} aria-hidden />
            {!recolhido && <><span>Buscar...</span><kbd className="ml-auto font-mono text-xs text-sidebar-fg-subtle">Ctrl K</kbd></>}
          </button>
        </div>

        {/* Navegação */}
        <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-4">
          {menuGroups.map((group) => (
            <div key={group.title}>
              {!recolhido ? (
                <p className="mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-wider text-sidebar-fg-subtle">{group.title}</p>
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
                          "group relative flex h-10 items-center gap-3 rounded-full text-sm transition-colors duration-150",
                          recolhido ? "justify-center px-0" : "px-3",
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
        <div className="shrink-0 space-y-1 border-t border-sidebar-line p-3">
          {professor && !recolhido && (
            <p className={cn("flex items-center gap-1.5 px-2 text-[11px] tabular-nums", timeLeft < 300 ? "font-medium text-sidebar-fg" : "text-sidebar-fg-subtle")}>
              <Clock size={12} strokeWidth={1.75} aria-hidden /> Sessão expira em {formatTime(timeLeft)}
            </p>
          )}
          <Menu
            align="start"
            side="top"
            className="w-full"
            trigger={(p) => (
              <button
                {...p}
                type="button"
                title={recolhido ? user.name ?? undefined : undefined}
                className={cn("flex w-full items-center gap-2.5 rounded-xl p-2 text-left transition-colors duration-150 hover:bg-sidebar-hover", recolhido && "justify-center p-1.5")}
              >
                <Avatar nome={user.name} className="bg-sidebar-active text-sidebar-fg ring-sidebar-line" />
                {!recolhido && (
                  <>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-13 font-medium text-sidebar-fg">{user.name}</span>
                      <span className="block truncate text-xs text-sidebar-fg-subtle">{papelDoUsuario(user)}</span>
                    </span>
                    <ChevronsUpDown size={14} strokeWidth={1.75} className="shrink-0 text-sidebar-fg-subtle" aria-hidden />
                  </>
                )}
                {recolhido && <span className="sr-only">Menu do usuário</span>}
              </button>
            )}
            items={[
              { label: "Meu perfil", icon: UserRound, href: "/dashboard/perfil" },
              { label: "Trocar senha", icon: KeyRound, href: "/dashboard/perfil#senha" },
              ...(user.isSuperuser ? [{ label: "Componentes", icon: Blocks, href: "/dashboard/ui" }] : []),
              { label: "Tema claro", icon: Sun, marcado: tema === "light", separadorAntes: true, onSelect: () => escolherTema("light") },
              { label: "Tema escuro", icon: Moon, marcado: tema === "dark", onSelect: () => escolherTema("dark") },
              { label: "Tema do sistema", icon: Monitor, marcado: tema === "system", onSelect: () => escolherTema("system") },
              { label: "Sair", icon: LogOut, perigo: true, separadorAntes: true, onSelect: () => signOut({ redirectTo: "/login" }) },
            ]}
          />
          <button
            type="button"
            onClick={toggleCollapse}
            aria-label={isCollapsed ? "Expandir menu" : "Recolher menu"}
            title={isCollapsed ? "Expandir menu" : "Recolher menu"}
            className={cn("hidden h-9 w-full items-center gap-3 rounded-full px-3 text-13 text-sidebar-fg-subtle transition-colors duration-150 hover:bg-sidebar-hover hover:text-sidebar-fg md:flex", recolhido && "justify-center px-0")}
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
        buscarRegistros={!user.isAEE && can(user, "gestao")}
      />
    </>
  )
}
