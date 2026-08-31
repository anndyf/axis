
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ turmaId: string; disciplinaId: string }> }
) {
  try {
    const session = await auth()

    if (!session?.user?.escolaId) {
      return NextResponse.json({ message: 'Não autorizado' }, { status: 401 })
    }
    const escolaId = session.user.escolaId

    const { turmaId, disciplinaId } = await params

    console.log(`Buscando notas via Raw SQL para Turma: ${turmaId}, Disc: ${disciplinaId}`)

    // "estudante_id" guarda o id tecnico do estudante desde a Migration 3b (nao mais
    // a matricula) - o JOIN precisa ser por e.id, e o frontend (LancarNotasClient.tsx)
    // espera a matricula de volta em "estudanteId" (usa como chave do dicionario).
    const notas = await prisma.$queryRaw<any[]>`
      SELECT
        nf.id,
        e.matricula as "estudanteId",
        nf."disciplina_id" as "disciplinaId",
        nf."nota_1" as "nota1",
        nf."nota_2" as "nota2",
        nf."nota_3" as "nota3",
        nf.nota,
        nf.status,
        nf."is_desistente_unid1" as "isDesistenteUnid1",
        nf."is_desistente_unid2" as "isDesistenteUnid2",
        nf."is_desistente_unid3" as "isDesistenteUnid3"
      FROM "notas_finais" nf
      INNER JOIN "estudantes" e ON e.id = nf."estudante_id"
      WHERE nf."disciplina_id" = ${disciplinaId} AND e."turma_id" = ${turmaId} AND e."escola_id" = ${escolaId}
    `

    return NextResponse.json(notas)
  } catch (error) {
    console.error('Erro ao buscar notas via SQL:', error)
    return NextResponse.json(
      { message: 'Erro ao buscar notas' },
      { status: 500 }
    )
  }
}
