import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logAudit } from '@/lib/audit'

export const runtime = 'nodejs'

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session || (!session.user.isSuperuser && !session.user.isDirecao)) {
      return NextResponse.json({ message: 'Não autorizado' }, { status: 401 })
    }
    if (!session.user.escolaId) {
      return NextResponse.json({ message: 'Não autorizado' }, { status: 401 })
    }

    const { id } = await context.params

    const ocorrencia = await prisma.ocorrencia.delete({
      where: { id, escolaId: session.user.escolaId }
    })

    await logAudit(
      session.user.id,
      'OCORRENCIA',
      id,
      'DELETE',
      { titulo: ocorrencia.titulo }
    )

    return NextResponse.json({ message: 'Ocorrência excluída com sucesso' })
  } catch (error) {
    console.error('Erro ao excluir ocorrência:', error)
    return NextResponse.json({ message: 'Erro ao excluir ocorrência' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session || (!session.user.isSuperuser && !session.user.isDirecao)) {
      return NextResponse.json({ message: 'Não autorizado' }, { status: 401 })
    }

    if (!session.user.escolaId) {
      return NextResponse.json({ message: 'Não autorizado' }, { status: 401 })
    }
    const escolaId = session.user.escolaId

    const { id } = await context.params
    const { titulo, descricao, tipo, data, estudantesIds } = await request.json()

    // estudantesIds vem como matriculas reais (mesmo formulario do POST) - precisa
    // resolver para o id tecnico antes de vincular via OcorrenciaEstudante.
    // "set" nao existe mais como troca direta: substitui a lista inteira apagando
    // os vinculos atuais e recriando com os estudantes resolvidos.
    let estudantesUpdate: any = undefined
    if (estudantesIds) {
      const estudantesResolvidos = await prisma.estudante.findMany({
        where: { escolaId, matricula: { in: estudantesIds } },
        select: { id: true }
      })
      estudantesUpdate = {
        deleteMany: {},
        create: estudantesResolvidos.map(e => ({ estudanteId: e.id }))
      }
    }

    const ocorrencia = await prisma.ocorrencia.update({
      where: { id, escolaId },
      data: {
        titulo,
        descricao,
        tipo,
        data: data ? new Date(data) : undefined,
        ...(estudantesUpdate && { estudantes: estudantesUpdate })
      }
    })

    await logAudit(
      session.user.id,
      'OCORRENCIA',
      id,
      'UPDATE',
      { titulo: ocorrencia.titulo }
    )

    return NextResponse.json(ocorrencia)
  } catch (error) {
    console.error('Erro ao atualizar ocorrência:', error)
    return NextResponse.json({ message: 'Erro ao atualizar ocorrência' }, { status: 500 })
  }
}
