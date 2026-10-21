/**
 * Capturas de tela para conferência visual (fora do build).
 *
 *   npm run dev            # em outro terminal
 *   npx tsx scripts/capturas.ts <fase>
 *
 * Faz login com os usuários de LOGINS_TESTE.md e salva PNGs (375, 390 e
 * 1440px) das telas principais em docs/capturas/<fase>/. CAPTURAS_TEMA=dark
 * captura no tema escuro (arquivos com sufixo -escuro); CAPTURAS_LARGURAS=375,1440
 * e CAPTURAS_TELAS=chamada,diario restringem a rodada. Usa o banco do .env (dev)
 * só para descobrir ids (turma 1TIM1, disciplina, aluno) e para liberar a
 * troca de senha obrigatória da conta de portal de teste. Só roda em banco local.
 */
import { chromium, type Browser, type Page } from 'playwright'
import { PrismaClient } from '@prisma/client'
import sharp from 'sharp'
import * as dotenv from 'dotenv'
import { mkdirSync } from 'fs'
import path from 'path'

dotenv.config()

const BASE = process.env.CAPTURAS_URL ?? 'http://localhost:3000'
const fase = process.argv[2] ?? 'sem-fase'
const saida = path.join('docs', 'capturas', fase)
const LARGURAS = (process.env.CAPTURAS_LARGURAS ?? '375,390,1440').split(',').map(Number)
const TEMA = process.env.CAPTURAS_TEMA === 'dark' ? 'dark' : 'light'
const SO = process.env.CAPTURAS_TELAS ? new Set(process.env.CAPTURAS_TELAS.split(',')) : null

if (!/localhost|127\.0\.0\.1/.test(process.env.DATABASE_URL ?? '')) {
  console.error('DATABASE_URL não é local: este script é só para desenvolvimento.')
  process.exit(1)
}

const prisma = new PrismaClient()

async function ids() {
  const escola = await prisma.escola.findUniqueOrThrow({ where: { slug: process.env.DEV_ESCOLA_SLUG ?? 'cetep' } })
  const turma = await prisma.turma.findFirstOrThrow({ where: { escolaId: escola.id, nome: '1TIM1' }, include: { disciplinas: { orderBy: { nome: 'asc' } }, estudantes: { orderBy: { nome: 'asc' } } } })
  const disciplina = turma.disciplinas[0]
  // Dia letivo recente com aula da disciplina (para a tela de chamada)
  const aula = await prisma.aula.findFirst({ where: { turmaId: turma.id, disciplinaId: disciplina.id }, orderBy: { data: 'desc' } })
  // Conta de portal de teste: libera a troca obrigatória de senha só no banco local
  await prisma.user.updateMany({ where: { escolaId: escola.id, username: '1TIM1-001' }, data: { deveTrocarSenha: false } })
  const direcao = await prisma.user.findFirst({ where: { escolaId: escola.id, username: 'direcao' } })
  return {
    direcao: direcao?.id ?? '',
    turma: turma.id,
    disciplina: disciplina.id,
    matricula: turma.estudantes[0].matricula,
    matriculaAee: turma.estudantes.find((e) => e.matricula.endsWith('-003'))?.matricula ?? turma.estudantes[0].matricula,
    dataAula: aula ? aula.data.toISOString().slice(0, 10) : '',
  }
}

async function salvar(page: Page, nome: string, largura: number) {
  await page.waitForLoadState('networkidle').catch(() => {})
  await page.waitForTimeout(800)
  // Viewport do tamanho da página: barras fixas (navegação inferior, salvar)
  // aparecem no fim, como depois de rolar, e não no meio da captura
  const viewport = page.viewportSize()!
  const altura = await page.evaluate(() => document.documentElement.scrollHeight)
  await page.setViewportSize({ width: viewport.width, height: Math.max(viewport.height, Math.min(altura, 12000)) })
  await page.waitForTimeout(300)
  const bruto = await page.screenshot({ fullPage: true })
  await page.setViewportSize(viewport)
  const arquivo = path.join(saida, `${nome}-${largura}${TEMA === 'dark' ? '-escuro' : ''}.png`)
  // PNG com paleta: ~5x menor, suficiente para conferência
  await sharp(bruto).png({ palette: true, quality: 80, compressionLevel: 9 }).toFile(arquivo)
  console.log('  ', arquivo)
}

async function sessao(browser: Browser, largura: number, usuario?: string, senha?: string) {
  const ctx = await browser.newContext({ viewport: { width: largura, height: largura > 600 ? 900 : 812 }, deviceScaleFactor: 1 })
  // Dicas de primeiro acesso (TeacherTipsModal) cobririam a tela: marca como vistas
  await ctx.addInitScript(() => {
    const original = Storage.prototype.getItem
    Storage.prototype.getItem = function (chave: string) {
      return chave.startsWith('seen_') ? 'true' : original.call(this, chave)
    }
  })
  await ctx.addCookies([{ name: 'axis_tema', value: TEMA, url: BASE }])
  const page = await ctx.newPage()
  if (usuario && senha) {
    await page.goto(`${BASE}/login`)
    await page.locator('input').first().fill(usuario)
    await page.locator('input[type=password]').first().fill(senha)
    await page.locator('button[type=submit]').first().click()
    await page.waitForURL(/dashboard|portal/, { timeout: 90_000 })
  }
  return page
}

async function main() {
  mkdirSync(saida, { recursive: true })
  const i = await ids()
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined })

  const roteiro: { usuario?: string; senha?: string; telas: [string, string][] }[] = [
    { telas: [['login', '/login']] },
    {
      usuario: 'direcao', senha: 'direcao123',
      telas: [
        ['dashboard-gestao', '/dashboard'],
        ['turmas', '/dashboard/turmas'],
        ['turma-detalhe', `/dashboard/turmas/${i.turma}/relatorio`],
        ['lancamento-notas', `/dashboard/notas/lancar/${i.turma}`],
        ['frequencia', `/dashboard/frequencia?turma=${i.turma}`],
        ['boletim', `/dashboard/estudantes/${i.matricula}/boletim`],
        ['conselho', `/dashboard/conselho-classe/${i.turma}`],
        ['resultados', '/dashboard/resultados'],
        ['configuracoes', '/dashboard/configuracoes'],
        ['estudantes', '/dashboard/estudantes'],
        ['estudante-ficha', `/dashboard/estudantes/${i.matricula}/editar`],
        ['turma-horario', `/dashboard/turmas/${i.turma}/horario`],
        ['disciplinas', '/dashboard/disciplinas'],
        ['mensagens', '/dashboard/mensagens'],
        ['ocorrencias', '/dashboard/ocorrencias'],
        ['questoes', '/dashboard/questoes'],
        ['provas', '/dashboard/provas'],
        ['simulados', '/dashboard/simulados'],
        ['conselho-lista', '/dashboard/conselho-classe'],
        ['notas-recuperacao', `/dashboard/notas/recuperacao/${i.turma}`],
        ['chamada-direcao', `/dashboard/chamada/fazer?turma=${i.turma}&disciplina=${i.disciplina}&data=${i.dataAula}`],
        ['diario-direcao', `/dashboard/chamada/diario?turma=${i.turma}&disciplina=${i.disciplina}`],
        ['auditoria', '/dashboard/auditoria'],
        ['ui', '/dashboard/ui'],
      ],
    },
    {
      usuario: 'professor', senha: 'professor123',
      telas: [
        ['dashboard-professor', '/dashboard'],
        ['chamada', '/dashboard/chamada'],
        ['chamada-fazer', `/dashboard/chamada/fazer?turma=${i.turma}&disciplina=${i.disciplina}&data=${i.dataAula}`],
        ['diario', `/dashboard/chamada/diario?turma=${i.turma}&disciplina=${i.disciplina}`],
        ['notas-professor', `/dashboard/notas/lancar/${i.turma}?disciplina=${i.disciplina}`],
      ],
    },
    {
      usuario: 'admin', senha: 'admin123',
      telas: [
        ['usuarios', '/dashboard/usuarios'],
        ['usuario-novo', '/dashboard/usuarios/novo'],
        ['usuario-editar', `/dashboard/usuarios/${i.direcao}/editar`],
      ],
    },
    { usuario: 'aee', senha: 'aee123', telas: [['aee', '/dashboard/aee'], ['aee-ficha', `/dashboard/aee/${i.matriculaAee}`]] },
    { usuario: 'secretaria', senha: 'secretaria123', telas: [['dashboard-secretaria', '/dashboard'], ['estudantes-secretaria', '/dashboard/estudantes']] },
    { usuario: 'coordenacao', senha: 'coordenacao123', telas: [['dashboard-coordenacao', '/dashboard'], ['frequencia-coordenacao', `/dashboard/frequencia?turma=${i.turma}`]] },
    { usuario: '1TIM1-001', senha: '1TIM1-001', telas: [['portal', '/portal'], ['portal-boletim', '/portal?aba=boletim'], ['portal-frequencia', '/portal?aba=frequencia'], ['portal-horario', '/portal?aba=horario']] },
  ]

  for (const largura of LARGURAS) {
    for (const etapa of roteiro) {
      if (SO && !etapa.telas.some(([n]) => SO.has(n))) continue
      const page = await sessao(browser, largura, etapa.usuario, etapa.senha)
      for (const [nome, url] of etapa.telas.filter(([n]) => !SO || SO.has(n))) {
        try {
          await page.goto(`${BASE}${url}`, { timeout: 120_000 })
          await salvar(page, nome, largura)
        } catch (e) {
          console.error(`  falhou ${nome} (${largura}px):`, (e as Error).message.split('\n')[0])
        }
      }
      await page.context().close()
    }
  }
  await browser.close()
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
