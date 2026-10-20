"use client"

import { usePathname, useSearchParams } from "next/navigation"
import type { ReactNode } from "react"
import Link from "next/link"
import { ArrowLeft, Bell } from "lucide-react"
import { MODULOS } from "@/lib/modules"
import { Breadcrumb, type Migalha } from "@/components/ui/PageHeader"
import type { EscolaDoMenu } from "@/components/DashboardSidebar"
import { Avatar } from "@/components/ui/Avatar"

// Rótulos de subpáginas conhecidas; segmentos que são ids não aparecem
const SEGMENTOS: Record<string, string> = {
  fazer: "Fazer chamada", diario: "Diário de classe", relatorio: "Relatório", boletim: "Boletim", horario: "Horário",
  editar: "Editar", novo: "Novo", nova: "Nova", lancar: "Lançamento", avaliacoes: "Minhas avaliações",
  calendario: "Calendário letivo", avaliacao: "Esquemas de avaliação", identidade: "Identidade visual", status: "Situação",
  ui: "Componentes", perfil: "Meu perfil", importar: "Importar", recuperacao: "Recuperação final", pendencias: "Pendências",
  "unificar-turmas": "Unificar turmas", responsaveis: "Responsáveis",
}

/** Migalhas a partir da rota: Início › módulo › subpágina. */
export function migalhasDaRota(pathname: string): Migalha[] {
  if (pathname === "/dashboard") return [{ label: "Início" }]
  const modulo = MODULOS.filter((m) => m.rota !== "/dashboard" && pathname.startsWith(m.rota)).sort((a, b) => b.rota.length - a.rota.length)[0]
  const migalhas: Migalha[] = [{ label: "Início", href: "/dashboard" }]
  let base = "/dashboard"
  if (modulo) {
    migalhas.push({ label: modulo.nome, href: modulo.rota })
    base = modulo.rota
  }
  const resto = pathname.slice(base.length).split("/").filter(Boolean)
  let caminho = base
  for (const seg of resto) {
    caminho += `/${seg}`
    if (SEGMENTOS[seg]) migalhas.push({ label: SEGMENTOS[seg], href: caminho })
  }
  migalhas[migalhas.length - 1] = { label: migalhas[migalhas.length - 1].label }
  return migalhas
}

/**
 * Tela anterior no celular. As telas da barra e do "Mais" são raízes (sem
 * voltar), a não ser com filtro na URL (ex.: um diário aberto volta para a
 * lista de diários); nas demais, a migalha de cima.
 */
export function telaAnterior(pathname: string, temParametros: boolean, raizes: string[]): string | null {
  if (raizes.includes(pathname)) return temParametros && pathname !== "/dashboard" ? pathname : null
  const m = migalhasDaRota(pathname)
  return m.length > 2 ? m[m.length - 2].href ?? null : null
}

/**
 * Barra superior. Desktop (modelo A): migalhas à esquerda; mensagens e
 * avatar à direita. Celular: cabeçalho enxuto de app - avatar no início
 * (telas raiz) ou botão voltar (subtelas), título da tela e mensagens.
 */
export default function DashboardTopbar({ nome, acoes, raizes = [] }: { escola?: EscolaDoMenu; nome?: string | null; acoes?: ReactNode; raizes?: string[] }) {
  const pathname = usePathname()
  const params = useSearchParams()
  const migalhas = migalhasDaRota(pathname)
  const voltar = telaAnterior(pathname, params.size > 0, raizes)
  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-2 border-b border-line bg-surface/90 px-2 backdrop-blur supports-[backdrop-filter]:bg-surface/80 md:h-16 md:gap-3 md:px-8 print:hidden">
      {voltar ? (
        <Link href={voltar} aria-label="Voltar" className="flex size-11 shrink-0 items-center justify-center rounded-full text-fg-muted hover:bg-subtle hover:text-fg md:hidden">
          <ArrowLeft size={20} strokeWidth={1.75} />
        </Link>
      ) : (
        <Link href="/dashboard/perfil" aria-label="Meu perfil" className="flex size-11 shrink-0 items-center justify-center rounded-full md:hidden">
          <Avatar nome={nome} size="md" tom="destaque" />
        </Link>
      )}
      <Breadcrumb items={migalhas} className="hidden min-w-0 flex-1 md:block" />
      <span className="min-w-0 flex-1 truncate text-base font-semibold text-fg md:hidden" title={migalhas.at(-1)?.label}>{migalhas.at(-1)?.label}</span>
      {acoes && <div className="flex shrink-0 items-center gap-2">{acoes}</div>}
      <Link href="/dashboard/mensagens" aria-label="Mensagens e comunicados" className="flex size-11 shrink-0 items-center justify-center rounded-full text-fg-muted transition-colors duration-150 hover:bg-subtle hover:text-fg md:size-10">
        <Bell size={20} strokeWidth={1.75} />
      </Link>
      <Link href="/dashboard/perfil" aria-label="Meu perfil" className="hidden shrink-0 rounded-full md:block">
        <Avatar nome={nome} size="lg" tom="destaque" />
      </Link>
    </header>
  )
}
