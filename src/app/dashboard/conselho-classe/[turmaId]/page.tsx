import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import ConselhoClasseClient from "./ConselhoClasseClient"
import { carregarEsquemaDaTurma, SELECT_ETAPAS_DA_NOTA } from "@/lib/services/notas-leitura"
import { etapasDaNota } from "@/lib/services/notas"

export const metadata = {
  title: 'Áxis - Conselho classe'
}

export const runtime = 'nodejs'

async function getNotasConselho(turmaId: string, escolaId: string) {
  const turma = await prisma.turma.findUnique({
    where: { id: turmaId, escolaId },
    include: {
      estudantes: {
        include: {
          notas: {
            include: {
              disciplina: true,
              unidades: SELECT_ETAPAS_DA_NOTA
            }
          }
        }
      }
    }
  })

  if (!turma) return null

  const esquema = await carregarEsquemaDaTurma(turma)
  const etapas = esquema?.etapas ?? []

  // Filtrar notas que precisam de conselho. Não usa mais
  // Turma.modalidade (sempre NULL nos dados reais, regra nunca funcionou
  // de fato) nem "3 vs 2 notas" hardcoded - `unidades` (NotaUnidade,
  // populado desde a Fase 3 do backfill) já reflete o número certo de
  // unidades do esquema da turma, seja lá qual for.
  const notasFiltradas = turma.estudantes.flatMap((estudante: any) =>
    estudante.notas.filter((nota: any) => {
      // 1. Status que explicitamente pedem conselho
      const statusConselho = [
        'RECUPERACAO',
        'DESISTENTE',
        'APROVADO_CONSELHO',
        'DEPENDENCIA',
        'CONSERVADO',
        'APROVADO_RECUPERACAO'
      ]
      if (statusConselho.includes(nota.status)) return true

      // 2. Todas as unidades do esquema preenchidas (ou marcadas desistente) e ainda não aprovado
      const completa = nota.unidades.length > 0 &&
        nota.unidades.every((u: any) => u.notaCalculada !== null || u.isDesistente)
      return completa && nota.status !== 'APROVADO'
    }).map((nota: any) => ({
      id: nota.id,
      nota: nota.nota,
      notaRecuperacao: nota.notaRecuperacao,
      status: nota.status,
      etapas: etapasDaNota(etapas, nota.unidades),
      estudanteId: estudante.matricula,
      estudanteNome: estudante.nome,
      disciplinaId: nota.disciplinaId,
      disciplinaNome: nota.disciplina.nome
    }))
  )

  return {
    turma,
    notasConselho: notasFiltradas,
    // Sem esquema resolvido, cai no comportamento legado (média simples, mínimo 5)
    esquemaConfig: esquema?.config ?? { numUnidades: etapas.length, notaMinimaAprovacao: 5, recuperacaoUnidadeAtiva: false, recuperacaoFinalAtiva: true },
    pesosEtapas: etapas.map((e) => e.peso)
  }
}

export default async function ConselhoClasseTurmaPage({
  params
}: {
  params: Promise<{ turmaId: string }>
}) {
  const session = await auth()

  if (!session?.user?.escolaId) {
    redirect("/login")
  }

  const { turmaId } = await params
  const data = await getNotasConselho(turmaId, session.user.escolaId)

  if (!data) {
    redirect("/dashboard/conselho-classe")
  }

  return (
    <ConselhoClasseClient
      turmaId={data.turma.id}
      turmaNome={data.turma.nome}
      turmaCurso={data.turma.curso}
      turmaTurno={data.turma.turno}
      notasConselho={data.notasConselho}
      esquemaConfig={data.esquemaConfig}
      pesosEtapas={data.pesosEtapas}
    />
  )
}
