import { PrismaClient } from '@prisma/client'
import * as dotenv from 'dotenv'

dotenv.config()

const prisma = new PrismaClient()

// Calendário letivo de exemplo (rodar depois do seed.ts): ano letivo 2026,
// datas das unidades, feriados nacionais, tempos de aula por turno e um
// horário semanal para cada turma. Idempotente. Guarda de host local, mesmo
// padrão dos outros scripts de dados de teste.
function assertHostLocal() {
  const url = process.env.DATABASE_URL ?? ''
  if (!/localhost|127\.0\.0\.1/.test(url) && process.env.FORCE_BACKFILL !== 'true') {
    console.error('❌ DATABASE_URL não parece apontar para um host local. Este script é só para desenvolvimento.')
    process.exit(1)
  }
}

const d = (s: string) => new Date(`${s}T00:00:00Z`)

// Feriados nacionais 2026 (Páscoa em 05/04) + carnaval como recesso
const NAO_LETIVOS: { data: string; tipo: 'FERIADO' | 'RECESSO'; descricao: string }[] = [
  { data: '2026-02-16', tipo: 'RECESSO', descricao: 'Carnaval' },
  { data: '2026-02-17', tipo: 'RECESSO', descricao: 'Carnaval' },
  { data: '2026-04-03', tipo: 'FERIADO', descricao: 'Sexta-feira Santa' },
  { data: '2026-04-21', tipo: 'FERIADO', descricao: 'Tiradentes' },
  { data: '2026-05-01', tipo: 'FERIADO', descricao: 'Dia do Trabalho' },
  { data: '2026-06-04', tipo: 'FERIADO', descricao: 'Corpus Christi' },
  { data: '2026-09-07', tipo: 'FERIADO', descricao: 'Independência' },
  { data: '2026-10-12', tipo: 'FERIADO', descricao: 'Nossa Senhora Aparecida' },
  { data: '2026-11-02', tipo: 'FERIADO', descricao: 'Finados' },
  { data: '2026-11-20', tipo: 'FERIADO', descricao: 'Consciência Negra' },
]

// Datas das etapas por número de unidades do esquema
const ETAPAS: Record<number, [string, string][]> = {
  3: [['2026-02-02', '2026-05-15'], ['2026-05-18', '2026-08-28'], ['2026-08-31', '2026-12-18']],
  2: [['2026-02-02', '2026-06-30'], ['2026-07-13', '2026-12-18']],
}

const TEMPOS: Record<string, string[][]> = {
  MATUTINO: [['07:00', '07:50'], ['07:50', '08:40'], ['08:40', '09:30'], ['09:50', '10:40'], ['10:40', '11:30'], ['11:30', '12:20']],
  VESPERTINO: [['13:00', '13:50'], ['13:50', '14:40'], ['14:40', '15:30'], ['15:50', '16:40'], ['16:40', '17:30'], ['17:30', '18:20']],
  NOTURNO: [['18:40', '19:25'], ['19:25', '20:10'], ['20:20', '21:05'], ['21:05', '21:50']],
}

async function main() {
  assertHostLocal()

  for (const escola of await prisma.escola.findMany()) {
    const periodo = await prisma.periodoLetivo.upsert({
      where: { escolaId_anoLetivo: { escolaId: escola.id, anoLetivo: 2026 } },
      update: {},
      create: { escolaId: escola.id, anoLetivo: 2026, inicio: d('2026-02-02'), fim: d('2026-12-18') },
    })

    for (const esquema of await prisma.esquemaAvaliacao.findMany({ where: { escolaId: escola.id }, include: { unidades: { orderBy: { ordem: 'asc' } } } })) {
      const datas = ETAPAS[esquema.unidades.length]
      if (!datas) continue
      for (const [i, u] of esquema.unidades.entries()) {
        await prisma.etapaCalendario.upsert({
          where: { periodoLetivoId_esquemaUnidadeId: { periodoLetivoId: periodo.id, esquemaUnidadeId: u.id } },
          update: {},
          create: { periodoLetivoId: periodo.id, esquemaUnidadeId: u.id, inicio: d(datas[i][0]), fim: d(datas[i][1]) },
        })
      }
    }

    for (const n of NAO_LETIVOS) {
      const existe = await prisma.diaNaoLetivo.findFirst({ where: { escolaId: escola.id, data: d(n.data), turmaId: null } })
      if (!existe) await prisma.diaNaoLetivo.create({ data: { escolaId: escola.id, data: d(n.data), tipo: n.tipo, descricao: n.descricao } })
    }

    for (const [turno, tempos] of Object.entries(TEMPOS)) {
      for (const [i, [inicio, fim]] of tempos.entries()) {
        await prisma.tempoAula.upsert({
          where: { escolaId_turno_ordem: { escolaId: escola.id, turno, ordem: i + 1 } },
          update: {},
          create: { escolaId: escola.id, turno, ordem: i + 1, inicio, fim },
        })
      }
    }

    // Horário: distribui as disciplinas da turma pelos tempos da semana, em
    // rodízio. Só para turmas que ainda não têm horário.
    for (const turma of await prisma.turma.findMany({
      where: { escolaId: escola.id, horarios: { none: {} } },
      include: { disciplinas: { orderBy: { nome: 'asc' }, include: { usuariosPermitidos: { select: { id: true, name: true, username: true }, take: 1 } } } },
    })) {
      if (turma.disciplinas.length === 0) continue
      const turno = (turma.turno ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase()
      const numTempos = (TEMPOS[turno] ?? TEMPOS.MATUTINO).length
      let k = 0
      const linhas = []
      for (let dia = 1; dia <= 5; dia++) {
        for (let horario = 1; horario <= numTempos; horario++) {
          const disc = turma.disciplinas[k++ % turma.disciplinas.length]
          const prof = disc.usuariosPermitidos[0]
          linhas.push({
            turmaId: turma.id, diaSemana: dia, horario,
            disciplinaId: disc.id, disciplina: disc.nome,
            professorId: prof?.id ?? null, professor: prof ? (prof.name || prof.username) : null,
          })
        }
      }
      await prisma.horarioAula.createMany({ data: linhas })
    }

    console.log(`📅 ${escola.nome}: calendário 2026, feriados, tempos de aula e horários prontos`)
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
