import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { exigirAdminPlataforma, registrarAcaoPlataforma } from '@/lib/plataforma'
import { definirModuloDaAssinatura } from '@/lib/modulos/assinatura-escrita'
import { resumoAssinaturaDaEscola } from '@/lib/modulos/assinatura-painel'
import { validarModuloAssinatura } from '@/lib/services/planos'

export const runtime = 'nodejs'

// Liga, desliga, põe em somente leitura ou devolve ao plano um módulo da escola.
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await exigirAdminPlataforma()
  if (!admin) {
    return NextResponse.json({ message: 'Não autorizado' }, { status: 403 })
  }
  try {
    const { id } = await params
    const v = validarModuloAssinatura(await request.json().catch(() => null))
    if (!v.ok) return NextResponse.json({ message: v.erro }, { status: 400 })
    if (!(await prisma.escola.findUnique({ where: { id }, select: { id: true } }))) {
      return NextResponse.json({ message: 'Escola não encontrada' }, { status: 404 })
    }
    await definirModuloDaAssinatura(id, v.moduloId, v.alvo, admin.id)
    await registrarAcaoPlataforma(admin.id, 'ALTERAR_MODULO', id, { moduloId: v.moduloId, alvo: v.alvo })
    return NextResponse.json(await resumoAssinaturaDaEscola(id))
  } catch (error) {
    console.error('Erro ao alterar módulo da assinatura:', error)
    return NextResponse.json({ message: 'Erro ao alterar módulo' }, { status: 500 })
  }
}
