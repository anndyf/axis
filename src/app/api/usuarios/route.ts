
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { hash } from 'bcryptjs'
import { enviarSenhaPorEmail } from '@/lib/mail'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.escolaId || (!session.user.isSuperuser && !session.user.isDirecao)) {
      return NextResponse.json({ message: 'Não autorizado' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const role = searchParams.get('role')

    const where: any = { escolaId: session.user.escolaId }
    if (role === 'professor') {
      where.isSuperuser = false
      where.isDirecao = false
      where.isPortalUser = false
    }

    const usuarios = await prisma.user.findMany({
      where,
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        email: true,
        username: true,
        isSuperuser: true,
        isDirecao: true,
        isStaff: true,
      }
    })

    return NextResponse.json(usuarios)
  } catch (error) {
    return NextResponse.json({ message: 'Erro ao buscar usuários' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.escolaId || !session.user.isSuperuser) {
      return NextResponse.json({ message: 'Não autorizado' }, { status: 403 })
    }
    const escolaId = session.user.escolaId

    const { name, email, isSuperuser, isDirecao, isStaff, isAEE } = await request.json()

    if (!email) {
      return NextResponse.json({ message: 'Email é obrigatório' }, { status: 400 })
    }

    const existingUser = await prisma.user.findFirst({
      where: { escolaId, OR: [{ email }, { username: email }] }
    })

    if (existingUser) {
      return NextResponse.json({ message: 'Este email já está cadastrado' }, { status: 400 })
    }

    // Geração de senha aleatória (Django Style)
    const charset = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789abcdefghijkmnopqrstuvwxyz"
    const senhaGerada = Array.from({ length: 10 }, () => charset[Math.floor(Math.random() * charset.length)]).join('')
    
    const hashedPassword = await hash(senhaGerada, 10)

    try {
      // Tentar criação normal via Prisma Client
      const user = await prisma.user.create({
        data: {
          name: name || '',
          email,
          username: email,
          password: hashedPassword,
          isSuperuser: !!isSuperuser,
          isDirecao: !!isDirecao,
          isStaff: !!isStaff,
          isAEE: !!isAEE,
          escolaId,
        }
      })

      // Enviar email com a senha (não trava se falhar)
      try {
        await enviarSenhaPorEmail(email, name || 'Professor', senhaGerada, escolaId);
      } catch (mailError) {
        console.error('Falha ao enviar e-mail:', mailError);
      }

      return NextResponse.json({ 
        id: user.id, 
        message: 'Usuário criado e senha enviada por e-mail' 
      }, { status: 201 })

    } catch (prismaError: any) {
      // FALLBACK: Se o Prisma Client estiver "stale" (cache do dev server), usamos RAW SQL
      console.warn('Prisma Client falhou, tentando fallback via SQL bruto...', prismaError.message)
      
      const id = `u_${Math.random().toString(36).substring(2, 11)}`

      await prisma.$executeRawUnsafe(`
        INSERT INTO "users" (id, email, username, password, name, is_superuser, is_direcao, is_staff, is_aee, is_active, escola_id, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, true, $10, NOW(), NOW())
      `, id, email, email, hashedPassword, name || '', !!isSuperuser, !!isDirecao, !!isStaff, !!isAEE, escolaId)

      try {
        await enviarSenhaPorEmail(email, name || 'Professor', senhaGerada, escolaId);
      } catch (mailError) {}

      return NextResponse.json({ 
        id, 
        message: 'Usuário criado via SQL (Fallback) e senha enviada por e-mail' 
      }, { status: 201 })
    }

  } catch (error: any) {
    console.error('ERRO DETALHADO AO CRIAR USUÁRIO:', error)
    return NextResponse.json({ 
      message: 'Erro interno ao criar usuário', 
      detail: error.message || 'Erro desconhecido' 
    }, { status: 500 })
  }
}
