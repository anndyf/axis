import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import ResultadosClient from "./ResultadosClient"
import { etapasDaNota } from "@/lib/services/notas"
import { carregarEsquemaDaTurma, SELECT_ETAPAS_DA_NOTA } from "@/lib/services/notas-leitura"

export const metadata = {
  title: 'Áxis - Resultados'
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

async function getNotasResultados(turmaId: string, escolaId: string) {
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

  // Notas por etapa vêm de NotaUnidade, alinhadas às etapas do esquema da
  // turma (2, 3, 4... unidades) - não mais das colunas fixas nota_1/2/3.
  const esquema = await carregarEsquemaDaTurma(turma)
  const etapas = esquema?.etapas ?? []

  const notas = await prisma.notaFinal.findMany({
    where: { estudante: { turmaId, escolaId } },
    include: {
      estudante: { select: { matricula: true, nome: true } },
      disciplina: { select: { nome: true } },
      unidades: SELECT_ETAPAS_DA_NOTA
    }
  })

  // O client usa a matrícula em "estudanteId" como chave do mapa de estudantes.
  const notasResultados = notas.map((nf) => ({
    id: nf.id,
    nota: nf.nota,
    notaRecuperacao: nf.notaRecuperacao,
    status: nf.status,
    estudanteId: nf.estudante.matricula,
    estudanteNome: nf.estudante.nome,
    disciplinaId: nf.disciplinaId,
    disciplinaNome: nf.disciplina.nome,
    etapas: etapasDaNota(etapas, nf.unidades)
  }))

  return {
    turma,
    disciplinas: turma.disciplinas,
    estudantes: turma.estudantes,
    notasResultados,
    nomesEtapas: etapas.map((e) => e.nome),
    numUnidades: esquema?.config.numUnidades ?? 3,
    notaMinimaAprovacao: esquema?.config.notaMinimaAprovacao ?? 5,
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
      nomesEtapas={data.nomesEtapas}
      numUnidades={data.numUnidades}
      notaMinimaAprovacao={data.notaMinimaAprovacao}
    />
  )
}
