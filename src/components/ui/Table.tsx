import type { HTMLAttributes, ReactNode, TdHTMLAttributes, ThHTMLAttributes } from 'react'
import { cn } from './cn'

/**
 * Tabela densa (linhas ~40px), cabeçalho fixo, hover sutil. A rolagem
 * horizontal fica dentro do contêiner - a página nunca rola de lado.
 * `maxHeight` ativa a rolagem vertical com cabeçalho grudado.
 */
export function TableContainer({ className, maxHeight, children }: { className?: string; maxHeight?: string; children: ReactNode }) {
  return (
    <div className={cn('relative w-full overflow-auto rounded-2xl border border-line bg-surface', className)} style={maxHeight ? { maxHeight } : undefined}>
      {children}
    </div>
  )
}

export function Table({ className, ...props }: HTMLAttributes<HTMLTableElement>) {
  return <table className={cn('w-full border-collapse text-13', className)} {...props} />
}

export function THead({ className, ...props }: HTMLAttributes<HTMLTableSectionElement>) {
  return <thead className={cn('sticky top-0 z-10 bg-canvas', className)} {...props} />
}

export function TBody({ className, ...props }: HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody className={cn('[&>tr:last-child>td]:border-b-0', className)} {...props} />
}

export function TR({ className, onClick, ...props }: HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr
      onClick={onClick}
      className={cn('transition-colors duration-150 hover:bg-subtle/60', onClick && 'cursor-pointer', className)}
      {...props}
    />
  )
}

/** `numeric`: alinhado à direita, algarismos tabulares. */
export function TH({ className, numeric, ...props }: ThHTMLAttributes<HTMLTableCellElement> & { numeric?: boolean }) {
  return (
    <th
      scope="col"
      className={cn(
        'h-9 whitespace-nowrap border-b border-line px-3 text-left text-xs font-medium text-fg-subtle',
        numeric && 'text-right',
        className
      )}
      {...props}
    />
  )
}

export function TD({ className, numeric, ...props }: TdHTMLAttributes<HTMLTableCellElement> & { numeric?: boolean }) {
  return (
    <td
      className={cn('h-10 border-b border-line-subtle px-3 align-middle text-fg', numeric && 'text-right tabular-nums', className)}
      {...props}
    />
  )
}

/** Linha de estado vazio ocupando todas as colunas. */
export function TableEmpty({ colSpan, children }: { colSpan: number; children: ReactNode }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-3 py-10 text-center text-13 text-fg-subtle">{children}</td>
    </tr>
  )
}
