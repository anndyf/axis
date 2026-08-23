import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { randomUUID } from 'crypto'
import { revalidatePath } from 'next/cache'

export const runtime = 'nodejs'

import { getTurmasPermitidas } from '@/lib/data-fetching'

// GET all turmas (filtered by permissions)
export async function GET() {
  try {
    const session = await auth()
    
    if (!session) {
      return NextResponse.json({ message: 'Não autorizado' }, { status: 401 })
    }

    const turmas = await getTurmasPermitidas(session)

    return NextResponse.json(turmas)
  } catch (error) {
    console.error('Erro ao buscar turmas:', error)
    return NextResponse.json(
      { message: 'Erro ao buscar turmas' },
      { status: 500 }
    )
  }
}

// POST create turma
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session || (!session.user.isSuperuser && !session.user.isDirecao)) {
      return NextResponse.json({ message: 'Não autorizado' }, { status: 401 })
    }

    const { nome, curso, turno, modalidade, serie, numero, cursoId, importarMatriz } = await request.json()

    if (!nome || nome.trim() === '') {
      return NextResponse.json(
        { message: 'Nome da turma é obrigatório' },
        { status: 400 }
      )
    }

    const config = await prisma.globalConfig.findUnique({ where: { id: 'global' } })
    const currentYear = config?.anoLetivoAtual || new Date().getFullYear()

    try {
      const turma = await prisma.turma.create({
        data: {
          nome: nome.trim(),
          curso: curso?.trim(),
          turno: turno?.trim(),
          modalidade: modalidade?.trim(),
          serie: serie?.toString(),
          numero: numero ? parseInt(numero.toString()) : null,
          anoLetivo: currentYear,
          cursoId: cursoId || null,
          escolaId: session.user.escolaId
        }
      })

      // NOVIDADE: Importar automaticamente as disciplinas da Matriz Curricular
      if (cursoId && serie && (importarMatriz === true || importarMatriz === undefined)) {
        const matrizItems = await (prisma as any).matrizCurricular.findMany({
          where: { 
            cursoId: cursoId, 
            serie: serie.toString(),
            anoLetivo: currentYear
          }
        })

        if (matrizItems.length > 0) {
          await prisma.disciplina.createMany({
            data: matrizItems.map((m: any) => ({
              nome: m.nome,
              turmaId: turma.id,
              areaId: m.areaId
            }))
          })
          console.log(`Importadas ${matrizItems.length} disciplinas da matriz para a turma ${turma.nome}`)
        }
      }

      revalidatePath('/dashboard/turmas')
      return NextResponse.json(turma, { status: 201 })
    } catch (prismaError: any) {
      console.warn('Prisma falhou ao criar turma, tentando SQL bruto...', prismaError.message)
      
      const id = randomUUID()
      const now = new Date()
      const numVal = numero ? parseInt(numero.toString()) : null
      
      await prisma.$executeRawUnsafe(`
        INSERT INTO "turmas" (id, nome, curso, turno, modalidade, serie, numero, ano_letivo, created_at, updated_at, curso_id, escola_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      `, id, nome.trim(), curso?.trim(), turno?.trim(), modalidade?.trim(), serie?.toString(), numVal, currentYear, now, now, cursoId || null, session.user.escolaId)

      revalidatePath('/dashboard/turmas')
      return NextResponse.json({ id, nome, message: 'Turma criada via SQL' }, { status: 201 })
    }
  } catch (error) {
    console.error('Erro ao criar turma:', error)
    return NextResponse.json(
      { message: 'Erro ao criar turma' },
      { status: 500 }
    )
  }
}
