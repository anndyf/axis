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

async function getTurmaData(turmaId: string, session: Session) {
  const turma = await prisma.turma.findUnique({
    where: { id: turmaId },
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
  params
}: {
  params: Promise<{ turmaId: string }>
}) {
  const session = await auth()
  
  if (!session) {
    redirect("/login")
  }

  const { turmaId } = await params
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
    />
  )
}
