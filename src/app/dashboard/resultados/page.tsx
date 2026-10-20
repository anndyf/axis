import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { getTurmasPermitidas } from "@/lib/data-fetching"
import { Session } from "next-auth"
import ResultadosClient from "./ResultadosClient"
import { paginaDoModulo } from '@/lib/modulos/guarda'
import { can } from '@/lib/rbac'

export const metadata = {
  title: 'Áxis - Resultados'
}

export const runtime = 'nodejs'

async function getTurmasResultados(session: Session) {
  // Buscar apenas as turmas que o usuário tem permissão
  const turmasPermitidas = await getTurmasPermitidas(session)
  const turmasIds = turmasPermitidas.map(t => t.id)

  const turmas = await prisma.turma.findMany({
    where: {
      id: { in: turmasIds }
    },
    include: {
      _count: {
        select: {
          estudantes: true,
          disciplinas: true
        }
      }
    },
    orderBy: {
      nome: 'asc'
    }
  })

  // Add fields if they are missing from Prisma schema (as per previous context they should be there now)
  // Ensure we select curso and turno
  return turmas.map((t: any) => ({
      ...t,
      curso: t.curso || 'Ensino Médio', // Fallback
      turno: t.turno || 'Matutino'      // Fallback
  }))
}

export default async function ResultadosPage() {
  await paginaDoModulo('RES')
  const session = await auth()
  
  if (!session) {
    redirect("/login")
  }

  // Apenas Direção e TI podem ver resultados
  if (!can(session.user, 'resultado.ler')) {
    redirect("/dashboard")
  }

  const turmas = await getTurmasResultados(session)

  return <ResultadosClient turmas={turmas} />
}
