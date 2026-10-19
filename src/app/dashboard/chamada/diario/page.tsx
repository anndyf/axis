import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import { prisma } from "@/lib/prisma"
import { can } from "@/lib/rbac"
import { acessoChamada } from "@/lib/chamada-acesso"
import { carregarEsquemaDaTurma } from "@/lib/services/notas-leitura"
import { carregarCalendario, anoLetivoDaTurma } from "@/lib/services/frequencia-leitura"
import { diasComAulaAte, hojeNaEscola } from "@/lib/services/chamada"
import { diasLetivos, aulasPrevistasPorDisciplina, chaveData } from "@/lib/services/calendario"
import { ArrowLeft, BookOpen } from "lucide-react"
import { Badge, Card, CardBody, CardHeader, EmptyState, PageHeader, Stat, buttonClasses } from "@/components/ui"

export const metadata = { title: 'Áxis - Diário de classe' }
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const dataBR = (iso: string) => iso.split("-").reverse().join("/")
const SITUACAO: Record<string, string> = { REALIZADA: "Dada", CANCELADA: "Não dada", PREVISTA: "Chamada não salva" }

export default async function DiarioPage({ searchParams }: { searchParams: Promise<{ turma?: string; disciplina?: string }> }) {
  const session = await auth()
  if (!session?.user?.escolaId || session.user.isPortalUser || !can(session.user, 'staff')) redirect("/dashboard")
  const escolaId = session.user.escolaId
  const { turma: turmaId, disciplina } = await searchParams
  if (!turmaId) redirect("/dashboard/chamada")

  const acesso = await acessoChamada(session.user, turmaId, disciplina ?? null)
  if (!acesso) redirect("/dashboard/chamada")
  const { turma } = acesso
  const disciplinaId = acesso.disciplina?.id ?? null

  const [esquema, aulas, horario, ano, cargaHoraria] = await Promise.all([
    carregarEsquemaDaTurma(turma),
    prisma.aula.findMany({
      where: { escolaId, turmaId: turma.id, disciplinaId },
      orderBy: { data: 'desc' },
      select: { id: true, data: true, tempos: true, quantidade: true, conteudo: true, situacao: true, professor: { select: { name: true, username: true } }, faltas: { select: { quantidade: true } } },
    }),
    prisma.horarioAula.findMany({ where: { turmaId: turma.id }, select: { diaSemana: true, horario: true, disciplinaId: true } }),
    anoLetivoDaTurma(escolaId, turma),
    disciplinaId ? prisma.disciplina.findFirst({ where: { id: disciplinaId, turmaId: turma.id }, select: { cargaHoraria: true } }).then((d) => d?.cargaHoraria ?? null) : Promise.resolve(null),
  ])
  const calendario = await carregarCalendario(escolaId, ano)
  const hoje = hojeNaEscola()
  const porDia = esquema?.registroFrequencia === "POR_DIA"

  const registradas = new Set(aulas.filter((a) => a.situacao !== "PREVISTA").map((a) => chaveData(a.data)))
  const pendentes = calendario ? diasComAulaAte(hoje, turma.id, calendario, horario, disciplinaId).filter((d) => !registradas.has(d)).reverse() : []
  const dadas = aulas.filter((a) => a.situacao === "REALIZADA").reduce((s, a) => s + a.quantidade, 0)
  const previstasAno = calendario
    ? (porDia
        ? diasLetivos(calendario, turma.id).filter((d) => horario.some((h) => h.diaSemana === d.diaSemana && h.disciplinaId)).length
        : (disciplinaId ? aulasPrevistasPorDisciplina(horario, diasLetivos(calendario, turma.id)).get(disciplinaId) ?? 0 : 0))
    : null

  const linkChamada = (d: string) => `/dashboard/chamada/fazer?turma=${turma.id}${disciplinaId ? `&disciplina=${disciplinaId}` : ""}&data=${d}`
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader
        title={`Diário de classe — ${acesso.disciplina?.nome ?? "Chamada diária"}`}
        description={`${turma.nome} · ${ano}`}
        actions={<Link href="/dashboard/chamada" className={buttonClasses({ variant: "ghost" })}><ArrowLeft size={16} strokeWidth={1.75} /> Chamada</Link>}
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label={porDia ? "Dias com chamada" : "Aulas dadas"} value={dadas} />
        <Stat label="Previstas no ano" value={previstasAno ?? "—"} />
        {!porDia && <Stat label="Carga horária" value={cargaHoraria ?? "—"} />}
        <Stat label="Chamadas pendentes" value={pendentes.length} hint={pendentes.length ? "Dias com aula sem chamada" : "Tudo em dia"} />
      </div>

      {pendentes.length > 0 && (
        <Card>
          <CardHeader title="Dias com aula sem chamada" description="Toque no dia para fazer a chamada." />
          <CardBody className="flex flex-wrap gap-1.5">
            {pendentes.slice(0, 60).map((d) => (
              <Link key={d} href={linkChamada(d)} className="rounded-md border border-line bg-surface px-2 py-1 text-xs tabular-nums text-fg-muted transition-colors duration-150 hover:border-line-strong hover:text-fg">{dataBR(d)}</Link>
            ))}
            {pendentes.length > 60 && <span className="px-2 py-1 text-xs text-fg-subtle">e mais {pendentes.length - 60}</span>}
          </CardBody>
        </Card>
      )}

      <Card className="overflow-hidden">
        <CardHeader title="Aulas registradas" />
        {aulas.length === 0 ? (
          <EmptyState icon={BookOpen} title="Nenhuma aula registrada ainda" description="As aulas aparecem aqui quando a chamada é salva." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[40rem] text-13">
              <thead>
                <tr className="border-b border-line text-xs text-fg-subtle">
                  <th scope="col" className="h-9 px-4 text-left font-medium sm:px-5">Data</th>
                  <th scope="col" className="h-9 px-3 text-left font-medium">Conteúdo</th>
                  <th scope="col" className="h-9 px-3 text-right font-medium">Faltas</th>
                  <th scope="col" className="h-9 px-4 text-right font-medium sm:px-5"><span className="sr-only">Ações</span></th>
                </tr>
              </thead>
              <tbody>
                {aulas.map((a) => {
                  const d = chaveData(a.data)
                  const faltas = a.faltas.reduce((s, f) => s + f.quantidade, 0)
                  return (
                    <tr key={a.id} className="border-b border-line-subtle align-top last:border-0">
                      <td className="whitespace-nowrap px-4 py-2.5 sm:px-5">
                        <p className="tabular-nums text-fg">{dataBR(d)}</p>
                        <p className="text-xs text-fg-subtle">{a.tempos.length ? a.tempos.map((t) => `${t}º`).join(", ") : `${a.quantidade} aula(s)`}</p>
                      </td>
                      <td className="min-w-[14rem] px-3 py-2.5">
                        <p className="whitespace-pre-line text-fg">{a.conteudo || <span className="text-fg-subtle">Sem conteúdo registrado</span>}</p>
                        <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-fg-subtle">
                          {a.situacao === "REALIZADA" ? null : <Badge tone={a.situacao === "CANCELADA" ? "neutral" : "warning"}>{SITUACAO[a.situacao]}</Badge>}
                          {a.professor && <span>{a.professor.name || a.professor.username}</span>}
                        </p>
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-fg-muted">{a.situacao === "REALIZADA" ? faltas : "—"}</td>
                      <td className="px-4 py-2.5 text-right sm:px-5">
                        <Link href={linkChamada(d)} className={buttonClasses({ size: "sm", variant: "secondary" })}>Editar</Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}
