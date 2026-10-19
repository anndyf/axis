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
import { ArrowLeft, ClipboardCheck, BookOpen, CheckCircle2, AlertCircle, Clock } from "lucide-react"
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
    <div className="max-w-4xl mx-auto space-y-6 pb-16">
      <div className="flex items-center gap-4">
        <Link href="/dashboard" className="p-2 hover:bg-slate-200 rounded-lg transition-colors">
          <ArrowLeft className="w-5 h-5 text-slate-700" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-medium text-blue-900 flex items-center gap-2">
            <ClipboardCheck className="w-6 h-6 text-slate-700" /> Chamada e diário de classe
          </h1>
          <p className="text-sm text-slate-600">Todos começam presentes: marque só quem faltou.</p>
        </div>
        <SeletorData data={data} hoje={hoje} />
      </div>

      {!calendario && (
        <div className="p-4 rounded-xl border text-sm flex items-center gap-2 bg-amber-50 border-amber-200 text-amber-800">
          <AlertCircle className="w-4 h-4" /> O calendário letivo de {ano} ainda não foi configurado. A gestão precisa cadastrá-lo em Configurações → Calendário letivo.
        </div>
      )}

      <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-3">
        <h2 className="font-medium text-slate-800">
          Aulas de {dataBR}{diaSemana !== null ? ` (${DIAS[diaSemana]})` : ""}
        </h2>
        {calendario && !letivo && <p className="text-sm text-slate-500">Dia não letivo.</p>}
        {letivo && doDia.length === 0 && <p className="text-sm text-slate-500">Nenhuma aula sua no horário deste dia.</p>}
        <div className="divide-y divide-slate-100">
          {doDia.map((i) => (
            <div key={`${i.turmaId}-${i.disciplinaId}`} className="flex flex-wrap items-center gap-3 py-3">
              <div className="flex-1 min-w-[12rem]">
                <p className="text-sm font-medium text-slate-800">{i.nome}</p>
                <p className="text-xs text-slate-500">
                  {i.turmaNome}{i.tempos.length > 0 && ` · ${i.tempos.map((t) => `${t}º`).join(", ")} ${i.tempos.length > 1 ? "tempos" : "tempo"}`}
                </p>
              </div>
              <Situacao situacao={i.situacao} />
              <Link href={link(i)} className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-lg text-xs font-medium uppercase tracking-wide hover:bg-slate-800">
                {i.situacao === "REALIZADA" ? "Editar chamada" : "Fazer chamada"}
              </Link>
            </div>
          ))}
        </div>
      </section>

      {itens.length > 0 && (
        <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-3">
          <h2 className="font-medium text-slate-800 flex items-center gap-2"><BookOpen className="w-4 h-4" /> Diários</h2>
          <div className="divide-y divide-slate-100">
            {[...doDia, ...outros].map((i) => (
              <div key={`d-${i.turmaId}-${i.disciplinaId}`} className="flex flex-wrap items-center gap-3 py-2">
                <p className="flex-1 text-sm text-slate-700">{i.nome} <span className="text-slate-400">· {i.turmaNome}</span></p>
                {i.pendentes > 0 && (
                  <span className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5 flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {i.pendentes} {i.pendentes === 1 ? "chamada pendente" : "chamadas pendentes"}
                  </span>
                )}
                <Link href={linkDiario(i)} className="text-xs font-medium text-blue-700 hover:underline">Abrir diário</Link>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

function Situacao({ situacao }: { situacao: Item["situacao"] }) {
  if (situacao === "REALIZADA") return <span className="text-xs text-green-700 bg-green-50 border border-green-200 rounded-full px-2 py-0.5 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Chamada feita</span>
  if (situacao === "CANCELADA") return <span className="text-xs text-slate-600 bg-slate-100 border border-slate-200 rounded-full px-2 py-0.5">Aula não dada</span>
  return <span className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5">Pendente</span>
}
