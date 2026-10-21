'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'
import { cn } from './cn'

export interface AbaLink {
  href: string
  rotulo: ReactNode
  contador?: number
  /** ativa só no endereço exato (padrão: também nas subpáginas) */
  exato?: boolean
  /** outros endereços em que a aba também fica ativa (ex.: "Dados" no formulário de edição) */
  ativaEm?: string[]
}

/** Aba ativa: endereço exato, ou subpágina quando a aba não é `exato`. */
export function abaAtiva(pathname: string, aba: Pick<AbaLink, 'href' | 'exato' | 'ativaEm'>): boolean {
  const alvo = aba.href.split('?')[0]
  if (aba.ativaEm?.some((outro) => pathname === outro || pathname.startsWith(`${outro}/`))) return true
  return pathname === alvo || (!aba.exato && pathname.startsWith(`${alvo}/`))
}

/**
 * Abas de navegação de uma ficha (turma, estudante, usuário): cada aba é um
 * link para uma tela que já existe. Sublinhado na cor de destaque; no
 * celular a faixa rola de lado e a página não.
 */
export function Abas({ itens, rotulo, className }: { itens: AbaLink[]; rotulo: string; className?: string }) {
  const pathname = usePathname()
  return (
    <nav aria-label={rotulo} className={cn('border-b border-line', className)}>
      <ul className="-mb-px flex gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {itens.map((a) => {
          const ativa = abaAtiva(pathname, a)
          return (
            <li key={a.href} className="shrink-0">
              <Link
                href={a.href}
                aria-current={ativa ? 'page' : undefined}
                className={cn(
                  'inline-flex h-10 items-center gap-1.5 whitespace-nowrap border-b-2 px-3 text-sm transition-colors duration-150',
                  ativa ? 'border-accent font-medium text-fg' : 'border-transparent text-fg-muted hover:border-line-strong hover:text-fg'
                )}
              >
                {a.rotulo}
                {a.contador !== undefined && <span className="rounded-full bg-subtle px-1.5 text-xs tabular-nums text-fg-muted">{a.contador}</span>}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
