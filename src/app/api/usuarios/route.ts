
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { hash } from 'bcryptjs'
import { enviarSenhaPorEmail } from '@/lib/mail'
import { gerarSenhaProvisoria } from '@/lib/senha'
import { podeAdicionarUsuarioStaff } from '@/lib/modules-server'
import { LIMITE_USUARIOS } from '@/lib/modules'
import { rotaDoModulo } from '@/lib/modulos/guarda'
import { can } from '@/lib/rbac'
import { gravarPapeis } from '@/lib/papeis'
import { papeisDoPedido } from '@/lib/services/papeis-usuario'

export const runtime = 'nodejs'

export const GET = rotaDoModulo('NUC', 'leitura', async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.escolaId || !can(session.user, 'plano.acompanhar')) {
      return NextResponse.json({ message: 'Não autorizado' }, { status: 403 })
    }

    // Usado pelo filtro de professor dos planos de ensino
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
})

export const POST = rotaDoModulo('NUC', 'escrita', async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.escolaId || !can(session.user, 'usuario.gerenciar')) {
      return NextResponse.json({ message: 'Não autorizado' }, { status: 403 })
    }
    const escolaId = session.user.escolaId

    const corpo = await request.json()
    const { name, email } = corpo

    if (!email) {
      return NextResponse.json({ message: 'Email é obrigatório' }, { status: 400 })
    }

    // Papéis escolhidos no editor (ou, de um cliente antigo, os booleanos)
    const pedido = papeisDoPedido(corpo, [])
    if ('erro' in pedido) {
      return NextResponse.json({ message: pedido.erro }, { status: 400 })
    }

    const existingUser = await prisma.user.findFirst({
      where: { escolaId, OR: [{ email }, { username: email }] }
    })

    if (existingUser) {
      return NextResponse.json({ message: 'Este email já está cadastrado' }, { status: 400 })
    }

    const escola = await prisma.escola.findUnique({ where: { id: escolaId }, select: { plano: true } })
    const plano = escola?.plano || 'BASICO'
    if (!(await podeAdicionarUsuarioStaff(escolaId, plano))) {
      const limite = LIMITE_USUARIOS[plano]
      return NextResponse.json({
        message: `Limite de usuários do plano ${plano} atingido (${limite}). Faça upgrade de plano ou remova um usuário existente.`
      }, { status: 403 })
    }

    const senhaGerada = gerarSenhaProvisoria()
    const hashedPassword = await hash(senhaGerada, 10)

    // Escrita dupla: vínculos de papel + booleanos coerentes (até a fase 3c)
    const user = await prisma.$transaction(async (tx) => {
      const criado = await tx.user.create({
        data: {
          name: name || '',
          email,
          username: email,
          password: hashedPassword,
          deveTrocarSenha: true,
          escolaId,
        }
      })
      await gravarPapeis(tx, { id: criado.id, escolaId }, pedido.papeis ?? [])
      return criado
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

  } catch (error: any) {
    console.error('ERRO DETALHADO AO CRIAR USUÁRIO:', error)
    return NextResponse.json({ 
      message: 'Erro interno ao criar usuário', 
      detail: error.message || 'Erro desconhecido' 
    }, { status: 500 })
  }
})
