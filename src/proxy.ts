import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

type EscolaCacheEntry = {
  data: { id: string; status: string } | null
  expiresAt: number
}

const escolaCache = new Map<string, EscolaCacheEntry>()
const CACHE_TTL_MS = 60_000

async function getEscolaBySlug(slug: string) {
  const cached = escolaCache.get(slug)
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data
  }

  const escola = await prisma.escola.findUnique({
    where: { slug },
    select: { id: true, status: true },
  })

  escolaCache.set(slug, { data: escola, expiresAt: Date.now() + CACHE_TTL_MS })
  return escola
}

// Extrai o primeiro nivel de subdominio a partir do ROOT_DOMAIN configurado.
// Usa uma env var em vez de assumir "2 labels = dominio raiz", porque dominios
// como ceteplnab.com.br ja tem 3 labels no proprio raiz.
function extractSlug(hostname: string): string | null {
  const host = hostname.split(':')[0]
  const rootDomain = (process.env.ROOT_DOMAIN || 'localhost').split(':')[0]

  if (host === rootDomain || host === `www.${rootDomain}`) {
    return null
  }

  if (host.endsWith(`.${rootDomain}`)) {
    const sub = host.slice(0, -(rootDomain.length + 1))
    // Subdominios compostos (ex: app.cetep.dominio) nao sao suportados - so o primeiro nivel importa.
    return sub.split('.')[0]
  }

  return null
}

function redirectToEscolaInvalida(request: NextRequest, motivo: string) {
  // Rotas /api/* precisam de uma resposta JSON, nao da pagina de erro em HTML -
  // um rewrite pra /escola-invalida quebraria qualquer client (ex: NextAuth)
  // que espera JSON e recebe HTML de volta.
  if (request.nextUrl.pathname.startsWith('/api/')) {
    return NextResponse.json({ message: 'Escola não encontrada', motivo }, { status: 404 })
  }

  const url = request.nextUrl.clone()
  url.pathname = '/escola-invalida'
  url.search = `?motivo=${motivo}`
  return NextResponse.rewrite(url)
}

export async function proxy(request: NextRequest) {
  const hostname = request.headers.get('host') || ''
  let slug = extractSlug(hostname)

  // Fallback de dev: sem subdominio (ex: localhost:3000 direto), usa a escola
  // definida em DEV_ESCOLA_SLUG. Nunca deve ser usado em producao real.
  if (!slug && process.env.DEV_ESCOLA_SLUG) {
    slug = process.env.DEV_ESCOLA_SLUG
  }

  if (!slug) {
    return redirectToEscolaInvalida(request, 'nao_encontrada')
  }

  const escola = await getEscolaBySlug(slug)

  if (!escola) {
    return redirectToEscolaInvalida(request, 'nao_encontrada')
  }

  if (escola.status === 'SUSPENSA' || escola.status === 'CANCELADA') {
    return redirectToEscolaInvalida(request, escola.status.toLowerCase())
  }

  // Header interno, nunca vem do client - recalculado do zero em toda requisicao
  // a partir do subdominio real. auth.ts e as rotas usam esse header, nunca um
  // escolaId vindo direto de input do usuario.
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-escola-id', escola.id)

  return NextResponse.next({
    request: { headers: requestHeaders },
  })
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|js|json|xml|txt|webmanifest|ttf|woff|woff2)$).*)',
  ],
}
