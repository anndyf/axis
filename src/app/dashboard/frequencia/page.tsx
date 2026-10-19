import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import { prisma } from "@/lib/prisma"
import { can } from "@/lib/rbac"
import { getTurmasPermitidas } from "@/lib/data-fetching"
import { carregarFrequenciaDaTurma } from "@/lib/services/frequencia-leitura"
import { linhasInfrequencia, formatarFrequencia } from "@/lib/services/frequencia"
import { chaveData } from "@/lib/services/calendario"
import { ArrowLeft, UserX, AlertTriangle } from "lucide-react"
import SeletorTurma from "./SeletorTurma"
import JustificativasClient from "./JustificativasClient"

export const metadata = { title: 'Áxis - Frequência' }
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const COR_RISCO: Record<string, string> = {
  CRITICAL: "text-rose-700 bg-rose-50 border-rose-200",
  HIGH: "text-orange-700 bg-orange-50 border-orange-200",
  MEDIUM: "text-amber-700 bg-amber-50 border-amber-200",
  LOW: "text-green-700 bg-green-50 border-green-200",
  NONE: "text-slate-500 bg-slate-50 border-slate-200",
}

export default async function FrequenciaPage({ searchParams }: { searchParams: Promise<{ turma?: string; todos?: string }> }) {
  const session = await auth()
  if (!session?.user?.escolaId || session.user.isPortalUser || !can(session.user, 'gestao')) redirect("/dashboard")
  const escolaId = session.user.escolaId
  const { turma: turmaId, todos } = await searchParams

  const turmas = (await getTurmasPermitidas(session)).map((t) => ({ id: t.id, nome: t.nome }))
  const turma = turmaId ? await prisma.turma.findFirst({ where: { id: turmaId, escolaId }, select: { id: true, nome: true } }) : null

  const card = "bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-4"
  let conteudo: React.ReactNode = <p className="text-sm text-slate-500">Escolha uma turma.</p>

  if (turma) {
    const [frequencia, alunos, disciplinas, justificativas] = await Promise.all([
      carregarFrequenciaDaTurma(escolaId, turma.id),
      prisma.estudante.findMany({ where: { turmaId: turma.id, escolaId }, orderBy: { nome: 'asc' }, select: { id: true, nome: true, matricula: true } }),
      prisma.disciplina.findMany({ where: { turmaId: turma.id }, select: { id: true, nome: true } }),
      prisma.justificativa.findMany({
        where: { escolaId, estudante: { turmaId: turma.id } },
        orderBy: { inicio: 'desc' },
        take: 100,
        select: { id: true, estudanteId: true, inicio: true, fim: true, tipo: true, efeito: true, descricao: true, registradoPor: { select: { name: true, username: true } } },
      }),
    ])
    const nomeAluno = new Map(alunos.map((a) => [a.id, a]))
    const nomeDisc = new Map(disciplinas.map((d) => [d.id, d.nome]))
    const linhas = frequencia ? linhasInfrequencia(alunos.map((a) => a.id), frequencia.porAluno, frequencia.regra, frequencia.aulasRestantes, todos === "1") : []

    conteudo = (
      <>
        <section className={card}>
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="font-medium text-slate-800 flex-1 flex items-center gap-2"><UserX className="w-4 h-4" /> Infrequência — {turma.nome}</h2>
            <Link href={`/dashboard/frequencia?turma=${turma.id}${todos === "1" ? "" : "&todos=1"}`} className="text-xs font-medium text-blue-700 hover:underline">
              {todos === "1" ? "Só abaixo ou perto do mínimo" : "Mostrar a turma toda"}
            </Link>
          </div>
          {frequencia && (
            <p className="text-sm text-slate-600">
              Mínimo de <strong>{frequencia.regra.minimo}%</strong> {frequencia.regra.apuracao === "GERAL" ? "do total de aulas" : "em cada disciplina"}.
              {" "}{frequencia.aulasRestantes.total} {frequencia.registro === "POR_DIA" ? "dias letivos" : "aulas"} ainda previstas até o fim do ano letivo.
            </p>
          )}
          {!frequencia?.temChamada && <p className="text-sm text-slate-500">Nenhuma chamada salva nesta turma ainda.</p>}
          {frequencia?.temChamada && linhas.length === 0 && <p className="text-sm text-green-700">Nenhum aluno abaixo ou perto da frequência mínima.</p>}
          {linhas.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-xs text-slate-500 uppercase tracking-wide">
                  <tr className="border-b border-slate-200">
                    <th className="py-2 text-left font-medium">Aluno</th>
                    <th className="py-2 text-center font-medium">Freq.</th>
                    <th className="py-2 text-center font-medium" title="Faltas que contam / aulas">Faltas</th>
                    <th className="py-2 text-center font-medium" title="Faltas sem atestado nem justificativa (ECA, art. 56)">Sem justif.</th>
                    <th className="py-2 text-center font-medium" title="Quantas faltas ainda cabem até o fim do ano letivo">Pode faltar</th>
                    <th className="py-2 text-left font-medium">Risco</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {linhas.map((l) => {
                    const aluno = nomeAluno.get(l.estudanteId)
                    return (
                      <tr key={l.estudanteId}>
                        <td className="py-2">
                          <Link href={`/dashboard/estudantes/${aluno?.matricula}/boletim`} className="text-slate-800 hover:underline">{aluno?.nome}</Link>
                          {l.disciplinaId && <span className="block text-xs text-slate-400">{nomeDisc.get(l.disciplinaId)}</span>}
                        </td>
                        <td className={`py-2 text-center font-medium ${l.percentual !== null && frequencia && l.percentual < frequencia.regra.minimo ? "text-rose-600" : "text-slate-700"}`}>{formatarFrequencia(l.percentual)}</td>
                        <td className="py-2 text-center text-slate-700">{l.faltas - l.faltasAbonadas} / {l.aulas}</td>
                        <td className="py-2 text-center text-slate-700">{l.faltasSemJustificativa}</td>
                        <td className="py-2 text-center text-slate-700">{l.faltasRestantesPermitidas === null ? "—" : Math.max(0, l.faltasRestantesPermitidas)}</td>
                        <td className="py-2"><span className={`text-xs border rounded-full px-2 py-0.5 ${COR_RISCO[l.risco.level]}`}>{l.risco.message}</span></td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
          {linhas.some((l) => l.faltasSemJustificativa >= 5) && (
            <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-3 flex gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              Faltas reiteradas sem justificativa devem ser comunicadas ao Conselho Tutelar depois de esgotados os recursos da escola (ECA, art. 56, II).
            </p>
          )}
        </section>

        <JustificativasClient
          alunos={alunos.map((a) => ({ id: a.id, nome: a.nome, matricula: a.matricula }))}
          justificativas={justificativas.map((j) => ({
            id: j.id,
            aluno: nomeAluno.get(j.estudanteId)?.nome ?? "",
            inicio: chaveData(j.inicio),
            fim: chaveData(j.fim),
            tipo: j.tipo,
            efeito: j.efeito,
            descricao: j.descricao ?? "",
            registradoPor: j.registradoPor ? (j.registradoPor.name || j.registradoPor.username) : "",
          }))}
        />
      </>
    )
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-16">
      <div className="flex flex-wrap items-center gap-4">
        <Link href="/dashboard" className="p-2 hover:bg-slate-200 rounded-lg transition-colors">
          <ArrowLeft className="w-5 h-5 text-slate-700" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-medium text-blue-900 flex items-center gap-2">
            <UserX className="w-6 h-6 text-slate-700" /> Frequência
          </h1>
          <p className="text-sm text-slate-600">Infrequência por turma e cadastro de atestados e justificativas.</p>
        </div>
        <SeletorTurma turmas={turmas} atual={turma?.id ?? ""} />
      </div>
      {conteudo}
    </div>
  )
}
