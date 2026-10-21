/**
 * Defeito do redirecionamento (Application error / "Rendered more hooks than
 * during the previous render" no Router do Next): um loading.tsx acima das
 * páginas do painel cria uma fronteira de Suspense, a resposta começa a ser
 * enviada antes da página decidir e o redirect() de "sem permissão" vira um
 * redirecionamento no navegador (meta refresh de 1s + router.replace), que
 * disputa com o roteador do Next. Sem a fronteira, o redirect() responde 307
 * antes de qualquer HTML. Conferência ao vivo: scripts/verificar-redirecionamento.ts.
 */
import { describe, it, expect } from 'vitest'
import { readdirSync, statSync } from 'fs'
import path from 'path'

function loadings(dir: string): string[] {
  const achados: string[] = []
  for (const nome of readdirSync(dir)) {
    const p = path.join(dir, nome)
    if (statSync(p).isDirectory()) achados.push(...loadings(p))
    else if (/^loading\.(tsx|ts|jsx|js)$/.test(nome)) achados.push(p)
  }
  return achados
}

describe('redirect() das telas do painel sem streaming', () => {
  it('não há loading.tsx na raiz do app nem dentro de /dashboard', () => {
    const app = path.resolve(__dirname, '../app')
    const raiz = readdirSync(app).filter((n) => /^loading\.(tsx|ts|jsx|js)$/.test(n))
    expect(raiz).toEqual([])
    expect(loadings(path.join(app, 'dashboard')).map((p) => path.relative(app, p))).toEqual([])
  })
})
