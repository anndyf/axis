/**
 * Modelos de painel (/dashboard/modelos): capturas e verificação de rolagem
 * horizontal (fora do build).
 *
 *   npm run dev            # em outro terminal
 *   npx tsx scripts/modelos.ts            # verifica 360-1440px, claro e escuro
 *   npx tsx scripts/modelos.ts --capturas # também salva PNGs em docs/capturas/modelos/
 *
 * Para cada perfil (professor, pedagogia via AEE e via direção, administração)
 * e cada modelo (A, B), abre a rota em 360, 390, 768, 1024, 1280 e 1440px e
 * confere que nem a página nem a camada do modelo rolam de lado
 * (scrollWidth <= clientWidth). Sai com código 1 se alguma rolar.
 */
import { chromium, type Browser } from 'playwright'
import sharp from 'sharp'
import { mkdirSync } from 'fs'
import path from 'path'

const BASE = process.env.CAPTURAS_URL ?? 'http://localhost:3000'
const capturas = process.argv.includes('--capturas')
const saida = path.join('docs', 'capturas', 'modelos')
const LARGURAS = [360, 390, 768, 1024, 1280, 1440]

const CONTAS = [
  { usuario: 'professor', senha: 'professor123', perfil: 'professor' },
  { usuario: 'aee', senha: 'aee123', perfil: 'pedagogia' },
  { usuario: 'direcao', senha: 'direcao123', perfil: 'pedagogia' },
  { usuario: 'direcao', senha: 'direcao123', perfil: 'administracao' },
]

async function entrar(browser: Browser, usuario: string, senha: string, largura: number, tema: string) {
  const ctx = await browser.newContext({ viewport: { width: largura, height: 900 }, deviceScaleFactor: 1 })
  await ctx.addCookies([{ name: 'axis_tema', value: tema, url: BASE }])
  // Dicas de primeiro acesso cobririam a tela
  await ctx.addInitScript("(() => { const o = Storage.prototype.getItem; Storage.prototype.getItem = function (k) { return k.startsWith('seen_') ? 'true' : o.call(this, k) } })()")
  const page = await ctx.newPage()
  await page.goto(`${BASE}/login`)
  await page.locator('input').first().fill(usuario)
  await page.locator('input[type=password]').first().fill(senha)
  await page.locator('button[type=submit]').first().click()
  await page.waitForURL(/dashboard|portal|trocar-senha/, { timeout: 90_000 })
  return page
}

// Texto (não função) para o tsx não injetar helpers que o navegador não tem
const MEDIR = `(() => {
  const camada = document.querySelector('[data-pagina-modelo]')
  const doc = document.documentElement
  const medidas = [['página', doc.scrollWidth, doc.clientWidth]]
  if (camada) medidas.push(['camada do modelo', camada.scrollWidth, camada.clientWidth])
  const culpados = []
  for (const el of document.querySelectorAll('[data-pagina-modelo] *')) {
    const r = el.getBoundingClientRect()
    if (r.width && r.right > doc.clientWidth + 1) {
      let p = el.parentElement, dentro = false
      while (p && p !== camada) { if (/(auto|scroll|hidden|clip)/.test(getComputedStyle(p).overflowX)) { dentro = true; break } p = p.parentElement }
      if (!dentro && culpados.length < 5) culpados.push(el.tagName.toLowerCase() + '.' + String(el.className).slice(0, 80) + ' direita=' + Math.round(r.right))
    }
  }
  return { medidas, culpados, temCamada: !!camada }
})()`

async function main() {
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined })
  if (capturas) mkdirSync(saida, { recursive: true })
  const falhas: string[] = []
  for (const tema of ['light', 'dark']) {
    for (const largura of LARGURAS) {
      for (const conta of CONTAS) {
        const page = await entrar(browser, conta.usuario, conta.senha, largura, tema)
        for (const modelo of ['a', 'b']) {
          const rota = `/dashboard/modelos?modelo=${modelo}&perfil=${conta.perfil}`
          await page.goto(`${BASE}${rota}`, { timeout: 180_000 })
          await page.waitForLoadState('networkidle').catch(() => {})
          const r = (await page.evaluate(MEDIR)) as { medidas: [string, number, number][]; culpados: string[]; temCamada: boolean }
          const rolando = r.medidas.filter(([, s, c]) => s > c)
          const id = `${tema} ${largura}px ${conta.usuario} ${rota}`
          if (!r.temCamada) falhas.push(`${id}: a camada do modelo não apareceu`)
          if (rolando.length) falhas.push(`${id}: ${rolando.map(([n, s, c]) => `${n} ${s} > ${c}`).join(', ')}\n      ${r.culpados.join('\n      ')}`)
          console.log(`  ${rolando.length || !r.temCamada ? '✗' : '✓'} ${id}`)
          if (capturas && (largura === 390 || largura === 1440) && (tema === 'light' || largura === 1440)) {
            // A camada do modelo rola por dentro: captura o conteúdo inteiro dela
            const altura = await page.evaluate("document.querySelector('[data-pagina-modelo]')?.scrollHeight ?? 900")
            await page.setViewportSize({ width: largura, height: Math.min(Number(altura), 6000) })
            await page.waitForTimeout(300)
            const nome = `${modelo}-${conta.perfil}-${conta.usuario}-${largura}${tema === 'dark' ? '-escuro' : ''}.png`
            await sharp(await page.screenshot()).png({ palette: true, quality: 80, compressionLevel: 9 }).toFile(path.join(saida, nome))
            await page.setViewportSize({ width: largura, height: 900 })
          }
        }
        await page.context().close()
      }
    }
  }
  await browser.close()
  if (falhas.length) {
    console.error(`\n${falhas.length} falha(s):\n  ${falhas.join('\n  ')}`)
    process.exitCode = 1
  } else {
    console.log('\nSem rolagem horizontal em nenhuma combinação.')
  }
}

main().catch((e) => {
  console.error(e)
  process.exitCode = 1
})
