import { PrismaClient } from '@prisma/client'
import * as dotenv from 'dotenv'
import { hojeNaEscola } from '../src/lib/services/chamada'
import { chaveData } from '../src/lib/services/calendario'

dotenv.config()

const prisma = new PrismaClient()

// Cadeado de unidade - dados de exemplo (rodar depois de seed-calendario.ts
// e seed-usuarios-teste.ts): `npx tsx prisma/seed-cadeado.ts`.
// - Prazo de lançamento de cada etapa do ano = fim da etapa + 7 dias (só onde
//   ainda não há prazo). Com as datas do seed-calendario, em out/2026 a 1ª e a
//   2ª Unidade (3 unidades) e a 1ª Unidade (semestral) ficam encerradas pelo
//   prazo; a última unidade segue aberta.
// - CETEP: reabertura da 2ª Unidade de 1TIM1 + Português (disciplina do
//   usuário "professor") por 4 dias, criada pela "coordenacao".
// Idempotente. Guarda de host local, mesmo padrão dos outros scripts.
function assertHostLocal() {
  const url = process.env.DATABASE_URL ?? ''
  if (!/localhost|127\.0\.0\.1/.test(url) && process.env.FORCE_BACKFILL !== 'true') {
    console.error('❌ DATABASE_URL não parece apontar para um host local. Este script é só para desenvolvimento.')
    process.exit(1)
  }
}

function somarDias(data: string, dias: number): string {
  const d = new Date(`${data}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + dias)
  return d.toISOString().slice(0, 10)
}

async function main() {
  assertHostLocal()
  const hoje = hojeNaEscola()

  for (const escola of await prisma.escola.findMany()) {
    const config = await prisma.globalConfig.findUnique({ where: { id: escola.id } })
    const ano = config?.anoLetivoAtual ?? Number(hoje.slice(0, 4))
    const etapas = await prisma.etapaCalendario.findMany({ where: { periodoLetivo: { escolaId: escola.id, anoLetivo: ano }, prazoLancamento: null } })
    for (const e of etapas) {
      await prisma.etapaCalendario.update({ where: { id: e.id }, data: { prazoLancamento: new Date(`${somarDias(chaveData(e.fim), 7)}T00:00:00Z`) } })
    }
    console.log(`🔒 ${escola.nome}: ${etapas.length} prazos de lançamento definidos`)

    if (escola.slug !== (process.env.DEV_ESCOLA_SLUG ?? 'cetep')) continue
    const [turma, coord, professor] = await Promise.all([
      prisma.turma.findFirst({ where: { escolaId: escola.id, nome: '1TIM1' }, select: { id: true, cursoId: true, esquemaAvaliacaoId: true } }),
      prisma.user.findFirst({ where: { escolaId: escola.id, username: 'coordenacao' }, select: { id: true } }),
      prisma.user.findFirst({ where: { escolaId: escola.id, username: 'professor' }, select: { id: true } }),
    ])
    if (!turma || !professor) continue
    const disciplina = await prisma.disciplina.findFirst({ where: { turmaId: turma.id, nome: 'Português', usuariosPermitidos: { some: { id: professor.id } } }, select: { id: true } })
    const curso = turma.cursoId ? await prisma.curso.findUnique({ where: { id: turma.cursoId }, select: { esquemaAvaliacaoId: true } }) : null
    const esquemaId = turma.esquemaAvaliacaoId ?? curso?.esquemaAvaliacaoId
    const etapa = esquemaId
      ? await prisma.etapaCalendario.findFirst({ where: { periodoLetivo: { escolaId: escola.id, anoLetivo: ano }, esquemaUnidade: { esquemaId, ordem: 2 } }, select: { id: true } })
      : null
    if (!disciplina || !etapa) continue
    const existe = await prisma.reaberturaUnidade.findFirst({ where: { escolaId: escola.id, etapaCalendarioId: etapa.id, turmaId: turma.id, disciplinaId: disciplina.id, revogadaEm: null, ate: { gte: new Date(`${hoje}T00:00:00Z`) } } })
    if (!existe) {
      await prisma.reaberturaUnidade.create({
        data: {
          escolaId: escola.id, etapaCalendarioId: etapa.id, turmaId: turma.id, disciplinaId: disciplina.id,
          ate: new Date(`${somarDias(hoje, 4)}T00:00:00Z`), motivo: 'Exemplo do seed: correção de notas da 2ª Unidade', criadoPorId: coord?.id ?? null,
        },
      })
    }
    console.log(`🔓 ${escola.nome}: reabertura de exemplo (1TIM1 · Português · 2ª Unidade) ${existe ? 'já existia' : 'criada'}`)
  }
}

main().finally(() => prisma.$disconnect())
