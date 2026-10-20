import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { rotaDoModulo } from '@/lib/modulos/guarda'

export const runtime = 'nodejs'

export const GET = rotaDoModulo('PRV', 'leitura', async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.escolaId) return NextResponse.json({ message: 'Não autorizado' }, { status: 401 })
    const escolaId = session.user.escolaId

    const isAdmin = session.user.isSuperuser || session.user.isDirecao
    const userId = session.user.id

    // Para criadores, apenas buscamos usuários que já criaram alguma prova
    // Se não for admin, retornamos apenas o próprio usuário
    let criadores: { id: string; name: string | null }[] = []
    if (isAdmin) {
      criadores = await prisma.user.findMany({
        where: {
          escolaId,
          provasCriadas: {
            some: {}
          }
        },
        select: {
          id: true,
          name: true
        },
        orderBy: {
          name: 'asc'
        }
      })
    } else {
      const self = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, name: true }
      })
      if (self) criadores = [self]
    }

    // Para áreas de conhecimento, retornamos todas disponíveis
    const areas = await prisma.areaConhecimento.findMany({
      where: { escolaId },
      select: {
        id: true,
        nome: true
      },
      orderBy: {
        nome: 'asc'
      }
    })

    return NextResponse.json({
      criadores,
      areas
    })
  } catch (error: any) {
    console.error('Erro ao buscar filtros de provas:', error)
    return NextResponse.json({ message: 'Erro interno' }, { status: 500 })
  }
})
