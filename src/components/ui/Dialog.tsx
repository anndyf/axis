'use client'

import { useId, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { cn } from './cn'
import { useFocoPreso } from './foco'

/**
 * Modal acessível: foco preso dentro, Esc e clique fora fecham, foco volta
 * para quem abriu. `footer` fica fixo embaixo (ações).
 */
export function Dialog({ open, onClose, title, description, children, footer, size = 'md' }: {
  open: boolean
  onClose: () => void
  title: ReactNode
  description?: ReactNode
  children?: ReactNode
  footer?: ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl'
}) {
  const painel = useRef<HTMLDivElement>(null)
  const tituloId = useId()
  const descricaoId = useId()

  useFocoPreso(painel, open, onClose)

  if (!open || typeof document === 'undefined') return null

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-end justify-center p-0 sm:items-center sm:p-4">
      <div aria-hidden className="absolute inset-0 bg-black/40 animate-fade-in" onClick={onClose} />
      <div
        ref={painel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={tituloId}
        aria-describedby={description ? descricaoId : undefined}
        tabIndex={-1}
        className={cn(
          'relative flex max-h-[90vh] w-full flex-col rounded-t-modal border border-line bg-elevated shadow-overlay outline-none sm:rounded-modal',
          'animate-pop-in',
          size === 'sm' ? 'sm:max-w-sm' : size === 'lg' ? 'sm:max-w-2xl' : size === 'xl' ? 'sm:max-w-5xl' : 'sm:max-w-lg'
        )}
      >
        <div className="flex items-start gap-3 px-5 pt-5 pb-3">
          <div className="min-w-0 flex-1">
            <h2 id={tituloId} className="text-base font-semibold text-fg">{title}</h2>
            {description && <p id={descricaoId} className="mt-1 text-13 text-fg-muted">{description}</p>}
          </div>
          <button type="button" onClick={onClose} aria-label="Fechar" className="-mr-1 rounded-md p-1 text-fg-subtle transition-colors duration-150 hover:bg-subtle hover:text-fg">
            <X size={16} strokeWidth={1.75} />
          </button>
        </div>
        {children && <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-4 text-sm text-fg">{children}</div>}
        {footer && <div className="flex flex-wrap justify-end gap-2 border-t border-line-subtle px-5 py-3">{footer}</div>}
      </div>
    </div>,
    document.body
  )
}
