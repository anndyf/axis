import Link from 'next/link'
import type { ReactNode } from 'react'
import { ChevronRight } from 'lucide-react'
import { cn } from './cn'

export interface Migalha {
  label: string
  href?: string
}

export function Breadcrumb({ items, className }: { items: Migalha[]; className?: string }) {
  if (items.length === 0) return null
  return (
    <nav aria-label="Você está em" className={cn('min-w-0', className)}>
      <ol className="flex min-w-0 items-center gap-1 text-13 text-fg-subtle">
        {items.map((m, i) => {
          const ultimo = i === items.length - 1
          return (
            <li key={`${m.label}-${i}`} className={cn('flex min-w-0 items-center gap-1', !ultimo && 'shrink-0')}>
              {m.href && !ultimo ? (
                <Link href={m.href} className="rounded-sm transition-colors duration-150 hover:text-fg">{m.label}</Link>
              ) : (
                <span aria-current={ultimo ? 'page' : undefined} className={cn('truncate', ultimo && 'text-fg-muted')}>{m.label}</span>
              )}
              {!ultimo && <ChevronRight size={14} strokeWidth={1.75} aria-hidden className="shrink-0 text-fg-disabled" />}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

/** Cabeçalho de página: (migalhas) título, descrição e ações. */
export function PageHeader({ title, description, actions, breadcrumb, className }: {
  title: ReactNode
  description?: ReactNode
  actions?: ReactNode
  breadcrumb?: Migalha[]
  className?: string
}) {
  return (
    <header className={cn('mb-6 space-y-2', className)}>
      {breadcrumb && <Breadcrumb items={breadcrumb} />}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight text-fg">{title}</h1>
          {description && <p className="mt-1 max-w-2xl text-sm text-fg-muted">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </header>
  )
}
