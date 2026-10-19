/**
 * Checagem de rolagem horizontal nas rotas principais (fora do build).
 *
 *   npm run dev            # em outro terminal
 *   npx tsx scripts/modelos.ts              # 360, 390, 768, 1024, 1280 e 1440px
 *   npx tsx scripts/modelos.ts --capturas   # também salva PNGs (390 e 1440px)
 *
 * Entra com as contas de LOGINS_TESTE.md (direção, professor, AEE e portal),
 * abre cada rota e confere document.documentElement.scrollWidth <=
 * clientWidth. Lista os elementos que passam da borda e sai com código 1 se
 * alguma rota rolar de lado. Usa o banco do .env só para descobrir ids (turma
 * 1TIM1, disciplina, aluno) e liberar a troca de senha da conta de portal de
 * teste. Só roda em banco local.
 */
import { chromium, type Browser } from 'playwright'
import { PrismaClient } from '@prisma/client'
import sharp from 'sharp'
import * as dotenv from 'dotenv'
import { mkdirSync } from 'fs'
import path from 'path'

dotenv.config()

const BASE = process.env.CAPTURAS_URL ?? 'http://localhost:3000'
const capturas = process.argv.includes('--capturas')
const saida = path.join('docs', 'capturas', 'painel')
const LARGURAS = [360, 390, 768, 1024, 1280, 1440]

if (!/localhost|127\.0\.0\.1/.test(process.env.DATABASE_URL ?? '')) {
  console.error('DATABASE_URL não é local: este script é só para desenvolvimento.')
  process.exit(1)
}

const prisma = new PrismaClient()

async function ids() {
  const escola = await prisma.escola.findUniqueOrThrow({ where: { slug: process.env.DEV_ESCOLA_SLUG ?? 'cetep' } })
  const turma = await prisma.turma.findFirstOrThrow({ where: { escolaId: escola.id, nome: '1TIM1' }, include: { disciplinas: { orderBy: { nome: 'asc' } }, estudantes: { orderBy: { nome: 'asc' } } } })
  const disciplina = turma.disciplinas[0]
  const aula = await prisma.aula.findFirst({ where: { turmaId: turma.id, disciplinaId: disciplina.id }, orderBy: { data: 'desc' } })
  // Conta de portal de teste: libera a troca obrigatória de senha só no banco local
  await prisma.user.updateMany({ where: { escolaId: escola.id, username: '1TIM1-001' }, data: { deveTrocarSenha: false } })
  return { turma: turma.id, disciplina: disciplina.id, matricula: turma.estudantes[0].matricula, dataAula: aula ? aula.data.toISOString().slice(0, 10) : '' }
}

type Etapa = { usuario?: string; senha?: string; rotas: string[] }

function roteiro(i: Awaited<ReturnType<typeof ids>>): Etapa[] {
  return [
    { rotas: ['/login', '/entrada', '/escola-invalida', '/redefinir-senha'] },
    {
      usuario: 'direcao', senha: 'direcao123',
      rotas: [
        '/dashboard', '/dashboard?visao=pedagogia', '/dashboard/turmas', `/dashboard/turmas/${i.turma}/relatorio`, '/dashboard/estudantes',
        `/dashboard/estudantes/${i.matricula}/boletim`, '/dashboard/notas', `/dashboard/notas/lancar/${i.turma}`, '/dashboard/notas/recuperacao',
        '/dashboard/frequencia', `/dashboard/frequencia?turma=${i.turma}`, '/dashboard/conselho-classe', `/dashboard/conselho-classe/${i.turma}`,
        '/dashboard/resultados', `/dashboard/resultados/${i.turma}`, '/dashboard/disciplinas', '/dashboard/configuracoes',
        '/dashboard/configuracoes/calendario', '/dashboard/configuracoes/avaliacao', '/dashboard/configuracoes/identidade', '/dashboard/mensagens',
        '/dashboard/ocorrencias', '/dashboard/aee', '/dashboard/perfil', '/dashboard/matriz', '/dashboard/laboratorios', '/dashboard/planos',
        '/dashboard/questoes', '/dashboard/provas', '/dashboard/simulados', '/dashboard/chamada',
      ],
    },
    {
      usuario: 'professor', senha: 'professor123',
      rotas: [
        '/dashboard', '/dashboard/chamada',
        `/dashboard/chamada/fazer?turma=${i.turma}&disciplina=${i.disciplina}&data=${i.dataAula}`,
        `/dashboard/chamada/diario?turma=${i.turma}&disciplina=${i.disciplina}`,
        '/dashboard/notas', '/dashboard/notas/avaliacoes', '/dashboard/turmas', '/dashboard/reportar-estudante',
      ],
    },
    { usuario: 'aee', senha: 'aee123', rotas: ['/dashboard', '/dashboard/aee'] },
    { usuario: '1TIM1-001', senha: '1TIM1-001', rotas: ['/portal'] },
  ]
}

async function entrar(browser: Browser, largura: number, usuario?: string, senha?: string) {
  const ctx = await browser.newContext({ viewport: { width: largura, height: 900 }, deviceScaleFactor: 1 })
  // Dicas de primeiro acesso cobririam a tela
  await ctx.addInitScript("(() => { const o = Storage.prototype.getItem; Storage.prototype.getItem = function (k) { return k.startsWith('seen_') ? 'true' : o.call(this, k) } })()")
  const page = await ctx.newPage()
  if (usuario && senha) {
    await page.goto(`${BASE}/login`)
    await page.locator('input').first().fill(usuario)
    await page.locator('input[type=password]').first().fill(senha)
    await page.locator('button[type=submit]').first().click()
    await page.waitForURL(/dashboard|portal/, { timeout: 120_000 })
  }
  return page
}

// Texto (não função) para o tsx não injetar helpers que o navegador não tem.
// Culpado = elemento que passa da borda sem estar dentro de um contêiner com rolagem própria.
const MEDIR = `(() => {
  const doc = document.documentElement, largura = doc.clientWidth, culpados = []
  if (doc.scrollWidth > largura) {
    for (const el of document.body.querySelectorAll('*')) {
      const r = el.getBoundingClientRect()
      if (!r.width || r.right <= largura + 1) continue
      let p = el.parentElement, dentro = false
      while (p && p !== document.body) {
        if (/(auto|scroll|hidden|clip)/.test(getComputedStyle(p).overflowX) || p.getBoundingClientRect().right > largura + 1) { dentro = true; break }
        p = p.parentElement
      }
      if (!dentro && culpados.length < 5) culpados.push('<' + el.tagName.toLowerCase() + ' class="' + String(el.className).slice(0, 90) + '"> direita=' + Math.round(r.right))
    }
  }
  return { scroll: doc.scrollWidth, largura, culpados }
})()`

async function main() {
  const i = await ids()
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined })
  if (capturas) mkdirSync(saida, { recursive: true })
  const falhas: string[] = []
  for (const largura of LARGURAS) {
    for (const etapa of roteiro(i)) {
      const page = await entrar(browser, largura, etapa.usuario, etapa.senha)
      for (const rota of etapa.rotas) {
        const id = `${largura}px ${rota} (${etapa.usuario ?? 'anônimo'})`
        try {
          await page.goto(`${BASE}${rota}`, { timeout: 180_000 })
          await page.waitForLoadState('networkidle').catch(() => {})
          await page.waitForTimeout(300)
          const r = (await page.evaluate(MEDIR)) as { scroll: number; largura: number; culpados: string[] }
          if (r.scroll > r.largura) {
            falhas.push(`${id}: scrollWidth ${r.scroll} > ${r.largura}\n      ${r.culpados.join('\n      ')}`)
            console.log(`  ✗ ${id}`)
          } else {
            console.log(`  ✓ ${id}`)
          }
          if (capturas && (largura === 390 || largura === 1440)) {
            const nome = `${(etapa.usuario ?? 'anonimo')}${rota.replace(/[^a-z0-9]+/gi, '-').replace(/-$/, '')}-${largura}.png`
            await sharp(await page.screenshot({ fullPage: true })).png({ palette: true, quality: 80, compressionLevel: 9 }).toFile(path.join(saida, nome))
          }
        } catch (e) {
          falhas.push(`${id}: ${(e as Error).message.split('\n')[0]}`)
          console.log(`  ✗ ${id} (erro)`)
        }
      }
      await page.context().close()
    }
  }
  await browser.close()
  if (falhas.length) {
    console.error(`\n${falhas.length} rota(s) com rolagem horizontal ou erro:\n  ${falhas.join('\n  ')}`)
    process.exitCode = 1
  } else {
    console.log('\nSem rolagem horizontal em nenhuma rota.')
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
