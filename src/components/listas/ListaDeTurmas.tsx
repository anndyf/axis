"use client"

import Link from "next/link"
import { useMemo, useState, type ReactNode } from "react"
import { useRouter } from "next/navigation"
import { ChevronRight } from "lucide-react"
import { Painel, RodapeTabela, SeletorColunas, useColunasVisiveis, Table, TableContainer, TableEmpty, TBody, TD, TH, THead, TR, type DirecaoOrdem } from "@/components/ui"
import { BarraFerramentas } from "@/components/ui/BarraFerramentas"
import { Fichas } from "@/components/ui/Fichas"
import { baixarCSV } from "@/lib/navegador/csv"

export interface TurmaDaLista {
  id: string
  nome: string
  curso?: string | null
  turno?: string | null
  estudantes?: number | null
}

export interface ColunaExtra<T extends TurmaDaLista> {
  titulo: string
  numeric?: boolean
  valor: (t: T) => ReactNode
  /** texto para o CSV (padrão: o valor, se for texto ou número) */
  csv?: (t: T) => string | number | null | undefined
}

const rotuloTurno = (t?: string | null) => (t ? t.charAt(0).toUpperCase() + t.slice(1).toLowerCase() : "")

/**
 * Lista de turmas para escolher onde trabalhar (resultados, conselho,
 * lançamento de notas, recuperação): busca, filtro por turno com contagem,
 * ordenação, linha clicável e exportar. Só desktop: no celular cada tela
 * mantém os cartões que já tinha.
 */
export default function ListaDeTurmas<T extends TurmaDaLista>({ turmas, href, extras = [], nomeExportacao, acaoLinha = "Abrir", titulo, className }: {
  turmas: T[]
  href: (t: T) => string
  extras?: ColunaExtra<T>[]
  nomeExportacao: string
  acaoLinha?: string
  titulo?: ReactNode
  className?: string
}) {
  const router = useRouter()
  const [busca, setBusca] = useState("")
  const [turno, setTurno] = useState("")
  const [ordem, setOrdem] = useState<{ coluna: "nome" | "curso" | "estudantes"; direcao: DirecaoOrdem }>({ coluna: "nome", direcao: "asc" })
  const turnos = useMemo(() => Array.from(new Set(turmas.map((t) => rotuloTurno(t.turno)).filter(Boolean))), [turmas])
  const temEstudantes = turmas.some((t) => typeof t.estudantes === "number")

  const linhas = useMemo(() => {
    const termo = busca.trim().toLowerCase()
    const f = turmas.filter((t) =>
      (!turno || rotuloTurno(t.turno) === turno) &&
      (!termo || t.nome.toLowerCase().includes(termo) || (t.curso ?? "").toLowerCase().includes(termo)))
    const s = [...f].sort((a, b) =>
      ordem.coluna === "estudantes" ? (a.estudantes ?? 0) - (b.estudantes ?? 0)
        : ordem.coluna === "curso" ? (a.curso ?? "").localeCompare(b.curso ?? "", "pt-BR")
        : a.nome.localeCompare(b.nome, "pt-BR", { numeric: true }))
    return ordem.direcao === "asc" ? s : s.reverse()
  }, [turmas, busca, turno, ordem])
  const ordenar = (coluna: typeof ordem.coluna) => setOrdem((o) => ({ coluna, direcao: o.coluna === coluna && o.direcao === "asc" ? "desc" : "asc" }))
  const seta = (c: typeof ordem.coluna) => (ordem.coluna === c ? ordem.direcao : null)
  const sel = useColunasVisiveis(`turmas-${nomeExportacao}`, [
    { id: "curso", rotulo: "Curso" },
    { id: "turno", rotulo: "Turno" },
    ...(temEstudantes ? [{ id: "estudantes", rotulo: "Estudantes" }] : []),
    ...extras.map((e) => ({ id: e.titulo, rotulo: e.titulo })),
  ])
  const ver = sel.visivel
  const extrasVisiveis = extras.filter((e) => ver(e.titulo))
  const colunas = 2 + (ver("curso") ? 1 : 0) + (ver("turno") ? 1 : 0) + (temEstudantes && ver("estudantes") ? 1 : 0) + extrasVisiveis.length

  return (
    <Painel titulo={titulo} semRecuo className={className ?? "hidden md:block"}>
      <BarraFerramentas
        noPainel
        busca={{ valor: busca, onChange: setBusca, placeholder: "Buscar turma ou curso" }}
        filtros={turnos.length > 1 ? (
          <Fichas compactas rotulo="Turno" valor={turno} onChange={setTurno} opcoes={[
            { valor: "", rotulo: "Todos os turnos", contagem: turmas.length },
            ...turnos.map((t) => ({ valor: t, rotulo: t, contagem: turmas.filter((x) => rotuloTurno(x.turno) === t).length })),
          ]} />
        ) : undefined}
        acoes={<SeletorColunas {...sel} />}
        onExportar={() => baixarCSV(nomeExportacao, [
          { titulo: "Turma", valor: (t: T) => t.nome },
          ...(ver("curso") ? [{ titulo: "Curso", valor: (t: T) => t.curso }] : []),
          ...(ver("turno") ? [{ titulo: "Turno", valor: (t: T) => rotuloTurno(t.turno) }] : []),
          ...(temEstudantes && ver("estudantes") ? [{ titulo: "Estudantes", valor: (t: T) => t.estudantes }] : []),
          ...extrasVisiveis.map((e) => ({ titulo: e.titulo, valor: (t: T) => (e.csv ? e.csv(t) : (() => { const v = e.valor(t); return typeof v === "string" || typeof v === "number" ? v : "" })()) })),
        ], linhas)}
      />
      <TableContainer semBorda>
        <Table>
          <THead>
            <TR>
              <TH ordem={seta("nome")} onOrdenar={() => ordenar("nome")}>Turma</TH>
              {ver("curso") && <TH ordem={seta("curso")} onOrdenar={() => ordenar("curso")}>Curso</TH>}
              {ver("turno") && <TH>Turno</TH>}
              {temEstudantes && ver("estudantes") && <TH numeric ordem={seta("estudantes")} onOrdenar={() => ordenar("estudantes")}>Estudantes</TH>}
              {extrasVisiveis.map((e) => <TH key={e.titulo} numeric={e.numeric}>{e.titulo}</TH>)}
              <TH className="text-right"><span className="sr-only">{acaoLinha}</span></TH>
            </TR>
          </THead>
          <TBody>
            {linhas.map((t) => (
              <TR key={t.id} onClick={() => router.push(href(t))}>
                <TD><Link href={href(t)} onClick={(ev) => ev.stopPropagation()} className="font-medium text-fg hover:underline">{t.nome}</Link></TD>
                {ver("curso") && <TD className="text-fg-muted">{t.curso || "—"}</TD>}
                {ver("turno") && <TD className="text-fg-muted">{rotuloTurno(t.turno) || "—"}</TD>}
                {temEstudantes && ver("estudantes") && <TD numeric>{t.estudantes ?? "—"}</TD>}
                {extrasVisiveis.map((e) => <TD key={e.titulo} numeric={e.numeric}>{e.valor(t)}</TD>)}
                <TD className="w-0 whitespace-nowrap text-right text-13 text-fg-subtle">
                  <span className="inline-flex items-center gap-1">{acaoLinha}<ChevronRight size={14} strokeWidth={1.75} aria-hidden /></span>
                </TD>
              </TR>
            ))}
            {linhas.length === 0 && <TableEmpty colSpan={colunas}>Nenhuma turma encontrada com estes filtros.</TableEmpty>}
          </TBody>
        </Table>
      </TableContainer>
      <RodapeTabela total={linhas.length} singular="turma" plural="turmas" />
    </Painel>
  )
}
