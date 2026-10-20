import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { can } from '@/lib/rbac'
import { validarEsquema, criarEstruturaEsquema, type EsquemaBody } from '@/lib/services/esquemas-avaliacao'
import { rotaDoModulo } from '@/lib/modulos/guarda'

export const runtime = 'nodejs'

export const GET = rotaDoModulo('NUC', 'leitura', async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.escolaId) {
      return NextResponse.json({ message: 'Não autorizado' }, { status: 401 })
    }

    const esquemas = await prisma.esquemaAvaliacao.findMany({
      where: { escolaId: session.user.escolaId },
      include: {
        unidades: {
          orderBy: { ordem: 'asc' },
          include: { atividades: { orderBy: { ordem: 'asc' } } }
        },
        _count: { select: { cursos: true, turmas: true } }
      },
      orderBy: { nome: 'asc' }
    })

    return NextResponse.json(esquemas)
  } catch (error) {
    console.error('Erro ao buscar esquemas de avaliação:', error)
    return NextResponse.json({ message: 'Erro ao buscar esquemas de avaliação' }, { status: 500 })
  }
})

export const POST = rotaDoModulo('NUC', 'escrita', async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.escolaId || !can(session.user, 'configuracao.editar')) {
      return NextResponse.json({ message: 'Não autorizado' }, { status: 403 })
    }
    const escolaId = session.user.escolaId

    const validado = validarEsquema(await request.json() as EsquemaBody)
    if ('erro' in validado) {
      return NextResponse.json({ message: validado.erro }, { status: 400 })
    }

    const esquema = await prisma.$transaction(async (tx) => {
      const criado = await tx.esquemaAvaliacao.create({ data: { ...validado.dados, escolaId } })
      await criarEstruturaEsquema(tx, criado.id, validado.unidades)

      return tx.esquemaAvaliacao.findUnique({
        where: { id: criado.id },
        include: { unidades: { orderBy: { ordem: 'asc' }, include: { atividades: { orderBy: { ordem: 'asc' } } } } }
      })
    })

    return NextResponse.json(esquema, { status: 201 })
  } catch (error) {
    console.error('Erro ao criar esquema de avaliação:', error)
    return NextResponse.json({ message: 'Erro ao criar esquema de avaliação' }, { status: 500 })
  }
})
