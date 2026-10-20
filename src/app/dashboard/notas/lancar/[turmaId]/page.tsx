import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import LancarNotasClient from "./LancarNotasClient"

export const metadata = {
  title: 'Áxis - Notas'
}

export const runtime = 'nodejs'

// import { getDisciplinasPermitidas } from "@/lib/data-fetching"
import { Session } from "next-auth"
import { paginaDoModulo } from '@/lib/modulos/guarda'

async function getTurmaData(turmaId: string, session: Session) {
  const turma = await prisma.turma.findUnique({
    where: { id: turmaId, escolaId: session.user.escolaId },
    include: {
      estudantes: {
        orderBy: { nome: 'asc' },
        include: {
          aeeProfile: {
            include: {
              acknowledgements: {
                where: { userId: session.user.id }
              }
            }
          }
        }
      }
    }
  })

  if (!turma) return null

  // Buscar apenas as disciplinas desta turma que o usuário tem permissão
  const whereClause: any = {
    turmaId: turmaId
  }

  if (!session.user.isSuperuser && !session.user.isDirecao) {
    whereClause.usuariosPermitidos = {
      some: {
        id: session.user.id
      }
    }
  }

  const disciplinas = await prisma.disciplina.findMany({
    where: whereClause,
    orderBy: { nome: 'asc' }
  })

  return {
    ...turma,
    disciplinas
  }
}

export default async function LancarNotasTurmaPage({
  params,
  searchParams,
}: {
  params: Promise<{ turmaId: string }>
  searchParams: Promise<{ disciplina?: string }>
}) {
  await paginaDoModulo('NOT')
  const session = await auth()
  
  if (!session) {
    redirect("/login")
  }

  const { turmaId } = await params
  const { disciplina } = await searchParams
  const turma = await getTurmaData(turmaId, session)
  
  if (!turma) {
    redirect("/dashboard/notas")
  }

  return (
    <LancarNotasClient
      turmaId={turma.id}
      turmaNome={turma.nome}
      disciplinas={turma.disciplinas}
      estudantes={turma.estudantes}
      // ?disciplina= (atalho do início do professor) só vale se for uma das disciplinas liberadas acima
      disciplinaInicial={turma.disciplinas.find((d) => d.id === disciplina)?.id ?? ""}
    />
  )
}
