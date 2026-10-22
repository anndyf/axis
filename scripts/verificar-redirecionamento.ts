/**
 * Conferência ao vivo do redirecionamento de telas sem permissão (fora do
 * build e do vitest: precisa do servidor no ar).
 *
 *   npm run build && npm start   # ou npm run dev
 *   npx tsx scripts/verificar-redirecionamento.ts
 *
 * Para cada caso, faz login numa sessão nova, abre a tela pelo endereço e
 * confere que termina na tela de destino do redirect() sem nenhum erro de
 * página (evento `pageerror`) e sem a tela "Application error". Repete cada
 * caso algumas vezes: o defeito antigo era intermitente (corrida entre o
 * redirecionamento do navegador e o do roteador do Next).
 */
import { chromium } from 'playwright'
import { PrismaClient } from '@prisma/client'
import * as dotenv from 'dotenv'

dotenv.config()
const BASE = process.env.CAPTURAS_URL ?? 'http://localhost:3000'
const VEZES = Number(process.env.VEZES ?? 4)

async function main() {
  const prisma = new PrismaClient()
  const escola = await prisma.escola.findUniqueOrThrow({ where: { slug: process.env.DEV_ESCOLA_SLUG ?? 'cetep' } })
  const turma = await prisma.turma.findFirstOrThrow({ where: { escolaId: escola.id, nome: '1TIM1' }, select: { id: true } })
  await prisma.$disconnect()

  const casos: { usuario: string; senha: string; rota: string; destino: RegExp }[] = [
    { usuario: 'professor', senha: 'professor123', rota: '/dashboard/usuarios', destino: /\/dashboard$/ },
    { usuario: 'professor', senha: 'professor123', rota: '/dashboard/auditoria', destino: /\/dashboard$/ },
    { usuario: 'aee', senha: 'aee123', rota: `/dashboard/turmas/${turma.id}`, destino: /\/dashboard\/turmas$/ },
  ]
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined })
  let falhas = 0
  for (const c of casos) {
    for (let i = 0; i < VEZES; i++) {
      const ctx = await browser.newContext()
      const page = await ctx.newPage()
      const erros: string[] = []
      await page.goto(`${BASE}/login`)
      await page.locator('input').first().fill(c.usuario)
      await page.locator('input[type=password]').first().fill(c.senha)
      await page.locator('button[type=submit]').first().click()
      await page.waitForURL(/dashboard/, { timeout: 90_000 })
      await page.waitForLoadState('networkidle').catch(() => {})
      page.on('pageerror', (e) => erros.push(e.message.slice(0, 200)))
      await page.goto(`${BASE}${c.rota}`)
      await page.waitForLoadState('networkidle').catch(() => {})
      await page.waitForTimeout(2500)
      const telaDeErro = await page.locator('text=Application error').count()
      const ok = c.destino.test(new URL(page.url()).pathname) && erros.length === 0 && telaDeErro === 0
      if (!ok) falhas++
      console.log(`${ok ? 'ok  ' : 'FALHA'} ${c.usuario} ${c.rota} -> ${new URL(page.url()).pathname}${erros.length ? ` erros: ${erros.join(' | ')}` : ''}`)
      await ctx.close()
    }
  }
  await browser.close()
  if (falhas) {
    console.error(`${falhas} falha(s)`)
    process.exit(1)
  }
}
main()
