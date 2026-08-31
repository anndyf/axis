import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { hash } from 'bcryptjs'
import { enviarSenhaPorEmail } from '@/lib/mail'

export const runtime = 'nodejs'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const session = await auth()

    if (!session?.user?.escolaId || !session.user.isSuperuser) {
      return NextResponse.json({ message: 'Não autorizado' }, { status: 403 })
    }

    const user = await prisma.user.findUnique({
      where: { id, escolaId: session.user.escolaId }
    })

    if (!user) {
      return NextResponse.json({ message: 'Usuário não encontrado' }, { status: 404 })
    }

    if (user.isApproved) {
      return NextResponse.json({ message: 'Usuário já está aprovado' }, { status: 400 })
    }

    // Geração de senha aleatória
    const charset = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789abcdefghijkmnopqrstuvwxyz"
    const senhaGerada = Array.from({ length: 10 }, () => charset[Math.floor(Math.random() * charset.length)]).join('')
    const hashedPassword = await hash(senhaGerada, 10)

    // Aprovar usuário
    await prisma.user.update({
      where: { id },
      data: {
        isApproved: true,
        isActive: true,
        password: hashedPassword
      }
    })

    // Enviar e-mail de acesso
    try {
      await enviarSenhaPorEmail(user.email, user.name || 'Professor', senhaGerada, user.escolaId)
    } catch (mailError) {
      console.error('Erro ao enviar e-mail de acesso:', mailError)
    }

    return NextResponse.json({ 
      message: `Usuário ${user.name} aprovado com sucesso! A senha foi enviada para ${user.email}.` 
    })

  } catch (error: any) {
    console.error('Erro ao aprovar usuário:', error)
    return NextResponse.json(
      { message: 'Erro ao processar aprovação de usuário' },
      { status: 500 }
    )
  }
}
