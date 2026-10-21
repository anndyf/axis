import { Badge, Painel, RodapeTabela, Table, TableContainer, TableEmpty, TBody, TD, TH, THead, TR } from "@/components/ui"
import { formatarQuando, type EntradaHistorico } from "@/lib/services/historico-leitura"

/** Aba "Histórico" das fichas: o que foi registrado na auditoria sobre a entidade. */
export default function TabelaHistorico({ entradas, vazio }: { entradas: EntradaHistorico[]; vazio: string }) {
  return (
    <Painel
      titulo="Histórico de alterações"
      descricao="Registros da auditoria do sistema sobre esta ficha, do mais recente ao mais antigo."
      semRecuo
    >
      <TableContainer semBorda>
        <Table className="min-w-[40rem]">
          <THead>
            <TR><TH className="w-40">Quando</TH><TH>Ação</TH><TH>Assunto</TH><TH>Detalhe</TH><TH>Por</TH></TR>
          </THead>
          <TBody>
            {entradas.map((e) => (
              <TR key={e.id}>
                <TD className="tabular-nums text-fg-muted">{formatarQuando(e)}</TD>
                <TD><Badge tone={e.acao.startsWith("Exclus") ? "danger" : e.acao.startsWith("Cria") ? "success" : "neutral"}>{e.acao}</Badge></TD>
                <TD>{e.assunto}</TD>
                <TD className="text-fg-muted">{e.detalhe ?? "—"}</TD>
                <TD className="text-fg-muted">{e.autor ?? "—"}</TD>
              </TR>
            ))}
            {entradas.length === 0 && <TableEmpty colSpan={5}>{vazio}</TableEmpty>}
          </TBody>
        </Table>
      </TableContainer>
      <RodapeTabela total={entradas.length} singular="registro" plural="registros" />
    </Painel>
  )
}
