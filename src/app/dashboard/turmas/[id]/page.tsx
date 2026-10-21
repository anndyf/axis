import Link from "next/link"
import { redirect } from "next/navigation"
import { ClipboardCheck, FileText, TrendingUp, Users } from "lucide-react"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { can } from "@/lib/rbac"
import { decodeTurma } from "@/lib/turma-utils"
import { turmaPermitida } from "@/lib/fichas/turma"
import { ListaDescritiva, Painel } from "@/components/ui"
import { paginaDoModulo } from '@/lib/modulos/guarda'

export const metadata = { title: 'Áxis - Turma' }
export const runtime = 'nodejs'

/** Ficha da turma, aba "Visão geral": dados da turma e acessos de trabalho. */
export default async function TurmaVisaoGeralPage({ params }: { params: Promise<{ id: string }> }) {
  await paginaDoModulo('NUC')
  const session = await auth()
  if (!session?.user?.escolaId) redirect("/login")
  const { id } = await params
  const permitida = await turmaPermitida(session, id)
  if (!permitida) redirect("/dashboard/turmas")

  const turma = await prisma.turma.findFirst({
    where: { id, escolaId: session.user.escolaId },
    select: {
      nome: true, curso: true, turno: true, modalidade: true, serie: true, numero: true, anoLetivo: true,
      esquemaAvaliacao: { select: { nome: true } },
      _count: { select: { estudantes: true, disciplinas: true } },
    },
  })
  if (!turma) redirect("/dashboard/turmas")
  const aee = await prisma.estudante.count({ where: { turmaId: id, escolaId: session.user.escolaId, aeeProfile: { isNot: null } } })

  const d = decodeTurma(turma.nome)
  const turno = turma.turno || d.turno
  const acessos = [
    ...(can(session.user, "nota.tela") ? [{ href: `/dashboard/notas/lancar/${id}`, rotulo: "Lançar notas", icone: FileText }] : []),
    ...(can(session.user, "nota.tela") ? [{ href: `/dashboard/notas/recuperacao/${id}`, rotulo: "Recuperação final", icone: TrendingUp }] : []),
    ...(can(session.user, "frequencia.lancar") ? [{ href: `/dashboard/chamada`, rotulo: "Chamada e diário", icone: ClipboardCheck }] : []),
    ...(can(session.user, "conselho.decidir") ? [{ href: `/dashboard/conselho-classe/${id}`, rotulo: "Conselho de classe", icone: Users }] : []),
  ]

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Painel titulo="Dados da turma" className="lg:col-span-2">
        <ListaDescritiva itens={[
          { rotulo: "Nome", valor: turma.nome },
          { rotulo: "Curso", valor: turma.curso || d.curso },
          { rotulo: "Modalidade", valor: turma.modalidade },
          { rotulo: "Série", valor: turma.serie },
          { rotulo: "Turno", valor: turno ? turno.charAt(0) + turno.slice(1).toLowerCase() : null },
          { rotulo: "Número", valor: turma.numero },
          { rotulo: "Ano letivo", valor: turma.anoLetivo },
          { rotulo: "Esquema de avaliação", valor: turma.esquemaAvaliacao?.nome },
          { rotulo: "Estudantes", valor: <span className="tabular-nums">{turma._count.estudantes}{aee > 0 ? ` (${aee} com ficha AEE)` : ""}</span> },
          { rotulo: "Disciplinas", valor: <span className="tabular-nums">{turma._count.disciplinas}</span> },
        ]} />
      </Painel>
      {acessos.length > 0 && (
        <Painel titulo="Trabalho com a turma" semRecuo>
          <ul className="divide-y divide-line-subtle">
            {acessos.map((a) => (
              <li key={a.href}>
                <Link href={a.href} className="flex h-11 items-center gap-2.5 px-painel text-sm text-fg transition-colors duration-150 hover:bg-subtle/60">
                  <a.icone size={16} strokeWidth={1.75} aria-hidden className="text-fg-subtle" />
                  {a.rotulo}
                </Link>
              </li>
            ))}
          </ul>
        </Painel>
      )}
    </div>
  )
}
