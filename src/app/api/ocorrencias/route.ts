import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logAudit } from '@/lib/audit'

export const runtime = 'nodejs'

// GET ocorrencias com filtros
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session || (!session.user.isSuperuser && !session.user.isDirecao)) {
      return NextResponse.json({ message: 'Não autorizado' }, { status: 401 })
    }
    if (!session.user.escolaId) {
      return NextResponse.json({ message: 'Não autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const studentName = searchParams.get('studentName')
    const type = searchParams.get('type')
    const turmaId = searchParams.get('turmaId')

    const where: any = { escolaId: session.user.escolaId }

    if (startDate || endDate) {
      where.data = {}
      if (startDate) where.data.gte = new Date(startDate)
      if (endDate) where.data.lte = new Date(endDate)
    }

    if (type) {
      where.tipo = type
    }

    if (studentName || turmaId) {
      // Ocorrencia.estudantes agora e OcorrenciaEstudante[] (modelo explicito, Fase 3
      // Migration 4) - o filtro precisa navegar por .estudante em vez de campos diretos.
      where.estudantes = {
        some: {
          estudante: {
            ...(studentName && {
              nome: {
                contains: studentName,
                mode: 'insensitive'
              }
            }),
            ...(turmaId && {
              turmaId: turmaId
            })
          }
        }
      }
    }

    const ocorrenciasRaw = await prisma.ocorrencia.findMany({
      where,
      include: {
        estudantes: {
          include: {
            estudante: {
              include: {
                turma: {
                  select: { nome: true }
                }
              }
            }
          }
        },
        autor: {
          select: { name: true }
        }
      },
      orderBy: { data: 'desc' }
    })

    // Achata OcorrenciaEstudante[] de volta para Estudante[], preservando o formato
    // que o frontend (OcorrenciasClient.tsx) espera (est.matricula, est.nome, est.turma.nome).
    const ocorrencias = ocorrenciasRaw.map(o => ({
      ...o,
      estudantes: o.estudantes.map(oe => oe.estudante)
    }))

    return NextResponse.json(ocorrencias)
  } catch (error) {
    console.error('Erro ao buscar ocorrências:', error)
    return NextResponse.json({ message: 'Erro ao buscar ocorrências' }, { status: 500 })
  }
}

// POST criar ocorrência
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session || (!session.user.isSuperuser && !session.user.isDirecao)) {
      return NextResponse.json({ message: 'Não autorizado' }, { status: 401 })
    }
    if (!session.user.escolaId) {
      return NextResponse.json({ message: 'Não autorizado' }, { status: 401 })
    }
    const escolaId = session.user.escolaId

    const { titulo, descricao, tipo, data, estudantesIds } = await request.json()

    if (!titulo || !descricao || !tipo || !estudantesIds || estudantesIds.length === 0) {
      return NextResponse.json({ message: 'Dados incompletos' }, { status: 400 })
    }

    // estudantesIds vem do formulário como matriculas reais (OcorrenciaForm.tsx),
    // não ids tecnicos - precisa resolver para o id antes de criar os vinculos.
    const estudantesResolvidos = await prisma.estudante.findMany({
      where: { escolaId, matricula: { in: estudantesIds } },
      select: { id: true }
    })

    if (estudantesResolvidos.length === 0) {
      return NextResponse.json({ message: 'Nenhum estudante válido encontrado' }, { status: 400 })
    }

    const ocorrencia = await prisma.ocorrencia.create({
      data: {
        titulo,
        descricao,
        tipo,
        data: data ? new Date(data) : new Date(),
        registradoPorId: session.user.id,
        escolaId,
        estudantes: {
          create: estudantesResolvidos.map(e => ({ estudanteId: e.id }))
        }
      },
      include: {
        estudantes: {
          include: {
            estudante: {
              select: { nome: true }
            }
          }
        }
      }
    })

    await logAudit(
      session.user.id,
      'OCORRENCIA',
      ocorrencia.id,
      'CREATE',
      {
        titulo: ocorrencia.titulo,
        estudantes: ocorrencia.estudantes.map(oe => oe.estudante.nome).join(', ')
      }
    )

    return NextResponse.json(ocorrencia)
  } catch (error) {
    console.error('Erro ao criar ocorrência:', error)
    return NextResponse.json({ message: 'Erro ao criar ocorrência' }, { status: 500 })
  }
}
