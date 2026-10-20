import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { exigirAdminPlataforma, registrarAcaoPlataforma, SELECT_ESCOLA_PLATAFORMA } from '@/lib/plataforma'

export const runtime = 'nodejs'

const STATUS_VALIDOS = ['TRIAL', 'ATIVA', 'SUSPENSA', 'CANCELADA'] as const
const PLANO_VALIDOS = ['BASICO', 'PRO', 'ENTERPRISE'] as const
type Status = typeof STATUS_VALIDOS[number]
type Plano = typeof PLANO_VALIDOS[number]

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await exigirAdminPlataforma()
  if (!admin) {
    return NextResponse.json({ message: 'Não autorizado' }, { status: 403 })
  }

  try {
    const { id } = await params
    const { status, plano }: { status?: string; plano?: string } = await request.json()

    if (status === undefined && plano === undefined) {
      return NextResponse.json({ message: 'Nada para atualizar' }, { status: 400 })
    }
    if (status !== undefined && !(STATUS_VALIDOS as readonly string[]).includes(status)) {
      return NextResponse.json({ message: 'Status inválido' }, { status: 400 })
    }
    if (plano !== undefined && !(PLANO_VALIDOS as readonly string[]).includes(plano)) {
      return NextResponse.json({ message: 'Plano inválido' }, { status: 400 })
    }
    // A conta do admin da plataforma pertence a uma escola: suspender ou
    // cancelar essa escola bloquearia o próprio acesso ao painel (o proxy
    // recusa o login em escola suspensa/cancelada).
    if (id === admin.escolaId && (status === 'SUSPENSA' || status === 'CANCELADA')) {
      return NextResponse.json({ message: 'Não é possível suspender ou cancelar a escola da conta de administração da plataforma.' }, { status: 409 })
    }

    const existente = await prisma.escola.findUnique({ where: { id }, select: { id: true, status: true, plano: true } })
    if (!existente) {
      return NextResponse.json({ message: 'Escola não encontrada' }, { status: 404 })
    }

    const escola = await prisma.escola.update({
      where: { id },
      data: {
        ...(status !== undefined ? { status: status as Status } : {}),
        ...(plano !== undefined ? { plano: plano as Plano } : {}),
      },
      select: SELECT_ESCOLA_PLATAFORMA,
    })

    await registrarAcaoPlataforma(admin.id, 'ATUALIZAR_ESCOLA', id, {
      antes: { status: existente.status, plano: existente.plano },
      depois: { status: escola.status, plano: escola.plano },
    })

    return NextResponse.json(escola)
  } catch (error) {
    console.error('Erro ao atualizar escola:', error)
    return NextResponse.json({ message: 'Erro ao atualizar escola' }, { status: 500 })
  }
}
