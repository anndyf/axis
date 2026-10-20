/**
 * Backfill da fase 2 (roteiro de migração 5.2): planos e assinaturas.
 *
 * O que faz (idempotente - rodar de novo não duplica nem sobrescreve):
 * 1. Cria os planos BASICO, PRO e ENTERPRISE com os módulos que cada um
 *    libera hoje (calculados do catálogo). Plano que já existe não é tocado.
 * 2. Para cada escola SEM assinatura: cria a assinatura do plano da escola
 *    (Escola.plano), com situação a partir de Escola.status (TRIAL vira TESTE
 *    sem data de fim), e converte os overrides de EscolaModulo em
 *    AssinaturaModulo (origem EXCECAO). Registra no histórico. Escola que já
 *    tem assinatura é pulada.
 * 3. Confere a equivalência: módulos ativos e estados pelo modelo novo =
 *    pelo antigo, para todas as escolas. Diferença = código de saída 1.
 *
 * Não altera nem remove Escola.plano, Escola.status nem EscolaModulo.
 *
 * Uso:  npx tsx prisma/backfill/fase-2.ts            (banco local)
 *       FORCE_BACKFILL=true npx tsx prisma/backfill/fase-2.ts   (outro host - cópia da produção)
 *       npx tsx prisma/backfill/fase-2.ts --so-conferir
 */
import * as dotenv from 'dotenv'
import { prisma } from '@/lib/prisma'
import { MODULOS } from '@/lib/modules'
import { planosIniciais, situacaoDoStatus } from '@/lib/services/planos'
import { excecoesDosOverrides, diferencasDeModulos } from '@/lib/services/modulos'
import { getModulosAtivos, getModulosAtivosLegado } from '@/lib/modules-server'
import { estadosDaEscola, estadosLegados } from '@/lib/modulos/estados'

const ORDEM = { BASICO: 0, PRO: 1, ENTERPRISE: 2 } as const

export async function garantirPlanosIniciais() {
  const criados: string[] = []
  for (const p of planosIniciais()) {
    const existe = await prisma.plano.findUnique({ where: { codigo: p.codigo }, select: { id: true } })
    if (existe) continue
    await prisma.plano.create({
      data: {
        codigo: p.codigo, nome: p.nome, ordem: p.ordem, limiteUsuarios: p.limiteUsuarios,
        modulos: { create: p.modulos.map((moduloId) => ({ moduloId })) },
      },
    })
    criados.push(p.codigo)
  }
  return criados
}

export async function backfillFase2(opcoes: { escolaIds?: string[]; autorId?: string } = {}) {
  const planosCriados = await garantirPlanosIniciais()
  const planos = new Map((await prisma.plano.findMany({ select: { id: true, codigo: true } })).map((p) => [p.codigo, p.id]))
  const escolas = await prisma.escola.findMany({
    where: opcoes.escolaIds ? { id: { in: opcoes.escolaIds } } : {},
    select: { id: true, nome: true, plano: true, status: true, createdAt: true, escolaModulos: { select: { moduloId: true, ativo: true } }, _count: { select: { assinaturas: true } } },
  })
  const hoje = new Date(new Date().toISOString().slice(0, 10))
  const criadas: string[] = []
  const avisos: string[] = []
  for (const escola of escolas) {
    if (escola._count.assinaturas > 0) continue
    const r = excecoesDosOverrides(MODULOS, escola.escolaModulos, (itemId) => {
      const item = MODULOS.find((m) => m.id === itemId)
      return !item?.planoMinimo || ORDEM[escola.plano] >= ORDEM[item.planoMinimo]
    })
    avisos.push(...r.avisos.map((a) => `${escola.nome}: ${a}`))
    await prisma.$transaction(async (tx) => {
      // confere de novo dentro da transação (duas execuções ao mesmo tempo)
      if (await tx.assinatura.count({ where: { escolaId: escola.id } })) return
      await tx.assinatura.create({
        data: {
          escolaId: escola.id,
          planoId: planos.get(escola.plano)!,
          situacao: situacaoDoStatus(escola.status),
          inicio: new Date(escola.createdAt.toISOString().slice(0, 10)),
          observacoes: 'Criada pelo backfill da fase 2 a partir de Escola.plano/status e EscolaModulo.',
          modulos: { create: r.excecoes.map((e) => ({ moduloId: e.moduloId, estado: e.estado, origem: 'EXCECAO' as const, inicio: hoje })) },
          historico: {
            create: {
              descricao: 'Assinatura criada pelo backfill da fase 2',
              autorId: opcoes.autorId ?? null,
              dados: { plano: escola.plano, status: escola.status, overrides: escola.escolaModulos, excecoes: r.excecoes, avisos: r.avisos },
            },
          },
        },
      })
      criadas.push(escola.nome)
    })
  }
  return { planosCriados, criadas, avisos }
}

/** Equivalência velho × novo para as escolas (todas, ou as indicadas). */
export async function conferirFase2(opcoes: { escolaIds?: string[] } = {}) {
  const escolas = await prisma.escola.findMany({
    where: opcoes.escolaIds ? { id: { in: opcoes.escolaIds } } : {},
    select: { id: true, nome: true, plano: true, _count: { select: { assinaturas: true } } },
  })
  const resultado: { escola: string; semAssinatura: boolean; diferencas: string[] }[] = []
  for (const e of escolas) {
    const velho = { itens: await getModulosAtivosLegado(e.id, e.plano), estados: await estadosLegados(e.id) }
    const novo = { itens: await getModulosAtivos(e.id, e.plano), estados: await estadosDaEscola(e.id) }
    resultado.push({ escola: e.nome, semAssinatura: e._count.assinaturas === 0, diferencas: diferencasDeModulos(velho, novo) })
  }
  return resultado
}

async function main() {
  dotenv.config()
  const url = process.env.DATABASE_URL ?? ''
  if (!/localhost|127\.0\.0\.1/.test(url) && process.env.FORCE_BACKFILL !== 'true') {
    console.error('❌ DATABASE_URL não aponta para host local. Para uma cópia da produção, use FORCE_BACKFILL=true (com backup verificado).')
    process.exit(1)
  }
  console.log(`🎯 Alvo: ${url.replace(/:[^:@]+@/, ':***@')}`)
  if (!process.argv.includes('--so-conferir')) {
    const r = await backfillFase2()
    console.log(`📦 Planos criados: ${r.planosCriados.join(', ') || 'nenhum (já existiam)'}`)
    console.log(`🧾 Assinaturas criadas: ${r.criadas.length}${r.criadas.length ? ` (${r.criadas.join(', ')})` : ''}`)
    for (const a of r.avisos) console.log(`⚠️  ${a}`)
  }
  const conferencia = await conferirFase2()
  let falhou = false
  for (const c of conferencia) {
    if (c.semAssinatura) { console.log(`⏳ ${c.escola}: sem assinatura (usa o modelo antigo)`); continue }
    if (c.diferencas.length) { falhou = true; console.log(`❌ ${c.escola}:\n   ${c.diferencas.join('\n   ')}`) }
    else console.log(`✅ ${c.escola}: equivalente`)
  }
  await prisma.$disconnect()
  process.exit(falhou ? 1 : 0)
}

if (process.argv[1]?.includes('fase-2')) main()
