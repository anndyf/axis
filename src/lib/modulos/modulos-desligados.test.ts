/**
 * Teste de comportamento com módulos desligados (docs/arquitetura/modulos-e-planos.md, 4.4.3 b).
 *
 * 1. Escola real no banco de teste com plano BASICO (hoje só QST, PRV e FIN
 *    podem ser desligados): rotas e páginas desses módulos recusam com
 *    MODULO_INDISPONIVEL; escola ENTERPRISE (a CETEP) fica com tudo ativo.
 * 2. "Escola sem módulos": o estado de todos os módulos (menos o Núcleo) é
 *    forçado para INATIVO e depois SOMENTE_LEITURA, e cada rota, action e
 *    página de módulo do mapa é chamada de verdade com sessão de direção.
 *    Nada pode ter mudado no banco.
 */
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import fs from 'fs'
import path from 'path'
import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { moduloDoArquivo, EXCECOES_MODULO, type DonoDoArquivo } from './mapa-rotas'
import { MODULO_IDS, type EstadoModulo, type ModuloId } from './tipos'

const sessao = vi.hoisted(() => ({ atual: null as any }))
const forcado = vi.hoisted(() => ({ estado: null as null | 'INATIVO' | 'SOMENTE_LEITURA' }))
vi.mock('@/lib/auth', () => ({ auth: vi.fn(async () => sessao.atual) }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn(), revalidateTag: vi.fn(), unstable_cache: (fn: any) => fn }))
vi.mock('next/headers', () => ({ headers: vi.fn(async () => new Headers({ 'x-escola-id': sessao.atual?.user?.escolaId ?? '' })), cookies: vi.fn(async () => ({ get: () => undefined })) }))
vi.mock('next/navigation', () => ({
  redirect: vi.fn((url: string) => { throw Object.assign(new Error('REDIRECT'), { url }) }),
  notFound: vi.fn(() => { throw new Error('NOT_FOUND') }),
}))
vi.mock('@/lib/modulos/estados', async (importOriginal) => {
  const real = await importOriginal<typeof import('./estados')>()
  return {
    estadosDaEscola: async (escolaId: string) => {
      if (!forcado.estado) return real.estadosDaEscola(escolaId)
      return Object.fromEntries(MODULO_IDS.map((m) => [m, m === 'NUC' ? 'ATIVO' : forcado.estado])) as Record<ModuloId, EstadoModulo>
    },
  }
})

vi.setConfig({ testTimeout: 120_000 })

const SUFIXO = `mod-${Date.now()}`
const ids: Record<string, string> = {}
const APP = path.resolve(__dirname, '../../app')

function listar(dir: string, out: string[] = []): string[] {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) listar(p, out)
    else out.push(p)
  }
  return out
}
type Arquivo = { abs: string; rel: string; dono: DonoDoArquivo }
const arquivos: Arquivo[] = listar(APP)
  .map((abs) => ({ abs, rel: path.relative(APP, abs).split(path.sep).join('/') }))
  .filter((f) => !EXCECOES_MODULO[f.rel])
  .map((f) => ({ ...f, dono: moduloDoArquivo(f.rel)! }))
  .filter((f) => f.dono && f.dono !== 'NUC' && f.dono !== 'PLT')
const rotas = arquivos.filter((f) => f.rel.endsWith('/route.ts'))
const paginas = arquivos.filter((f) => f.rel.endsWith('/page.tsx'))
const actions = arquivos.filter((f) => /\.ts$/.test(f.rel) && !f.rel.endsWith('route.ts') && /['"]use server['"]/.test(fs.readFileSync(f.abs, 'utf8')))

function sessaoDe(escolaId: string, userId: string, papel: 'direcao' | 'professor') {
  const gestao = papel === 'direcao'
  return { user: { id: userId, escolaId, username: `${papel}-${SUFIXO}`, name: papel, email: `${papel}@${SUFIXO}.t`, isSuperuser: gestao, isDirecao: gestao, isStaff: true, isAEE: false, isPortalUser: false, isPlatformAdmin: false, estudanteId: null } }
}

/** QST desligado vale só para professor (exceção herdada); os demais módulos, para a direção também. */
function entrarComo(escola: 'BASICO' | 'ENTERPRISE', dono: DonoDoArquivo) {
  const papel = dono === 'QST' ? 'professor' : 'direcao'
  sessao.atual = sessaoDe(ids[escola], ids[`${escola}-${papel}`], papel)
}

async function chamarRota(handler: any, metodo: string) {
  const req = new NextRequest('http://localhost/x', { method: metodo, ...(metodo !== 'GET' ? { body: '{}', headers: { 'Content-Type': 'application/json' } } : {}) })
  const res: Response = await handler(req, { params: Promise.resolve({ id: 'x', turmaId: 'x', disciplinaId: 'x' }) })
  const corpo = res.headers.get('content-type')?.includes('json') ? await res.json().catch(() => ({})) : {}
  return { status: res.status, codigo: corpo?.codigo as string | undefined }
}

/** Dados das escolas de teste (outros arquivos de teste rodam em paralelo no mesmo banco). */
async function contagens() {
  const escolaId = { in: [ids.BASICO, ids.ENTERPRISE] }
  const [aulas, questoes, provas, simulados, justificativas, mensagens, auditoria, turmas, configs] = await Promise.all([
    prisma.aula.count({ where: { escolaId } }),
    prisma.questao.count({ where: { professor: { escolaId } } }),
    prisma.prova.count({ where: { professorCriador: { escolaId } } }),
    prisma.notaSimulado.count({ where: { lancadoBy: { escolaId } } }),
    prisma.justificativa.count({ where: { escolaId } }),
    prisma.message.count({ where: { escolaId } }),
    prisma.auditLog.count({ where: { user: { escolaId } } }),
    prisma.turma.count({ where: { escolaId } }),
    prisma.globalConfig.count({ where: { escolaId } }),
  ])
  return { aulas, questoes, provas, simulados, justificativas, mensagens, auditoria, turmas, configs }
}

beforeAll(async () => {
  for (const plano of ['BASICO', 'ENTERPRISE'] as const) {
    const escola = await prisma.escola.create({ data: { nome: `Escola ${plano} ${SUFIXO}`, slug: `${SUFIXO}-${plano.toLowerCase()}`, plano, status: 'ATIVA' } })
    ids[plano] = escola.id
    await prisma.globalConfig.create({ data: { id: escola.id, escolaId: escola.id, anoLetivoAtual: 2026 } })
    ids[`${plano}-direcao`] = (await prisma.user.create({ data: { escolaId: escola.id, username: `dir-${plano}-${SUFIXO}`, email: `dir-${plano}@${SUFIXO}.t`, password: 'x', name: 'Direção', isSuperuser: true, isDirecao: true, isStaff: true, isApproved: true } })).id
    ids[`${plano}-professor`] = (await prisma.user.create({ data: { escolaId: escola.id, username: `prof-${plano}-${SUFIXO}`, email: `prof-${plano}@${SUFIXO}.t`, password: 'x', name: 'Professor', isStaff: true, isApproved: true } })).id
  }
}, 60_000)

afterAll(async () => {
  for (const plano of ['BASICO', 'ENTERPRISE']) {
    const escolaId = ids[plano]
    if (!escolaId) continue
    await prisma.globalConfig.deleteMany({ where: { escolaId } })
    await prisma.auditLog.deleteMany({ where: { user: { escolaId } } })
    await prisma.user.deleteMany({ where: { escolaId } })
    await prisma.escola.delete({ where: { id: escolaId } })
  }
  await prisma.$disconnect()
})

describe('mapa: há o que testar', () => {
  it('rotas, páginas e actions de módulos fora do Núcleo', () => {
    expect(rotas.length).toBeGreaterThan(20)
    expect(paginas.length).toBeGreaterThan(15)
    expect(actions.length).toBeGreaterThanOrEqual(4)
  })
})

describe('escola BASICO real (sem QST, PRV e FIN)', () => {
  const desligados: ModuloId[] = ['QST', 'PRV', 'FIN']

  it('escola ENTERPRISE (como a CETEP): todos os módulos ativos', async () => {
    const { estadosDaEscola } = await import('./estados')
    const estados = await estadosDaEscola(ids.ENTERPRISE)
    expect(Object.values(estados).every((e) => e === 'ATIVO')).toBe(true)
  })

  it('rotas de QST, PRV e FIN recusam com MODULO_INDISPONIVEL', async () => {
    const falhas: string[] = []
    for (const f of rotas.filter((r) => desligados.includes(r.dono as ModuloId))) {
      entrarComo('BASICO', f.dono)
      const mod = await import(f.abs)
      for (const metodo of ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']) {
        if (!mod[metodo]) continue
        const r = await chamarRota(mod[metodo], metodo)
        if (r.status !== 403 || r.codigo !== 'MODULO_INDISPONIVEL') falhas.push(`${metodo} ${f.rel} → ${r.status} ${r.codigo ?? ''}`)
      }
    }
    expect(falhas).toEqual([])
  })

  it('direção continua usando o banco de questões (comportamento atual)', async () => {
    sessao.atual = sessaoDe(ids.BASICO, ids['BASICO-direcao'], 'direcao')
    const { GET } = await import('@/app/api/questoes/route')
    const r = await chamarRota(GET, 'GET')
    expect(r.codigo).not.toBe('MODULO_INDISPONIVEL')
  })

  it('páginas de QST, PRV e FIN levam à tela "módulo indisponível"', async () => {
    const falhas: string[] = []
    for (const f of paginas.filter((p) => desligados.includes(p.dono as ModuloId))) {
      entrarComo('BASICO', f.dono)
      const destino = await abrirPagina(f.abs)
      if (destino !== `/dashboard/modulo-indisponivel?m=${f.dono}`) falhas.push(`${f.rel} → ${destino}`)
    }
    expect(falhas).toEqual([])
  })
})

async function abrirPagina(abs: string): Promise<string | null> {
  const mod = await import(abs)
  try {
    await mod.default({ params: Promise.resolve({ id: 'x', turmaId: 'x', matricula: 'x' }), searchParams: Promise.resolve({}) })
    return null
  } catch (e: any) {
    return e?.url ?? `erro: ${e?.message}`
  }
}

describe('escola sem módulos (todos INATIVO, menos o Núcleo)', () => {
  let antes: Awaited<ReturnType<typeof contagens>>
  beforeAll(async () => {
    forcado.estado = 'INATIVO'
    antes = await contagens()
  })
  afterAll(() => { forcado.estado = null })

  it('toda rota de módulo recusa com 403 MODULO_INDISPONIVEL', async () => {
    const falhas: string[] = []
    for (const f of rotas) {
      entrarComo('ENTERPRISE', f.dono)
      const mod = await import(f.abs)
      for (const metodo of ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']) {
        if (!mod[metodo]) continue
        const r = await chamarRota(mod[metodo], metodo)
        if (r.status !== 403 || r.codigo !== 'MODULO_INDISPONIVEL') falhas.push(`${metodo} ${f.rel} → ${r.status} ${r.codigo ?? ''}`)
      }
    }
    expect(falhas).toEqual([])
  })

  it('toda server action de módulo devolve erro sem executar', async () => {
    const falhas: string[] = []
    for (const f of actions) {
      entrarComo('ENTERPRISE', f.dono)
      const mod = await import(f.abs)
      for (const [nome, fn] of Object.entries(mod)) {
        if (typeof fn !== 'function') continue
        const r: any = await (fn as any)('x', 'x', 'x')
        const msg = r?.erro ?? r?.error
        if (typeof msg !== 'string' || !msg.includes('não está disponível')) falhas.push(`${f.rel} ${nome} → ${JSON.stringify(r)?.slice(0, 80)}`)
      }
    }
    expect(falhas).toEqual([])
  })

  it('toda página de módulo leva à tela "módulo indisponível"', async () => {
    const falhas: string[] = []
    for (const f of paginas) {
      entrarComo('ENTERPRISE', f.dono)
      const destino = await abrirPagina(f.abs)
      if (destino !== `/dashboard/modulo-indisponivel?m=${f.dono}`) falhas.push(`${f.rel} → ${destino}`)
    }
    expect(falhas).toEqual([])
  })

  it('nada mudou no banco', async () => {
    expect(await contagens()).toEqual(antes)
  })
})

describe('escola com módulos em SOMENTE_LEITURA', () => {
  let antes: Awaited<ReturnType<typeof contagens>>
  beforeAll(async () => {
    forcado.estado = 'SOMENTE_LEITURA'
    antes = await contagens()
  })
  afterAll(() => { forcado.estado = null })

  it('escrita recusada; leitura passa pela guarda', async () => {
    const falhas: string[] = []
    for (const f of rotas) {
      entrarComo('ENTERPRISE', f.dono)
      const src = fs.readFileSync(f.abs, 'utf8')
      const mod = await import(f.abs)
      for (const [, metodo, acesso] of src.matchAll(/^export const (\w+) = rotaDoModulo\('\w+', '(leitura|escrita)'/gm)) {
        const r = await chamarRota(mod[metodo], metodo)
        const barrado = r.status === 403 && r.codigo === 'MODULO_INDISPONIVEL'
        if (acesso === 'escrita' && !barrado) falhas.push(`${metodo} ${f.rel} (escrita) passou: ${r.status}`)
        if (acesso === 'leitura' && barrado) falhas.push(`${metodo} ${f.rel} (leitura) foi barrada`)
      }
    }
    expect(falhas).toEqual([])
  })

  it('páginas abrem (leitura)', async () => {
    const falhas: string[] = []
    for (const f of paginas) {
      entrarComo('ENTERPRISE', f.dono)
      const destino = await abrirPagina(f.abs)
      if (destino?.startsWith('/dashboard/modulo-indisponivel')) falhas.push(f.rel)
    }
    expect(falhas).toEqual([])
  })

  it('nada mudou no banco', async () => {
    expect(await contagens()).toEqual(antes)
  })
})
