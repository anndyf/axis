"use client"

import { usePathname } from "next/navigation"
import type { ReactNode } from "react"
import { Menu as MenuIcon } from "lucide-react"
import { MODULOS } from "@/lib/modules"
import { Breadcrumb, type Migalha } from "@/components/ui/PageHeader"
import { MarcaEscola, type EscolaDoMenu } from "@/components/DashboardSidebar"

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

export default function DashboardTopbar({ escola, onOpenMobile, acoes }: { escola: EscolaDoMenu; onOpenMobile: () => void; acoes?: ReactNode }) {
  const pathname = usePathname()
  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-3 border-b border-line bg-canvas/85 px-4 backdrop-blur supports-[backdrop-filter]:bg-canvas/75 md:px-6 print:hidden">
      <button type="button" onClick={onOpenMobile} aria-label="Abrir menu" className="-ml-1 rounded-md p-1.5 text-fg-muted hover:bg-subtle hover:text-fg md:hidden">
        <MenuIcon size={18} strokeWidth={1.75} />
      </button>
      <span className="md:hidden"><MarcaEscola escola={escola} compacta /></span>
      <Breadcrumb items={migalhasDaRota(pathname)} className="hidden min-w-0 flex-1 sm:block" />
      <span className="min-w-0 flex-1 truncate text-sm font-medium text-fg sm:hidden">{migalhasDaRota(pathname).at(-1)?.label}</span>
      {acoes && <div className="flex shrink-0 items-center gap-2">{acoes}</div>}
    </header>
  )
}
