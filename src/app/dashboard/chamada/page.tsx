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
import { Alert, Badge, Card, EmptyState, PageHeader, buttonClasses } from "@/components/ui"
import { rotuloTempos } from "@/lib/services/inicio-professor"
import SeletorData from "./SeletorData"
import { paginaDoModulo } from '@/lib/modulos/guarda'

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
  await paginaDoModulo('DIA')
  const session = await auth()
  if (!session?.user?.escolaId || can(session.user, 'portal.acessar') || !can(session.user, 'frequencia.lancar')) redirect("/dashboard")
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

      <section className="space-y-3">
        <h2 className="text-base font-semibold text-fg">Aulas de {dataBR}{diaSemana !== null ? ` (${DIAS[diaSemana]})` : ""}</h2>
        {calendario && !letivo && <Card><EmptyState icon={CalendarOff} title="Dia não letivo" description="Fim de semana, feriado ou recesso. Escolha outra data acima." className="py-8" /></Card>}
        {letivo && doDia.length === 0 && <Card><EmptyState icon={ClipboardCheck} title="Nenhuma aula sua neste dia" description="Só aparecem as disciplinas que estão no horário da turma neste dia da semana." className="py-8" /></Card>}
        {doDia.length > 0 && (
          <ul className="grid gap-3 grid-cols-[repeat(auto-fill,minmax(min(100%,18rem),1fr))]">
            {doDia.map((i) => (
              <li key={`${i.turmaId}-${i.disciplinaId}`} className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-4 shadow-card">
                <div className="flex items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="break-words text-base font-semibold leading-snug text-fg">{i.nome}</p>
                    <p className="text-13 text-fg-subtle"><span className="font-mono">{i.turmaNome}</span> · {rotuloTempos(i.tempos)}</p>
                  </div>
                  <Situacao situacao={i.situacao} />
                </div>
                <Link href={link(i)} className={buttonClasses({ variant: i.situacao === "REALIZADA" ? "secondary" : "primary", className: "min-h-11 w-full" })}>
                  {i.situacao === "REALIZADA" ? "Editar chamada" : "Fazer chamada"}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {itens.length > 0 && (
        <section className="space-y-3">
          <div>
            <h2 className="text-base font-semibold text-fg">Diários</h2>
            <p className="text-13 text-fg-subtle">Aulas dadas, conteúdo ministrado e dias com aula sem chamada.</p>
          </div>
          <ul className="overflow-hidden rounded-2xl border border-line bg-surface shadow-card">
            {[...doDia, ...outros].map((i) => (
              <li key={`d-${i.turmaId}-${i.disciplinaId}`} className="border-b border-line-subtle last:border-0">
                <Link href={linkDiario(i)} className="flex min-h-14 items-center gap-3 px-4 py-3 transition-colors duration-150 hover:bg-subtle/60 sm:px-5">
                  <BookOpen size={18} strokeWidth={1.75} className="shrink-0 text-fg-subtle" aria-hidden />
                  <p className="min-w-0 flex-1 break-words text-sm text-fg">{i.nome} <span className="text-fg-subtle">· {i.turmaNome}</span></p>
                  {i.pendentes > 0 && <Badge tone="warning">{i.pendentes} {i.pendentes === 1 ? "pendente" : "pendentes"}</Badge>}
                  <ChevronRight size={16} strokeWidth={1.75} className="shrink-0 text-fg-disabled" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}

function Situacao({ situacao }: { situacao: Item["situacao"] }) {
  if (situacao === "REALIZADA") return <Badge tone="success" dot>Chamada feita</Badge>
  if (situacao === "CANCELADA") return <Badge>Aula não dada</Badge>
  return <Badge tone="warning" dot>Pendente</Badge>
}
