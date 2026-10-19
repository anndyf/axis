import { NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import path from 'path'
import { escolaDaRequisicao } from '@/lib/escola-atual'
import { variaveisDeDestaque } from '@/lib/services/identidade'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Manifest do PWA por escola: nome e cor do tema da escola do subdomínio.
// Parte do public/manifest.json (ícones etc.); sem escola, devolve o padrão.
export async function GET() {
  const base = JSON.parse(await readFile(path.join(process.cwd(), 'public', 'manifest.json'), 'utf8'))
  const escola = await escolaDaRequisicao()
  const cor = variaveisDeDestaque(escola?.corPrimaria)['--accent']
  const manifest = {
    ...base,
    ...(escola ? { name: `${escola.nome} · Áxis`, short_name: escola.nome.slice(0, 12), description: `Sistema de Gestão Escolar Áxis - ${escola.nome}` } : {}),
    theme_color: cor,
    background_color: '#fafafa',
  }
  return NextResponse.json(manifest, { headers: { 'Content-Type': 'application/manifest+json', 'Cache-Control': 'no-store' } })
}
