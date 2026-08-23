
"use server"

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function getStudentPortalData() {
  const session = await auth()
  
  if (!session?.user?.estudanteId) {
    return { error: "Estudante não vinculado a este usuário." }
  }

  try {
    const estudante = await prisma.estudante.findUnique({
      where: { id: session.user.estudanteId },
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

    return { estudante, mensagens }
  } catch (error) {
    console.error("Erro ao buscar dados do portal:", error)
    return { error: "Erro interno no servidor." }
  }
}
