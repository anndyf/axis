import type { ReactNode } from 'react'
import { cn } from './cn'

/**
 * Dica curta ao passar o mouse ou focar (só CSS). Para botões só com ícone,
 * o aria-label continua obrigatório no próprio botão.
 */
export function Tooltip({ content, children, side = 'top', className }: { content: ReactNode; children: ReactNode; side?: 'top' | 'bottom' | 'right'; className?: string }) {
  return (
    <span className={cn('group/tip relative inline-flex', className)}>
      {children}
      <span
        role="tooltip"
        className={cn(
          'pointer-events-none absolute z-50 w-max max-w-56 rounded-md bg-fg px-2 py-1 text-xs text-canvas opacity-0 shadow-overlay',
          'transition-opacity duration-150 delay-200 group-hover/tip:opacity-100 group-focus-within/tip:opacity-100',
          side === 'top' && 'bottom-full left-1/2 mb-1.5 -translate-x-1/2',
          side === 'bottom' && 'top-full left-1/2 mt-1.5 -translate-x-1/2',
          side === 'right' && 'left-full top-1/2 ml-2 -translate-y-1/2'
        )}
      >
        {content}
      </span>
    </span>
  )
}
