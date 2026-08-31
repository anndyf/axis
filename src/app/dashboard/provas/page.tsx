import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import GeradorProvasClient from "./GeradorProvasClient"

export const runtime = 'nodejs'

export default async function ProvasPage() {
  const session = await auth()
  
  if (!session || (!session.user.isSuperuser && !session.user.isDirecao)) {
    redirect("/dashboard")
  }

  const turmas = await prisma.turma.findMany({
    where: { escolaId: session.user.escolaId },
    orderBy: { nome: 'asc' },
    select: {
      id: true, 
      nome: true,
      serie: true,
      curso: true,
      turno: true,
      disciplinas: {
        select: { 
          id: true, 
          nome: true,
          _count: {
            select: {
              questoes: {
                where: { status: 'APROVADA' }
              }
            }
          }
        }
      },
      _count: {
        select: { 
          questoes: {
            where: { status: 'APROVADA' }
          }
        }
      }
    }
  })

  const escola = await prisma.escola.findUnique({
    where: { id: session.user.escolaId },
    select: { nome: true, logoUrl: true }
  })

  return (
    <GeradorProvasClient
      user={session.user}
      turmas={turmas}
      nomeEscola={escola?.nome || 'Áxis'}
      logoUrl={escola?.logoUrl}
    />
  )
}
