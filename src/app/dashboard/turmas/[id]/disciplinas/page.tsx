import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { turmaPermitida } from "@/lib/fichas/turma"
import { Painel, RodapeTabela, Table, TableContainer, TableEmpty, TBody, TD, TH, THead, TR } from "@/components/ui"
import { paginaDoModulo } from '@/lib/modulos/guarda'

export const metadata = { title: 'Áxis - Turma' }
export const runtime = 'nodejs'

/**
 * Ficha da turma, aba "Disciplinas": disciplinas, área, professores e carga
 * horária (os mesmos dados que o relatório e o horário da turma já mostram;
 * do professor, só o nome).
 */
export default async function TurmaDisciplinasPage({ params }: { params: Promise<{ id: string }> }) {
  await paginaDoModulo('NUC')
  const session = await auth()
  if (!session?.user?.escolaId) redirect("/login")
  const { id } = await params
  if (!(await turmaPermitida(session, id))) redirect("/dashboard/turmas")

  const disciplinas = await prisma.disciplina.findMany({
    where: { turmaId: id, turma: { escolaId: session.user.escolaId } },
    orderBy: { nome: 'asc' },
    select: { id: true, nome: true, cargaHoraria: true, area: { select: { nome: true } }, usuariosPermitidos: { select: { name: true, username: true } } },
  })

  return (
    <Painel semRecuo>
      <TableContainer semBorda>
        <Table className="min-w-[32rem]">
          <THead>
            <TR><TH>Disciplina</TH><TH>Área</TH><TH>Professor</TH><TH numeric>Carga horária</TH></TR>
          </THead>
          <TBody>
            {disciplinas.map((d) => (
              <TR key={d.id}>
                <TD className="font-medium">{d.nome}</TD>
                <TD className="text-fg-muted">{d.area?.nome ?? "—"}</TD>
                <TD className="text-fg-muted">{d.usuariosPermitidos.map((u) => u.name || u.username).join(", ") || <span className="text-fg-disabled">Sem professor</span>}</TD>
                <TD numeric className="text-fg-muted">{d.cargaHoraria ? `${d.cargaHoraria} aulas` : "—"}</TD>
              </TR>
            ))}
            {disciplinas.length === 0 && <TableEmpty colSpan={4}>Nenhuma disciplina cadastrada nesta turma.</TableEmpty>}
          </TBody>
        </Table>
      </TableContainer>
      <RodapeTabela total={disciplinas.length} singular="disciplina" plural="disciplinas" />
    </Painel>
  )
}
