
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import AEEDashboardClient from "./AEEDashboardClient"
import { paginaDoModulo } from '@/lib/modulos/guarda'

export const runtime = 'nodejs'

export default async function AEEDashboardPage() {
  await paginaDoModulo('AEE')
  const session = await auth()
  if (!session?.user?.escolaId) redirect("/login")
  const escolaId = session.user.escolaId

  const isAEE = (session.user as any).isAEE
  const isDirecao = session.user.isDirecao || session.user.isSuperuser || isAEE

  const turmasWhere: any = { escolaId }
  if (!isDirecao) {
    // Turmas vinculadas via Disciplinas OU manual
    turmasWhere.OR = [
      { usuariosPermitidos: { some: { id: session.user.id } } },
      { disciplinas: { some: { usuariosPermitidos: { some: { id: session.user.id } } } } }
    ]
  }

  const todasTurmas = await prisma.turma.findMany({
    where: turmasWhere,
    select: { id: true, nome: true },
    orderBy: { nome: 'asc' }
  })

  // Busca perfis AEE
  const aeeWhere: any = { estudante: { escolaId } }
  if (!isDirecao) {
    // Alunos das turmas onde o professor tem disciplina vinculada OU manual
    aeeWhere.estudante = {
      escolaId,
      turma: {
        OR: [
          { usuariosPermitidos: { some: { id: session.user.id } } },
          { 
            disciplinas: {
              some: {
                usuariosPermitidos: {
                  some: { id: session.user.id }
                }
              }
            }
          }
        ]
      }
    }
  }

  const aeeAlunos = await (prisma.aEEProfile as any).findMany({
    where: aeeWhere,
    include: {
      estudante: {
        include: {
          turma: { 
            include: { 
              usuariosPermitidos: { select: { id: true, name: true } },
              disciplinas: {
                include: {
                  usuariosPermitidos: { select: { id: true, name: true } }
                }
              }
            } 
          }
        }
      },
      acknowledgements: {
        include: { user: { select: { id: true, name: true } } }
      }
    },
    orderBy: { estudante: { nome: 'asc' } }
  })

  // Busca estudantes que NÃO possuem ficha AEE (apenas para Direção)
  let estudantesSemAee: any[] = []
  if (isDirecao) {
    const config = await prisma.globalConfig.findUnique({ where: { id: escolaId } })
    const currentYear = config?.anoLetivoAtual || new Date().getFullYear()

    estudantesSemAee = await prisma.estudante.findMany({
      where: {
        escolaId,
        aeeProfile: { is: null },
        turma: { anoLetivo: currentYear }
      },
      select: { 
        matricula: true, 
        nome: true, 
        turma: { select: { nome: true } } 
      },
      orderBy: { nome: 'asc' }
    })
  }

  return (
    <AEEDashboardClient 
      usuario={session.user}
      aeeAlunos={aeeAlunos}
      todasTurmas={todasTurmas}
      estudantesSemAee={estudantesSemAee}
    />
  )
}
