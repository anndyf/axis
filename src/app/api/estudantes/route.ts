import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'

// POST create estudante
export async function POST(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user?.escolaId) {
      return NextResponse.json({ message: 'Não autorizado' }, { status: 401 })
    }
    const escolaId = session.user.escolaId

    const { nome, turmaId, matricula } = await request.json()

    if (!nome || nome.trim() === '') {
      return NextResponse.json(
        { message: 'Nome do estudante é obrigatório' },
        { status: 400 }
      )
    }

    if (!matricula) {
      return NextResponse.json(
        { message: 'Matrícula é obrigatória' },
        { status: 400 }
      )
    }

    // Verificar se já existe estudante com esta matrícula
    const existingEstudante = await prisma.estudante.findUnique({
      where: { escolaId_matricula: { escolaId, matricula } }
    })

    if (existingEstudante) {
      return NextResponse.json(
        { message: `A matrícula ${matricula} já está cadastrada para o aluno ${existingEstudante.nome}.` },
        { status: 400 }
      )
    }

    // Verificar se já existe usuário com este username (matricula)
    const existingUser = await prisma.user.findUnique({
      where: { escolaId_username: { escolaId, username: matricula } }
    })

    if (existingUser) {
        return NextResponse.json(
          { message: `Já existe um usuário no sistema com o login ${matricula}.` },
          { status: 400 }
        )
    }

    const estudante = await prisma.estudante.create({
      data: {
        nome: nome.trim(),
        turmaId,
        matricula,
        escolaId
      }
    })

    // Se tiver matrícula, criar acesso ao portal automaticamente
    if (matricula) {
      const bcrypt = await import('bcryptjs')
      const hashedPassword = await bcrypt.hash(matricula, 10)
      
      try {
        await prisma.user.create({
            data: {
              username: matricula,
              email: `${matricula}@axis.com`,
              password: hashedPassword,
              name: nome.trim(),
              isPortalUser: true,
              estudanteId: estudante.id,
              escolaId,
              isApproved: true,
              isActive: true
            }
          })
      } catch (userError) {
          console.error('Erro ao criar usuário automático do portal:', userError)
          // Não falhamos a criação do estudante se apenas o usuário falhar, 
          // mas como já checamos acima, isso não deve acontecer por duplicidade.
      }
    }

    return NextResponse.json(estudante, { status: 201 })
  } catch (error: any) {
    console.error('Erro ao criar estudante:', error)
    
    // Tratamento específico para erros do Prisma (P2002 é Unique Constraint)
    if (error.code === 'P2002') {
        return NextResponse.json(
            { message: 'Erro de duplicidade: Esta matrícula ou usuário já existe no sistema.' },
            { status: 400 }
        )
    }

    return NextResponse.json(
      { message: 'Erro interno ao criar estudante. Verifique os dados e tente novamente.' },
      { status: 500 }
    )
  }
}

// GET buscar estudantes
export async function GET(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user?.escolaId) {
      return NextResponse.json({ message: 'Não autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')
    const turmaId = searchParams.get('turmaId')

    const where: any = { escolaId: session.user.escolaId }

    if (search) {
      where.OR = [
        { nome: { contains: search, mode: 'insensitive' } },
        { matricula: { contains: search, mode: 'insensitive' } }
      ]
    }
    
    if (turmaId) {
      where.turmaId = turmaId
    }

    const estudantes = await prisma.estudante.findMany({
      where,
      include: {
        turma: { select: { nome: true } }
      },
      orderBy: { nome: 'asc' },
      take: 50
    })

    return NextResponse.json(estudantes)
  } catch (error) {
    console.error('Erro ao buscar estudantes:', error)
    return NextResponse.json(
      { message: 'Erro ao buscar estudantes' },
      { status: 500 }
    )
  }
}
