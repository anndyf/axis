import Link from "next/link"
import { prisma } from "@/lib/prisma"
import { carregarFrequenciaDaTurma } from "@/lib/services/frequencia-leitura"
import { linhasInfrequencia, formatarFrequencia } from "@/lib/services/frequencia"
import { chaveData } from "@/lib/services/calendario"
import { ClipboardCheck, CheckCircle2 } from "lucide-react"
import { Alert, Badge, Card, CardHeader, EmptyState, buttonClasses, type BadgeTone } from "@/components/ui"
import JustificativasClient from "./JustificativasClient"

const TOM_RISCO: Record<string, BadgeTone> = { CRITICAL: "danger", HIGH: "danger", MEDIUM: "warning", LOW: "success", NONE: "neutral" }

/**
 * Infrequência e justificativas de uma turma (tela Frequência e aba
 * Frequência da ficha da turma). `base`: endereço da tela que mostra, para o
 * botão "Mostrar a turma toda" continuar nela. A turma já vem conferida na
 * escola da sessão.
 */
export default async function ConteudoFrequencia({ escolaId, turma, todos, base }: {
  escolaId: string
  turma: { id: string; nome: string }
  todos?: string
  base: string
}) {
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

    return (
      <>
        <Card className="overflow-hidden">
          <CardHeader
            title={`Infrequência — ${turma.nome}`}
            description={frequencia ? `Mínimo de ${frequencia.regra.minimo}% ${frequencia.regra.apuracao === "GERAL" ? "do total de aulas" : "em cada disciplina"} · ${frequencia.aulasRestantes.total} ${frequencia.registro === "POR_DIA" ? "dias letivos" : "aulas"} ainda previstas até o fim do ano letivo` : undefined}
            actions={
              <Link href={`${base}${todos === "1" ? "" : `${base.includes("?") ? "&" : "?"}todos=1`}`} className={buttonClasses({ variant: "secondary", size: "sm" })}>
                {todos === "1" ? "Só abaixo ou perto do mínimo" : "Mostrar a turma toda"}
              </Link>
            }
          />
          {!frequencia?.temChamada && <EmptyState icon={ClipboardCheck} title="Nenhuma chamada salva nesta turma ainda" description="A frequência aparece depois que os professores salvarem as primeiras chamadas." />}
          {frequencia?.temChamada && linhas.length === 0 && <EmptyState icon={CheckCircle2} title="Ninguém abaixo ou perto da frequência mínima" description="Use “Mostrar a turma toda” para ver todos os alunos." />}
          {linhas.length > 0 && (
            <ul className="divide-y divide-line-subtle md:hidden">
              {linhas.map((l) => {
                const aluno = nomeAluno.get(l.estudanteId)
                const abaixo = l.percentual !== null && !!frequencia && l.percentual < frequencia.regra.minimo
                return (
                  <li key={`m-${l.estudanteId}-${l.disciplinaId ?? ""}`}>
                    <Link href={`/dashboard/estudantes/${aluno?.matricula}/boletim`} className="block px-4 py-3 transition-colors duration-150 hover:bg-subtle/60">
                      <div className="flex items-start gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="break-words text-sm font-medium text-fg">{aluno?.nome}</p>
                          {l.disciplinaId && <p className="text-xs text-fg-subtle">{nomeDisc.get(l.disciplinaId)}</p>}
                          <div className="mt-1"><Badge tone={TOM_RISCO[l.risco.level]} dot>{l.risco.message}</Badge></div>
                        </div>
                        <p className={`shrink-0 text-lg font-semibold tabular-nums ${abaixo ? "text-danger-fg" : "text-fg"}`}>{formatarFrequencia(l.percentual)}</p>
                      </div>
                      <dl className="mt-2 grid grid-cols-3 gap-2 text-center">
                        <div className="rounded-xl bg-subtle px-2 py-1.5"><dt className="text-[11px] text-fg-subtle">Faltas</dt><dd className="text-13 font-medium tabular-nums text-fg">{l.faltas - l.faltasAbonadas} / {l.aulas}</dd></div>
                        <div className="rounded-xl bg-subtle px-2 py-1.5"><dt className="text-[11px] text-fg-subtle">Sem justif.</dt><dd className="text-13 font-medium tabular-nums text-fg">{l.faltasSemJustificativa}</dd></div>
                        <div className="rounded-xl bg-subtle px-2 py-1.5"><dt className="text-[11px] text-fg-subtle">Pode faltar</dt><dd className="text-13 font-medium tabular-nums text-fg">{l.faltasRestantesPermitidas === null ? "—" : Math.max(0, l.faltasRestantesPermitidas)}</dd></div>
                      </dl>
                    </Link>
                  </li>
                )
              })}
            </ul>
          )}
          {linhas.length > 0 && (
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[40rem] text-13">
                <thead>
                  <tr className="border-b border-line text-xs text-fg-subtle">
                    <th scope="col" className="h-9 px-4 text-left font-medium sm:px-5">Aluno</th>
                    <th scope="col" className="h-9 px-3 text-right font-medium">Freq.</th>
                    <th scope="col" className="h-9 px-3 text-right font-medium" title="Faltas que contam / aulas">Faltas</th>
                    <th scope="col" className="h-9 px-3 text-right font-medium" title="Faltas sem atestado nem justificativa (ECA, art. 56)">Sem justificativa</th>
                    <th scope="col" className="h-9 px-3 text-right font-medium" title="Quantas faltas ainda cabem até o fim do ano letivo">Pode faltar</th>
                    <th scope="col" className="h-9 px-4 text-left font-medium sm:px-5">Risco</th>
                  </tr>
                </thead>
                <tbody>
                  {linhas.map((l) => {
                    const aluno = nomeAluno.get(l.estudanteId)
                    const abaixo = l.percentual !== null && !!frequencia && l.percentual < frequencia.regra.minimo
                    return (
                      <tr key={l.estudanteId} className="border-b border-line-subtle transition-colors duration-150 last:border-0 hover:bg-subtle/60">
                        <td className="h-10 px-4 sm:px-5">
                          <Link href={`/dashboard/estudantes/${aluno?.matricula}/boletim`} className="text-fg hover:underline">{aluno?.nome}</Link>
                          {l.disciplinaId && <span className="block text-xs text-fg-subtle">{nomeDisc.get(l.disciplinaId)}</span>}
                        </td>
                        <td className={`h-10 px-3 text-right tabular-nums ${abaixo ? "font-medium text-danger-fg" : "text-fg"}`}>{formatarFrequencia(l.percentual)}</td>
                        <td className="h-10 px-3 text-right tabular-nums text-fg-muted">{l.faltas - l.faltasAbonadas} / {l.aulas}</td>
                        <td className="h-10 px-3 text-right tabular-nums text-fg-muted">{l.faltasSemJustificativa}</td>
                        <td className="h-10 px-3 text-right tabular-nums text-fg-muted">{l.faltasRestantesPermitidas === null ? "—" : Math.max(0, l.faltasRestantesPermitidas)}</td>
                        <td className="h-10 px-4 sm:px-5"><Badge tone={TOM_RISCO[l.risco.level]} dot>{l.risco.message}</Badge></td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
          {linhas.some((l) => l.faltasSemJustificativa >= 5) && (
            <div className="border-t border-line-subtle p-4 sm:px-5">
              <Alert tone="warning">Faltas reiteradas sem justificativa devem ser comunicadas ao Conselho Tutelar depois de esgotados os recursos da escola (ECA, art. 56, II).</Alert>
            </div>
          )}
        </Card>

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
