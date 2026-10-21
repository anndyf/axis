import type { Session } from "next-auth"
import { prisma } from "@/lib/prisma"
import { can } from "@/lib/rbac"
import { CabecalhoPagina, Badge } from "@/components/ui"
import { Abas } from "@/components/ui/Abas"
import { abasDoEstudante } from "@/lib/fichas/abas"
import { permissoesFichaEstudante } from "@/lib/fichas/permissoes"

/**
 * Cabeçalho da ficha do estudante (nome, matrícula, turma) com as abas.
 * Usado nas telas do estudante e na ficha AEE. Lê só nome, matrícula e
 * turma, na escola da sessão; null se o estudante não existir nela ou se o
 * usuário não puder ver a ficha de estudante.
 */
export default async function CabecalhoFichaEstudante({ session, matricula }: { session: Session; matricula: string }) {
  if (!session.user?.escolaId || !can(session.user, "estudante.ler")) return null
  const estudante = await prisma.estudante.findUnique({
    where: { escolaId_matricula: { escolaId: session.user.escolaId, matricula } },
    select: { nome: true, matricula: true, status: true, turma: { select: { id: true, nome: true } }, aeeProfile: { select: { id: true } } },
  })
  if (!estudante) return null
  const permissoes = await permissoesFichaEstudante(session.user, session.user.escolaId, !!estudante.aeeProfile)

  return (
    <CabecalhoPagina
      titulo={<span className="inline-flex flex-wrap items-center gap-2">{estudante.nome}{estudante.aeeProfile && <Badge tone="accent">AEE</Badge>}</span>}
      caminho={[{ label: "Início", href: "/dashboard" }, { label: "Estudantes", href: "/dashboard/estudantes" }, { label: estudante.nome }]}
      dados={[
        { rotulo: "Matrícula", valor: <span className="font-mono">{estudante.matricula}</span> },
        { rotulo: "Turma", valor: estudante.turma.nome },
        ...(estudante.status && estudante.status !== "ATIVO" ? [{ rotulo: "Situação", valor: estudante.status.charAt(0) + estudante.status.slice(1).toLowerCase() }] : []),
      ]}
      abas={<Abas rotulo={`Seções da ficha de ${estudante.nome}`} itens={abasDoEstudante(estudante.matricula, permissoes)} />}
    />
  )
}
