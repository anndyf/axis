import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { ArrowLeft, TrendingUp } from "lucide-react"
import RecuperacaoPageClient from "./RecuperacaoPageClient"

export const metadata = {
  title: 'Áxis - Notas'
}

export const runtime = 'nodejs'

import { getTurmasPermitidas } from "@/lib/data-fetching"
import { Session } from "next-auth"

async function getTurmasComRecuperacao(session: Session) {
  // Buscar apenas as turmas que o usuário tem permissão
  const turmasPermitidas = await getTurmasPermitidas(session)
  const turmasIds = turmasPermitidas.map(t => t.id)

  // Busca um superset amplo (nota < 5 ou status já sinalizando recuperação),
  // refinado em JS logo abaixo com `unidades` (NotaUnidade) - não usa mais
  // "nota1/nota2/nota3 not null" pra decidir "completo", já que isso
  // hardcodeava 3 unidades e dava falso-negativo em turmas semestrais.
  const turmas = await prisma.turma.findMany({
    where: {
      id: { in: turmasIds }
    },
    include: {
      estudantes: {
        include: {
          notas: {
            where: {
              OR: [
                { nota: { lt: 5 } },
                { status: 'DESISTENTE' },
                { status: 'RECUPERACAO' }
              ]
            },
            include: {
              disciplina: true,
              unidades: { select: { notaCalculada: true } }
            }
          }
        }
      },
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

  // Refina em JS: só considera "em recuperação" quem já tem todas as
  // unidades do esquema preenchidas (senão nota < 5 pode só significar
  // "ainda não terminou de lançar", não reprovação de verdade) - status
  // RECUPERACAO/DESISTENTE já são sinal suficiente por si só.
  const turmasFiltradas = turmas.map((turma) => ({
    ...turma,
    estudantes: turma.estudantes.map((est) => ({
      ...est,
      notas: est.notas.filter((n) =>
        n.status === 'RECUPERACAO' ||
        n.status === 'DESISTENTE' ||
        (n.unidades.length > 0 && n.unidades.every((u) => u.notaCalculada !== null))
      )
    }))
  }))

  // Filtrar apenas turmas com estudantes em recuperação
  return turmasFiltradas.filter(turma =>
    turma.estudantes.some(est => est.notas.length > 0)
  ).map(turma => ({
    ...turma,
    totalRecuperacao: turma.estudantes.filter(est => est.notas.length > 0).length
  }))
}

export default async function RecuperacaoPage() {
  const session = await auth()
  
  if (!session) {
    redirect("/login")
  }

  const turmas = await getTurmasComRecuperacao(session)
  // Calcular total de estudantes em recuperação
  const totalAlunosEmRecuperacao = turmas.reduce((acc, t) => acc + t.totalRecuperacao, 0)

  return <RecuperacaoPageClient turmas={turmas} totalAlunosEmRecuperacao={totalAlunosEmRecuperacao} />
}
