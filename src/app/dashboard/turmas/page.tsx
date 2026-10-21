import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import Link from "next/link"

export const metadata = {
  title: 'Áxis - Turmas'
}
import { Plus, Users } from "lucide-react"
import { CabecalhoPagina, EmptyState, Painel, buttonClasses } from "@/components/ui"

import { getTurmasPermitidas } from "@/lib/data-fetching"
import TurmasListClient from "@/components/TurmasListClient"
import { paginaDoModulo } from '@/lib/modulos/guarda'
import { can } from '@/lib/rbac'

export const runtime = 'nodejs'

export default async function TurmasPage() {
  await paginaDoModulo('NUC')
  const session = await auth()
  
  if (!session) {
    redirect("/login")
  }

  const turmas = await getTurmasPermitidas(session)


  const podeGerir = can(session.user, 'turma.gerenciar')
  const totalEstudantes = turmas.reduce((n: number, t: any) => n + (t._count?.estudantes ?? 0), 0)

  return (
    <div>
      <CabecalhoPagina
        titulo="Turmas"
        descricao="Turmas do ano letivo, com acesso à ficha de cada turma."
        dados={[{ rotulo: "Turmas", valor: turmas.length }, { rotulo: "Estudantes", valor: totalEstudantes }]}
        acoes={podeGerir ? (
          <Link href="/dashboard/turmas/nova" className={buttonClasses()}>
            <Plus size={16} strokeWidth={1.75} aria-hidden /> Nova turma
          </Link>
        ) : undefined}
      />

      {turmas.length === 0 ? (
        <Painel>
          <EmptyState
            icon={Users}
            title="Nenhuma turma encontrada"
            description="Ainda não há turmas vinculadas ao seu perfil neste ano letivo."
            action={podeGerir ? <Link href="/dashboard/turmas/nova" className={buttonClasses({ variant: "secondary" })}><Plus size={16} strokeWidth={1.75} aria-hidden /> Criar a primeira turma</Link> : undefined}
          />
        </Painel>
      ) : (
        <TurmasListClient turmas={turmas as any} />
      )}
    </div>
  )
}
