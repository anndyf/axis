import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'

export async function GET() {
  const session = await auth()
  if (!session || (!session.user.isSuperuser && !session.user.isDirecao)) {
    return NextResponse.json({ message: 'Não autorizado' }, { status: 401 })
  }
  if (!session.user.escolaId) {
    return NextResponse.json({ message: 'Não autorizado' }, { status: 401 })
  }

  const turmas = await prisma.turma.findMany({
    where: { escolaId: session.user.escolaId },
    include: {
      _count: {
        select: {
          questoes: true,
          estudantes: true,
          disciplinas: true,
        }
      }
    },
    orderBy: { nome: 'asc' }
  })

  // Agrupa por nome para achar duplicatas facilmente
  const duplicates = turmas.filter(t => 
    turmas.filter(t2 => t2.nome === t.nome).length > 1
  )

  return NextResponse.json({
    total: turmas.length,
    duplicates: duplicates.map(t => ({
      id: t.id,
      nome: t.nome,
      ano: t.anoLetivo,
      counts: t._count
    }))
  })
}

// Rota para migrar questões de uma turma para outra
export async function POST(request: Request) {
  const session = await auth()
  if (!session || (!session.user.isSuperuser && !session.user.isDirecao)) {
    return NextResponse.json({ message: 'Não autorizado' }, { status: 401 })
  }
  if (!session.user.escolaId) {
    return NextResponse.json({ message: 'Não autorizado' }, { status: 401 })
  }
  const escolaId = session.user.escolaId

  const { fromId, toId } = await request.json()

  if (!fromId || !toId) {
    return NextResponse.json({ message: 'IDs de origem e destino são obrigatórios' }, { status: 400 })
  }

  // Garante que as duas turmas pertencem a escola do usuario logado - sem isso, um
  // superuser poderia informar o id de uma turma de outra escola e misturar dados.
  const turmasValidas = await prisma.turma.findMany({
    where: { id: { in: [fromId, toId] }, escolaId },
    select: { id: true }
  })
  if (turmasValidas.length !== 2) {
    return NextResponse.json({ message: 'Turma de origem ou destino não encontrada nesta escola' }, { status: 404 })
  }

  try {
    // 1. Pega todas as disciplinas da turma de DESTINO para mapeamento
    const targetDisciplinas = await prisma.disciplina.findMany({
      where: { turmaId: toId }
    })

    // 2. Pega todas as questões da turma de ORIGEM
    const questionsFrom = await prisma.questao.findMany({
      where: { turmas: { some: { id: fromId } } },
      include: { disciplinas: true }
    })

    // 3. Processa cada questão
    for (const q of questionsFrom) {
      const discToConnect = []
      const discToDisconnect = []

      // Mapeia disciplinas pelo nome
      for (const d of q.disciplinas) {
        if (d.turmaId === fromId) {
          discToDisconnect.push({ id: d.id })
          const match = targetDisciplinas.find(td => td.nome.trim().toLowerCase() === d.nome.trim().toLowerCase())
          if (match) {
            discToConnect.push({ id: match.id })
          }
        }
      }

      await prisma.questao.update({
        where: { id: q.id },
        data: {
          turmas: {
            connect: { id: toId },
            disconnect: { id: fromId }
          },
          disciplinas: {
            connect: discToConnect,
            disconnect: discToDisconnect
          }
        }
      })
    }

    // 4. Migrar estudantes
    const studentsFrom = await prisma.estudante.findMany({
      where: { turmaId: fromId },
      select: { id: true }
    })

    for (const s of studentsFrom) {
      await prisma.estudante.update({
        where: { id: s.id },
        data: {
          turmaId: toId
        }
      })
    }

    return NextResponse.json({ 
      message: 'Migração concluída com sucesso',
      movedQuestions: questionsFrom.length,
      movedStudents: studentsFrom.length
    })
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 })
  }
}
