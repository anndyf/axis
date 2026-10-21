import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import PendenciasClient from "./PendenciasClient"
import { paginaDoModulo } from '@/lib/modulos/guarda'
import { can } from '@/lib/rbac'

export const metadata = {
  title: "Pendências de Cadastro | Sistema de Notas",
}

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function PendenciasPage({
  searchParams
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  await paginaDoModulo('NUC')
  const session = await auth()
  
  if (!session?.user?.escolaId) {
    redirect("/login")
  }
  
  const user = session.user as any
  if (!can(user, 'pendencia.resolver')) {
    redirect("/dashboard")
  }

  const resolvedParams = await searchParams
  const showResolved = resolvedParams.status === 'resolvido'
  const search = typeof resolvedParams.q === 'string' ? resolvedParams.q : undefined

  // Buscar administradores para atribuição
  const escolaId = session.user.escolaId
  const admins = await prisma.user.findMany({
    where: {
      escolaId,
      OR: [
        { isSuperuser: true },
        { isDirecao: true }
      ]
    },
    select: {
      id: true,
      name: true,
      username: true
    },
    orderBy: { name: 'asc' }
  })

  // Buscar mensagens de "Cadastro Pendente"
  const pendencias = await prisma.message.findMany({
    where: {
      escolaId,
      subject: { startsWith: "[Cadastro Pendente]" },
      isResolved: showResolved,
      ...(search ? {
        OR: [
          { subject: { contains: search, mode: 'insensitive' } },
          { content: { contains: search, mode: 'insensitive' } },
          { sender: { name: { contains: search, mode: 'insensitive' } } }
        ]
      } : {})
    },
    include: {
      sender: {
        select: {
          name: true,
          username: true
        }
      },
      assignedTo: {
        select: {
          id: true,
          name: true,
          username: true
        }
      },
      replies: {
        orderBy: { createdAt: 'desc' },
        include: {
          sender: {
            select: { name: true, username: true }
          }
        }
      }
    },
    orderBy: [
      { priority: 'asc' }, // Critica primeiro se usarmos enum order, mas Prisma enums são por ordem de definição
      { createdAt: 'desc' }
    ],
    take: 100
  })

  // Count totals for stats
  const [totalPendentes, totalResolvidos] = await Promise.all([
    prisma.message.count({
      where: {
        escolaId,
        subject: { startsWith: "[Cadastro Pendente]" },
        isResolved: false
      }
    }),
    prisma.message.count({
      where: {
        escolaId,
        subject: { startsWith: "[Cadastro Pendente]" },
        isResolved: true
      }
    })
  ])

  return <PendenciasClient 
    pendencias={pendencias} 
    serverFilters={{ showResolved, search }} 
    admins={admins}
    currentUser={user}
    counts={{ pendentes: totalPendentes, resolvidos: totalResolvidos }}
  />
}
