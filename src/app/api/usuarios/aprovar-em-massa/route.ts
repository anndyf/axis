import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { hash } from 'bcryptjs'
import { enviarSenhaPorEmail } from '@/lib/mail'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.escolaId || !session.user.isSuperuser) {
      return NextResponse.json({ message: 'Não autorizado' }, { status: 403 })
    }

    const { ids } = await request.json() as { ids: string[] }
    if (!ids || ids.length === 0) {
      return NextResponse.json({ message: 'Nenhum ID fornecido' }, { status: 400 })
    }

    // Busca apenas os que ainda não foram aprovados, restrito a escola do superuser logado
    const usuarios = await prisma.user.findMany({
      where: { id: { in: ids }, isApproved: false, escolaId: session.user.escolaId }
    })

    if (usuarios.length === 0) {
      return NextResponse.json({ message: 'Todos os usuários selecionados já foram aprovados' }, { status: 400 })
    }

    const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%"
    const gerarSenha = () =>
      Array.from({ length: 10 }, () => charset[Math.floor(Math.random() * charset.length)]).join('')

    const resultados: { nome: string; email: string; ok: boolean }[] = []

    // Processa em paralelo
    await Promise.all(usuarios.map(async (user) => {
      try {
        const senhaGerada = gerarSenha()
        const hashedPassword = await hash(senhaGerada, 10)

        await prisma.user.update({
          where: { id: user.id },
          data: { isApproved: true, isActive: true, password: hashedPassword }
        })

        try {
          await enviarSenhaPorEmail(user.email, user.name || 'Professor', senhaGerada, user.escolaId)
        } catch (mailErr) {
          console.error(`Email falhou para ${user.email}:`, mailErr)
        }

        resultados.push({ nome: user.name || '', email: user.email, ok: true })
      } catch (err) {
        console.error(`Erro ao aprovar ${user.id}:`, err)
        resultados.push({ nome: user.name || '', email: user.email, ok: false })
      }
    }))

    const aprovados = resultados.filter(r => r.ok).length
    const falhas = resultados.filter(r => !r.ok).length

    return NextResponse.json({
      aprovados,
      falhas,
      resultados,
      message: `${aprovados} usuário(s) aprovado(s) com sucesso${falhas > 0 ? `. ${falhas} falha(s).` : '!'}`
    })

  } catch (error: any) {
    console.error('Erro na aprovação em massa:', error)
    return NextResponse.json({ message: 'Erro interno' }, { status: 500 })
  }
}
