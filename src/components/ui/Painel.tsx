import type { HTMLAttributes, ReactNode } from 'react'
import { cn } from './cn'

/**
 * Painel da área de trabalho: borda de 1px, raio de 8px e nenhuma sombra.
 * Faixa de título com ações à direita, corpo e rodapé opcionais.
 * `semRecuo` deixa o corpo sem margem interna (tabelas e listas encostam na
 * borda do painel).
 */
export function Painel({ titulo, descricao, acoes, rodape, semRecuo, className, corpoClassName, children, ...props }: Omit<HTMLAttributes<HTMLElement>, 'title'> & {
  titulo?: ReactNode
  descricao?: ReactNode
  acoes?: ReactNode
  rodape?: ReactNode
  semRecuo?: boolean
  corpoClassName?: string
}) {
  return (
    <section className={cn('min-w-0 rounded-painel border border-line bg-surface', className)} {...props}>
      {(titulo || acoes) && (
        <header className="flex min-h-11 flex-wrap items-center gap-x-3 gap-y-1 border-b border-line-subtle px-painel py-2">
          <div className="min-w-0 flex-1">
            {titulo && <h2 className="text-sm font-semibold text-fg">{titulo}</h2>}
            {descricao && <p className="text-13 text-fg-muted">{descricao}</p>}
          </div>
          {acoes && <div className="flex shrink-0 flex-wrap items-center gap-2">{acoes}</div>}
        </header>
      )}
      <div className={cn(!semRecuo && 'px-painel py-painel-y', corpoClassName)}>{children}</div>
      {rodape && (
        <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-line-subtle px-painel py-2 text-13 text-fg-muted">{rodape}</footer>
      )}
    </section>
  )
}
