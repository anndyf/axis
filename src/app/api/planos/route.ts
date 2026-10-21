import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { can } from '@/lib/rbac'
import { turmasSaoDaEscola } from '@/lib/data-fetching'
import { rotaDoModulo } from '@/lib/modulos/guarda'

export const POST = rotaDoModulo('PLA', 'escrita', async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.escolaId || !can(session.user, 'plano.elaborar')) {
      return NextResponse.json({ message: 'Apenas professores podem criar planos' }, { status: 403 })
    }

    const data = await request.json()
    const {
      disciplinaNome, periodoInicio, periodoFim,
      indicadores, conteudos, metodologias, recursos, avaliacao,
      observacoes, turmasIds
    } = data

    if (!turmasIds || turmasIds.length === 0) {
      return NextResponse.json({ message: 'Selecione pelo menos uma turma' }, { status: 400 })
    }
    if (!(await turmasSaoDaEscola(turmasIds, session.user.escolaId))) {
      return NextResponse.json({ message: 'Turma não encontrada' }, { status: 404 })
    }

    const plano = await prisma.planoEnsino.create({
      data: {
        disciplinaNome,
        periodoInicio: new Date(periodoInicio),
        periodoFim: new Date(periodoFim),
        indicadores,
        conteudos,
        metodologias,
        recursos,
        avaliacao,
        observacoes,
        professorId: session.user.id,
        turmas: {
          connect: turmasIds.map((id: string) => ({ id }))
        }
      },
      include: {
        turmas: true
      }
    })

    return NextResponse.json(plano)
  } catch (err) {
    console.error(err)
    return NextResponse.json({ message: 'Erro ao criar plano de ensino' }, { status: 500 })
  }
})

export const GET = rotaDoModulo('PLA', 'leitura', async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.escolaId) return NextResponse.json({ message: 'Não autorizado' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const professorId = searchParams.get('professorId')
    const turmaId = searchParams.get('turmaId')
    const disciplinaNome = searchParams.get('disciplinaNome')
    const dataInicio = searchParams.get('dataInicio')
    const dataFim = searchParams.get('dataFim')

    // PlanoEnsino não tem escolaId próprio - o escopo vem do professor
    const where: any = { professor: { escolaId: session.user.escolaId } }
    
    // Filtros
    if (!can(session.user, 'plano.acompanhar')) {
        // Se não for admin, vê apenas os próprios planos
        where.professorId = session.user.id
    } else if (professorId) {
        where.professorId = professorId
    }

    if (turmaId) {
        where.turmas = { some: { id: turmaId } }
    }

    if (disciplinaNome) {
        where.disciplinaNome = { contains: disciplinaNome, mode: 'insensitive' }
    }

    if (dataInicio && dataFim) {
        where.OR = [
            {
                periodoInicio: {
                    gte: new Date(dataInicio),
                    lte: new Date(dataFim)
                }
            },
            {
                periodoFim: {
                    gte: new Date(dataInicio),
                    lte: new Date(dataFim)
                }
            },
            {
                AND: [
                    { periodoInicio: { lte: new Date(dataInicio) } },
                    { periodoFim: { gte: new Date(dataFim) } }
                ]
            }
        ]
    } else if (dataInicio) {
        where.periodoInicio = { gte: new Date(dataInicio) }
    } else if (dataFim) {
        where.periodoFim = { lte: new Date(dataFim) }
    }

    const planos = await prisma.planoEnsino.findMany({
      where,
      include: {
        professor: { select: { name: true } },
        turmas: { select: { id: true, nome: true } }
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json(planos)
  } catch (err) {
    console.error(err)
    return NextResponse.json({ message: 'Erro ao buscar planos de ensino' }, { status: 500 })
  }
})
