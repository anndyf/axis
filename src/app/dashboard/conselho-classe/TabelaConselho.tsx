"use client"

import { Badge } from "@/components/ui"
import ListaDeTurmas from "@/components/listas/ListaDeTurmas"

interface TurmaDoConselho {
  id: string
  nome: string
  curso: string
  turno: string
  totalAlunosPendentes: number
  totalAlunosResolvidos: number
  isResolvido: boolean
}

/** Conselho de classe no desktop: turmas com estudantes pendentes e resolvidos. */
export default function TabelaConselho({ turmas }: { turmas: TurmaDoConselho[] }) {
  return (
    <ListaDeTurmas
      turmas={turmas.map((t) => ({ ...t, turno: t.turno === "Não Definido" ? null : t.turno }))}
      href={(t) => `/dashboard/conselho-classe/${t.id}`}
      nomeExportacao="Conselho de classe"
      acaoLinha="Abrir conselho"
      extras={[
        { titulo: "Pendentes", numeric: true, valor: (t) => <span className={t.totalAlunosPendentes > 0 ? "font-medium text-danger-fg" : "text-fg-muted"}>{t.totalAlunosPendentes}</span>, csv: (t) => t.totalAlunosPendentes },
        { titulo: "Resolvidos", numeric: true, valor: (t) => <span className="text-fg-muted">{t.totalAlunosResolvidos}</span>, csv: (t) => t.totalAlunosResolvidos },
        { titulo: "Situação", valor: (t) => t.isResolvido ? <Badge tone="success" dot>Concluído</Badge> : <Badge tone="warning" dot>Com pendência</Badge>, csv: (t) => (t.isResolvido ? "Concluído" : "Com pendência") },
      ]}
    />
  )
}
