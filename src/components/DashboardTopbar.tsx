"use client"

import { usePathname } from "next/navigation"
import type { ReactNode } from "react"
import Link from "next/link"
import { Bell, Menu as MenuIcon } from "lucide-react"
import { MODULOS } from "@/lib/modules"
import { Breadcrumb, type Migalha } from "@/components/ui/PageHeader"
import { MarcaEscola, type EscolaDoMenu } from "@/components/DashboardSidebar"
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

/** Barra superior (modelo A): migalhas à esquerda; mensagens e avatar do usuário à direita. */
export default function DashboardTopbar({ escola, nome, onOpenMobile, acoes }: { escola: EscolaDoMenu; nome?: string | null; onOpenMobile: () => void; acoes?: ReactNode }) {
  const pathname = usePathname()
  return (
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-3 border-b border-line bg-surface/90 px-4 backdrop-blur supports-[backdrop-filter]:bg-surface/80 md:px-8 print:hidden">
      <button type="button" onClick={onOpenMobile} aria-label="Abrir menu" className="-ml-1 rounded-full p-2 text-fg-muted hover:bg-subtle hover:text-fg md:hidden">
        <MenuIcon size={20} strokeWidth={1.75} />
      </button>
      <span className="md:hidden"><MarcaEscola escola={escola} compacta /></span>
      <Breadcrumb items={migalhasDaRota(pathname)} className="hidden min-w-0 flex-1 sm:block" />
      <span className="min-w-0 flex-1 truncate text-sm font-medium text-fg sm:hidden">{migalhasDaRota(pathname).at(-1)?.label}</span>
      {acoes && <div className="flex shrink-0 items-center gap-2">{acoes}</div>}
      <Link href="/dashboard/mensagens" aria-label="Mensagens e comunicados" className="shrink-0 rounded-full p-2 text-fg-muted transition-colors duration-150 hover:bg-subtle hover:text-fg">
        <Bell size={20} strokeWidth={1.75} />
      </Link>
      <Link href="/dashboard/perfil" aria-label="Meu perfil" className="shrink-0 rounded-full">
        <Avatar nome={nome} size="lg" className="bg-accent text-on-accent ring-0" />
      </Link>
    </header>
  )
}
