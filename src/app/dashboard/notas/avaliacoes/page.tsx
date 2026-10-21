import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import { prisma } from "@/lib/prisma"
import { can } from "@/lib/rbac"
import { getDisciplinasPermitidas } from "@/lib/data-fetching"
import { contextoDaDisciplina } from "@/lib/avaliacoes-acesso"
import { notaMaximaDaEtapa } from "@/lib/services/avaliacoes-professor"
import { chaveData } from "@/lib/services/calendario"
import { ArrowLeft, ListChecks } from "lucide-react"
import AvaliacoesClient from "./AvaliacoesClient"
import { paginaDoModulo } from '@/lib/modulos/guarda'

export const metadata = { title: 'Áxis - Minhas avaliações' }
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export default async function AvaliacoesPage({ searchParams }: { searchParams: Promise<{ disciplina?: string }> }) {
  await paginaDoModulo('NOT')
  const session = await auth()
  if (!session?.user?.escolaId || can(session.user, 'portal.acessar') || !can(session.user, 'nota.lancar')) redirect("/dashboard")
  const { disciplina: disciplinaId } = await searchParams

  const cabecalho = (titulo: string, sub: string, voltar: string) => (
    <div className="flex items-center gap-4">
      <Link href={voltar} className="p-2 hover:bg-subtle-hover rounded-lg transition-colors">
        <ArrowLeft className="w-5 h-5 text-fg-muted" />
      </Link>
      <div>
        <h1 className="text-2xl font-medium text-fg flex items-center gap-2"><ListChecks className="w-6 h-6 text-fg-muted" /> {titulo}</h1>
        <p className="text-sm text-fg-muted">{sub}</p>
      </div>
    </div>
  )

  // Sem disciplina escolhida: lista as minhas
  if (!disciplinaId) {
    const disciplinas = await getDisciplinasPermitidas(session)
    return (
      <div className="max-w-3xl mx-auto space-y-6 pb-16">
        {cabecalho("Minhas avaliações", "Provas, trabalhos e atividades de cada unidade, quando o esquema da turma deixa o professor definir.", "/dashboard/notas")}
        <section className="bg-surface rounded-2xl shadow-sm border border-line p-6 divide-y divide-line-subtle">
          {disciplinas.length === 0 && <p className="text-sm text-fg-subtle">Nenhuma disciplina.</p>}
          {disciplinas.map((d) => (
            <Link key={d.id} href={`/dashboard/notas/avaliacoes?disciplina=${d.id}`} className="flex items-center justify-between py-3 text-sm text-fg hover:text-accent-fg">
              <span>{d.nome} <span className="text-fg-subtle">· {d.turma.nome}</span></span>
              <span className="text-xs text-accent-fg">Abrir</span>
            </Link>
          ))}
        </section>
      </div>
    )
  }

  const ctx = await contextoDaDisciplina(disciplinaId)
  if (!ctx) redirect("/dashboard/notas/avaliacoes")
  const { disciplina, esquema } = ctx
  const porProfessor = esquema?.definicaoAtividades === "PROFESSOR"

  const avaliacoes = porProfessor
    ? await prisma.avaliacaoDisciplina.findMany({
        where: { disciplinaId: disciplina.id },
        orderBy: [{ ordem: 'asc' }, { createdAt: 'asc' }],
        select: { id: true, esquemaUnidadeId: true, nome: true, data: true, notaMaxima: true, peso: true, _count: { select: { notas: { where: { valor: { not: null } } } } } },
      })
    : []

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-16">
      {cabecalho(`Avaliações — ${disciplina.nome}`, `${disciplina.turma.nome}${esquema ? ` · ${esquema.nome}` : ""}`, "/dashboard/notas/avaliacoes")}
      {!porProfessor ? (
        <p className="text-sm text-fg-muted bg-surface rounded-2xl border border-line p-6">
          No esquema desta turma as atividades de cada unidade são definidas pela escola. Para o professor criar as próprias avaliações, a gestão precisa marcar &quot;Atividades definidas pelo professor&quot; no esquema de avaliação.
        </p>
      ) : (
        <AvaliacoesClient
          disciplinaId={disciplina.id}
          turmaId={disciplina.turma.id}
          etapas={esquema!.unidades.map((u) => ({
            id: u.id,
            nome: u.nome,
            formaCalculo: u.formaCalculo,
            teto: notaMaximaDaEtapa(u.atividades, u.formaCalculo, u.divisor),
            avaliacoes: avaliacoes.filter((a) => a.esquemaUnidadeId === u.id).map((a) => ({
              id: a.id, nome: a.nome, data: a.data ? chaveData(a.data) : "", notaMaxima: a.notaMaxima, peso: a.peso, temNotas: a._count.notas > 0,
            })),
          }))}
        />
      )}
    </div>
  )
}
