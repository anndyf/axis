import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { can } from '@/lib/rbac'
import { turmasSaoDaEscola } from '@/lib/data-fetching'

export const runtime = 'nodejs'

// GET all disciplinas
export async function GET() {
  try {
    const session = await auth()
    
    if (!session?.user?.escolaId) {
      return NextResponse.json({ message: 'Não autorizado' }, { status: 401 })
    }

    const disciplinas = await prisma.disciplina.findMany({
      where: { turma: { escolaId: session.user.escolaId } },
      include: {
        turma: {
          select: { nome: true }
        }
      },
      orderBy: [
        { turma: { nome: 'asc' } },
        { nome: 'asc' }
      ]
    })

    return NextResponse.json(disciplinas)
  } catch (error) {
    console.error('Erro ao buscar disciplinas:', error)
    return NextResponse.json(
      { message: 'Erro ao buscar disciplinas' },
      { status: 500 }
    )
  }
}

// POST create disciplina
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user?.escolaId || !can(session.user, 'gestao')) {
      return NextResponse.json({ message: 'Não autorizado' }, { status: 401 })
    }

    const { nome, nomes, turmaId, turmaIds } = await request.json()

    // Normalize turmas to an array
    let targetTurmaIds: string[] = []
    if (turmaIds && Array.isArray(turmaIds) && turmaIds.length > 0) {
      targetTurmaIds = turmaIds
    } else if (turmaId) {
      targetTurmaIds = [turmaId]
    }

    if (targetTurmaIds.length === 0) {
      return NextResponse.json(
        { message: 'Pelo menos uma turma é obrigatória' },
        { status: 400 }
      )
    }

    if (!(await turmasSaoDaEscola(targetTurmaIds, session.user.escolaId))) {
      return NextResponse.json({ message: 'Turma não encontrada' }, { status: 404 })
    }

    // Determine the list of names
    let cleanNomes: string[] = []
    if (nomes && Array.isArray(nomes) && nomes.length > 0) {
      cleanNomes = Array.from(new Set(nomes
        .map((n: string) => n.trim())
        .filter((n: string) => n !== '')))
    } else if (nome && nome.trim() !== '') {
      cleanNomes = [nome.trim()]
    }

    if (cleanNomes.length === 0) {
       return NextResponse.json(
        { message: 'Nome da disciplina é obrigatório' },
        { status: 400 }
      )
    }

    // Check for existing disciplines with the same names in the target classes
    const existingDisciplinas = await prisma.disciplina.findMany({
        where: {
            turmaId: { in: targetTurmaIds },
            nome: { in: cleanNomes }
        },
        include: {
            turma: true
        }
    })

    if (existingDisciplinas.length > 0) {
        // Use a Set to ensure we don't report the same (name, class) conflict multiple times
        const uniqueConflicts = Array.from(new Set(
            existingDisciplinas.map(d => `${d.nome} na turma ${d.turma.nome}`)
        ))
        
        // Limit the number of displayed conflicts to avoid huge error messages
        const displayConflicts = uniqueConflicts.slice(0, 5)
        const moreCount = uniqueConflicts.length - 5
        let errorMsg = `As seguintes disciplinas já existem: ${displayConflicts.join(', ')}`
        if (moreCount > 0) {
            errorMsg += ` e mais ${moreCount} outra(s).`
        }

        return NextResponse.json(
            { message: errorMsg },
            { status: 400 }
        )
    }

    // If no conflicts, prepare data for creation
    const dataToCreate: { nome: string; turmaId: string }[] = []
    
    // Cartesian product: Names x Turmas
    for (const tId of targetTurmaIds) {
      for (const n of cleanNomes) {
        dataToCreate.push({ nome: n, turmaId: tId })
      }
    }

    if (dataToCreate.length > 0) {
      await prisma.disciplina.createMany({
        data: dataToCreate
      })
      return NextResponse.json({ message: 'Disciplinas criadas com sucesso', count: dataToCreate.length }, { status: 201 })
    }

    return NextResponse.json({ message: 'Nenhum dado para criar' }, { status: 400 })

  } catch (error) {
    console.error('Erro ao criar disciplina:', error)
    return NextResponse.json(
      { message: 'Erro ao criar disciplina' },
      { status: 500 }
    )
  }
}
