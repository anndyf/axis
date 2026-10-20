import { PrismaClient } from '@prisma/client'
import * as dotenv from 'dotenv'
import bcrypt from 'bcryptjs'
import { sincronizarVinculosDosBooleanos } from '../src/lib/papeis'

dotenv.config()

const prisma = new PrismaClient()

// Cria um usuario de cada perfil na escola CETEP (rodar depois do seed.ts),
// pra testar permissoes manualmente. Logins documentados em LOGINS_TESTE.md.
// Guarda de seguranca: so roda contra host local, mesmo padrao dos outros
// scripts de backfill.
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

type UsuarioTeste = {
  username: string
  senha: string
  name: string
  isSuperuser?: boolean
  isDirecao?: boolean
  isStaff?: boolean
  isAEE?: boolean
  isActive?: boolean
  isApproved?: boolean
}

const usuarios: UsuarioTeste[] = [
  { username: 'direcao', senha: 'direcao123', name: 'Diretora Teste', isDirecao: true, isStaff: true },
  { username: 'aee', senha: 'aee123', name: 'Coordenação AEE Teste', isAEE: true, isStaff: true },
  { username: 'professor', senha: 'professor123', name: 'Professor Teste', isStaff: true },
  { username: 'professor.pendente', senha: 'pendente123', name: 'Professor Pendente', isStaff: true, isApproved: false },
  { username: 'professor.inativo', senha: 'inativo123', name: 'Professor Inativo', isStaff: true, isActive: false },
]

async function main() {
  assertHostLocal()

  const escola = await prisma.escola.findUnique({ where: { slug: 'cetep' } })
  if (!escola) {
    console.error('❌ Escola "cetep" não encontrada. Rode "npm run db:seed" antes.')
    process.exit(1)
  }
  const escolaId = escola.id

  console.log('👥 Criando usuários de teste...')
  for (const u of usuarios) {
    const { senha, ...flags } = u
    const password = await bcrypt.hash(senha, 10)
    const data = {
      ...flags,
      email: `${u.username}@axis.com`,
      password,
      isActive: u.isActive ?? true,
      isApproved: u.isApproved ?? true,
    }
    await prisma.user.upsert({
      where: { escolaId_username: { escolaId, username: u.username } },
      update: data,
      create: { ...data, escolaId },
    })
    console.log(`  ✓ ${u.username}`)
  }

  // O "professor" de teste recebe as disciplinas da turma 1TIM1, pra ter o
  // que lancar nota.
  const professor = await prisma.user.findUniqueOrThrow({
    where: { escolaId_username: { escolaId, username: 'professor' } },
  })
  const turma = await prisma.turma.findFirst({ where: { nome: '1TIM1', escolaId } })
  if (turma) {
    const disciplinas = await prisma.disciplina.findMany({ where: { turmaId: turma.id } })
    for (const d of disciplinas) {
      await prisma.disciplina.update({
        where: { id: d.id },
        data: { usuariosPermitidos: { connect: { id: professor.id } } },
      })
    }
    console.log(`  ✓ professor vinculado a ${disciplinas.length} disciplinas da 1TIM1`)
  }

  // Acesso ao portal do estudante: mesmo padrao do app (username e senha =
  // matricula), ver src/app/dashboard/estudantes/actions.ts.
  console.log('🎓 Criando acessos ao portal do estudante...')
  for (const matricula of ['1TIM1-001', '1TIM1-002']) {
    const estudante = await prisma.estudante.findUnique({
      where: { escolaId_matricula: { escolaId, matricula } },
    })
    if (!estudante) continue
    const password = await bcrypt.hash(matricula, 10)
    await prisma.user.upsert({
      where: { escolaId_username: { escolaId, username: matricula } },
      update: { password, estudanteId: estudante.id, deveTrocarSenha: true },
      create: {
        username: matricula,
        email: `${matricula}@axis.com`,
        password,
        name: estudante.nome,
        isPortalUser: true,
        deveTrocarSenha: true, // mesmo comportamento do app (senha = matrícula)
        estudanteId: estudante.id,
        escolaId,
        isApproved: true,
        isActive: true,
      },
    })
    console.log(`  ✓ ${matricula} (${estudante.nome})`)
  }

  // Um estudante com perfil AEE, pra o painel AEE nao ficar vazio.
  const estudanteAEE = await prisma.estudante.findUnique({
    where: { escolaId_matricula: { escolaId, matricula: '1TIM1-003' } },
  })
  if (estudanteAEE) {
    await prisma.aEEProfile.upsert({
      where: { estudanteId: estudanteAEE.id },
      update: {},
      create: {
        estudanteId: estudanteAEE.id,
        cids: ['F84.0'],
        condicao: 'Transtorno do Espectro Autista (dados fictícios de teste)',
        recomendacoes: 'Tempo estendido nas avaliações e instruções por escrito.',
        precisaProvaAdaptada: true,
      },
    })
    console.log(`♿ Perfil AEE criado para ${estudanteAEE.nome} (1TIM1-003)`)
  }

  // Fase 3: vínculos de papel a partir dos booleanos (mesma regra do backfill)
  for (const u of await prisma.user.findMany({ where: { escolaId: escolaId }, select: { id: true } })) {
    await sincronizarVinculosDosBooleanos(prisma, u.id)
  }

  console.log('✅ Usuários de teste prontos. Veja LOGINS_TESTE.md.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
