import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { rotaDoModulo } from '@/lib/modulos/guarda'

function normalizeText(text: string) {
    if (!text) return ''
    return text
        .replace(/<[^>]*>?/gm, '') // Remove HTML tags
        .replace(/&nbsp;/g, ' ') // Remove non-breaking spaces
        .normalize('NFD') // Decompose accents
        .replace(/[\u0300-\u036f]/g, '') // Remove accents
        .toLowerCase() // Lowercase
        .replace(/[^a-z0-9]/g, '') // Keep only alphanumeric
}

export const POST = rotaDoModulo('QST', 'leitura', async function POST(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const data = await req.json()
    const { enunciado, alternativas } = data

    if (!enunciado) {
      return NextResponse.json({ isDuplicate: false })
    }

    // Normaliza o enunciado recebido e as alternativas
    const normalizedEnunciado = normalizeText(enunciado)
    const normalizedAlts = alternativas ? normalizeText(alternativas.join('')) : ''

    // Pega as últimas 50 questões deste professor (duplicatas geralmente são recentes)
    const recentQuestions = await prisma.questao.findMany({
      where: { professorId: session.user.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: {
        id: true,
        enunciado: true,
        alternativaA: true,
        alternativaB: true,
        alternativaC: true,
        alternativaD: true,
        alternativaE: true
      }
    })

    for (const q of recentQuestions) {
        const qNormEnunciado = normalizeText(q.enunciado)
        
        // Verifica se o enunciado bate
        if (qNormEnunciado === normalizedEnunciado && qNormEnunciado.length > 10) {
            // Enunciado igual. Vamos checar as alternativas.
            if (alternativas) {
               const qAlts = [q.alternativaA, q.alternativaB, q.alternativaC, q.alternativaD, q.alternativaE]
               const qNormAlts = normalizeText(qAlts.join(''))
               if (qNormAlts === normalizedAlts) {
                   return NextResponse.json({ isDuplicate: true, matchId: q.id })
               }
            } else {
               // Se não mandou alternativas para validar, considera duplicado apenas pelo enunciado
               return NextResponse.json({ isDuplicate: true, matchId: q.id })
            }
        }
    }

    return NextResponse.json({ isDuplicate: false })
  } catch (error) {
    console.error('Error checking duplicate:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
})
