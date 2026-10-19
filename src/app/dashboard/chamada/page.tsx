import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import { prisma } from "@/lib/prisma"
import { can } from "@/lib/rbac"
import { getDisciplinasPermitidas, getGlobalConfig } from "@/lib/data-fetching"
import { carregarEsquemaDaTurma } from "@/lib/services/notas-leitura"
import { carregarCalendario } from "@/lib/services/frequencia-leitura"
import { aulasDoDia, diasComAulaAte, hojeNaEscola, dataValida } from "@/lib/services/chamada"
import { chaveData } from "@/lib/services/calendario"
import { ClipboardCheck, BookOpen, CalendarOff, ChevronRight } from "lucide-react"
import { Alert, Badge, Card, CardHeader, EmptyState, PageHeader, buttonClasses } from "@/components/ui"
import SeletorData from "./SeletorData"

export const metadata = { title: 'Áxis - Chamada' }
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const DIAS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"]

interface Item {
  turmaId: string
  turmaNome: string
  disciplinaId: string | null
  nome: string
  tempos: number[]
  /** tem aula no horário do dia escolhido */
  temAula: boolean
  situacao: "PREVISTA" | "REALIZADA" | "CANCELADA" | null
  pendentes: number
}

export default async function ChamadaPage({ searchParams }: { searchParams: Promise<{ data?: string }> }) {
  const session = await auth()
  if (!session?.user?.escolaId || session.user.isPortalUser || !can(session.user, 'staff')) redirect("/dashboard")
  const escolaId = session.user.escolaId

  const hoje = hojeNaEscola()
  const { data: dataParam } = await searchParams
  const data = dataValida(dataParam) && dataParam <= hoje ? dataParam : hoje

  const disciplinas = await getDisciplinasPermitidas(session)
  const config = await getGlobalConfig(escolaId)
  const ano = config?.anoLetivoAtual ?? new Date().getFullYear()
  const calendario = await carregarCalendario(escolaId, ano)

  // Agrupa minhas disciplinas por turma
  const porTurma = new Map<string, { turma: (typeof disciplinas)[number]["turma"]; ids: Set<string>; nomes: Map<string, string> }>()
  for (const d of disciplinas) {
    const g = porTurma.get(d.turmaId) ?? { turma: d.turma, ids: new Set<string>(), nomes: new Map<string, string>() }
    g.ids.add(d.id)
    g.nomes.set(d.id, d.nome)
    porTurma.set(d.turmaId, g)
  }

  const turmaIds = [...porTurma.keys()]
  const [horarios, aulas] = await Promise.all([
    prisma.horarioAula.findMany({ where: { turmaId: { in: turmaIds }, turma: { escolaId } }, select: { turmaId: true, diaSemana: true, horario: true, disciplinaId: true } }),
    prisma.aula.findMany({ where: { escolaId, turmaId: { in: turmaIds } }, select: { turmaId: true, disciplinaId: true, data: true, situacao: true } }),
  ])

  const itens: Item[] = []
  let diaSemana: number | null = null
  let letivo = false
  for (const [turmaId, g] of porTurma) {
    const horario = horarios.filter((h) => h.turmaId === turmaId)
    const esquema = await carregarEsquemaDaTurma(g.turma)
    const porDia = esquema?.registroFrequencia === "POR_DIA"
    const registradas = new Map(aulas.filter((a) => a.turmaId === turmaId).map((a) => [`${chaveData(a.data)}|${a.disciplinaId ?? ""}`, a.situacao]))
    if (!calendario) continue
    const dia = aulasDoDia(data, turmaId, calendario, horario)
    if (dia.letivo) { letivo = true; diaSemana = dia.diaSemana }

    const alvos: { disciplinaId: string | null; nome: string; tempos: number[]; temAula: boolean }[] = porDia
      ? [{ disciplinaId: null, nome: "Chamada diária", tempos: [], temAula: dia.temposPorDisciplina.size > 0 }]
      : [...g.ids].map((id) => {
          const tempos = dia.temposPorDisciplina.get(id) ?? []
          return { disciplinaId: id, nome: g.nomes.get(id)!, tempos, temAula: tempos.length > 0 }
        })

    for (const alvo of alvos) {
      const pendentes = diasComAulaAte(hoje, turmaId, calendario, horario, alvo.disciplinaId)
        .filter((d) => !registradas.has(`${d}|${alvo.disciplinaId ?? ""}`) || registradas.get(`${d}|${alvo.disciplinaId ?? ""}`) === "PREVISTA").length
      itens.push({
        turmaId,
        turmaNome: g.turma.nome,
        ...alvo,
        situacao: registradas.get(`${data}|${alvo.disciplinaId ?? ""}`) ?? null,
        pendentes,
      })
    }
  }

  const doDia = itens.filter((i) => i.temAula).sort((a, b) => (a.tempos[0] ?? 0) - (b.tempos[0] ?? 0) || a.turmaNome.localeCompare(b.turmaNome))
  const outros = itens.filter((i) => !i.temAula).sort((a, b) => a.turmaNome.localeCompare(b.turmaNome) || a.nome.localeCompare(b.nome))
  const link = (i: Item, d = data) => `/dashboard/chamada/fazer?turma=${i.turmaId}${i.disciplinaId ? `&disciplina=${i.disciplinaId}` : ""}&data=${d}`
  const linkDiario = (i: Item) => `/dashboard/chamada/diario?turma=${i.turmaId}${i.disciplinaId ? `&disciplina=${i.disciplinaId}` : ""}`
  const dataBR = data.split("-").reverse().join("/")

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader
        title="Chamada e diário de classe"
        description="Todos começam presentes: marque só quem faltou."
        actions={<SeletorData data={data} hoje={hoje} />}
      />

      {!calendario && (
        <Alert tone="warning" title="Calendário letivo não configurado">
          O calendário de {ano} ainda não foi cadastrado. A gestão precisa configurá-lo em Configurações → Calendário letivo.
        </Alert>
      )}

      <Card>
        <CardHeader title={`Aulas de ${dataBR}${diaSemana !== null ? ` (${DIAS[diaSemana]})` : ""}`} />
        {calendario && !letivo && <EmptyState icon={CalendarOff} title="Dia não letivo" description="Fim de semana, feriado ou recesso. Escolha outra data acima." className="py-8" />}
        {letivo && doDia.length === 0 && <EmptyState icon={ClipboardCheck} title="Nenhuma aula sua neste dia" description="Só aparecem as disciplinas que estão no horário da turma neste dia da semana." className="py-8" />}
        {doDia.length > 0 && (
          <ul className="divide-y divide-line-subtle">
            {doDia.map((i) => (
              <li key={`${i.turmaId}-${i.disciplinaId}`} className="flex flex-wrap items-center gap-3 px-4 py-2.5 sm:px-5">
                <span className="w-16 shrink-0 text-xs tabular-nums text-fg-subtle">{i.tempos.length ? i.tempos.map((t) => `${t}º`).join(", ") : "Dia"}</span>
                <div className="min-w-[10rem] flex-1">
                  <p className="text-13 font-medium text-fg">{i.nome}</p>
                  <p className="text-xs text-fg-subtle">{i.turmaNome}</p>
                </div>
                <Situacao situacao={i.situacao} />
                <Link href={link(i)} className={buttonClasses({ size: "sm", variant: i.situacao === "REALIZADA" ? "secondary" : "primary" })}>
                  {i.situacao === "REALIZADA" ? "Editar chamada" : "Fazer chamada"}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {itens.length > 0 && (
        <Card>
          <CardHeader title="Diários" description="Aulas dadas, conteúdo ministrado e dias com aula sem chamada." />
          <ul className="divide-y divide-line-subtle">
            {[...doDia, ...outros].map((i) => (
              <li key={`d-${i.turmaId}-${i.disciplinaId}`}>
                <Link href={linkDiario(i)} className="flex flex-wrap items-center gap-3 px-4 py-2.5 transition-colors duration-150 hover:bg-subtle/60 sm:px-5">
                  <BookOpen size={16} strokeWidth={1.75} className="shrink-0 text-fg-subtle" aria-hidden />
                  <p className="min-w-0 flex-1 truncate text-13 text-fg">{i.nome} <span className="text-fg-subtle">· {i.turmaNome}</span></p>
                  {i.pendentes > 0 && <Badge tone="warning">{i.pendentes} {i.pendentes === 1 ? "pendente" : "pendentes"}</Badge>}
                  <ChevronRight size={14} strokeWidth={1.75} className="text-fg-disabled" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  )
}

function Situacao({ situacao }: { situacao: Item["situacao"] }) {
  if (situacao === "REALIZADA") return <Badge tone="success" dot>Chamada feita</Badge>
  if (situacao === "CANCELADA") return <Badge>Aula não dada</Badge>
  return <Badge tone="warning" dot>Pendente</Badge>
}
