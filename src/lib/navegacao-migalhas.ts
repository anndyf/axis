import { MODULOS } from "@/lib/modules"
import type { Migalha } from "@/components/ui/PageHeader"

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

