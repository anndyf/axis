import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { can } from '@/lib/rbac'
import { getModulosAtivos } from '@/lib/modules-server'

export const runtime = 'nodejs'

// Esqueleto do módulo financeiro (Fase 11 do plano multi-tenant) - prova o
// padrão de isolamento de módulos "satélite" (seção 7.5): rota própria sob
// seu próprio prefixo, sem nenhum modelo de dado financeiro real ainda.
export async function GET() {
  const session = await auth()
  if (!session?.user?.escolaId || !can(session.user, 'gestao')) {
    return NextResponse.json({ message: 'Não autorizado' }, { status: 401 })
  }

  const escola = await prisma.escola.findUnique({ where: { id: session.user.escolaId }, select: { plano: true } })
  const modulosAtivos = await getModulosAtivos(session.user.escolaId, escola?.plano || 'BASICO')

  if (!modulosAtivos.includes('financeiro')) {
    return NextResponse.json({ message: 'Módulo desativado para esta escola' }, { status: 403 })
  }

  return NextResponse.json({ message: 'Módulo em construção' })
}
