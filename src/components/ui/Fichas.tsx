'use client'

import { cn } from './cn'

export interface OpcaoFicha<T extends string> {
  valor: T
  rotulo: string
  /** quantidade de itens com este filtro (aparece ao lado do rótulo) */
  contagem?: number
}

/**
 * Fichas de filtro em linha que rola de lado (Todas · 1TIM1 · 2TIM1). Só a
 * faixa rola; a página não. A ficha ativa fica na cor de destaque.
 * `compactas`: altura de 32px no desktop, para barras de ferramentas.
 */
export function Fichas<T extends string>({ opcoes, valor, onChange, rotulo, compactas, className }: {
  opcoes: OpcaoFicha<T>[]
  valor: T
  onChange: (v: T) => void
  /** nome do grupo para leitores de tela */
  rotulo: string
  compactas?: boolean
  className?: string
}) {
  return (
    <div role="group" aria-label={rotulo} className={cn('-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] md:mx-0 md:flex-wrap md:px-0 [&::-webkit-scrollbar]:hidden', compactas && 'md:gap-1.5 md:pb-0', className)}>
      {opcoes.map((o) => {
        const ativa = o.valor === valor
        return (
          <button
            key={o.valor}
            type="button"
            aria-pressed={ativa}
            onClick={() => onChange(o.valor)}
            className={cn(
              'inline-flex h-11 shrink-0 items-center gap-1.5 rounded-full px-4 text-sm font-medium transition-colors duration-150 md:text-13',
              compactas ? 'md:h-8 md:px-3' : 'md:h-9',
              ativa ? 'bg-accent text-on-accent' : 'border border-line bg-surface text-fg-muted hover:border-line-strong hover:text-fg'
            )}
          >
            {o.rotulo}
            {o.contagem !== undefined && (
              <span className={cn('rounded-full px-1.5 text-xs tabular-nums', ativa ? 'bg-white/20 text-on-accent' : 'bg-subtle text-fg-muted')}>{o.contagem}</span>
            )}
          </button>
        )
      })}
    </div>
  )
}
