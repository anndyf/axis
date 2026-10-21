import Link from "next/link"
import { redirect } from "next/navigation"
import { Pencil } from "lucide-react"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { can } from "@/lib/rbac"
import { turmaPermitida } from "@/lib/fichas/turma"
import { ListaDescritiva, Painel, RodapeRastreio, buttonClasses } from "@/components/ui"
import { podeVerHistorico, ultimaAlteracao } from "@/lib/services/historico-leitura"
import { paginaDoModulo } from '@/lib/modulos/guarda'

export const metadata = { title: 'Áxis - Estudante' }
export const runtime = 'nodejs'

const dataBR = (d: Date | null) => (d ? d.toLocaleDateString("pt-BR", { timeZone: "UTC" }) : null)
const SEXO: Record<string, string> = { M: "Masculino", F: "Feminino" }

/**
 * Ficha do estudante, aba "Dados" (modo leitura). Mesmo acesso da lista de
 * estudantes: direção vê a escola; professor, só alunos das suas turmas.
 * "Editar" abre o formulário de sempre.
 */
export default async function EstudanteDadosPage({ params }: { params: Promise<{ id: string }> }) {
  await paginaDoModulo('NUC')
  const session = await auth()
  if (!session?.user?.escolaId) redirect("/login")
  if (!can(session.user, "estudante.ler")) redirect("/dashboard")
  const { id } = await params

  const estudante = await prisma.estudante.findUnique({
    where: { escolaId_matricula: { escolaId: session.user.escolaId, matricula: id } },
    select: {
      nome: true, matricula: true, status: true, dataNascimento: true, sexo: true, createdAt: true, updatedAt: true,
      turma: { select: { id: true, nome: true, curso: true, turno: true, anoLetivo: true } },
      turmaAnterior: { select: { nome: true, anoLetivo: true } },
      aeeProfile: { select: { id: true } },
      _count: { select: { portalAccess: true, notas: true } },
    },
  })
  if (!estudante) redirect("/dashboard/estudantes")
  if (!can(session.user, "escopo.escola") && !(await turmaPermitida(session, estudante.turma.id))) redirect("/dashboard/estudantes")
  // Autor da última alteração só para quem já vê a auditoria; os demais veem só as datas
  const ultima = podeVerHistorico(session.user) ? await ultimaAlteracao(session.user.escolaId, "ESTUDANTE", estudante.matricula) : null

  return (
    <div className="grid gap-4 lg:grid-cols-3 lg:items-start">
      <Painel
        titulo="Dados do estudante"
        className="lg:col-span-2"
        rodape={<RodapeRastreio criadoEm={estudante.createdAt} {...(ultima ? { alteradoEm: ultima.quando, alteradoPor: ultima.autor, fusoAlteracao: "UTC" as const } : { alteradoEm: estudante.updatedAt })} />}
        acoes={can(session.user, "estudante.editar") ? (
          <Link href={`/dashboard/estudantes/${encodeURIComponent(estudante.matricula)}/editar`} className={buttonClasses({ variant: "secondary", size: "sm" })}>
            <Pencil size={14} strokeWidth={1.75} aria-hidden /> Editar
          </Link>
        ) : undefined}
      >
        <ListaDescritiva itens={[
          { rotulo: "Nome completo", valor: estudante.nome, largo: true },
          { rotulo: "Matrícula", valor: <span className="font-mono">{estudante.matricula}</span> },
          { rotulo: "Situação", valor: estudante.status ? estudante.status.charAt(0) + estudante.status.slice(1).toLowerCase() : null },
          { rotulo: "Data de nascimento", valor: dataBR(estudante.dataNascimento) },
          { rotulo: "Sexo", valor: estudante.sexo ? SEXO[estudante.sexo] ?? estudante.sexo : null },
        ]} />
      </Painel>
      <Painel titulo="Vínculo escolar">
        <ListaDescritiva colunas={1} itens={[
          { rotulo: "Turma", valor: <Link href={`/dashboard/turmas/${estudante.turma.id}`} className="text-accent-fg hover:underline">{estudante.turma.nome}</Link> },
          { rotulo: "Curso", valor: estudante.turma.curso },
          { rotulo: "Ano letivo", valor: estudante.turma.anoLetivo },
          { rotulo: "Turma anterior", valor: estudante.turmaAnterior ? `${estudante.turmaAnterior.nome}${estudante.turmaAnterior.anoLetivo ? ` (${estudante.turmaAnterior.anoLetivo})` : ""}` : null },
          { rotulo: "Acesso ao portal", valor: estudante._count.portalAccess > 0 ? "Ativo" : "Não ativado" },
          { rotulo: "Ficha AEE", valor: estudante.aeeProfile ? "Sim" : "Não" },
        ]} />
      </Painel>
    </div>
  )
}
