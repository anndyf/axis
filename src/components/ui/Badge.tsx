import type { HTMLAttributes } from 'react'
import { cn } from './cn'

export type BadgeTone = 'neutral' | 'accent' | 'success' | 'warning' | 'danger' | 'info'

const TONS: Record<BadgeTone, string> = {
  neutral: 'bg-subtle text-fg-muted border-line',
  accent: 'bg-accent-subtle text-accent-fg border-transparent',
  success: 'bg-success-subtle text-success-fg border-success-line',
  warning: 'bg-warning-subtle text-warning-fg border-warning-line',
  danger: 'bg-danger-subtle text-danger-fg border-danger-line',
  info: 'bg-info-subtle text-info-fg border-info-line',
}

const PONTOS: Record<BadgeTone, string> = {
  neutral: 'bg-fg-subtle', accent: 'bg-accent', success: 'bg-success', warning: 'bg-warning', danger: 'bg-danger', info: 'bg-info',
}

/** Status pequeno e suave. `dot` mostra uma bolinha na cor do tom. */
export function Badge({ tone = 'neutral', dot, className, children, ...props }: HTMLAttributes<HTMLSpanElement> & { tone?: BadgeTone; dot?: boolean }) {
  return (
    <span className={cn('inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2 py-0.5 text-xs font-medium leading-4', TONS[tone], className)} {...props}>
      {dot && <span aria-hidden className={cn('size-1.5 rounded-full', PONTOS[tone])} />}
      {children}
    </span>
  )
}
