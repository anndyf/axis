/**
 * Capturas do cadeado de unidade (fora do build). Servidor no ar e dados de
 * exemplo do cadeado (npx tsx prisma/seed-cadeado.ts):
 *
 *   npm run build && npm start
 *   npx tsx scripts/capturas-cadeado.ts
 *
 * Salva PNGs (1440 e 375px) em docs/capturas/cadeado/ e falha se alguma tela
 * tiver erro de página (`pageerror`). Para recuperação e conselho, encerra a
 * última unidade da CETEP só durante a captura (banco local) e desfaz no fim.
 */
import { chromium, type Browser, type Page } from 'playwright'
import { PrismaClient } from '@prisma/client'
import sharp from 'sharp'
import * as dotenv from 'dotenv'
import { mkdirSync } from 'fs'
import path from 'path'

dotenv.config()

const BASE = process.env.CAPTURAS_URL ?? 'http://localhost:3000'
const saida = path.join('docs', 'capturas', 'cadeado')
const LARGURAS = (process.env.CAPTURAS_LARGURAS ?? '1440,375').split(',').map(Number)

if (!/localhost|127\.0\.0\.1/.test(process.env.DATABASE_URL ?? '')) {
  console.error('DATABASE_URL não é local: este script é só para desenvolvimento.')
  process.exit(1)
}
const prisma = new PrismaClient()
const erros: string[] = []

async function salvar(page: Page, nome: string, largura: number) {
  await page.waitForLoadState('networkidle').catch(() => {})
  await page.waitForTimeout(800)
  // Viewport do tamanho da página: barras fixas aparecem no fim, não no meio (como em capturas.ts)
  const viewport = page.viewportSize()!
  const altura = await page.evaluate(() => document.documentElement.scrollHeight)
  await page.setViewportSize({ width: viewport.width, height: Math.max(viewport.height, Math.min(altura, 12000)) })
  await page.waitForTimeout(300)
  const bruto = await page.screenshot({ fullPage: true })
  await page.setViewportSize(viewport)
  const arquivo = path.join(saida, `${nome}-${largura}.png`)
  await sharp(bruto).png({ palette: true, quality: 80, compressionLevel: 9 }).toFile(arquivo)
  console.log('  ', arquivo)
}

async function sessao(browser: Browser, largura: number, usuario: string, senha: string) {
  const ctx = await browser.newContext({ viewport: { width: largura, height: largura > 600 ? 900 : 812 }, deviceScaleFactor: 1 })
  await ctx.addInitScript(() => {
    const original = Storage.prototype.getItem
    Storage.prototype.getItem = function (chave: string) {
      return chave.startsWith('seen_') ? 'true' : original.call(this, chave)
    }
  })
  const page = await ctx.newPage()
  page.on('pageerror', (e) => erros.push(`${usuario} ${page.url()}: ${e.message}`))
  await page.goto(`${BASE}/login`)
  await page.locator('input').first().fill(usuario)
  await page.locator('input[type=password]').first().fill(senha)
  await page.locator('button[type=submit]').first().click()
  await page.waitForURL(/dashboard/, { timeout: 90_000 })
  await page.waitForLoadState('networkidle').catch(() => {})
  return page
}

async function main() {
  mkdirSync(saida, { recursive: true })
  const escola = await prisma.escola.findUniqueOrThrow({ where: { slug: process.env.DEV_ESCOLA_SLUG ?? 'cetep' } })
  const turma = await prisma.turma.findFirstOrThrow({ where: { escolaId: escola.id, nome: '1TIM1' }, include: { disciplinas: true } })
  const portugues = turma.disciplinas.find((d) => d.nome === 'Português')!
  const historia = turma.disciplinas.find((d) => d.nome === 'História')!
  const ultima = await prisma.etapaCalendario.findFirstOrThrow({
    where: { periodoLetivo: { escolaId: escola.id }, esquemaUnidade: { ordem: 3, esquema: { escolaId: escola.id, numUnidades: 3 } } },
  })
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined })

  for (const largura of LARGURAS) {
    console.log(`— ${largura}px`)
    let page = await sessao(browser, largura, 'direcao', 'direcao123')
    await page.goto(`${BASE}/dashboard`)
    await salvar(page, 'painel-gestao', largura)
    await page.goto(`${BASE}/dashboard/configuracoes/encerramento`)
    await salvar(page, 'encerramento-direcao', largura)
    await page.getByRole('button', { name: 'Reabrir para turma e disciplina' }).click()
    await page.waitForTimeout(400)
    await salvar(page, 'encerramento-reabrir', largura)
    await page.context().close()

    page = await sessao(browser, largura, 'secretaria', 'secretaria123')
    await page.goto(`${BASE}/dashboard/configuracoes/encerramento`)
    await salvar(page, 'encerramento-secretaria-leitura', largura)
    await page.context().close()

    page = await sessao(browser, largura, 'professor', 'professor123')
    await page.goto(`${BASE}/dashboard/notas/lancar/${turma.id}?disciplina=${historia.id}`)
    await salvar(page, 'notas-encerradas', largura)
    await page.goto(`${BASE}/dashboard/notas/lancar/${turma.id}?disciplina=${portugues.id}`)
    await salvar(page, 'notas-reaberta', largura)
    await page.goto(`${BASE}/dashboard/chamada/fazer?turma=${turma.id}&disciplina=${historia.id}&data=2026-08-24`)
    await salvar(page, 'chamada-dia-encerrado', largura)
    await page.goto(`${BASE}/dashboard/chamada/diario?turma=${turma.id}&disciplina=${historia.id}`)
    await salvar(page, 'diario-encerrado', largura)

    // Recuperação e conselho: última unidade encerrada só durante a captura
    await prisma.etapaCalendario.update({ where: { id: ultima.id }, data: { encerradaEm: new Date() } })
    try {
      await page.goto(`${BASE}/dashboard/notas/recuperacao/${turma.id}`)
      await page.waitForLoadState('networkidle').catch(() => {})
      await page.locator('select').first().selectOption(historia.id).catch(() => {})
      await salvar(page, 'recuperacao-encerrada', largura)
      await page.context().close()
      page = await sessao(browser, largura, 'coordenacao', 'coordenacao123')
      await page.goto(`${BASE}/dashboard/conselho-classe/${turma.id}`)
      await salvar(page, 'conselho-encerrado', largura)
      await page.goto(`${BASE}/dashboard/configuracoes/encerramento`)
      await salvar(page, 'encerramento-coordenacao', largura)
    } finally {
      await prisma.etapaCalendario.update({ where: { id: ultima.id }, data: { encerradaEm: null, encerradaPorId: null } })
    }
    await page.context().close()
  }
  await browser.close()
  await prisma.$disconnect()
  if (erros.length) {
    console.error('Erros de página:\n' + erros.join('\n'))
    process.exit(1)
  }
}
main()
