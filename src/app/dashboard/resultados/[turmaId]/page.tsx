import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import ResultadosClient from "./ResultadosClient"

export const metadata = {
  title: 'Áxis - Resultados'
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

async function getNotasResultados(turmaId: string, escolaId: string) {
  // Usamos Row SQL para contornar o cache do Prisma Client desatualizado no servidor Next.js dev
  // e garantir que os campos nota_1, nota_2 e nota_3 sejam lidos corretamente.
  try {
    // "estudante_id" guarda o id tecnico do estudante desde a Migration 3b (nao mais
    // a matricula) - o JOIN precisa ser por e.id, e o frontend (ResultadosClient.tsx)
    // espera a matricula de volta em "estudanteId" (usa como chave do mapa de estudantes).
    const rawNotas = await prisma.$queryRaw<any[]>`
      SELECT
        nf.id,
        nf.nota,
        nf."nota_1" as "nota1",
        nf."nota_2" as "nota2",
        nf."nota_3" as "nota3",
        nf."nota_recuperacao" as "notaRecuperacao",
        nf.status,
        nf."is_desistente_unid1" as "isDesistenteUnid1",
        nf."is_desistente_unid2" as "isDesistenteUnid2",
        nf."is_desistente_unid3" as "isDesistenteUnid3",
        e.matricula as "estudanteId",
        e.nome as "estudanteNome",
        nf."disciplina_id" as "disciplinaId",
        d.nome as "disciplinaNome"
      FROM "notas_finais" nf
      INNER JOIN "estudantes" e ON e.id = nf."estudante_id"
      INNER JOIN "disciplinas" d ON d.id = nf."disciplina_id"
      WHERE e."turma_id" = ${turmaId} AND e."escola_id" = ${escolaId}
    `

    const turma = await prisma.turma.findUnique({
      where: { id: turmaId, escolaId },
      include: {
        disciplinas: {
          orderBy: { nome: 'asc' }
        },
        estudantes: {
          select: { matricula: true, nome: true },
          orderBy: { nome: 'asc' }
        }
      }
    })

    if (!turma) return null

    return {
      turma,
      disciplinas: turma.disciplinas,
      estudantes: turma.estudantes,
      notasResultados: rawNotas
    }
  } catch (error) {
    console.error("Erro ao buscar notas via SQL na página de resultados:", error)
    return null
  }
}

export default async function ResultadosTurmaPage({
  params
}: {
  params: Promise<{ turmaId: string }>
}) {
  const session = await auth()

  if (!session?.user?.escolaId) {
    redirect("/login")
  }

  const { turmaId } = await params
  const data = await getNotasResultados(turmaId, session.user.escolaId)

  if (!data) {
    redirect("/dashboard/resultados")
  }

  return (
    <ResultadosClient
      turmaId={data.turma.id}
      turmaNome={data.turma.nome}
      disciplinas={data.disciplinas}
      initialNotas={data.notasResultados}
      initialEstudantes={data.estudantes}
    />
  )
}
