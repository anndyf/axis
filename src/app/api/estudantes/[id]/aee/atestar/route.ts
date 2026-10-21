
import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { can } from "@/lib/rbac"
import { rotaDoModulo } from '@/lib/modulos/guarda'

export const POST = rotaDoModulo('AEE', 'escrita', async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: matricula } = await params
  const session = await auth()
  if (!session?.user?.escolaId) return NextResponse.json({ message: "Não autorizado" }, { status: 401 })

  try {
    // Busca o perfil AEE do aluno (inclui disciplinas da turma para autorização correta).
    // O [id] da rota é a matrícula; AEEProfile.estudanteId é o id técnico do estudante.
    const profile = await prisma.aEEProfile.findFirst({
      where: { estudante: { escolaId: session.user.escolaId, matricula } },
      include: { 
        estudante: { 
          include: { 
            turma: { 
              include: { 
                usuariosPermitidos: { select: { id: true } },
                disciplinas: {
                  include: {
                    usuariosPermitidos: { select: { id: true } }
                  }
                }
              } 
            } 
          } 
        } 
      }
    })

    if (!profile) {
      return NextResponse.json({ message: "Perfil não encontrado" }, { status: 404 })
    }

    // Verifica se professor tem aula nessa turma (via manual ou disciplina)
    const isDirecao = can(session.user, 'aee.ficha.editar')
    const isProfessorManual = profile.estudante.turma.usuariosPermitidos.some((u: any) => u.id === session.user.id)
    const isProfessorViaDisciplina = profile.estudante.turma.disciplinas.some((d: any) => 
      d.usuariosPermitidos.some((u: any) => u.id === session.user.id)
    )

    if (!isDirecao && !isProfessorManual && !isProfessorViaDisciplina) {
      return NextResponse.json({ message: "Não autorizado para este aluno" }, { status: 403 })
    }

    // Registra o aceite (upsert para evitar duplicata mas atualizar data if needed)
    const ack = await prisma.aEEAcknowledgement.upsert({
      where: {
        profileId_userId: {
          profileId: profile.id,
          userId: session.user.id
        }
      },
      update: { readAt: new Date() },
      create: {
        profileId: profile.id,
        userId: session.user.id
      }
    })

    return NextResponse.json({ success: true, ack })

  } catch (error: any) {
    console.error("Erro AEE Atestar:", error)
    return NextResponse.json({ message: "Erro ao atestar: " + error.message }, { status: 500 })
  }
})
