import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { exigirAdminPlataforma, registrarAcaoPlataforma, SELECT_ESCOLA_PLATAFORMA } from '@/lib/plataforma'
import { garantirEsquemasPadrao } from '@/lib/services/esquemas-padrao'

export const runtime = 'nodejs'

const SLUG_REGEX = /^[a-z0-9-]+$/
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PLANOS_VALIDOS = ['BASICO', 'PRO', 'ENTERPRISE']
const SENHA_MINIMA = 8

export async function GET() {
  if (!(await exigirAdminPlataforma())) {
    return NextResponse.json({ message: 'Não autorizado' }, { status: 403 })
  }

  const escolas = await prisma.escola.findMany({
    select: SELECT_ESCOLA_PLATAFORMA,
    orderBy: { createdAt: 'desc' }
  })

  return NextResponse.json(escolas)
}

export async function POST(request: NextRequest) {
  const admin = await exigirAdminPlataforma()
  if (!admin) {
    return NextResponse.json({ message: 'Não autorizado' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const texto = (v: unknown) => (typeof v === 'string' ? v.trim() : '')
    const nome = texto(body.nome)
    const slug = texto(body.slug)
    const plano = texto(body.plano)
    const adminNome = texto(body.adminNome)
    const adminUsername = texto(body.adminUsername)
    const adminEmail = texto(body.adminEmail).toLowerCase()
    const adminSenha = typeof body.adminSenha === 'string' ? body.adminSenha : ''

    if (!nome || !slug || !plano) {
      return NextResponse.json({ message: 'Nome, slug e plano são obrigatórios' }, { status: 400 })
    }
    if (!SLUG_REGEX.test(slug)) {
      return NextResponse.json({ message: 'Slug inválido: use apenas letras minúsculas, números e hífen' }, { status: 400 })
    }
    if (!PLANOS_VALIDOS.includes(plano)) {
      return NextResponse.json({ message: 'Plano inválido' }, { status: 400 })
    }
    if (!adminNome || !adminUsername || !adminEmail || !adminSenha) {
      return NextResponse.json({ message: 'Dados do administrador inicial são obrigatórios' }, { status: 400 })
    }
    if (!EMAIL_REGEX.test(adminEmail)) {
      return NextResponse.json({ message: 'E-mail do administrador inválido' }, { status: 400 })
    }
    if (adminSenha.length < SENHA_MINIMA) {
      return NextResponse.json({ message: `A senha do administrador precisa ter ao menos ${SENHA_MINIMA} caracteres` }, { status: 400 })
    }

    const slugExistente = await prisma.escola.findUnique({ where: { slug }, select: { id: true } })
    if (slugExistente) {
      return NextResponse.json({ message: `O slug "${slug}" já está em uso` }, { status: 409 })
    }

    const hashedPassword = await bcrypt.hash(adminSenha, 10)

    const escola = await prisma.$transaction(async (tx) => {
      const novaEscola = await tx.escola.create({
        data: { nome, slug, plano: plano as 'BASICO' | 'PRO' | 'ENTERPRISE', status: 'ATIVA' },
        select: SELECT_ESCOLA_PLATAFORMA,
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
          // Senha definida por quem vendeu: o admin da escola cria a dele
          deveTrocarSenha: true,
        }
      })

      // Esquemas de avaliação padrão (anual e semestral), como no onboarding
      await garantirEsquemasPadrao(tx, novaEscola.id)

      return novaEscola
    })

    await registrarAcaoPlataforma(admin.id, 'CRIAR_ESCOLA', escola.id, { nome, slug, plano, adminUsername, adminEmail })

    return NextResponse.json(escola, { status: 201 })
  } catch (error: any) {
    if (error.code === 'P2002') {
      return NextResponse.json({ message: 'Conflito: slug ou usuário já em uso' }, { status: 409 })
    }
    console.error('Erro ao criar escola:', error)
    return NextResponse.json({ message: 'Erro ao criar escola' }, { status: 500 })
  }
}
