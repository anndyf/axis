import { PrismaClient } from '@prisma/client'
import * as dotenv from 'dotenv'
import { aulasDoDia, chaveAula, hojeNaEscola } from '../src/lib/services/chamada'
import { diasLetivos, chaveData } from '../src/lib/services/calendario'

dotenv.config()

const prisma = new PrismaClient()

// Aulas e faltas de exemplo (rodar depois de seed.ts e seed-calendario.ts):
// chamadas dos últimos 30 dias letivos de cada turma, a partir do horário e
// do calendário. Em cada turma, o 1º aluno fica infrequente (~35% de
// faltas), o 2º perto do limite (~20%) com um atestado, e os demais faltam
// de vez em quando. Idempotente (aula pela chave; faltas só em aula nova).
// Guarda de host local, mesmo padrão dos outros scripts de dados de teste.
function assertHostLocal() {
  const url = process.env.DATABASE_URL ?? ''
  if (!/localhost|127\.0\.0\.1/.test(url) && process.env.FORCE_BACKFILL !== 'true') {
    console.error('❌ DATABASE_URL não parece apontar para um host local. Este script é só para desenvolvimento.')
    process.exit(1)
  }
}

const DIAS = 30

// Pseudoaleatório determinístico: mesma entrada, mesma falta
function sorteio(...partes: string[]): number {
  let h = 2166136261
  for (const c of partes.join('|')) h = Math.imul(h ^ c.charCodeAt(0), 16777619)
  return ((h >>> 0) % 1000) / 1000
}

async function main() {
  assertHostLocal()
  const hoje = hojeNaEscola()

  for (const escola of await prisma.escola.findMany()) {
    const config = await prisma.globalConfig.findUnique({ where: { id: escola.id } })
    const ano = config?.anoLetivoAtual ?? Number(hoje.slice(0, 4))
    const periodo = await prisma.periodoLetivo.findUnique({ where: { escolaId_anoLetivo: { escolaId: escola.id, anoLetivo: ano } } })
    if (!periodo) {
      console.log(`⏭️  ${escola.nome}: sem calendário letivo ${ano} (rode seed-calendario.ts)`)
      continue
    }
    const [naoLetivos, extras] = await Promise.all([
      prisma.diaNaoLetivo.findMany({ where: { escolaId: escola.id }, select: { data: true, turmaId: true } }),
      prisma.diaLetivoExtra.findMany({ where: { escolaId: escola.id }, select: { data: true, seguirHorarioDe: true } }),
    ])
    const fim = chaveData(periodo.fim) < hoje ? chaveData(periodo.fim) : hoje
    const calendario = { inicio: periodo.inicio, fim: periodo.fim, naoLetivos, extras }

    let aulasCriadas = 0
    let faltasCriadas = 0
    for (const turma of await prisma.turma.findMany({
      where: { escolaId: escola.id, anoLetivo: ano },
      include: {
        horarios: { select: { diaSemana: true, horario: true, disciplinaId: true, professorId: true } },
        estudantes: { orderBy: { nome: 'asc' }, select: { id: true } },
      },
    })) {
      if (turma.horarios.length === 0 || turma.estudantes.length === 0) continue
      const dias = diasLetivos({ ...calendario, fim }, turma.id).slice(-DIAS)

      for (const dia of dias) {
        const doDia = aulasDoDia(dia.data, turma.id, calendario, turma.horarios)
        for (const [disciplinaId, tempos] of doDia.temposPorDisciplina) {
          const chave = chaveAula(turma.id, dia.data, disciplinaId)
          if (await prisma.aula.findUnique({ where: { chave }, select: { id: true } })) continue
          const professorId = turma.horarios.find((h) => h.disciplinaId === disciplinaId)?.professorId ?? null
          const aula = await prisma.aula.create({
            data: {
              escolaId: escola.id, turmaId: turma.id, disciplinaId, professorId,
              data: new Date(`${dia.data}T00:00:00Z`), tempos, quantidade: tempos.length,
              situacao: 'REALIZADA', conteudo: 'Aula de exemplo (seed)', chave,
            },
          })
          aulasCriadas++

          const faltas = turma.estudantes.flatMap((e, i) => {
            const chance = i === 0 ? 0.35 : i === 1 ? 0.2 : 0.04
            return sorteio(aula.chave, e.id) < chance ? [{ aulaId: aula.id, estudanteId: e.id, quantidade: tempos.length }] : []
          })
          if (faltas.length) await prisma.falta.createMany({ data: faltas })
          faltasCriadas += faltas.length
        }
      }

      // Atestado de 2 dias para o 2º aluno, no meio do intervalo
      const aluno = turma.estudantes[1]
      const meio = dias[Math.floor(dias.length / 2)]
      if (aluno && meio) {
        const ja = await prisma.justificativa.findFirst({ where: { escolaId: escola.id, estudanteId: aluno.id, descricao: 'Atestado de exemplo (seed)' } })
        const depois = dias[Math.floor(dias.length / 2) + 1] ?? meio
        if (!ja) {
          await prisma.justificativa.create({
            data: { escolaId: escola.id, estudanteId: aluno.id, inicio: new Date(`${meio.data}T00:00:00Z`), fim: new Date(`${depois.data}T00:00:00Z`), tipo: 'ATESTADO', efeito: 'ABONA', descricao: 'Atestado de exemplo (seed)' },
          })
        }
      }
    }
    console.log(`📝 ${escola.nome}: ${aulasCriadas} aulas e ${faltasCriadas} faltas de exemplo criadas`)
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
