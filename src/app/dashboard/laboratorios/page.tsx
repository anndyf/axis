import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import LaboratoriosClient from "./LaboratoriosClient"
import { paginaDoModulo } from '@/lib/modulos/guarda'

export const metadata = {
  title: 'Áxis - Reserva de Laboratórios'
}

export default async function LaboratoriosPage() {
  await paginaDoModulo('REC')
  const session = await auth()
  if (!session?.user?.escolaId) redirect("/login")
  const escolaId = session.user.escolaId

  const laboratorios = await prisma.laboratorio.findMany({
    where: { escolaId },
    orderBy: { nome: 'asc' }
  })

  // Buscar turmas e disciplinas para o seletor
  const isAdmin = session.user.isSuperuser || session.user.isDirecao
  
  let myTurmas: any[] = []

  if (isAdmin) {
    myTurmas = await prisma.turma.findMany({
      where: { escolaId },
      include: {
        disciplinas: {
          select: { id: true, nome: true }
        }
      },
      orderBy: { nome: 'asc' }
    })
  } else {
    // Para professores, buscar apenas as disciplinas que eles lecionam
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        disciplinasPermitidas: {
          include: {
            turma: true
          }
        }
      }
    })

    // Agrupar disciplinas por turma
    const turmasMap = new Map()
    user?.disciplinasPermitidas.forEach(d => {
      if (!turmasMap.has(d.turmaId)) {
        turmasMap.set(d.turmaId, {
          ...d.turma,
          disciplinas: []
        })
      }
      turmasMap.get(d.turmaId).disciplinas.push({ id: d.id, nome: d.nome })
    })
    myTurmas = Array.from(turmasMap.values())
  }

  return (
    <div className="p-4 md:p-8">
      <LaboratoriosClient 
          initialLaboratorios={laboratorios}
          currentUser={session.user}
          myTurmas={myTurmas}
      />
    </div>
  )
}
