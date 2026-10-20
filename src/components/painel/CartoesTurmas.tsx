"use client"

import Link from "next/link"
import { useState } from "react"
import { BookOpenCheck, ClipboardCheck, FileText } from "lucide-react"
import type { CartaoTurmaDisciplina } from "@/lib/services/inicio-professor"
import { Badge, Fichas, cn } from "@/components/ui"

const ACAO = "flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-xl px-2 text-13 font-medium transition-colors duration-150"

/**
 * "Minhas turmas" do professor: fichas de filtro por turma e um cartão por
 * turma × disciplina com Chamada · Notas · Diário (as três ações por linha
 * do SIGEduc). O nome da disciplina quebra linha, nunca é cortado.
 */
export default function CartoesTurmas({ cartoes, turmas }: { cartoes: CartaoTurmaDisciplina[]; turmas: { id: string; nome: string }[] }) {
  const [turma, setTurma] = useState("todas")
  const visiveis = turma === "todas" ? cartoes : cartoes.filter((c) => c.turmaId === turma)

  return (
    <div className="space-y-3">
      {turmas.length > 1 && (
        <Fichas rotulo="Filtrar por turma" valor={turma} onChange={setTurma} opcoes={[{ valor: "todas", rotulo: "Todas" }, ...turmas.map((t) => ({ valor: t.id, rotulo: t.nome }))]} />
      )}
      <ul className="grid gap-3 grid-cols-[repeat(auto-fill,minmax(min(100%,19rem),1fr))]">
        {visiveis.map((c) => (
          <li key={c.chave} className="flex min-w-0 flex-col rounded-2xl border border-line bg-surface p-4 shadow-card">
            <div className="flex items-start gap-3">
              <div className="min-w-0 flex-1">
                <h3 className="break-words text-base font-semibold leading-snug text-fg">{c.nome}</h3>
                <p className="mt-0.5 text-13 text-fg-subtle">
                  <span className="font-mono">{c.turmaNome}</span> · {c.alunos} {c.alunos === 1 ? "aluno" : "alunos"}
                  {c.temAulaHoje && <> · <span className="font-medium text-accent-fg">aula hoje</span></>}
                </p>
              </div>
            </div>
            {(c.chamadasPendentes > 0 || c.semNota > 0) && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {c.chamadasPendentes > 0 && (
                  <Badge tone="warning" dot>{c.chamadasPendentes} {c.chamadasPendentes === 1 ? "chamada pendente" : "chamadas pendentes"}{c.chamadaDiaria && " (turma)"}</Badge>
                )}
                {c.semNota > 0 && <Badge tone="neutral">{c.semNota} sem nota</Badge>}
              </div>
            )}
            <div className="mt-auto flex gap-2 pt-4">
              <Link
                href={c.links.chamada}
                aria-label={`Chamada: ${c.nome}, ${c.turmaNome}`}
                className={cn(ACAO, c.temAulaHoje || c.chamadasPendentes > 0 ? "bg-accent text-on-accent hover:bg-accent-hover" : "bg-subtle text-fg hover:bg-subtle-hover")}
              >
                <ClipboardCheck size={16} strokeWidth={1.75} aria-hidden /> Chamada
              </Link>
              <Link href={c.links.notas} aria-label={`Notas: ${c.nome}, ${c.turmaNome}`} className={cn(ACAO, "bg-subtle text-fg hover:bg-subtle-hover")}>
                <FileText size={16} strokeWidth={1.75} aria-hidden /> Notas
              </Link>
              <Link href={c.links.diario} aria-label={`Diário: ${c.nome}, ${c.turmaNome}`} className={cn(ACAO, "bg-subtle text-fg hover:bg-subtle-hover")}>
                <BookOpenCheck size={16} strokeWidth={1.75} aria-hidden /> Diário
              </Link>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
