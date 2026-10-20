import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import SimuladosClient from "./SimuladosClient"
import { prisma } from "@/lib/prisma"
import { anoLetivoAtualDaEscola } from "@/lib/data-fetching"
import { paginaDoModulo } from '@/lib/modulos/guarda'
import { can } from '@/lib/rbac'

export const metadata = {
  title: 'Áxis - Simulados'
}

export default async function SimuladosPage() {
  await paginaDoModulo('PRV')
  const session = await auth()
  if (!session) redirect("/login")

  const user = session.user as any
  const escolaId = session.user.escolaId

  // Buscar turmas que o professor tem acesso ou todas para gestão
  let turmas = []
  if (can(user, 'simulado.gerenciar')) {
    turmas = await prisma.turma.findMany({
      where: { escolaId, anoLetivo: await anoLetivoAtualDaEscola(escolaId) },
      orderBy: { nome: 'asc' }
    })
  } else {
    // 1. Turmas onde o professor leciona
    const teacher = await prisma.user.findUnique({
      where: { id: user.id },
      include: {
        disciplinasPermitidas: { include: { turma: true } },
        responsavelSimulados: { include: { turma: true } } // 2. Turmas onde ele é responsável pelo simulado
      }
    })
    
    const turmasMap = new Map()
    teacher?.disciplinasPermitidas.forEach(d => {
      if (d.turma) turmasMap.set(d.turma.id, d.turma)
    })
    teacher?.responsavelSimulados.forEach(r => {
      if (r.turma) turmasMap.set(r.turma.id, r.turma)
    })
    turmas = Array.from(turmasMap.values())
  }

  // Buscar Provas de Simulado
  let provas = []
  if (can(user, 'simulado.gerenciar')) {
    // Prova nao tem escolaId proprio (turmaId e professorCriadorId sao ambos
    // opcionais, entao nao ha um caminho garantido) - filtra pelo que existir.
    // TODO: adicionar escolaId denormalizado em Prova para fechar isso de vez.
    provas = await prisma.prova.findMany({
      where: {
        tipo: 'SIMULADO',
        OR: [
          { turma: { escolaId } },
          { professorCriador: { escolaId } }
        ]
      },
      select: { id: true, titulo: true, codigo: true, turmaId: true, createdAt: true, unidade: true, _count: { select: { questoes: true } } },
      orderBy: { createdAt: 'desc' }
    })
  } else {
    // 1. Provas onde ele é o responsável
    // 2. Provas que contém disciplinas que ele leciona
    const teacherResponsaveis = await prisma.responsavelSimulado.findMany({
      where: { userId: user.id },
      select: { provaId: true }
    })
    const assignedProvaIds = teacherResponsaveis.map((r: any) => r.provaId).filter(Boolean)

    const teacherDisciplinas = await prisma.user.findUnique({
      where: { id: user.id },
      select: { disciplinasPermitidas: { select: { id: true } } }
    })
    const disciplinaIds = teacherDisciplinas?.disciplinasPermitidas.map((d: any) => d.id) || []

    provas = await prisma.prova.findMany({
      where: {
        tipo: 'SIMULADO',
        OR: [
          { id: { in: assignedProvaIds } },
          { questoes: { some: { disciplinas: { some: { id: { in: disciplinaIds } } } } } },
          { questoes: { some: { professorId: user.id } } }
        ]
      },
      select: { id: true, titulo: true, codigo: true, turmaId: true, createdAt: true, unidade: true, _count: { select: { questoes: true } } },
      orderBy: { createdAt: 'desc' }
    })
  }

  // Filtrar turmas apenas para EPTM
  turmas = turmas.filter((t: any) => t.modalidade?.toUpperCase().includes('EPTM'))

  const areas = await prisma.areaConhecimento.findMany({
    where: { escolaId },
    orderBy: { nome: 'asc' }
  })

  const escola = await prisma.escola.findUnique({
    where: { id: escolaId },
    select: { nome: true }
  })

  return (
    <SimuladosClient
      turmas={turmas}
      provas={provas}
      areas={areas}
      user={user}
      nomeEscola={escola?.nome || 'Áxis'}
    />
  )
}
