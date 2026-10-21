import type { HTMLAttributes, ReactNode, TdHTMLAttributes, ThHTMLAttributes } from 'react'
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, ChevronsUpDown } from 'lucide-react'
import { cn } from './cn'

/**
 * Tabela da área de trabalho: linhas de 40px, cabeçalho fixo, números à
 * direita com algarismos tabulares, hover sutil. A rolagem horizontal fica
 * dentro do contêiner - a página nunca rola de lado. `maxHeight` ativa a
 * rolagem vertical com o cabeçalho grudado. `semBorda`: dentro de um Painel.
 */
export function TableContainer({ className, maxHeight, semBorda, children }: { className?: string; maxHeight?: string; semBorda?: boolean; children: ReactNode }) {
  return (
    <div
      className={cn('relative w-full overflow-auto bg-surface', !semBorda && 'rounded-painel border border-line', className)}
      style={maxHeight ? { maxHeight } : undefined}
    >
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

/** Linha. Com `onClick` vira linha clicável (cursor e foco por teclado ficam com a célula-link). */
export function TR({ className, onClick, selecionada, ...props }: HTMLAttributes<HTMLTableRowElement> & { selecionada?: boolean }) {
  return (
    <tr
      onClick={onClick}
      aria-selected={selecionada}
      className={cn(
        'transition-colors duration-150 hover:bg-subtle/60',
        onClick && 'cursor-pointer',
        selecionada && 'bg-accent-subtle/60 hover:bg-accent-subtle',
        className
      )}
      {...props}
    />
  )
}

export type DirecaoOrdem = 'asc' | 'desc'

/**
 * Cabeçalho de coluna. `numeric`: alinhado à direita. Com `onOrdenar` vira
 * botão de ordenação; `ordem` diz a direção atual desta coluna (ou nada).
 */
export function TH({ className, numeric, ordem, onOrdenar, children, ...props }: ThHTMLAttributes<HTMLTableCellElement> & {
  numeric?: boolean
  ordem?: DirecaoOrdem | null
  onOrdenar?: () => void
}) {
  const Seta = ordem === 'asc' ? ArrowUp : ordem === 'desc' ? ArrowDown : ChevronsUpDown
  return (
    <th
      scope="col"
      aria-sort={ordem === 'asc' ? 'ascending' : ordem === 'desc' ? 'descending' : onOrdenar ? 'none' : undefined}
      className={cn(
        'h-9 whitespace-nowrap border-b border-line px-3 text-left text-rotulo font-medium text-fg-muted',
        numeric && 'text-right',
        className
      )}
      {...props}
    >
      {onOrdenar ? (
        <button type="button" onClick={onOrdenar} className={cn('-mx-1 inline-flex items-center gap-1 rounded px-1 hover:text-fg', numeric && 'flex-row-reverse', ordem && 'text-fg')}>
          {children}
          <Seta size={12} strokeWidth={1.75} aria-hidden className={cn(!ordem && 'opacity-50')} />
        </button>
      ) : children}
    </th>
  )
}

export function TD({ className, numeric, ...props }: TdHTMLAttributes<HTMLTableCellElement> & { numeric?: boolean }) {
  return (
    <td
      className={cn('h-linha border-b border-line-subtle px-3 align-middle text-fg', numeric && 'text-right tabular-nums', className)}
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

/**
 * Rodapé da tabela: contagem ("32 estudantes") e, se houver, paginação.
 * `pagina` começa em 1.
 */
export function RodapeTabela({ total, singular, plural, pagina, porPagina, onPagina, children, className }: {
  total: number
  singular: string
  plural: string
  pagina?: number
  porPagina?: number
  onPagina?: (p: number) => void
  children?: ReactNode
  className?: string
}) {
  const paginas = porPagina ? Math.max(1, Math.ceil(total / porPagina)) : 1
  const ini = pagina && porPagina ? (pagina - 1) * porPagina + 1 : 1
  const fim = pagina && porPagina ? Math.min(total, pagina * porPagina) : total
  return (
    <div className={cn('flex flex-wrap items-center justify-between gap-2 border-t border-line-subtle px-3 py-2 text-13 text-fg-muted', className)}>
      <span className="tabular-nums">
        {paginas > 1 ? <>{ini}–{fim} de {total} {plural}</> : <>{total} {total === 1 ? singular : plural}</>}
      </span>
      {children}
      {paginas > 1 && pagina && onPagina && (
        <div className="flex items-center gap-1">
          <button type="button" onClick={() => onPagina(pagina - 1)} disabled={pagina <= 1} aria-label="Página anterior" className="flex size-7 items-center justify-center rounded-md border border-line bg-surface text-fg-muted hover:bg-subtle disabled:opacity-40">
            <ChevronLeft size={14} strokeWidth={1.75} />
          </button>
          <span className="px-2 tabular-nums">Página {pagina} de {paginas}</span>
          <button type="button" onClick={() => onPagina(pagina + 1)} disabled={pagina >= paginas} aria-label="Próxima página" className="flex size-7 items-center justify-center rounded-md border border-line bg-surface text-fg-muted hover:bg-subtle disabled:opacity-40">
            <ChevronRight size={14} strokeWidth={1.75} />
          </button>
        </div>
      )}
    </div>
  )
}
