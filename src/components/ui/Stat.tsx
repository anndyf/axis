import Link from 'next/link'
import type { ReactNode } from 'react'
import { ArrowDownRight, ArrowUpRight } from 'lucide-react'
import { cn } from './cn'

/**
 * Número de destaque com rótulo. `delta` mostra variação (positiva em
 * verde, negativa em vermelho; `inverter` quando subir é ruim).
 */
export function Stat({ label, value, hint, delta, inverter, href, className }: {
  label: ReactNode
  value: ReactNode
  hint?: ReactNode
  delta?: number | null
  inverter?: boolean
  href?: string
  className?: string
}) {
  const bom = delta !== undefined && delta !== null && (inverter ? delta < 0 : delta > 0)
  const conteudo = (
    <>
      <p className="text-13 text-fg-muted">{label}</p>
      <div className="mt-1 flex items-baseline gap-2">
        <p className="text-2xl font-semibold tracking-tight text-fg tabular-nums">{value}</p>
        {delta !== undefined && delta !== null && delta !== 0 && (
          <span className={cn('inline-flex items-center text-xs font-medium tabular-nums', bom ? 'text-success-fg' : 'text-danger-fg')}>
            {delta > 0 ? <ArrowUpRight size={14} strokeWidth={1.75} aria-hidden /> : <ArrowDownRight size={14} strokeWidth={1.75} aria-hidden />}
            {Math.abs(delta).toLocaleString('pt-BR')}
          </span>
        )}
      </div>
      {hint && <p className="mt-1 text-xs text-fg-subtle">{hint}</p>}
    </>
  )
  const base = cn('block rounded-painel border border-line bg-surface p-4', className)
  return href ? (
    <Link href={href} className={cn(base, 'transition-colors duration-150 hover:border-line-strong')}>{conteudo}</Link>
  ) : (
    <div className={base}>{conteudo}</div>
  )
}
