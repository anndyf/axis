import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logAudit } from '@/lib/audit'
import { getModulosAtivos } from '@/lib/modules-server'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session) return NextResponse.json({ message: 'Não autorizado' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const turmaId = searchParams.get('turmaId')
    const serie = searchParams.get('serie')
    const disciplinaId = searchParams.get('disciplinaId')
    const disciplinaNome = searchParams.get('disciplinaNome')
    const status = searchParams.get('status')
    const search = searchParams.get('search')
    const professorNome = searchParams.get('professorNome')
    const professorId = searchParams.get('professorId')
    const unidade = searchParams.get('unidade')
    const tipo = searchParams.get('tipo')
    const includeProvas = searchParams.get('includeProvas') === 'true'
    const areaId = searchParams.get('areaId')
 
    // Filtros base
    const where: any = {}
 
    // Se não for admin e não estiver buscando do banco de questões aprovadas públicas, só vê as próprias
    if (!session.user.isSuperuser && !session.user.isDirecao) {
      if (status !== 'APROVADA') {
        where.professorId = session.user.id
      }
    }
 
    if (turmaId) {
      where.OR = [
        { turmas: { some: { id: turmaId } } },
        { disciplinas: { some: { turmaId: turmaId } } }
      ]
    } else if (serie) {
      where.turmas = { some: { serie: serie } }
    }
 
    if (disciplinaId) {
      where.disciplinas = { some: { id: disciplinaId } }
    } else if (disciplinaNome) {
      where.disciplinas = { some: { nome: { contains: disciplinaNome, mode: 'insensitive' } } }
    }

    if (areaId) {
      if (!where.disciplinas) {
        where.disciplinas = { some: {} }
      }
      where.disciplinas.some.areaId = areaId
    }

    if (status) where.status = status
    if (unidade) where.unidade = unidade
    if (tipo) where.tipo = tipo
    if (professorId) {
      where.professorId = professorId
    } else if (professorNome) {
      where.professor = {
        name: {
          equals: professorNome,
          mode: 'insensitive'
        }
      }
    }
    if (search) {
      // Divide a busca por palavras com mais de 2 letras para ignorar "de", "e", "um".
      // Isso resolve o problema de buscas de frases ignorando as tags HTML (como <strong>) no banco.
      const searchTerms = search.trim().split(/\s+/).filter(word => word.length > 2)
      
      if (searchTerms.length > 0) {
        where.AND = searchTerms.map(term => ({
          enunciado: {
            contains: term,
            mode: 'insensitive'
          }
        }))
      } else {
        where.enunciado = {
          contains: search,
          mode: 'insensitive'
        }
      }
    }

    const includeObj: any = {
      professor: { select: { name: true } },
      disciplinas: { 
        select: { 
          id: true, 
          nome: true,
          turma: { select: { nome: true } }
        } 
      },
      turmas: { select: { id: true, nome: true } },
      adminFeedback: { select: { name: true } },
      _count: { select: { provas: true } }
    }

    if (includeProvas) {
      includeObj.provas = { select: { id: true, turmaId: true, titulo: true } }
    }

    const limitParam = searchParams.get('limit')
    const limit = limitParam ? parseInt(limitParam) : undefined

    const total = await prisma.questao.count({ where })
    const questoes = await prisma.questao.findMany({
      where,
      include: includeObj,
      orderBy: { createdAt: 'desc' },
      ...(limit ? { take: limit } : {})
    })

    const response = NextResponse.json(questoes)
    response.headers.set('X-Total-Count', total.toString())
    return response
  } catch (error) {
    console.error('Erro ao buscar questões:', error)
    return NextResponse.json({ message: 'Erro interno' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.escolaId) return NextResponse.json({ message: 'Não autorizado' }, { status: 401 })

    // Verificar se a funcionalidade está ativa para professores (por plano ou toggle da direção)
    if (!session.user.isSuperuser && !session.user.isDirecao) {
      const escola = await prisma.escola.findUnique({ where: { id: session.user.escolaId }, select: { plano: true } })
      const modulosAtivos = await getModulosAtivos(session.user.escolaId, escola?.plano || 'BASICO')
      if (!modulosAtivos.includes('banco-questoes')) {
        return NextResponse.json({ message: 'Funcionalidade temporariamente desativada' }, { status: 403 })
      }
    }

    const body = await request.json()
    const { 
      enunciado, 
      alternativaA, alternativaB, alternativaC, alternativaD, alternativaE, 
      correta, dificuldade, muleta, imagemUrl, unidade,
      disciplinasIds, turmasIds, tipo 
    } = body

    const questao = await prisma.questao.create({
      data: {
        enunciado,
        alternativaA, alternativaB, alternativaC, alternativaD, alternativaE,
        correta,
        dificuldade,
        muleta,
        imagemUrl,
        unidade,
        tipo,
        professorId: session.user.id,
        status: 'PENDENTE',
        disciplinas: { connect: disciplinasIds.map((id: string) => ({ id })) },
        turmas: { connect: turmasIds.map((id: string) => ({ id })) }
      }
    })

    await logAudit(
      session.user.id,
      'QUESTAO',
      questao.id,
      'INSERT',
      { enunciado: enunciado.substring(0, 50) + '...' }
    )

    return NextResponse.json(questao, { status: 201 })
  } catch (error: any) {
    console.error('Erro ao criar questão:', error)
    return NextResponse.json({ message: 'Erro ao salvar: ' + (error?.message || error) }, { status: 500 })
  }
}
