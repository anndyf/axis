import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { provaDaEscola } from "@/lib/data-fetching"
import ResponsaveisClient from "./ResponsaveisClient"
import { prisma } from "@/lib/prisma"
import { anoLetivoAtualDaEscola } from "@/lib/data-fetching"
import { paginaDoModulo } from '@/lib/modulos/guarda'
import { can } from '@/lib/rbac'

export const metadata = {
  title: 'Áxis - Simulados'
}

export default async function ResponsaveisSimuladoPage() {
  await paginaDoModulo('PRV')
  const session = await auth()
  if (!session?.user?.escolaId) redirect("/login")
  const escolaId = session.user.escolaId

  const user = session.user as any
  if (!can(user, 'simulado.gerenciar')) {
    redirect("/dashboard/simulados")
  }

  const [turmas, areas, professores, provas] = await Promise.all([
    prisma.turma.findMany({ 
        where: { escolaId, anoLetivo: await anoLetivoAtualDaEscola(escolaId) },
        orderBy: { nome: 'asc' } 
    }),
    prisma.areaConhecimento.findMany({
        where: { escolaId },
        orderBy: { nome: 'asc' } 
    }),
    prisma.user.findMany({
      where: { 
        escolaId,
        isPortalUser: false,
        name: {
            notIn: [
                'Equipe Administrativa', 
                'Todos os Estudantes', 
                'Todos os Professores', 
                'Equipe de Suporte',
                'Administrador'
            ]
        }
      },
      select: { id: true, name: true, email: true },
      orderBy: { name: 'asc' }
    }),
    prisma.prova.findMany({
      where: {
        tipo: 'SIMULADO',
        ...provaDaEscola(escolaId)
      },
      select: { id: true, titulo: true, codigo: true, turmaId: true, createdAt: true, unidade: true },
      orderBy: { createdAt: 'desc' }
    })
  ])

  return (
    <ResponsaveisClient 
      turmas={turmas} 
      areas={areas} 
      professores={professores}
      provas={provas}
    />
  )
}
