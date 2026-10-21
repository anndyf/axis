import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import MatrizCurricularClient from "@/components/MatrizCurricularClient"
import { paginaDoModulo } from '@/lib/modulos/guarda'
import { can } from '@/lib/rbac'

export const metadata = {
  title: 'Áxis - Matriz'
}

export default async function MatrizCurricularPage() {
  await paginaDoModulo('NUC')
  const session = await auth()
  if (!session?.user?.escolaId || !can(session.user, 'matriz.gerenciar')) {
    redirect("/dashboard")
  }
  const escolaId = session.user.escolaId

  const dbCursos = await prisma.curso.findMany({
    where: { escolaId },
    orderBy: { nome: 'asc' }
  })
  const cursos = dbCursos.map(c => ({ id: c.id, nome: c.nome, modalidade: c.modalidade, nivelEnsino: c.nivelEnsino, esquemaAvaliacaoId: c.esquemaAvaliacaoId, sigla: c.sigla, turnos: c.turnos }))
  const areas = await prisma.areaConhecimento.findMany({
    where: { escolaId },
    orderBy: { nome: 'asc' }
  })

  return <MatrizCurricularClient cursos={cursos} areas={areas} />

}
