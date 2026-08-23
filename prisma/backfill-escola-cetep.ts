import { PrismaClient } from '@prisma/client'
import * as dotenv from 'dotenv'

dotenv.config()

const prisma = new PrismaClient()

// Fase 2 do plano multi-tenant: popular escola_id do CETEP em todas as linhas
// existentes. Guarda de segurança: só roda contra um host que pareça dev local,
// já que esse script faz UPDATE em massa sem filtro além de escolaId IS NULL.
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

  const escolaCetep = await prisma.escola.upsert({
    where: { slug: 'cetep' },
    update: {},
    create: {
      nome: 'CETEP/LNAB',
      slug: 'cetep',
      plano: 'ENTERPRISE',
      status: 'ATIVA',
    },
  })
  console.log(`🏫 Escola CETEP: id=${escolaCetep.id} slug=${escolaCetep.slug}`)

  const [users, turmas, cursos, areasConhecimento, laboratorios, messages, configs] =
    await prisma.$transaction([
      prisma.user.updateMany({
        where: { escolaId: null },
        data: { escolaId: escolaCetep.id },
      }),
      prisma.turma.updateMany({
        where: { escolaId: null },
        data: { escolaId: escolaCetep.id },
      }),
      prisma.curso.updateMany({
        where: { escolaId: null },
        data: { escolaId: escolaCetep.id },
      }),
      prisma.areaConhecimento.updateMany({
        where: { escolaId: null },
        data: { escolaId: escolaCetep.id },
      }),
      prisma.laboratorio.updateMany({
        where: { escolaId: null },
        data: { escolaId: escolaCetep.id },
      }),
      prisma.message.updateMany({
        where: { escolaId: null },
        data: { escolaId: escolaCetep.id },
      }),
      prisma.globalConfig.updateMany({
        where: { escolaId: null },
        data: { escolaId: escolaCetep.id },
      }),
    ])

  console.log('✅ Backfill concluído:')
  console.log(`   users: ${users.count}`)
  console.log(`   turmas: ${turmas.count}`)
  console.log(`   cursos: ${cursos.count}`)
  console.log(`   areasConhecimento: ${areasConhecimento.count}`)
  console.log(`   laboratorios: ${laboratorios.count}`)
  console.log(`   messages: ${messages.count}`)
  console.log(`   configs: ${configs.count}`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
