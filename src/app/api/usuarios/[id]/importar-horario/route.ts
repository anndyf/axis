import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

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
    const escolaId = session.user.escolaId

    const usuario = await prisma.user.findUnique({ where: { id, escolaId } })
    if (!usuario) {
      return NextResponse.json({ message: 'Usuário não encontrado' }, { status: 404 })
    }

    const { disciplinaIds } = await request.json() as { disciplinaIds: string[] }
    if (!disciplinaIds?.length) {
      return NextResponse.json({ message: 'Nenhuma disciplina para vincular' }, { status: 400 })
    }

    // So vincula disciplinas que realmente pertencem a escola do usuario logado
    const disciplinasValidas = await prisma.disciplina.findMany({
      where: { id: { in: disciplinaIds }, turma: { escolaId } },
      select: { id: true }
    })

    // Conecta as disciplinas ao professor (mantendo as já existentes)
    await prisma.user.update({
      where: { id },
      data: {
        disciplinasPermitidas: {
          connect: disciplinasValidas.map(d => ({ id: d.id }))
        }
      }
    })

    return NextResponse.json({
      vinculadas: disciplinasValidas.length,
      message: `${disciplinasValidas.length} disciplina(s) vinculada(s) com sucesso!`
    })

  } catch (error: any) {
    console.error('Erro importar-horario:', error)
    return NextResponse.json({ message: 'Erro interno: ' + error.message }, { status: 500 })
  }
}
