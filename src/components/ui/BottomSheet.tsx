'use client'

import { useId, useRef, useState, type PointerEvent, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { cn } from './cn'
import { useFocoPreso } from './foco'

/** Arrasto (px) a partir do qual soltar fecha o painel. */
const LIMITE_ARRASTO = 90

/**
 * Painel que sobe de baixo (padrão de app): alça no topo, foco preso, fecha
 * com Esc, toque fora ou arrastando para baixo pela alça/cabeçalho. No
 * desktop fica centralizado embaixo, com largura de modal. `footer` fica
 * fixo no fim (ações), acima da área segura do aparelho.
 */
export function BottomSheet({ open, onClose, title, description, children, footer, className }: {
  open: boolean
  onClose: () => void
  title: ReactNode
  description?: ReactNode
  children?: ReactNode
  footer?: ReactNode
  className?: string
}) {
  const painel = useRef<HTMLDivElement>(null)
  const inicio = useRef<number | null>(null)
  const [deslocamento, setDeslocamento] = useState(0)
  const tituloId = useId()
  const descricaoId = useId()

  useFocoPreso(painel, open, onClose)

  const comecar = (e: PointerEvent) => {
    // Botões no cabeçalho (fechar) continuam clicáveis
    if ((e.target as HTMLElement).closest('button')) return
    inicio.current = e.clientY
    ;(e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId)
  }
  const mover = (e: PointerEvent) => {
    if (inicio.current === null) return
    setDeslocamento(Math.max(0, e.clientY - inicio.current))
  }
  const soltar = () => {
    if (inicio.current === null) return
    inicio.current = null
    if (deslocamento > LIMITE_ARRASTO) onClose()
    setDeslocamento(0)
  }

  if (!open || typeof document === 'undefined') return null

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-end justify-center">
      <div aria-hidden className="absolute inset-0 bg-black/40 animate-fade-in" onClick={onClose} />
      <div
        ref={painel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={tituloId}
        aria-describedby={description ? descricaoId : undefined}
        tabIndex={-1}
        style={deslocamento ? { transform: `translateY(${deslocamento}px)` } : undefined}
        className={cn(
          'relative flex max-h-[88dvh] w-full flex-col rounded-t-2xl border border-b-0 border-line bg-elevated shadow-overlay outline-none sm:max-w-lg',
          deslocamento ? '' : 'animate-sheet-up transition-transform duration-150 ease-out',
          className
        )}
      >
        <div className="touch-none select-none" onPointerDown={comecar} onPointerMove={mover} onPointerUp={soltar} onPointerCancel={soltar}>
          <div aria-hidden className="mx-auto mt-2.5 h-1.5 w-10 rounded-full bg-line-strong" />
          <div className="flex items-start gap-3 px-5 pt-3 pb-3">
            <div className="min-w-0 flex-1">
              <h2 id={tituloId} className="text-base font-semibold text-fg">{title}</h2>
              {description && <p id={descricaoId} className="mt-0.5 text-13 text-fg-muted">{description}</p>}
            </div>
            <button type="button" onClick={onClose} aria-label="Fechar" className="-mr-2 -mt-1 flex size-11 shrink-0 items-center justify-center rounded-full text-fg-subtle transition-colors duration-150 hover:bg-subtle hover:text-fg">
              <X size={18} strokeWidth={1.75} />
            </button>
          </div>
        </div>
        {children && <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-4 text-sm text-fg">{children}</div>}
        {footer && <div className="flex flex-wrap justify-end gap-2 border-t border-line-subtle px-5 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">{footer}</div>}
        {!footer && <div aria-hidden className="h-[env(safe-area-inset-bottom)] shrink-0" />}
      </div>
    </div>,
    document.body
  )
}
