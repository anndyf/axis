import { PrismaClient } from '@prisma/client'
import * as dotenv from 'dotenv'

dotenv.config()

const prisma = new PrismaClient()

// Marca a conta admin da CETEP como admin de plataforma (isPlatformAdmin) -
// única conta com acesso ao painel /dashboard/plataforma, que lista e
// gerencia TODAS as escolas (fora do escopo normal de escolaId).
function assertHostLocal() {
  const url = process.env.DATABASE_URL ?? ''
  const isLocal = /localhost|127\.0\.0\.1/.test(url)
  if (!isLocal && process.env.FORCE_BACKFILL !== 'true') {
    console.error(
      `❌ DATABASE_URL não parece apontar para um host local (${url.replace(/:[^:@]+@/, ':***@')}).\n` +
      `Este script só deve rodar contra o banco de desenvolvimento isolado.`
    )
    process.exit(1)
  }
}

async function main() {
  assertHostLocal()
  console.log(`🎯 Alvo: ${process.env.DATABASE_URL?.replace(/:[^:@]+@/, ':***@')}`)

  const escola = await prisma.escola.findUnique({ where: { slug: 'cetep' } })
  if (!escola) {
    console.error('❌ Escola "cetep" não encontrada')
    process.exit(1)
  }

  const admin = await prisma.user.update({
    where: { escolaId_username: { escolaId: escola.id, username: 'admin' } },
    data: { isPlatformAdmin: true },
  })

  console.log(`✅ isPlatformAdmin=true para ${admin.username} (escola: ${escola.slug})`)
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
