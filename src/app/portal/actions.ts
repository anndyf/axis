
"use server"

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { resolverEsquemaAvaliacaoId } from "@/lib/services/notas"

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
                usuariosPermitidos: true
              }
            }
          }
        },
        notas: {
          include: {
            disciplina: true
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

    // Resolve o esquema de avaliação (turma ?? curso) só pra saber
    // numUnidades/notaMinimaAprovacao - usado pela análise de risco no
    // client, que hoje hardcoda "3 unidades" (bug conhecido).
    const curso = estudante.turma.cursoId
      ? await prisma.curso.findUnique({ where: { id: estudante.turma.cursoId }, select: { esquemaAvaliacaoId: true } })
      : null
    const esquemaId = resolverEsquemaAvaliacaoId(estudante.turma, curso)
    const esquema = esquemaId
      ? await prisma.esquemaAvaliacao.findUnique({
          where: { id: esquemaId },
          select: { numUnidades: true, notaMinimaAprovacao: true }
        })
      : null

    return {
      estudante,
      mensagens,
      numUnidades: esquema?.numUnidades ?? 3,
      notaMinimaAprovacao: esquema?.notaMinimaAprovacao ?? 5,
    }
  } catch (error) {
    console.error("Erro ao buscar dados do portal:", error)
    return { error: "Erro interno no servidor." }
  }
}
