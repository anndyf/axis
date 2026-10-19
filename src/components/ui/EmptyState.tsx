import type { ComponentType, ReactNode } from 'react'
import { cn } from './cn'

/** Estado vazio com orientação: o que é, por que está vazio, o que fazer. */
export function EmptyState({ icon: Icone, title, description, action, className }: {
  icon?: ComponentType<{ size?: number; strokeWidth?: number; className?: string }>
  title: ReactNode
  description?: ReactNode
  action?: ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex flex-col items-center justify-center px-6 py-12 text-center', className)}>
      {Icone && (
        <div className="mb-3 flex size-10 items-center justify-center rounded-lg border border-line bg-surface text-fg-subtle shadow-card">
          <Icone size={18} strokeWidth={1.75} />
        </div>
      )}
      <p className="text-sm font-medium text-fg">{title}</p>
      {description && <p className="mt-1 max-w-sm text-13 text-fg-muted">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
