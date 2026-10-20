'use client'

import { cn } from './cn'

/**
 * Fichas de filtro em linha que rola de lado (Todas · 1TIM1 · 2TIM1). Só a
 * faixa rola; a página não. A ficha ativa fica na cor de destaque.
 */
export function Fichas<T extends string>({ opcoes, valor, onChange, rotulo, className }: {
  opcoes: { valor: T; rotulo: string }[]
  valor: T
  onChange: (v: T) => void
  /** nome do grupo para leitores de tela */
  rotulo: string
  className?: string
}) {
  return (
    <div role="group" aria-label={rotulo} className={cn('-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] md:mx-0 md:flex-wrap md:px-0 [&::-webkit-scrollbar]:hidden', className)}>
      {opcoes.map((o) => {
        const ativa = o.valor === valor
        return (
          <button
            key={o.valor}
            type="button"
            aria-pressed={ativa}
            onClick={() => onChange(o.valor)}
            className={cn(
              'inline-flex h-11 shrink-0 items-center rounded-full px-4 text-sm font-medium transition-colors duration-150 md:h-9 md:text-13',
              ativa ? 'bg-accent text-on-accent' : 'border border-line bg-surface text-fg-muted hover:border-line-strong hover:text-fg'
            )}
          >
            {o.rotulo}
          </button>
        )
      })}
    </div>
  )
}
