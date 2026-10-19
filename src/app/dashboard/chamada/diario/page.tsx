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
import { ArrowLeft, BookOpen, ChevronRight } from "lucide-react"
import { getDisciplinasPermitidas } from "@/lib/data-fetching"
import { agruparPorUnidade, unidadeAtual } from "@/lib/services/diario"
import { rotuloTempos } from "@/lib/services/inicio-professor"
import { calendarioDaDisciplina } from "@/lib/services/calendario-disciplina"
import CalendarioDisciplina from "@/components/CalendarioDisciplina"
import { Badge, Card, CardBody, CardHeader, EmptyState, PageHeader, Stat, buttonClasses } from "@/components/ui"

export const metadata = { title: 'Áxis - Diário de classe' }
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const dataBR = (iso: string) => iso.split("-").reverse().join("/")
const DIAS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"]
const SITUACAO: Record<string, string> = { REALIZADA: "Dada", CANCELADA: "Não dada", PREVISTA: "Chamada não salva" }

export default async function DiarioPage({ searchParams }: { searchParams: Promise<{ turma?: string; disciplina?: string }> }) {
  const session = await auth()
  if (!session?.user?.escolaId || session.user.isPortalUser || !can(session.user, 'staff')) redirect("/dashboard")
  const escolaId = session.user.escolaId
  const { turma: turmaId, disciplina } = await searchParams
  if (!turmaId) return <IndiceDiarios />

  const acesso = await acessoChamada(session.user, turmaId, disciplina ?? null)
  if (!acesso) redirect("/dashboard/chamada")
  const { turma } = acesso
  const disciplinaId = acesso.disciplina?.id ?? null

  const [esquema, aulas, horario, ano, cargaHoraria] = await Promise.all([
    carregarEsquemaDaTurma(turma),
    prisma.aula.findMany({
      where: { escolaId, turmaId: turma.id, disciplinaId },
      orderBy: { data: 'asc' },
      select: {
        id: true, data: true, tempos: true, quantidade: true, conteudo: true, situacao: true,
        professor: { select: { name: true, username: true } },
        faltas: { orderBy: { estudante: { nome: 'asc' } }, select: { id: true, quantidade: true, tempos: true, estudante: { select: { nome: true } } } },
        observacoes: { orderBy: { estudante: { nome: 'asc' } }, select: { id: true, texto: true, estudante: { select: { nome: true } } } },
      },
    }),
    prisma.horarioAula.findMany({ where: { turmaId: turma.id }, select: { diaSemana: true, horario: true, disciplinaId: true } }),
    anoLetivoDaTurma(escolaId, turma),
    disciplinaId ? prisma.disciplina.findFirst({ where: { id: disciplinaId, turmaId: turma.id }, select: { cargaHoraria: true } }).then((d) => d?.cargaHoraria ?? null) : Promise.resolve(null),
  ])
  const [calendario, etapas] = await Promise.all([
    carregarCalendario(escolaId, ano),
    prisma.etapaCalendario.findMany({ where: { periodoLetivo: { escolaId, anoLetivo: ano }, esquemaUnidadeId: { in: (esquema?.etapas ?? []).map((e) => e.id) } }, select: { esquemaUnidadeId: true, inicio: true, fim: true } }),
  ])
  const hoje = hojeNaEscola()
  // Unidades (1ª, 2ª, 3ª UNIDADE...) pelas datas da EtapaCalendario
  const datasEtapa = new Map(etapas.map((e) => [e.esquemaUnidadeId, { inicio: chaveData(e.inicio), fim: chaveData(e.fim) }]))
  const unidades = (esquema?.etapas ?? []).map((e) => ({ id: e.id, nome: e.nome, ordem: e.ordem, inicio: datasEtapa.get(e.id)?.inicio ?? null, fim: datasEtapa.get(e.id)?.fim ?? null }))
  const grupos = agruparPorUnidade(aulas.map((a) => ({ ...a, data: chaveData(a.data) })), unidades)
  const aberta = unidadeAtual(unidades, hoje)
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
  const linkBase = linkChamada("")
  const diasCalendario = calendario ? calendarioDaDisciplina({ calendario, turmaId: turma.id, disciplinaId, horario, aulas, hoje }) : null
  return (
    <div className={diasCalendario ? "mx-auto max-w-6xl md:grid md:grid-cols-[15rem_minmax(0,1fr)] md:items-start md:gap-6" : "mx-auto max-w-4xl"}>
      {diasCalendario && (
        <aside aria-label="Calendário da disciplina" className="sticky top-20 hidden max-h-[calc(100dvh-6rem)] overflow-y-auto rounded-2xl border border-line bg-surface p-3 shadow-card md:block">
          <CalendarioDisciplina dias={diasCalendario} linkBase={linkBase} hoje={hoje} modo="coluna" />
        </aside>
      )}
    <div className="min-w-0 space-y-6">
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

      {diasCalendario && (
        <Card className="md:hidden">
          <CardHeader title="Calendário" description="Toque num dia com aula para abrir a chamada." />
          <CardBody><CalendarioDisciplina dias={diasCalendario} linkBase={linkBase} hoje={hoje} modo="mes" /></CardBody>
        </Card>
      )}

      {pendentes.length > 0 && (
        <Card className="hidden md:block">
          <CardHeader title="Dias com aula sem chamada" description="Toque no dia para fazer a chamada." />
          <CardBody className="flex flex-wrap gap-1.5">
            {pendentes.slice(0, 60).map((d) => (
              <Link key={d} href={linkChamada(d)} className="rounded-md border border-line bg-surface px-2 py-1 text-xs tabular-nums text-fg-muted transition-colors duration-150 hover:border-line-strong hover:text-fg">{dataBR(d)}</Link>
            ))}
            {pendentes.length > 60 && <span className="px-2 py-1 text-xs text-fg-subtle">e mais {pendentes.length - 60}</span>}
          </CardBody>
        </Card>
      )}

      <section className="space-y-3" aria-label="Aulas por unidade">
        <h2 className="text-base font-semibold text-fg">Aulas registradas</h2>
        {aulas.length === 0 ? (
          <Card><EmptyState icon={BookOpen} title="Nenhuma aula registrada ainda" description="As aulas aparecem aqui quando a chamada é salva." /></Card>
        ) : grupos.map((g) => {
          const dadasNaUnidade = g.aulas.filter((a) => a.situacao === "REALIZADA").reduce((s, a) => s + a.quantidade, 0)
          return (
            <details key={g.id} open={g.id === aberta || (aberta === null && g === grupos[0])} className="group rounded-2xl border border-line bg-surface shadow-card">
              <summary className="flex min-h-14 cursor-pointer list-none items-center gap-3 px-4 py-3 marker:hidden sm:px-5 [&::-webkit-details-marker]:hidden">
                <ChevronRight size={18} strokeWidth={1.75} aria-hidden className="shrink-0 text-fg-subtle transition-transform duration-150 group-open:rotate-90" />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold uppercase text-fg">{g.nome}</span>
                  <span className="block text-13 text-fg-subtle">
                    {g.inicio && g.fim ? `${dataBR(g.inicio)} a ${dataBR(g.fim)} · ` : g.id === "fora" ? "" : "Sem datas no calendário · "}
                    {g.aulas.length} {g.aulas.length === 1 ? "registro" : "registros"}{!porDia && ` · ${dadasNaUnidade} ${dadasNaUnidade === 1 ? "aula dada" : "aulas dadas"}`}
                  </span>
                </span>
              </summary>
              {g.aulas.length === 0 ? (
                <p className="border-t border-line-subtle px-4 py-4 text-13 text-fg-subtle sm:px-5">Nenhuma aula registrada nesta unidade.</p>
              ) : (
                <ol className="border-t border-line-subtle">
                  {g.aulas.map((a) => {
                    const faltas = a.faltas.reduce((s, f) => s + f.quantidade, 0)
                    return (
                      <li key={a.id} className="border-b border-line-subtle px-4 py-3 last:border-0 sm:px-5">
                        <div className="flex flex-wrap items-start gap-x-3 gap-y-1">
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-fg tabular-nums">{DIAS[new Date(`${a.data}T12:00:00Z`).getUTCDay()]}, {dataBR(a.data)}</p>
                            <p className="flex flex-wrap items-center gap-1.5 text-xs text-fg-subtle">
                              <span>{a.tempos.length ? rotuloTempos([...a.tempos].sort((x, y) => x - y)) : `${a.quantidade} aula(s)`}</span>
                              {a.situacao !== "REALIZADA" && <Badge tone={a.situacao === "CANCELADA" ? "neutral" : "warning"}>{SITUACAO[a.situacao]}</Badge>}
                              {a.professor && <span>· {a.professor.name || a.professor.username}</span>}
                            </p>
                          </div>
                          <Link href={linkChamada(a.data)} className={buttonClasses({ size: "sm", variant: "secondary", className: "min-h-9" })} aria-label={`Editar a chamada de ${dataBR(a.data)}`}>Editar</Link>
                        </div>
                        <p className="mt-2 whitespace-pre-line break-words text-13 text-fg">{a.conteudo || <span className="text-fg-subtle">Sem conteúdo registrado</span>}</p>
                        {a.situacao === "REALIZADA" && (
                          <p className="mt-1.5 text-xs text-fg-muted">
                            <span className="font-medium text-fg">{faltas === 0 ? "Todos presentes" : `${faltas} ${faltas === 1 ? "falta" : "faltas"}:`}</span>{" "}
                            {a.faltas.map((f, i) => (
                              <span key={f.id}>{i > 0 && ", "}{f.estudante.nome}{a.tempos.length > 1 && f.tempos.length > 0 && ` (${f.tempos.map((t) => `${t}º`).join(" e ")})`}</span>
                            ))}
                          </p>
                        )}
                        {a.observacoes.length > 0 && (
                          <ul className="mt-1.5 space-y-0.5 rounded-xl bg-subtle px-3 py-2 text-xs text-fg-muted" aria-label="Observações">
                            {a.observacoes.map((o) => <li key={o.id} className="break-words"><span className="font-medium text-fg">{o.estudante.nome}:</span> {o.texto}</li>)}
                          </ul>
                        )}
                      </li>
                    )
                  })}
                </ol>
              )}
            </details>
          )
        })}
      </section>
    </div>
    </div>
  )
}

/** Sem turma escolhida (item "Diário" da barra do celular): os diários que o usuário pode abrir, por turma. */
async function IndiceDiarios() {
  const session = await auth()
  if (!session?.user?.escolaId) redirect("/login")
  const disciplinas = await getDisciplinasPermitidas(session)
  const porTurma = new Map<string, { turma: (typeof disciplinas)[number]["turma"]; itens: { id: string; nome: string }[] }>()
  for (const d of disciplinas) {
    if (d.turma.escolaId !== session.user.escolaId) continue
    const g = porTurma.get(d.turmaId) ?? { turma: d.turma, itens: [] }
    g.itens.push({ id: d.id, nome: d.nome })
    porTurma.set(d.turmaId, g)
  }
  const grupos = [...porTurma.values()].sort((a, b) => a.turma.nome.localeCompare(b.turma.nome))
  for (const g of grupos) {
    const esquema = await carregarEsquemaDaTurma(g.turma)
    // Chamada diária: um diário só por turma, sem disciplina
    if (esquema?.registroFrequencia === "POR_DIA") g.itens = [{ id: "", nome: "Chamada diária" }]
    else g.itens.sort((a, b) => a.nome.localeCompare(b.nome))
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader title="Diário de classe" description="Aulas dadas, conteúdo ministrado e faltas por disciplina." />
      {grupos.length === 0 ? (
        <Card><EmptyState icon={BookOpen} title="Nenhuma disciplina vinculada" description="Peça à gestão para vincular suas disciplinas." /></Card>
      ) : grupos.map((g) => (
        <section key={g.turma.id} className="space-y-2">
          <h2 className="px-1 font-mono text-13 font-medium text-fg-muted">{g.turma.nome}</h2>
          <ul className="space-y-2">
            {g.itens.map((i) => (
              <li key={i.id || "dia"}>
                <Link href={`/dashboard/chamada/diario?turma=${g.turma.id}${i.id ? `&disciplina=${i.id}` : ""}`} className="flex min-h-14 items-center gap-3 rounded-2xl border border-line bg-surface px-4 py-3 shadow-card transition-colors duration-150 hover:border-accent">
                  <BookOpen size={18} strokeWidth={1.75} className="shrink-0 text-fg-subtle" aria-hidden />
                  <span className="min-w-0 flex-1 break-words text-sm font-medium text-fg">{i.nome}</span>
                  <ChevronRight size={16} strokeWidth={1.75} className="shrink-0 text-fg-disabled" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}
