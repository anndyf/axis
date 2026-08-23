import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

export const runtime = 'nodejs'

export async function GET() {
  try {
  const session = await auth()
  if (!session?.user?.escolaId) {
    return NextResponse.json({ message: 'Não autorizado' }, { status: 401 })
  }
  const config = await prisma.globalConfig.upsert({
    where: { id: 'global' },
    update: {},
    create: { id: 'global', escolaId: session.user.escolaId, isBancoQuestoesAtivo: true, anoLetivoAtual: new Date().getFullYear() }
  })
    // Buscar anos com dados cadastrados
    const turmas = await prisma.turma.groupBy({
      by: ['anoLetivo'],
      _count: { id: true },
      orderBy: { anoLetivo: 'desc' },
      where: { anoLetivo: { not: null } }
    })
    
    let availableYears = turmas.map((t: any) => t.anoLetivo).filter((y: any) => y !== null) as number[]
    
    // Garantir que o ano atual sempre apareça
    const currentYear = new Date().getFullYear()
    if (!availableYears.includes(currentYear)) {
      availableYears.push(currentYear)
    }
    
    // Garantir que o ano configurado apareça
    if (config.anoLetivoAtual && !availableYears.includes(config.anoLetivoAtual)) {
      availableYears.push(config.anoLetivoAtual)
    }
    
    availableYears.sort((a, b) => b - a)

    return NextResponse.json({ ...config, availableYears })
  } catch (error) {
    return NextResponse.json({ message: 'Erro ao buscar config' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await auth()
    if (!session || !session.user.isSuperuser) {
      return NextResponse.json({ message: 'Não autorizado' }, { status: 403 })
    }

    const body = await request.json()
    const { isBancoQuestoesAtivo, anoLetivoAtual } = body
    
    // Filtra apenas campos definidos
    const data: any = {}
    if (isBancoQuestoesAtivo !== undefined) data.isBancoQuestoesAtivo = isBancoQuestoesAtivo
    if (anoLetivoAtual !== undefined) data.anoLetivoAtual = anoLetivoAtual

    const config = await prisma.globalConfig.upsert({
      where: { id: 'global' },
      update: data,
      create: {
        id: 'global',
        escolaId: session.user.escolaId,
        isBancoQuestoesAtivo: isBancoQuestoesAtivo ?? true,
        anoLetivoAtual: anoLetivoAtual ?? new Date().getFullYear()
      }
    })
    
    // Invalidar caches
    revalidatePath('/dashboard', 'layout')
    revalidatePath('/portal', 'layout')

    return NextResponse.json(config)
  } catch (error) {
    return NextResponse.json({ message: 'Erro ao atualizar config' }, { status: 500 })
  }
}
