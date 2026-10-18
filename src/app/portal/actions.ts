
"use server"

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { etapasDaNota } from "@/lib/services/notas"
import { carregarEsquemaDaTurma, SELECT_ETAPAS_DA_NOTA } from "@/lib/services/notas-leitura"

export async function getStudentPortalData() {
  const session = await auth()

  if (!session?.user?.escolaId || !session?.user?.estudanteId) {
    return { error: "Estudante não vinculado a este usuário." }
  }
  const escolaId = session.user.escolaId

  try {
    const estudante = await prisma.estudante.findUnique({
      where: { id: session.user.estudanteId, escolaId },
      include: {
        turma: {
          include: {
            horarios: {
               orderBy: [
                 { diaSemana: 'asc' },
                 { horario: 'asc' }
               ]
            },
            disciplinas: {
              include: {
                // Só o nome do professor: isto vai para o navegador do aluno
                // (antes ia o registro inteiro, com e-mail e hash de senha)
                usuariosPermitidos: { select: { name: true, username: true } }
              }
            }
          }
        },
        notas: {
          include: {
            disciplina: true,
            unidades: SELECT_ETAPAS_DA_NOTA
          },
          orderBy: {
            disciplina: { nome: 'asc' }
          }
        }
      }
    })

    if (!estudante) {
      return { error: "Dados do estudante não encontrados." }
    }

    // Buscar comunicados gerais ou para este estudante (futuro)
    const mensagens = await prisma.message.findMany({
      where: {
        escolaId,
        category: 'COMUNICADO',
        OR: [
          { receiverId: 'GROUP_STUDENTS' },
          { receiverId: session.user.id },
          { receiverId: `TURMA_${estudante.turmaId}` },
          { receiverId: null }
        ]
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: {
          sender: { select: { name: true } }
      }
    })

    // Esquema de avaliação da turma (turma ?? curso): colunas U1..UN do
    // boletim e parâmetros da análise de risco.
    const esquema = await carregarEsquemaDaTurma(estudante.turma)
    const etapas = esquema?.etapas ?? []

    return {
      estudante: {
        ...estudante,
        notas: estudante.notas.map((n) => ({ ...n, etapas: etapasDaNota(etapas, n.unidades) })),
      },
      mensagens,
      nomesEtapas: etapas.map((e) => e.nome),
      numUnidades: esquema?.config.numUnidades ?? 3,
      notaMinimaAprovacao: esquema?.config.notaMinimaAprovacao ?? 5,
    }
  } catch (error) {
    console.error("Erro ao buscar dados do portal:", error)
    return { error: "Erro interno no servidor." }
  }
}
