import Link from "next/link"
import { Pencil } from "lucide-react"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { can } from "@/lib/rbac"
import { decodeTurma } from "@/lib/turma-utils"
import { CabecalhoPagina, buttonClasses } from "@/components/ui"
import { Abas } from "@/components/ui/Abas"
import { abasDaTurma } from "@/lib/fichas/abas"
import { permissoesFichaTurma } from "@/lib/fichas/permissoes"

/**
 * Ficha da turma: cabeçalho com os dados-chave e abas para as telas da
 * turma (cada aba é uma rota filha). Só lê nome e contagens da turma da
 * escola da sessão; cada tela confere o próprio acesso.
 */
export default async function FichaTurmaLayout({ children, params }: { children: React.ReactNode; params: Promise<{ id: string }> }) {
  const session = await auth()
  const { id } = await params
  if (!session?.user?.escolaId) return children

  const turma = await prisma.turma.findFirst({
    where: { id, escolaId: session.user.escolaId },
    select: { id: true, nome: true, curso: true, turno: true, anoLetivo: true, _count: { select: { estudantes: true, disciplinas: true } } },
  })
  if (!turma) return children

  const decodificada = decodeTurma(turma.nome)
  const curso = turma.curso || decodificada.curso
  const turno = turma.turno || decodificada.turno
  const permissoes = await permissoesFichaTurma(session.user, session.user.escolaId)

  return (
    <div>
      <CabecalhoPagina
        titulo={`Turma ${turma.nome}`}
        caminho={[{ label: "Início", href: "/dashboard" }, { label: "Turmas", href: "/dashboard/turmas" }, { label: turma.nome }]}
        dados={[
          ...(curso ? [{ rotulo: "Curso", valor: curso }] : []),
          ...(turno ? [{ rotulo: "Turno", valor: turno.charAt(0) + turno.slice(1).toLowerCase() }] : []),
          ...(turma.anoLetivo ? [{ rotulo: "Ano letivo", valor: turma.anoLetivo }] : []),
          { rotulo: "Estudantes", valor: turma._count.estudantes },
          { rotulo: "Disciplinas", valor: turma._count.disciplinas },
        ]}
        acoes={can(session.user, "turma.gerenciar") ? (
          <Link href={`/dashboard/turmas/${turma.id}/editar`} className={buttonClasses({ variant: "secondary", size: "sm" })}>
            <Pencil size={14} strokeWidth={1.75} aria-hidden /> Editar turma
          </Link>
        ) : undefined}
        abas={<Abas rotulo={`Seções da turma ${turma.nome}`} itens={abasDaTurma(turma.id, permissoes)} />}
      />
      {children}
    </div>
  )
}
