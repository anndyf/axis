import type { ReactNode } from 'react'
import { cn } from './cn'

/**
 * Barra de salvar fixa de formulários longos: gruda no pé da área de
 * trabalho enquanto a pessoa rola (no celular, acima da barra inferior).
 * À esquerda, o estado (ex.: IndicadorGravacao); à direita, as ações.
 */
export function BarraSalvar({ estado, children, className }: { estado?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'sticky bottom-[calc(var(--barra-inferior)+0.75rem)] z-20 flex flex-wrap items-center justify-end gap-2 rounded-painel border border-line bg-surface/95 px-painel py-2.5 shadow-overlay backdrop-blur md:bottom-3 print:hidden',
        className
      )}
    >
      {estado && <div className="mr-auto min-w-0">{estado}</div>}
      {children}
    </div>
  )
}
