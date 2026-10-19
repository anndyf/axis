import { NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import path from 'path'
import { escolaDaRequisicao } from '@/lib/escola-atual'
import { DESTAQUE_PADRAO } from '@/lib/services/identidade'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Manifest do PWA por escola: nome da escola do subdomínio, cor do tema azul Áxis.
// Parte do public/manifest.json (ícones etc.); sem escola, devolve o padrão.
export async function GET() {
  const base = JSON.parse(await readFile(path.join(process.cwd(), 'public', 'manifest.json'), 'utf8'))
  const escola = await escolaDaRequisicao()
  const manifest = {
    ...base,
    ...(escola ? { name: `${escola.nome} · Áxis`, short_name: escola.nome.slice(0, 12), description: `Sistema de Gestão Escolar Áxis - ${escola.nome}` } : {}),
    theme_color: DESTAQUE_PADRAO,
    background_color: '#f8fafb',
  }
  return NextResponse.json(manifest, { headers: { 'Content-Type': 'application/manifest+json', 'Cache-Control': 'no-store' } })
}
