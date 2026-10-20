/**
 * Teste estático de cobertura de módulos (docs/arquitetura/modulos-e-planos.md, 4.4.3 a).
 *
 * Varre todas as rotas de API, arquivos de server actions e páginas do
 * painel/portal e exige que cada um declare a guarda do módulo a que
 * pertence segundo src/lib/modulos/mapa-rotas.ts:
 * - rota:   todo handler exportado é `export const X = rotaDoModulo('<ID>', ...)`
 * - action: toda função exportada chama `bloqueioDoModulo('<ID>'` (Núcleo: marcador `@modulo NUC`)
 * - página: `paginaDoModulo('<ID>')` (página cliente do Núcleo: marcador `@modulo NUC`)
 * - plataforma (PLT): `exigirAdminPlataforma`
 * Arquivo novo sem entrada no mapa faz o teste falhar.
 */
import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'
import { EXCECOES_MODULO, moduloDoArquivo } from './mapa-rotas'

const APP = path.resolve(__dirname, '../../app')
const METODOS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS']

function listar(dir: string, out: string[] = []): string[] {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) listar(p, out)
    else out.push(p)
  }
  return out
}

const todos = listar(APP).map((p) => ({ abs: p, rel: path.relative(APP, p).split(path.sep).join('/') }))
const ehAction = (src: string) => /^\s*(\/\/[^\n]*\n\s*)*['"]use server['"]/.test(src)
const fonte = (abs: string) => fs.readFileSync(abs, 'utf8')

const rotas = todos.filter((f) => path.basename(f.rel) === 'route.ts')
const actions = todos.filter((f) => /\.tsx?$/.test(f.rel) && !f.rel.endsWith('.test.ts') && ehAction(fonte(f.abs)))
const paginas = todos.filter((f) => path.basename(f.rel) === 'page.tsx' && (f.rel.startsWith('dashboard/') || f.rel.startsWith('portal/')))

/** Corpo de cada função exportada (do "export async function" até o próximo export de topo). */
function funcoesExportadas(src: string): { nome: string; corpo: string }[] {
  const re = /^export async function (\w+)/gm
  const marcas = [...src.matchAll(re)].map((m) => ({ nome: m[1], ini: m.index! }))
  return marcas.map((m) => {
    const prox = src.slice(m.ini + 1).search(/^export /m)
    const fim = prox === -1 ? src.length : m.ini + 1 + prox
    return { nome: m.nome, corpo: src.slice(m.ini, fim) }
  })
}

function problemaRota(rel: string, src: string, dono: string): string | null {
  if (dono === 'PLT') return src.includes('exigirAdminPlataforma(') ? null : `${rel} é da plataforma mas não chama exigirAdminPlataforma()`
  const soltos = [...src.matchAll(/^export (?:async )?function (\w+)/gm)].map((m) => m[1]).filter((n) => METODOS.includes(n))
  if (soltos.length) return `${rel} pertence a ${dono} mas ${soltos.join(', ')} não passa por rotaDoModulo('${dono}', ...)`
  const exportados = [...src.matchAll(/^export const (\w+)\s*=\s*(.*)$/gm)].filter((m) => METODOS.includes(m[1]))
  if (!exportados.length) return `${rel}: nenhum handler encontrado`
  for (const m of exportados) {
    if (!m[2].startsWith(`rotaDoModulo('${dono}', '`)) return `${rel} pertence a ${dono} mas ${m[1]} não chama rotaDoModulo('${dono}', ...)`
  }
  return null
}

function problemaAction(rel: string, src: string, dono: string): string | null {
  if (dono === 'PLT') return src.includes('exigirAdminPlataforma(') ? null : `${rel} é da plataforma mas não chama exigirAdminPlataforma()`
  if (dono === 'NUC') return src.includes('@modulo NUC') ? null : `${rel} pertence ao Núcleo mas não tem o marcador "@modulo NUC"`
  if (src.includes('@modulo NUC')) return `${rel} pertence a ${dono} mas está marcado como Núcleo`
  for (const f of funcoesExportadas(src)) {
    if (!f.corpo.includes(`bloqueioDoModulo('${dono}'`)) return `${rel} pertence a ${dono} mas ${f.nome}() não chama bloqueioDoModulo('${dono}', ...)`
  }
  return null
}

function problemaPagina(rel: string, src: string, dono: string): string | null {
  if (dono === 'PLT') return src.includes('exigirAdminPlataforma(') ? null : `${rel} é da plataforma mas não chama exigirAdminPlataforma()`
  if (src.includes(`paginaDoModulo('${dono}')`)) return null
  if (dono === 'NUC' && src.includes('@modulo NUC') && /^\s*(\/\/[^\n]*\n\s*)*['"]use client['"]/.test(src)) return null
  return `${rel} pertence a ${dono} mas não chama paginaDoModulo('${dono}')`
}

describe('cobertura de módulos (teste estático)', () => {
  it('encontra os arquivos esperados', () => {
    expect(rotas.length).toBeGreaterThan(50)
    expect(actions.length).toBeGreaterThan(10)
    expect(paginas.length).toBeGreaterThan(50)
  })

  for (const [tipo, lista, checar] of [
    ['rota', rotas, problemaRota],
    ['action', actions, problemaAction],
    ['página', paginas, problemaPagina],
  ] as const) {
    it(`toda ${tipo} tem módulo no mapa e chama a guarda desse módulo`, () => {
      const problemas: string[] = []
      for (const f of lista) {
        if (EXCECOES_MODULO[f.rel]) continue
        const dono = moduloDoArquivo(f.rel)
        if (!dono) { problemas.push(`${f.rel}: ${tipo} nova sem módulo definido em src/lib/modulos/mapa-rotas.ts`); continue }
        const p = checar(f.rel, fonte(f.abs), dono)
        if (p) problemas.push(p)
      }
      expect(problemas).toEqual([])
    })
  }

  it('toda exceção corresponde a um arquivo que existe', () => {
    const existentes = new Set(todos.map((f) => f.rel))
    expect(Object.keys(EXCECOES_MODULO).filter((e) => !existentes.has(e))).toEqual([])
  })

  it('o detector de falhas funciona (arquivo de exemplo)', () => {
    expect(problemaRota('api/x/route.ts', 'export async function GET() {}', 'NOT')).toMatch(/não passa por rotaDoModulo/)
    expect(problemaRota('api/x/route.ts', "export const GET = rotaDoModulo('DIA', 'leitura', async function GET() {})", 'NOT')).toMatch(/não chama rotaDoModulo\('NOT'/)
    expect(problemaAction('x/actions.ts', '"use server"\nexport async function a() {\n  return 1\n}\n', 'DIA')).toMatch(/a\(\) não chama/)
    expect(problemaPagina('dashboard/x/page.tsx', 'export default async function P() {}', 'RES')).toMatch(/paginaDoModulo\('RES'\)/)
  })
})
