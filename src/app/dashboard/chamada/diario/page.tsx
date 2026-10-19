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
import { ArrowLeft, BookOpen, Clock } from "lucide-react"

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
  const card = "bg-white rounded-lg shadow-sm border border-zinc-200 p-6 space-y-3"

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-16">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/chamada" className="p-2 hover:bg-zinc-200 rounded-lg transition-colors">
          <ArrowLeft className="w-5 h-5 text-fg-muted" />
        </Link>
        <div>
          <h1 className="text-2xl font-medium text-accent-fg flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-fg-muted" /> Diário de classe — {acesso.disciplina?.nome ?? "Chamada diária"}
          </h1>
          <p className="text-sm text-fg-muted">{turma.nome} · {ano}</p>
        </div>
      </div>

      <section className={`${card} grid grid-cols-2 sm:grid-cols-4 gap-4 space-y-0`}>
        <Numero rotulo={porDia ? "Dias com chamada" : "Aulas dadas"} valor={dadas} />
        <Numero rotulo="Previstas no ano" valor={previstasAno ?? "—"} />
        {!porDia && <Numero rotulo="Carga horária" valor={cargaHoraria ?? "—"} />}
        <Numero rotulo="Chamadas pendentes" valor={pendentes.length} destaque={pendentes.length > 0} />
      </section>

      {pendentes.length > 0 && (
        <section className={card}>
          <h2 className="font-medium text-fg flex items-center gap-2"><Clock className="w-4 h-4" /> Dias com aula sem chamada</h2>
          <div className="flex flex-wrap gap-2">
            {pendentes.slice(0, 60).map((d) => (
              <Link key={d} href={linkChamada(d)} className="text-xs text-warning-fg bg-warning-subtle border border-warning-line rounded-lg px-2 py-1 hover:bg-warning-subtle">{dataBR(d)}</Link>
            ))}
          </div>
        </section>
      )}

      <section className={card}>
        <h2 className="font-medium text-fg">Aulas registradas</h2>
        {aulas.length === 0 && <p className="text-sm text-fg-subtle">Nenhuma aula registrada ainda.</p>}
        <div className="divide-y divide-zinc-100">
          {aulas.map((a) => {
            const d = chaveData(a.data)
            const faltas = a.faltas.reduce((s, f) => s + f.quantidade, 0)
            return (
              <div key={a.id} className="flex flex-wrap items-start gap-3 py-3">
                <div className="w-28">
                  <p className="text-sm font-medium text-fg">{dataBR(d)}</p>
                  <p className="text-xs text-fg-subtle">{a.tempos.length ? a.tempos.map((t) => `${t}º`).join(", ") : `${a.quantidade} aula(s)`}</p>
                </div>
                <div className="flex-1 min-w-[12rem]">
                  <p className="text-sm text-fg-muted whitespace-pre-line">{a.conteudo || <span className="text-fg-subtle">Sem conteúdo registrado</span>}</p>
                  <p className="text-xs text-fg-subtle">
                    {SITUACAO[a.situacao]}{a.situacao === "REALIZADA" && ` · ${faltas} ${faltas === 1 ? "falta" : "faltas"}`}
                    {a.professor && ` · ${a.professor.name || a.professor.username}`}
                  </p>
                </div>
                <Link href={linkChamada(d)} className="text-xs font-medium text-accent-fg hover:underline">Editar</Link>
              </div>
            )
          })}
        </div>
      </section>
    </div>
  )
}

function Numero({ rotulo, valor, destaque }: { rotulo: string; valor: number | string; destaque?: boolean }) {
  return (
    <div>
      <p className="text-xs text-fg-subtle">{rotulo}</p>
      <p className={`text-2xl font-medium ${destaque ? "text-warning-fg" : "text-fg"}`}>{valor}</p>
    </div>
  )
}
