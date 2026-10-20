import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logAudit } from '@/lib/audit'
import { turmasSaoDaEscola } from '@/lib/data-fetching'
import { rotaDoModulo } from '@/lib/modulos/guarda'

export const runtime = 'nodejs'

export const PUT = rotaDoModulo('QST', 'escrita', async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const session = await auth()
    if (!session?.user?.escolaId) return NextResponse.json({ message: 'Não autorizado' }, { status: 401 })
    const escolaId = session.user.escolaId

    const body = await request.json()
    const { status, feedbackAdmin, enunciado, alternativaA, alternativaB, alternativaC, alternativaD, alternativaE, correta, dificuldade, muleta, imagemUrl, unidade, disciplinasIds, turmasIds, tipo } = body

    // Questao não tem escolaId próprio - o escopo vem do professor autor
    const questao = await prisma.questao.findFirst({ where: { id, professor: { escolaId } } })
    if (!questao) return NextResponse.json({ message: 'Questão não encontrada' }, { status: 404 })

    if (disciplinasIds) {
      const count = await prisma.disciplina.count({ where: { id: { in: disciplinasIds }, turma: { escolaId } } })
      if (count !== new Set(disciplinasIds).size) {
        return NextResponse.json({ message: 'Disciplina não encontrada' }, { status: 404 })
      }
    }
    if (turmasIds && !(await turmasSaoDaEscola(turmasIds, escolaId))) {
      return NextResponse.json({ message: 'Turma não encontrada' }, { status: 404 })
    }

    // Se nâo for admin, só pode editar se for o dono
    if (!session.user.isSuperuser && !session.user.isDirecao) {
      if (questao.professorId !== session.user.id) {
        return NextResponse.json({ message: 'Acesso negado' }, { status: 403 })
      }
    }

    // Preparar dados de atualização
    const data: any = {}
    
    // Admin pode mudar status e feedback
    if (session.user.isSuperuser || session.user.isDirecao) {
      if (status) data.status = status
      if (feedbackAdmin !== undefined) {
        data.feedbackAdmin = feedbackAdmin
        data.adminFeedbackId = session.user.id
      }
    }

    // Professor (ou admin) pode mudar o conteúdo se não estiver travado
    if (enunciado) data.enunciado = enunciado
    if (alternativaA) data.alternativaA = alternativaA
    if (alternativaB) data.alternativaB = alternativaB
    if (alternativaC) data.alternativaC = alternativaC
    if (alternativaD) data.alternativaD = alternativaD
    if (alternativaE) data.alternativaE = alternativaE
    if (correta) data.correta = correta
    if (dificuldade) data.dificuldade = dificuldade
    if (muleta !== undefined) data.muleta = muleta
    if (imagemUrl !== undefined) data.imagemUrl = imagemUrl
    if (unidade !== undefined) data.unidade = unidade
    if (tipo !== undefined) data.tipo = tipo

    // Se mudou o conteúdo, volta para pendente se for professor
    if (!session.user.isSuperuser && !session.user.isDirecao && status === undefined) {
      data.status = 'PENDENTE'
    }

    if (disciplinasIds) {
      data.disciplinas = { set: disciplinasIds.map((id: string) => ({ id })) }
    }
    if (turmasIds) {
      data.turmas = { set: turmasIds.map((id: string) => ({ id })) }
    }

    const updated = await prisma.questao.update({
      where: { id },
      data
    })

    await logAudit(
      session.user.id,
      'QUESTAO',
      id,
      'UPDATE',
      { 
        statusChanged: !!status, 
        contentChanged: !!(enunciado || alternativaA || alternativaB || alternativaC || alternativaD || alternativaE) 
      }
    )

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Erro ao atualizar questão:', error)
    return NextResponse.json({ message: 'Erro interno ao atualizar' }, { status: 500 })
  }
})

export const DELETE = rotaDoModulo('QST', 'escrita', async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const session = await auth()
    if (!session?.user?.escolaId) return NextResponse.json({ message: 'Não autorizado' }, { status: 401 })

    const questao = await prisma.questao.findFirst({ where: { id, professor: { escolaId: session.user.escolaId } } })
    if (!questao) return NextResponse.json({ message: 'Questão não encontrada' }, { status: 404 })

    // Apenas dono ou admin, e professor não pode deletar se já estiver aprovada
    if (!session.user.isSuperuser && !session.user.isDirecao) {
      if (questao.professorId !== session.user.id) {
        return NextResponse.json({ message: 'Sem permissão' }, { status: 403 })
      }
      if (questao.status === 'APROVADA') {
        return NextResponse.json({ message: 'Não é possível excluir uma questão já aprovada' }, { status: 403 })
      }
    }

    await prisma.questao.delete({ where: { id } })
    
    await logAudit(
      session.user.id,
      'QUESTAO',
      id,
      'DELETE',
      { enunciado: questao.enunciado.substring(0, 50) + '...' }
    )

    return NextResponse.json({ message: 'Questão removida' })
  } catch (error) {
    return NextResponse.json({ message: 'Erro ao deletar' }, { status: 500 })
  }
})
