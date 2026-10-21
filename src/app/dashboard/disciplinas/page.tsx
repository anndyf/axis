import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Plus, BookOpen } from "lucide-react"
import { CabecalhoPagina, EmptyState, Painel, buttonClasses } from "@/components/ui"
import { getDisciplinasPermitidas } from "@/lib/data-fetching"
import DisciplinasList from "./DisciplinasList"
import { paginaDoModulo } from '@/lib/modulos/guarda'
import { can } from '@/lib/rbac'

export const metadata = {
  title: 'Áxis - Disciplinas'
}

export const runtime = 'nodejs'

export default async function DisciplinasPage() {
  await paginaDoModulo('NUC')
  const session = await auth()
  
  if (!session) {
    redirect("/login")
  }

  const disciplinas = await getDisciplinasPermitidas(session)

  const podeGerir = can(session.user, 'disciplina.gerenciar')

  return (
    <div className="pb-24 md:pb-0">
      <CabecalhoPagina
        titulo="Disciplinas"
        descricao="Disciplinas das turmas do ano letivo."
        dados={[{ rotulo: "Disciplinas", valor: disciplinas.length }]}
        acoes={podeGerir ? (
          <Link href="/dashboard/disciplinas/nova" className={buttonClasses()}>
            <Plus size={16} strokeWidth={1.75} aria-hidden /> Nova disciplina
          </Link>
        ) : undefined}
      />
      {disciplinas.length === 0 ? (
        <Painel>
          <EmptyState
            icon={BookOpen}
            title="Nenhuma disciplina cadastrada"
            description="Cadastre a primeira disciplina ou gere as disciplinas pela matriz curricular."
            action={podeGerir ? <Link href="/dashboard/disciplinas/nova" className={buttonClasses({ variant: "secondary" })}><Plus size={16} strokeWidth={1.75} aria-hidden /> Cadastrar disciplina</Link> : undefined}
          />
        </Painel>
      ) : (
        <DisciplinasList disciplinas={disciplinas} />
      )}
    </div>
  )
}
