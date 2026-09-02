import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'

const STATUS_VALIDOS = ['TRIAL', 'ATIVA', 'SUSPENSA', 'CANCELADA']
const PLANO_VALIDOS = ['BASICO', 'PRO', 'ENTERPRISE']

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.isPlatformAdmin) {
    return NextResponse.json({ message: 'Não autorizado' }, { status: 403 })
  }

  try {
    const { id } = await params
    const { status, plano }: { status?: string; plano?: string } = await request.json()

    if (status === undefined && plano === undefined) {
      return NextResponse.json({ message: 'Nada para atualizar' }, { status: 400 })
    }
    if (status !== undefined && !STATUS_VALIDOS.includes(status)) {
      return NextResponse.json({ message: 'Status inválido' }, { status: 400 })
    }
    if (plano !== undefined && !PLANO_VALIDOS.includes(plano)) {
      return NextResponse.json({ message: 'Plano inválido' }, { status: 400 })
    }

    const existente = await prisma.escola.findUnique({ where: { id } })
    if (!existente) {
      return NextResponse.json({ message: 'Escola não encontrada' }, { status: 404 })
    }

    const escola = await prisma.escola.update({
      where: { id },
      data: {
        ...(status !== undefined ? { status: status as any } : {}),
        ...(plano !== undefined ? { plano: plano as any } : {}),
      }
    })

    return NextResponse.json(escola)
  } catch (error) {
    console.error('Erro ao atualizar escola:', error)
    return NextResponse.json({ message: 'Erro ao atualizar escola' }, { status: 500 })
  }
}
