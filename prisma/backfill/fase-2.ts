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
import { diferencasDeModulos } from '@/lib/services/modulos'
import { garantirPlanosIniciais, criarAssinaturaDoModeloAntigo } from '@/lib/modulos/assinatura-escrita'
import { getModulosAtivos, getModulosAtivosLegado } from '@/lib/modules-server'
import { estadosDaEscola, estadosLegados } from '@/lib/modulos/estados'

export { garantirPlanosIniciais }

export async function backfillFase2(opcoes: { escolaIds?: string[]; autorId?: string } = {}) {
  const planosCriados = await garantirPlanosIniciais()
  const escolas = await prisma.escola.findMany({
    where: opcoes.escolaIds ? { id: { in: opcoes.escolaIds } } : {},
    select: { id: true, nome: true },
    orderBy: { createdAt: 'asc' },
  })
  const criadas: string[] = []
  const avisos: string[] = []
  for (const escola of escolas) {
    // a função confere dentro da transação se a escola já tem assinatura
    const r = await prisma.$transaction((tx) => criarAssinaturaDoModeloAntigo(tx, escola.id, opcoes.autorId ?? null, 'Assinatura criada pelo backfill da fase 2'))
    if (r.criada) criadas.push(escola.nome)
    avisos.push(...r.avisos.map((a) => `${escola.nome}: ${a}`))
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
