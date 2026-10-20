import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { provaDaEscola } from '@/lib/data-fetching'
import { rotaDoModulo } from '@/lib/modulos/guarda'

export const runtime = 'nodejs'

export const GET = rotaDoModulo('PRV', 'leitura', async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.escolaId) return NextResponse.json({ message: 'Não autorizado' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')
    const tipo = searchParams.get('tipo')
    const turmaId = searchParams.get('turmaId')
    const criadorId = searchParams.get('criadorId')
    const areaId = searchParams.get('areaId')
    const page = parseInt(searchParams.get('page') || '1', 10)
    const limit = parseInt(searchParams.get('limit') || '20', 10)
    const skip = (page - 1) * limit

    const isAdmin = session.user.isSuperuser || session.user.isDirecao
    const userId = session.user.id

    const where: any = isAdmin ? {} : { professorCriadorId: userId }

    if (search) {
      where.OR = [
        { titulo: { contains: search, mode: 'insensitive' } },
        { turma: { nome: { contains: search, mode: 'insensitive' } } }
      ]
    }

    if (tipo) {
      where.tipo = tipo
    }
    
    if (turmaId) {
      where.turmaId = turmaId
    }

    if (criadorId && isAdmin) {
      where.professorCriadorId = criadorId
    }

    if (areaId) {
      where.areaId = areaId
    }

    // Aplicado por fora pra não colidir com o OR da busca
    const whereEscola = { AND: [where, provaDaEscola(session.user.escolaId)] }

    const [provas, total] = await Promise.all([
      prisma.prova.findMany({
        where: whereEscola,
        skip,
        take: limit,
        include: {
          turma: { select: { nome: true, curso: true } },
          professorCriador: { select: { name: true } },
          savedByUser: { select: { name: true } },
          area: { select: { nome: true } },
          questoes: {
            select: { id: true }
          }
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.prova.count({ where: whereEscola })
    ])

    return NextResponse.json({
      data: provas,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    })
  } catch (error: any) {
    console.error('Erro ao buscar provas:', error)
    return NextResponse.json({ message: 'Erro interno' }, { status: 500 })
  }
})

export const POST = rotaDoModulo('PRV', 'escrita', async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.escolaId) return NextResponse.json({ message: 'Não autorizado' }, { status: 401 })

    const body = await request.json()
    console.log('Post Prova body:', body)
    const { titulo, turmaId, questoesIds, questoesSnapshot, unidade, tipo, areaId } = body

    if (!titulo || !turmaId || !questoesIds || questoesIds.length === 0) {
      return NextResponse.json({ message: 'Dados incompletos' }, { status: 400 })
    }

    const escolaId = session.user.escolaId
    const [turma, area, questoesDaEscola] = await Promise.all([
      prisma.turma.findUnique({ where: { id: turmaId, escolaId }, select: { id: true } }),
      areaId ? prisma.areaConhecimento.findUnique({ where: { id: areaId, escolaId }, select: { id: true } }) : null,
      prisma.questao.count({ where: { id: { in: questoesIds }, professor: { escolaId } } })
    ])
    if (!turma || (areaId && !area) || questoesDaEscola !== new Set(questoesIds).size) {
      return NextResponse.json({ message: 'Turma, área ou questão não encontrada' }, { status: 404 })
    }

    // Regra de Duplicidade: Impede 2 provas da mesma unidade/tipo para a mesma turma (exceto dependência)
    if (tipo && tipo !== 'DEPENDÊNCIA' && tipo !== 'OUTRO') {
      if (!unidade) {
        return NextResponse.json({ message: 'A unidade é obrigatória para provas do tipo ' + tipo }, { status: 400 })
      }
      
      const existingProva = await prisma.prova.findFirst({
        where: {
          turmaId,
          unidade: parseInt(unidade),
          tipo: tipo,
          areaId: areaId || null
        },
        include: { 
          professorCriador: { select: { name: true } },
          area: { select: { nome: true } }
        }
      })

      if (existingProva) {
        const areaNome = existingProva.area?.nome || 'Conhecimentos Gerais'
        return NextResponse.json({ 
          message: `Atenção: Já existe uma prova [${tipo}] gerada para a área de ${areaNome} nesta turma na ${unidade}ª Unidade (Criada por ${existingProva.professorCriador?.name || 'Desconhecido'}). Não é possível criar provas duplicadas da mesma área.`,
          conflict: true
        }, { status: 409 })
      }
    }

    // Mantendo fallback para títulos duplicados genéricos
    const existingTitle = await prisma.prova.findFirst({
      where: { titulo: { equals: titulo, mode: 'insensitive' }, ...provaDaEscola(session.user.escolaId) }
    })

    if (existingTitle) {
      return NextResponse.json({ message: 'Já existe uma prova salva com este título. Escolha um nome diferente.' }, { status: 400 })
    }

    const prova = await prisma.prova.create({
      data: {
        titulo,
        turmaId,
        unidade: unidade ? parseInt(unidade) : null,
        tipo: tipo || 'BIMESTRAL',
        areaId: areaId || null,
        professorCriadorId: session.user.id,
        savedByUserId: session.user.id,
        questoesSnapshot: questoesSnapshot || null,
        questoes: {
          connect: questoesIds.map((id: string) => ({ id }))
        }
      },
      include: {
        turma: { select: { nome: true, curso: true } },
        savedByUser: { select: { name: true } },
        questoes: true
      }
    })

    return NextResponse.json(prova, { status: 201 })
  } catch (error: any) {
    console.error('Erro ao criar prova:', error)
    return NextResponse.json({ 
      message: 'Erro ao salvar prova', 
      details: error.message,
      stack: error.stack
    }, { status: 500 })
  }
})
