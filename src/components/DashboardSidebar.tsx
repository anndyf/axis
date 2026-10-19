"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useState } from "react"
import { signOut } from "next-auth/react"
import { KeyRound, LogOut, PanelLeftClose, PanelLeftOpen, UserRound, X, ChevronsUpDown, Clock, Blocks } from "lucide-react"
import { useSessionTimer } from "@/contexts/SessionTimerContext"
import { getUnreadCount } from "@/app/dashboard/mensagens/actions"
import { getPendingUsersCount } from "@/app/dashboard/usuarios/actions"
import { MODULOS } from "@/lib/modules"
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
}

export interface EscolaDoMenu {
  nome: string
  logoUrl?: string | null
}

const GRUPOS_ORDENADOS = ["Início", "Gestão Acadêmica", "Diário e Avaliações", "Ferramentas", "Configurações"]

export function papelDoUsuario(user: User) {
  return user.isSuperuser ? "Administrador" : user.isAEE ? "Especialista AEE" : user.isDirecao ? "Direção" : user.isStaff ? "Professor" : "Gestão escolar"
}

/** Marca da escola: logo (se houver) ou inicial na cor de destaque. */
export function MarcaEscola({ escola, compacta }: { escola: EscolaDoMenu; compacta?: boolean }) {
  return (
    <span className="flex min-w-0 items-center gap-2.5">
      {escola.logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={escola.logoUrl} alt="" className="size-7 shrink-0 rounded-md object-contain" />
      ) : (
        <span aria-hidden className="flex size-7 shrink-0 items-center justify-center rounded-md bg-accent text-xs font-semibold text-on-accent">
          {escola.nome.charAt(0).toUpperCase()}
        </span>
      )}
      {!compacta && <span className="truncate text-sm font-semibold text-fg">{escola.nome}</span>}
    </span>
  )
}

/**
 * Menu lateral (estilo Linear). Itens e permissões vêm de src/lib/modules.ts;
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
    links: MODULOS
      .filter((m) => m.grupo === title)
      .filter((m) => m.permissao(user as any))
      .filter((m) => !m.planoMinimo || modulosAtivos.includes(m.id))
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
      {isMobileOpen && <div className="fixed inset-0 z-40 bg-black/30 animate-fade-in md:hidden" onClick={closeMobile} aria-hidden />}

      <aside
        aria-label="Menu principal"
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex flex-col border-r border-line bg-canvas print:hidden",
          "transition-[width,transform] duration-150 ease-out",
          recolhido ? "w-14" : "w-60",
          isMobileOpen ? "translate-x-0 shadow-overlay" : "-translate-x-full md:translate-x-0"
        )}
      >
        {/* Escola */}
        <div className={cn("flex h-14 shrink-0 items-center gap-2 border-b border-line-subtle", recolhido ? "justify-center px-2" : "px-3")}>
          <Link href="/dashboard" className="min-w-0 flex-1 rounded-md" title={recolhido ? escola.nome : undefined}>
            <MarcaEscola escola={escola} compacta={recolhido} />
          </Link>
          {!recolhido && anoLetivo && <span className="shrink-0 rounded-md border border-line px-1.5 text-[11px] font-medium leading-5 text-fg-subtle tabular-nums">{anoLetivo}</span>}
          <button type="button" onClick={closeMobile} aria-label="Fechar menu" className="rounded-md p-1 text-fg-subtle hover:bg-subtle hover:text-fg md:hidden">
            <X size={16} strokeWidth={1.75} />
          </button>
        </div>

        {/* Navegação */}
        <nav className="flex-1 space-y-5 overflow-y-auto px-2 py-3">
          {menuGroups.map((group) => (
            <div key={group.title}>
              {!recolhido ? (
                <p className="mb-1 px-2 text-[11px] font-medium text-fg-subtle">{group.title}</p>
              ) : (
                <div className="mx-2 mb-2 h-px bg-line-subtle first:hidden" aria-hidden />
              )}
              <ul className="space-y-px">
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
                          recolhido ? "justify-center px-0" : "px-2",
                          active ? "bg-subtle font-medium text-fg" : "text-fg-muted hover:bg-subtle hover:text-fg"
                        )}
                      >
                        {active && <span aria-hidden className="absolute -left-2 top-1.5 bottom-1.5 w-0.5 rounded-full bg-accent" />}
                        <Icon size={16} strokeWidth={1.75} className={cn("shrink-0", active ? "text-accent" : "text-fg-subtle group-hover:text-fg-muted")} />
                        {!recolhido && <span className="truncate">{link.name}</span>}
                        {link.badge !== undefined && link.badge > 0 && (
                          <span className={cn(
                            "rounded-full bg-accent px-1.5 text-[10px] font-semibold leading-4 text-on-accent tabular-nums",
                            recolhido ? "absolute right-1 top-0.5" : "ml-auto"
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
        <div className="shrink-0 space-y-1 border-t border-line-subtle p-2">
          {professor && !recolhido && (
            <p className={cn("flex items-center gap-1.5 px-2 text-[11px] tabular-nums", timeLeft < 300 ? "text-warning-fg" : "text-fg-subtle")}>
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
                className={cn("flex w-full items-center gap-2.5 rounded-md p-1.5 text-left transition-colors duration-150 hover:bg-subtle", recolhido && "justify-center")}
              >
                <Avatar nome={user.name} size="sm" />
                {!recolhido && (
                  <>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-13 font-medium text-fg">{user.name}</span>
                      <span className="block truncate text-[11px] text-fg-subtle">{papelDoUsuario(user)}</span>
                    </span>
                    <ChevronsUpDown size={14} strokeWidth={1.75} className="shrink-0 text-fg-subtle" aria-hidden />
                  </>
                )}
                {recolhido && <span className="sr-only">Menu do usuário</span>}
              </button>
            )}
            items={[
              { label: "Meu perfil", icon: UserRound, href: "/dashboard/perfil" },
              { label: "Trocar senha", icon: KeyRound, href: "/dashboard/perfil#senha" },
              ...(user.isSuperuser ? [{ label: "Componentes", icon: Blocks, href: "/dashboard/ui" }] : []),
              { label: "Sair", icon: LogOut, perigo: true, separadorAntes: true, onSelect: () => signOut({ redirectTo: "/login" }) },
            ]}
          />
          <button
            type="button"
            onClick={toggleCollapse}
            aria-label={isCollapsed ? "Expandir menu" : "Recolher menu"}
            title={isCollapsed ? "Expandir menu" : "Recolher menu"}
            className={cn("hidden h-8 w-full items-center gap-2.5 rounded-md px-2 text-13 text-fg-subtle transition-colors duration-150 hover:bg-subtle hover:text-fg md:flex", recolhido && "justify-center px-0")}
          >
            {isCollapsed ? <PanelLeftOpen size={16} strokeWidth={1.75} /> : <PanelLeftClose size={16} strokeWidth={1.75} />}
            {!recolhido && "Recolher"}
          </button>
        </div>
      </aside>
    </>
  )
}
