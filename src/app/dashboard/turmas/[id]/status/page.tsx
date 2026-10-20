import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import RelatorioStatusClient from "./RelatorioStatusClient"
import { carregarEsquemaDaTurma, SELECT_ETAPAS_DA_NOTA } from "@/lib/services/notas-leitura"
import { etapasDaNota } from "@/lib/services/notas"
import { paginaDoModulo } from '@/lib/modulos/guarda'

export const metadata = {
  title: 'Áxis - Turmas'
}

export const runtime = 'nodejs'

async function getRelatorioStatus(turmaId: string, escolaId: string) {
  return await prisma.turma.findUnique({
    where: { id: turmaId, escolaId },
    include: {
      disciplinas: {
        orderBy: { nome: 'asc' }
      },
      estudantes: {
        include: {
          aeeProfile: { select: { id: true } },
          notas: {
            include: {
              disciplina: true,
              unidades: SELECT_ETAPAS_DA_NOTA
            }
          }
        },
        orderBy: { nome: 'asc' }
      }
    }
  })
}

export default async function RelatorioStatusPage({
  params
}: {
  params: Promise<{ id: string }>
}) {
  await paginaDoModulo('RES')
  const session = await auth()

  if (!session?.user?.escolaId) {
    redirect("/login")
  }

  const { id } = await params
  const turma = await getRelatorioStatus(id, session.user.escolaId)

  if (!turma) {
    redirect("/dashboard/turmas")
  }

  const esquema = await carregarEsquemaDaTurma(turma)
  const etapas = esquema?.etapas ?? []
  const turmaComEtapas = {
    ...turma,
    estudantes: turma.estudantes.map((e) => ({
      ...e,
      notas: e.notas.map((n) => ({ ...n, etapas: etapasDaNota(etapas, n.unidades) })),
    })),
  }

  return (
    <RelatorioStatusClient
      turma={turmaComEtapas}
      nomesEtapas={etapas.map((e) => e.nome)}
      notaMinimaAprovacao={esquema?.config.notaMinimaAprovacao ?? 5}
    />
  )
}
