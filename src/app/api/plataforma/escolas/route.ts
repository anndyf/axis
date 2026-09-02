import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export const runtime = 'nodejs'

const SLUG_REGEX = /^[a-z0-9-]+$/

export async function GET() {
  const session = await auth()
  if (!session?.user?.isPlatformAdmin) {
    return NextResponse.json({ message: 'Não autorizado' }, { status: 403 })
  }

  const escolas = await prisma.escola.findMany({
    include: { _count: { select: { users: true, estudantes: true } } },
    orderBy: { createdAt: 'desc' }
  })

  return NextResponse.json(escolas)
}

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.isPlatformAdmin) {
    return NextResponse.json({ message: 'Não autorizado' }, { status: 403 })
  }

  try {
    const {
      nome,
      slug,
      plano,
      adminNome,
      adminUsername,
      adminEmail,
      adminSenha
    }: {
      nome: string
      slug: string
      plano: string
      adminNome: string
      adminUsername: string
      adminEmail: string
      adminSenha: string
    } = await request.json()

    if (!nome || !slug || !plano) {
      return NextResponse.json({ message: 'Nome, slug e plano são obrigatórios' }, { status: 400 })
    }
    if (!SLUG_REGEX.test(slug)) {
      return NextResponse.json({ message: 'Slug inválido: use apenas letras minúsculas, números e hífen' }, { status: 400 })
    }
    if (!adminNome || !adminUsername || !adminEmail || !adminSenha) {
      return NextResponse.json({ message: 'Dados do administrador inicial são obrigatórios' }, { status: 400 })
    }
    if (adminSenha.length < 6) {
      return NextResponse.json({ message: 'A senha do administrador precisa ter ao menos 6 caracteres' }, { status: 400 })
    }

    const slugExistente = await prisma.escola.findUnique({ where: { slug } })
    if (slugExistente) {
      return NextResponse.json({ message: `O slug "${slug}" já está em uso` }, { status: 409 })
    }

    const hashedPassword = await bcrypt.hash(adminSenha, 10)

    const escola = await prisma.$transaction(async (tx) => {
      const novaEscola = await tx.escola.create({
        data: { nome, slug, plano: plano as any, status: 'ATIVA' }
      })

      await tx.user.create({
        data: {
          escolaId: novaEscola.id,
          name: adminNome,
          username: adminUsername,
          email: adminEmail,
          password: hashedPassword,
          isSuperuser: true,
          isStaff: true,
          isDirecao: true,
          isActive: true,
          isApproved: true,
        }
      })

      return novaEscola
    })

    return NextResponse.json(escola, { status: 201 })
  } catch (error: any) {
    if (error.code === 'P2002') {
      return NextResponse.json({ message: 'Conflito: slug ou usuário já em uso' }, { status: 409 })
    }
    console.error('Erro ao criar escola:', error)
    return NextResponse.json({ message: 'Erro ao criar escola' }, { status: 500 })
  }
}
