import type { ReactNode } from 'react'
import { AlertCircle, AlertTriangle, CheckCircle2, Info } from 'lucide-react'
import { cn } from './cn'

type Tom = 'info' | 'success' | 'warning' | 'danger'

const ESTILO: Record<Tom, string> = {
  info: 'bg-info-subtle border-info-line text-info-fg',
  success: 'bg-success-subtle border-success-line text-success-fg',
  warning: 'bg-warning-subtle border-warning-line text-warning-fg',
  danger: 'bg-danger-subtle border-danger-line text-danger-fg',
}
const ICONES = { info: Info, success: CheckCircle2, warning: AlertTriangle, danger: AlertCircle }

/** Aviso em linha (resultado de ação, atenção). */
export function Alert({ tone = 'info', title, children, className }: { tone?: Tom; title?: ReactNode; children?: ReactNode; className?: string }) {
  const Icone = ICONES[tone]
  return (
    <div role={tone === 'danger' ? 'alert' : 'status'} className={cn('flex gap-2.5 rounded-xl border px-3.5 py-3 text-13', ESTILO[tone], className)}>
      <Icone size={16} strokeWidth={1.75} className="mt-px shrink-0" aria-hidden />
      <div className="min-w-0 space-y-0.5">
        {title && <p className="font-medium">{title}</p>}
        {children && <div className="leading-relaxed">{children}</div>}
      </div>
    </div>
  )
}
