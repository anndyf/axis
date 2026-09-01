import { PrismaClient } from '@prisma/client'
import * as dotenv from 'dotenv'

dotenv.config()

const prisma = new PrismaClient()

// Fase 3 do modelo de avaliação configurável: popula NotaUnidade/NotaAtividade
// a partir das colunas fixas nota1/nota2/nota3 existentes, usando o esquema
// (legado ou customizado) resolvido para a turma/curso de cada estudante.
// Guarda de segurança: só roda contra host local, mesmo padrão dos outros
// scripts de backfill desta sessão.
function assertHostLocal() {
  const url = process.env.DATABASE_URL ?? ''
  const isLocal = /localhost|127\.0\.0\.1/.test(url)
  if (!isLocal && process.env.FORCE_BACKFILL !== 'true') {
    console.error(
      `❌ DATABASE_URL não parece apontar para um host local (${url.replace(/:[^:@]+@/, ':***@')}).\n` +
      `Este script só deve rodar contra o banco de desenvolvimento isolado.\n` +
      `Se isso for intencional, rode novamente com FORCE_BACKFILL=true.`
    )
    process.exit(1)
  }
}

async function main() {
  assertHostLocal()
  console.log(`🎯 Alvo: ${process.env.DATABASE_URL?.replace(/:[^:@]+@/, ':***@')}`)

  const notas = await prisma.notaFinal.findMany({
    select: {
      id: true,
      nota1: true,
      nota2: true,
      nota3: true,
      isDesistenteUnid1: true,
      isDesistenteUnid2: true,
      isDesistenteUnid3: true,
      estudante: {
        select: {
          turma: { select: { esquemaAvaliacaoId: true, cursoId: true } },
        },
      },
    },
  })
  console.log(`📋 ${notas.length} NotaFinal encontradas`)

  const cursos = await prisma.curso.findMany({ select: { id: true, esquemaAvaliacaoId: true } })
  const cursoEsquemaMap = new Map(cursos.map((c) => [c.id, c.esquemaAvaliacaoId]))

  const esquemas = await prisma.esquemaAvaliacao.findMany({
    include: { unidades: { orderBy: { ordem: 'asc' }, include: { atividades: { orderBy: { ordem: 'asc' } } } } },
  })
  const esquemaMap = new Map(esquemas.map((e) => [e.id, e]))

  const jaMigradas = new Set(
    (await prisma.notaUnidade.findMany({ select: { notaFinalId: true }, distinct: ['notaFinalId'] })).map(
      (r) => r.notaFinalId
    )
  )

  let criadas = 0
  let puladas = 0
  let semEsquema = 0

  for (const n of notas) {
    if (jaMigradas.has(n.id)) {
      puladas++
      continue
    }

    const turma = n.estudante.turma
    const esquemaId = turma.esquemaAvaliacaoId ?? (turma.cursoId ? cursoEsquemaMap.get(turma.cursoId) : null)
    const esquema = esquemaId ? esquemaMap.get(esquemaId) : null

    if (!esquema) {
      semEsquema++
      continue
    }

    const notasPorOrdem: Record<number, number | null> = { 1: n.nota1, 2: n.nota2, 3: n.nota3 }
    const desistentePorOrdem: Record<number, boolean> = {
      1: n.isDesistenteUnid1,
      2: n.isDesistenteUnid2,
      3: n.isDesistenteUnid3,
    }

    await prisma.$transaction(async (tx) => {
      for (const eu of esquema.unidades) {
        const valor = notasPorOrdem[eu.ordem] ?? null
        const isDesistente = desistentePorOrdem[eu.ordem] ?? false

        const notaUnidade = await tx.notaUnidade.create({
          data: {
            notaFinalId: n.id,
            esquemaUnidadeId: eu.id,
            notaCalculada: valor,
            isDesistente,
          },
        })

        const primeiraAtividade = eu.atividades[0]
        if (primeiraAtividade) {
          await tx.notaAtividade.create({
            data: {
              notaUnidadeId: notaUnidade.id,
              esquemaAtividadeId: primeiraAtividade.id,
              valor,
            },
          })
        }
      }
    })

    criadas++
  }

  console.log(
    `\n✅ Criadas: ${criadas} | Já migradas (puladas): ${puladas} | Sem esquema resolvido: ${semEsquema}`
  )
  if (semEsquema > 0) {
    console.warn(
      `⚠️  ${semEsquema} NotaFinal não tiveram esquema resolvido (turma e curso sem esquemaAvaliacaoId) - revisar manualmente.`
    )
  }
  await prisma.$disconnect()
}

main()
