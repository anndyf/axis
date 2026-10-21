"use client"

import { usePathname, useSearchParams } from "next/navigation"
import { useEffect, useState } from "react"
import Link from "next/link"
import { signOut } from "next-auth/react"
import { ArrowLeft, Bell, Blocks, CalendarDays, ChevronDown, KeyRound, LogOut, Monitor, Moon, Search, Sun, UserRound } from "lucide-react"
import { migalhasDaRota, telaAnterior } from "@/lib/navegacao-migalhas"
import type { EscolaDoMenu } from "@/components/DashboardSidebar"
import { Avatar } from "@/components/ui/Avatar"
import { Menu } from "@/components/ui/Menu"
import { definirTema, temaValido, type Tema } from "@/lib/tema"
import { ROTULO_VISAO, type VisaoPainel } from "@/lib/services/painel-visoes"

export interface ContextoTopbar {
  escola: EscolaDoMenu
  anoLetivo?: number
  papel: string
  visoes: VisaoPainel[]
  naoLidas: number
  podeVerComponentes: boolean
}

/**
 * Barra superior.
 * Desktop (48px): contexto de trabalho à esquerda (escola, ano letivo só
 * exibido, perfil/visão do painel) e, à direita, busca (Ctrl+K),
 * notificações e menu do usuário. O caminho da tela fica no cabeçalho de
 * cada página.
 * Celular (sem mudança): avatar no início (telas raiz) ou botão voltar
 * (subtelas), título da tela e mensagens.
 */
export default function DashboardTopbar({ nome, raizes = [], contexto }: { nome?: string | null; raizes?: string[]; contexto: ContextoTopbar }) {
  const pathname = usePathname()
  const params = useSearchParams()
  const migalhas = migalhasDaRota(pathname)
  const voltar = telaAnterior(pathname, params.size > 0, raizes)
  const [tema, setTema] = useState<Tema>("light")
  useEffect(() => { setTema(temaValido(document.documentElement.dataset.theme)) }, [])
  const escolherTema = (t: Tema) => { definirTema(t); setTema(t) }
  const abrirBusca = () => window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", ctrlKey: true }))

  const visaoAtual = pathname === "/dashboard"
    ? ((contexto.visoes as string[]).includes(params.get("visao") ?? "") ? params.get("visao") : contexto.visoes[0])
    : null

  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-2 border-b border-line bg-surface/90 px-2 backdrop-blur supports-[backdrop-filter]:bg-surface/80 md:h-barra md:gap-3 md:bg-surface md:px-pagina md:backdrop-blur-none print:hidden">
      {/* Celular */}
      {voltar ? (
        <Link href={voltar} aria-label="Voltar" className="flex size-11 shrink-0 items-center justify-center rounded-full text-fg-muted hover:bg-subtle hover:text-fg md:hidden">
          <ArrowLeft size={20} strokeWidth={1.75} />
        </Link>
      ) : (
        <Link href="/dashboard/perfil" aria-label="Meu perfil" className="flex size-11 shrink-0 items-center justify-center rounded-full md:hidden">
          <Avatar nome={nome} size="md" tom="destaque" />
        </Link>
      )}
      <span className="min-w-0 flex-1 truncate text-base font-semibold text-fg md:hidden" title={migalhas.at(-1)?.label}>{migalhas.at(-1)?.label}</span>

      {/* Desktop: contexto de trabalho */}
      <div className="hidden min-w-0 flex-1 items-center gap-3 text-13 md:flex" aria-label="Contexto de trabalho">
        <span className="min-w-0 truncate font-semibold text-fg" title={contexto.escola.nome}>{contexto.escola.nome}</span>
        {contexto.anoLetivo && (
          <>
            <span aria-hidden className="h-4 w-px shrink-0 bg-line" />
            <span className="inline-flex shrink-0 items-center gap-1.5 text-fg-muted">
              <CalendarDays size={14} strokeWidth={1.75} aria-hidden className="text-fg-subtle" />
              Ano letivo <span className="font-medium tabular-nums text-fg">{contexto.anoLetivo}</span>
            </span>
          </>
        )}
        <span aria-hidden className="h-4 w-px shrink-0 bg-line" />
        {contexto.visoes.length > 1 ? (
          <Menu
            align="start"
            trigger={(p) => (
              <button {...p} type="button" className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md px-2 text-fg-muted transition-colors duration-150 hover:bg-subtle hover:text-fg">
                Perfil <span className="font-medium text-fg">{contexto.papel}</span>
                {visaoAtual && <span className="text-fg-subtle">· visão {ROTULO_VISAO[visaoAtual as VisaoPainel].toLowerCase()}</span>}
                <ChevronDown size={14} strokeWidth={1.75} aria-hidden />
              </button>
            )}
            items={contexto.visoes.map((v) => ({
              label: `Painel: visão ${ROTULO_VISAO[v].toLowerCase()}`,
              href: `/dashboard?visao=${v}`,
              marcado: v === visaoAtual,
            }))}
          />
        ) : (
          <span className="shrink-0 text-fg-muted">Perfil <span className="font-medium text-fg">{contexto.papel}</span></span>
        )}
      </div>

      <button
        type="button"
        onClick={abrirBusca}
        aria-label="Busca rápida (Ctrl+K)"
        className="hidden h-8 w-56 shrink-0 items-center gap-2 rounded-md border border-line bg-canvas px-2.5 text-13 text-fg-subtle transition-colors duration-150 hover:border-line-strong hover:text-fg-muted md:flex lg:w-64"
      >
        <Search size={14} strokeWidth={1.75} aria-hidden />
        <span>Buscar…</span>
        <kbd className="ml-auto rounded border border-line bg-surface px-1 font-mono text-[11px] text-fg-subtle">Ctrl K</kbd>
      </button>

      <Link
        href="/dashboard/mensagens"
        aria-label={contexto.naoLidas > 0 ? `Mensagens e comunicados (${contexto.naoLidas} não lidas)` : "Mensagens e comunicados"}
        className="relative flex size-11 shrink-0 items-center justify-center rounded-full text-fg-muted transition-colors duration-150 hover:bg-subtle hover:text-fg md:size-8 md:rounded-md"
      >
        <Bell size={20} strokeWidth={1.75} className="md:size-[18px]" />
        {contexto.naoLidas > 0 && (
          <span aria-hidden className="absolute right-1.5 top-1.5 min-w-4 rounded-full bg-danger px-1 text-center text-[10px] font-semibold leading-4 text-white tabular-nums md:-right-1 md:-top-1">
            {contexto.naoLidas > 99 ? "99+" : contexto.naoLidas}
          </span>
        )}
      </Link>

      <div className="hidden md:block">
      <Menu
        trigger={(p) => (
          <button {...p} type="button" className="flex h-8 shrink-0 items-center gap-2 rounded-md pl-1 pr-1.5 transition-colors duration-150 hover:bg-subtle">
            <Avatar nome={nome} size="sm" tom="destaque" />
            <span className="hidden max-w-40 truncate text-13 font-medium text-fg lg:inline">{nome}</span>
            <ChevronDown size={14} strokeWidth={1.75} aria-hidden className="text-fg-subtle" />
            <span className="sr-only">Menu do usuário</span>
          </button>
        )}
        items={[
          { label: "Meu perfil", icon: UserRound, href: "/dashboard/perfil" },
          { label: "Trocar senha", icon: KeyRound, href: "/dashboard/perfil#senha" },
          ...(contexto.podeVerComponentes ? [{ label: "Componentes", icon: Blocks, href: "/dashboard/ui" }] : []),
          { label: "Tema claro", icon: Sun, marcado: tema === "light", separadorAntes: true, onSelect: () => escolherTema("light") },
          { label: "Tema escuro", icon: Moon, marcado: tema === "dark", onSelect: () => escolherTema("dark") },
          { label: "Tema do sistema", icon: Monitor, marcado: tema === "system", onSelect: () => escolherTema("system") },
          { label: "Sair", icon: LogOut, perigo: true, separadorAntes: true, onSelect: () => signOut({ redirectTo: "/login" }) },
        ]}
      />
      </div>
    </header>
  )
}
