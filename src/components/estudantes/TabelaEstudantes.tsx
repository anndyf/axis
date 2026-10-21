"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Accessibility, FileText, Pencil } from "lucide-react"
import { Badge, Painel, SeletorColunas, useColunasVisiveis, RodapeTabela, Table, TableContainer, TableEmpty, TBody, TD, TH, THead, TR, type DirecaoOrdem } from "@/components/ui"
import { BarraFerramentas } from "@/components/ui/BarraFerramentas"
import { baixarCSV } from "@/lib/navegador/csv"
import PortalActivationAction from "@/app/dashboard/estudantes/PortalActivationAction"

export interface LinhaEstudante {
  matricula: string
  nome: string
  turma: { id: string; nome: string }
  aeeProfile: { id: string } | null
  _count: { notas: number }
}

const acaoIcone = "flex size-8 items-center justify-center rounded-md text-fg-subtle transition-colors duration-150 hover:bg-subtle hover:text-fg"

/**
 * Tabela de estudantes (tela Estudantes e aba Estudantes da ficha da turma):
 * busca e ordenação no que já foi carregado, linha abre a ficha do
 * estudante, ações por linha (portal, editar, AEE, boletim) e exportar CSV.
 */
export default function TabelaEstudantes({ estudantes, portalUserIds, mostrarTurma, titulo, nomeExportacao, acoes, topo, semBusca, vazio }: {
  estudantes: LinhaEstudante[]
  /** conteúdo acima da barra (ex.: filtros da tela Estudantes) */
  topo?: React.ReactNode
  /** a tela já busca no servidor: só ordena e exporta aqui */
  semBusca?: boolean
  /** estado vazio próprio (substitui a tabela quando não há estudantes) */
  vazio?: React.ReactNode
  portalUserIds: string[]
  mostrarTurma?: boolean
  titulo?: string
  nomeExportacao: string
  acoes?: React.ReactNode
}) {
  const router = useRouter()
  const [busca, setBusca] = useState("")
  const [ordem, setOrdem] = useState<{ coluna: "nome" | "matricula" | "turma" | "notas"; direcao: DirecaoOrdem }>({ coluna: "nome", direcao: "asc" })
  const comPortal = useMemo(() => new Set(portalUserIds), [portalUserIds])

  const linhas = useMemo(() => {
    const termo = busca.trim().toLowerCase()
    const f = termo ? estudantes.filter((e) => e.nome.toLowerCase().includes(termo) || e.matricula.toLowerCase().includes(termo)) : estudantes
    const valor = (e: LinhaEstudante) => ordem.coluna === "notas" ? e._count.notas : ordem.coluna === "turma" ? e.turma.nome : e[ordem.coluna]
    const s = [...f].sort((a, b) => {
      const va = valor(a), vb = valor(b)
      return typeof va === "number" && typeof vb === "number" ? va - vb : String(va).localeCompare(String(vb), "pt-BR")
    })
    return ordem.direcao === "asc" ? s : s.reverse()
  }, [estudantes, busca, ordem])

  const ordenar = (coluna: typeof ordem.coluna) => setOrdem((o) => ({ coluna, direcao: o.coluna === coluna && o.direcao === "asc" ? "desc" : "asc" }))
  const seta = (coluna: typeof ordem.coluna) => (ordem.coluna === coluna ? ordem.direcao : null)
  const ficha = (e: LinhaEstudante) => `/dashboard/estudantes/${encodeURIComponent(e.matricula)}`
  const colunas = useColunasVisiveis("estudantes", [
    { id: "matricula", rotulo: "Matrícula" },
    ...(mostrarTurma ? [{ id: "turma", rotulo: "Turma" }] : []),
    { id: "notas", rotulo: "Notas lançadas" },
  ])
  const ver = colunas.visivel
  const totalColunas = 2 + (ver("matricula") ? 1 : 0) + (mostrarTurma && ver("turma") ? 1 : 0) + (ver("notas") ? 1 : 0)

  return (
    <Painel titulo={titulo} semRecuo acoes={titulo ? acoes : undefined}>
      {topo}
      {estudantes.length === 0 && vazio ? vazio : (<>
      <BarraFerramentas
        noPainel
        resumo={semBusca ? `${linhas.length} ${linhas.length === 1 ? "estudante" : "estudantes"}` : undefined}
        busca={semBusca ? undefined : { valor: busca, onChange: setBusca, placeholder: "Buscar por nome ou matrícula" }}
        acoes={<><SeletorColunas {...colunas} />{titulo ? undefined : acoes}</>}
        onExportar={() => baixarCSV(nomeExportacao, [
          { titulo: "Nome", valor: (e: LinhaEstudante) => e.nome },
          ...(ver("matricula") ? [{ titulo: "Matrícula", valor: (e: LinhaEstudante) => e.matricula }] : []),
          ...(mostrarTurma && ver("turma") ? [{ titulo: "Turma", valor: (e: LinhaEstudante) => e.turma.nome }] : []),
          { titulo: "AEE", valor: (e: LinhaEstudante) => (e.aeeProfile ? "Sim" : "Não") },
          ...(ver("notas") ? [{ titulo: "Notas lançadas", valor: (e: LinhaEstudante) => e._count.notas }] : []),
        ], linhas)}
      />
      <TableContainer semBorda>
        <Table className="min-w-[36rem]">
          <THead>
            <TR>
              <TH ordem={seta("nome")} onOrdenar={() => ordenar("nome")}>Estudante</TH>
              {ver("matricula") && <TH ordem={seta("matricula")} onOrdenar={() => ordenar("matricula")}>Matrícula</TH>}
              {mostrarTurma && ver("turma") && <TH ordem={seta("turma")} onOrdenar={() => ordenar("turma")}>Turma</TH>}
              {ver("notas") && <TH numeric ordem={seta("notas")} onOrdenar={() => ordenar("notas")}>Notas lançadas</TH>}
              <TH className="text-right"><span className="sr-only">Ações</span></TH>
            </TR>
          </THead>
          <TBody>
            {linhas.map((e) => (
              <TR key={e.matricula} onClick={() => router.push(ficha(e))}>
                <TD>
                  <span className="flex items-center gap-2">
                    <Link href={ficha(e)} onClick={(ev) => ev.stopPropagation()} className="font-medium text-fg hover:underline">{e.nome}</Link>
                    {e.aeeProfile && <Badge tone="accent">AEE</Badge>}
                  </span>
                </TD>
                {ver("matricula") && <TD className="font-mono text-fg-muted">{e.matricula}</TD>}
                {mostrarTurma && ver("turma") && <TD className="text-fg-muted">{e.turma.nome}</TD>}
                {ver("notas") && <TD numeric className="text-fg-muted">{e._count.notas}</TD>}
                <TD className="w-0" onClick={(ev) => ev.stopPropagation()}>
                  <div className="flex items-center justify-end gap-0.5">
                    <PortalActivationAction estudanteId={e.matricula} initialMatricula={e.matricula} hasUser={comPortal.has(e.matricula)} />
                    <Link href={`/dashboard/estudantes/${encodeURIComponent(e.matricula)}/editar`} className={acaoIcone} title="Editar dados" aria-label={`Editar dados de ${e.nome}`}>
                      <Pencil size={16} strokeWidth={1.75} />
                    </Link>
                    {e.aeeProfile && (
                      <Link href={`/dashboard/aee/${encodeURIComponent(e.matricula)}`} className={acaoIcone} title="Ficha AEE" aria-label={`Ficha AEE de ${e.nome}`}>
                        <Accessibility size={16} strokeWidth={1.75} />
                      </Link>
                    )}
                    <Link href={`/dashboard/estudantes/${encodeURIComponent(e.matricula)}/boletim`} className={acaoIcone} title="Boletim" aria-label={`Boletim de ${e.nome}`}>
                      <FileText size={16} strokeWidth={1.75} />
                    </Link>
                  </div>
                </TD>
              </TR>
            ))}
            {linhas.length === 0 && <TableEmpty colSpan={totalColunas}>{busca ? "Nenhum estudante encontrado com esta busca." : "Nenhum estudante nesta lista."}</TableEmpty>}
          </TBody>
        </Table>
      </TableContainer>
      <RodapeTabela total={linhas.length} singular="estudante" plural="estudantes" />
      </>)}
    </Painel>
  )
}
