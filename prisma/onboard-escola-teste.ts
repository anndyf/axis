import { PrismaClient } from '@prisma/client'
import * as dotenv from 'dotenv'
import bcrypt from 'bcryptjs'

dotenv.config()

const prisma = new PrismaClient()

// Fase 8 do plano multi-tenant: provisiona uma segunda escola de teste,
// com dados minimos proprios, para validar isolamento real entre tenants.
// Guarda de seguranca: so roda contra host local, mesmo padrao dos outros
// scripts de backfill desta sessao.
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

  const escola = await prisma.escola.upsert({
    where: { slug: 'horizonte' },
    update: {},
    create: {
      nome: 'Colégio Horizonte',
      slug: 'horizonte',
      plano: 'PRO',
      status: 'ATIVA',
    },
  })
  console.log(`🏫 Escola: id=${escola.id} slug=${escola.slug}`)

  const hashedPassword = await bcrypt.hash('admin123', 10)

  // Propositalmente username/email iguais aos do CETEP - deve funcionar,
  // pois a unicidade agora e por escola.
  const admin = await prisma.user.upsert({
    where: { escolaId_username: { escolaId: escola.id, username: 'admin' } },
    update: {},
    create: {
      username: 'admin',
      email: 'admin@axis.com',
      password: hashedPassword,
      name: 'Administrador - Horizonte',
      isSuperuser: true,
      isStaff: true,
      isActive: true,
      isApproved: true,
      isDirecao: true,
      escolaId: escola.id,
    },
  })
  console.log(`👤 Admin: ${admin.username} (id=${admin.id})`)

  // Curso com sigla igual a um do CETEP ("I") - deve funcionar, unicidade e por escola.
  const curso = await prisma.curso.upsert({
    where: { escolaId_sigla: { escolaId: escola.id, sigla: 'I' } },
    update: {},
    create: {
      nome: 'Técnico em Informática',
      sigla: 'I',
      modalidade: 'EPI',
      turnos: ['MATUTINO'],
      escolaId: escola.id,
    },
  })
  console.log(`📚 Curso: ${curso.nome} (${curso.sigla})`)

  const turma = await prisma.turma.upsert({
    where: { id: `horizonte-turma-1` },
    update: {},
    create: {
      id: 'horizonte-turma-1',
      nome: '1TIM1',
      cursoId: curso.id,
      curso: curso.nome,
      turno: 'MATUTINO',
      serie: '1',
      anoLetivo: 2026,
      escolaId: escola.id,
    },
  })
  console.log(`🏫 Turma: ${turma.nome}`)

  const estudante = await prisma.estudante.upsert({
    where: { escolaId_matricula: { escolaId: escola.id, matricula: 'HZT-001' } },
    update: {},
    create: {
      matricula: 'HZT-001',
      nome: 'Estudante Teste Horizonte',
      turmaId: turma.id,
      escolaId: escola.id,
    },
  })
  console.log(`🎓 Estudante: ${estudante.nome} (${estudante.matricula})`)

  console.log('✅ Segunda escola provisionada com sucesso.')
  console.log('🔑 Login de teste: escolaId via subdomínio horizonte.localhost:3000, user: admin / pass: admin123')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
