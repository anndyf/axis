import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { can } from '@/lib/rbac'
import { rotaDoModulo } from '@/lib/modulos/guarda'

export const runtime = 'nodejs'

// Esqueleto do módulo financeiro (Fase 11 do plano multi-tenant) - prova o
// padrão de isolamento de módulos "satélite" (seção 7.5): rota própria sob
// seu próprio prefixo, sem nenhum modelo de dado financeiro real ainda.
export const GET = rotaDoModulo('FIN', 'leitura', async function GET() {
  const session = await auth()
  if (!session?.user?.escolaId || !can(session.user, 'financeiro.gerenciar')) {
    return NextResponse.json({ message: 'Não autorizado' }, { status: 401 })
  }

  return NextResponse.json({ message: 'Módulo em construção' })
})
