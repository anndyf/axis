import { PrismaClient } from '@prisma/client'
import * as dotenv from 'dotenv'
import { randomUUID } from 'crypto'

dotenv.config()

const prisma = new PrismaClient()

// Fase 3 (Migration 2) do plano multi-tenant: popular o novo id tecnico
// em todas as linhas existentes de Estudante. Usa randomUUID() nativo do Node
// em vez de cuid() (que so e gerado pelo Prisma Client em creates, nao em
// updates) - formato diferente das outras tabelas, mas mesmo proposito:
// string unica. matricula continua sendo a PK nesta etapa - so preparando
// o terreno para a troca de PK na Migration 5.
// Guarda de seguranca: so roda contra um host que pareca dev local.
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

  const semId = await prisma.estudante.findMany({
    where: { id: null },
    select: { matricula: true },
  })
  console.log(`📋 ${semId.length} estudante(s) sem id técnico.`)

  let atualizados = 0
  for (const { matricula } of semId) {
    await prisma.estudante.update({
      where: { matricula },
      data: { id: randomUUID() },
    })
    atualizados++
  }

  console.log(`✅ Backfill concluído: ${atualizados} linha(s) atualizadas com novo id.`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
