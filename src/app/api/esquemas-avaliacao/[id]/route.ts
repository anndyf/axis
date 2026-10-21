import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { can } from '@/lib/rbac'
import { validarEsquema, criarEstruturaEsquema, type EsquemaBody } from '@/lib/services/esquemas-avaliacao'
import { rotaDoModulo } from '@/lib/modulos/guarda'

export const runtime = 'nodejs'

export const PUT = rotaDoModulo('NUC', 'escrita', async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()
    if (!session?.user?.escolaId || !can(session.user, 'configuracao.editar')) {
      return NextResponse.json({ message: 'Não autorizado' }, { status: 403 })
    }
    const escolaId = session.user.escolaId
    const { id } = await params

    const existente = await prisma.esquemaAvaliacao.findUnique({ where: { id, escolaId } })
    if (!existente) {
      return NextResponse.json({ message: 'Esquema não encontrado' }, { status: 404 })
    }

    const validado = validarEsquema(await request.json() as EsquemaBody)
    if ('erro' in validado) {
      return NextResponse.json({ message: validado.erro }, { status: 400 })
    }

    // Recriar as unidades apagaria as avaliações que os professores criaram
    // nelas (atividades definidas pelo professor) - mesma regra das notas.
    if (await prisma.avaliacaoDisciplina.count({ where: { esquemaUnidade: { esquemaId: id } } })) {
      return NextResponse.json(
        { message: 'Não é possível editar: professores já criaram avaliações nas unidades atuais deste esquema.' },
        { status: 409 }
      )
    }

    const esquema = await prisma.$transaction(async (tx) => {
      await tx.esquemaAvaliacao.update({ where: { id }, data: validado.dados })

      // Apagar e recriar unidades/atividades é mais simples que diff
      // incremental. NotaUnidade referencia EsquemaUnidade sem cascade: se o
      // esquema já tem notas lançadas, o deleteMany falha com P2003 e a edição
      // inteira é desfeita (tratado abaixo como 409).
      // As datas das etapas no calendário (EtapaCalendario) caem em cascata
      // com as unidades: guardadas pela ordem e religadas às unidades novas.
      const datas = await tx.etapaCalendario.findMany({
        where: { esquemaUnidade: { esquemaId: id } },
        select: { periodoLetivoId: true, inicio: true, fim: true, prazoLancamento: true, esquemaUnidade: { select: { ordem: true } } },
      })
      await tx.esquemaUnidade.deleteMany({ where: { esquemaId: id } })
      await criarEstruturaEsquema(tx, id, validado.unidades)
      const novas = await tx.esquemaUnidade.findMany({ where: { esquemaId: id }, select: { id: true, ordem: true } })
      const porOrdem = new Map(novas.map((u) => [u.ordem, u.id]))
      const religadas = datas.flatMap(({ esquemaUnidade, ...d }) => {
        const esquemaUnidadeId = porOrdem.get(esquemaUnidade.ordem)
        return esquemaUnidadeId ? [{ ...d, esquemaUnidadeId }] : []
      })
      if (religadas.length) await tx.etapaCalendario.createMany({ data: religadas })

      return tx.esquemaAvaliacao.findUnique({
        where: { id },
        include: { unidades: { orderBy: { ordem: 'asc' }, include: { atividades: { orderBy: { ordem: 'asc' } } } } }
      })
    })

    return NextResponse.json(esquema)
  } catch (error: any) {
    if (error.code === 'P2003') {
      return NextResponse.json(
        { message: 'Não é possível editar: já existem notas lançadas usando as unidades atuais deste esquema.' },
        { status: 409 }
      )
    }
    console.error('Erro ao atualizar esquema de avaliação:', error)
    return NextResponse.json({ message: 'Erro ao atualizar esquema de avaliação' }, { status: 500 })
  }
})

export const DELETE = rotaDoModulo('NUC', 'escrita', async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()
    if (!session?.user?.escolaId || !can(session.user, 'configuracao.editar')) {
      return NextResponse.json({ message: 'Não autorizado' }, { status: 403 })
    }
    const escolaId = session.user.escolaId
    const { id } = await params

    const existente = await prisma.esquemaAvaliacao.findUnique({
      where: { id, escolaId },
      include: { _count: { select: { cursos: true, turmas: true } } }
    })
    if (!existente) {
      return NextResponse.json({ message: 'Esquema não encontrado' }, { status: 404 })
    }
    if (existente._count.cursos > 0 || existente._count.turmas > 0) {
      return NextResponse.json(
        { message: 'Não é possível excluir: este esquema está atribuído a cursos ou turmas.' },
        { status: 409 }
      )
    }

    await prisma.esquemaAvaliacao.delete({ where: { id } })

    return NextResponse.json({ message: 'Esquema removido com sucesso' })
  } catch (error: any) {
    if (error.code === 'P2003') {
      return NextResponse.json(
        { message: 'Não é possível excluir: já existem notas lançadas usando este esquema.' },
        { status: 409 }
      )
    }
    console.error('Erro ao remover esquema de avaliação:', error)
    return NextResponse.json({ message: 'Erro ao remover esquema de avaliação' }, { status: 500 })
  }
})
