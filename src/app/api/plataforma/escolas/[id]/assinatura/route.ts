import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { exigirAdminPlataforma, registrarAcaoPlataforma } from '@/lib/plataforma'
import { alterarAssinatura } from '@/lib/modulos/assinatura-escrita'
import { resumoAssinaturaDaEscola } from '@/lib/modulos/assinatura-painel'
import { validarMudancaAssinatura } from '@/lib/services/planos'

export const runtime = 'nodejs'

// Assinatura e módulos de uma escola, para o painel da plataforma (fase 2).
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await exigirAdminPlataforma())) {
    return NextResponse.json({ message: 'Não autorizado' }, { status: 403 })
  }
  const { id } = await params
  const resumo = await resumoAssinaturaDaEscola(id)
  if (!resumo) return NextResponse.json({ message: 'Escola não encontrada' }, { status: 404 })
  return NextResponse.json(resumo)
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await exigirAdminPlataforma()
  if (!admin) {
    return NextResponse.json({ message: 'Não autorizado' }, { status: 403 })
  }
  try {
    const { id } = await params
    const v = validarMudancaAssinatura(await request.json().catch(() => null))
    if (!v.ok) return NextResponse.json({ message: v.erro }, { status: 400 })
    // Mesma regra do PATCH da escola: não bloquear a escola da conta da plataforma
    if (id === admin.escolaId && (v.mudanca.situacao === 'SUSPENSA' || v.mudanca.situacao === 'CANCELADA')) {
      return NextResponse.json({ message: 'Não é possível suspender ou cancelar a escola da conta de administração da plataforma.' }, { status: 409 })
    }
    if (!(await prisma.escola.findUnique({ where: { id }, select: { id: true } }))) {
      return NextResponse.json({ message: 'Escola não encontrada' }, { status: 404 })
    }
    await alterarAssinatura(id, v.mudanca, admin.id)
    await registrarAcaoPlataforma(admin.id, 'ALTERAR_ASSINATURA', id, v.mudanca)
    return NextResponse.json(await resumoAssinaturaDaEscola(id))
  } catch (error) {
    if (error instanceof Error && error.message === 'PLANO_INVALIDO') {
      return NextResponse.json({ message: 'Plano inválido' }, { status: 400 })
    }
    console.error('Erro ao alterar assinatura:', error)
    return NextResponse.json({ message: 'Erro ao alterar assinatura' }, { status: 500 })
  }
}
