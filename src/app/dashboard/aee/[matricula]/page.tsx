
import { auth } from "@/lib/auth"
import { redirect, notFound } from "next/navigation"
import { prisma } from "@/lib/prisma"
import AEEProfileClient from "./AEEProfileClient"

export const runtime = 'nodejs'

export default async function AEEPage({ params }: { params: Promise<{ matricula: string }> }) {
  const session = await auth()
  if (!session?.user?.escolaId) redirect("/login")

  const { matricula } = await params

  // Busca estudante e perfil AEE
  const estudante = await prisma.estudante.findUnique({
    where: { escolaId_matricula: { escolaId: session.user.escolaId, matricula } },
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
      },
      aeeProfile: {
        include: {
          acknowledgements: {
            include: { user: { select: { id: true, name: true } } }
          }
        }
      }
    }
  })

  if (!estudante) notFound()

  const isDirecao = session.user.isDirecao || session.user.isSuperuser
  
  // Verifica se o professor é da turma (via manual ou via disciplina)
  const isProfessorManual = estudante.turma.usuariosPermitidos.some((u: any) => u.id === session.user.id)
  const isProfessorViaDisciplina = (estudante.turma as any).disciplinas.some((d: any) => 
    d.usuariosPermitidos.some((u: any) => u.id === session.user.id)
  )

  const isProfessorDaTurma = isProfessorManual || isProfessorViaDisciplina

  // Segurança: Se não for direção nem professor daquela turma, nega acesso
  if (!isDirecao && !isProfessorDaTurma) {
    redirect("/dashboard")
  }

  // Verifica se este professor específico já atestou a leitura
  const jaAtestado = estudante.aeeProfile?.acknowledgements.some(ack => ack.user.id === session.user.id) || false

  return (
    <AEEProfileClient 
      usuario={session.user}
      estudante={estudante}
      perfilExistente={estudante.aeeProfile}
      jaAtestado={jaAtestado}
    />
  )
}
