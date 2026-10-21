'use client'

import type { ReactNode } from 'react'
import { Download, Search, X } from 'lucide-react'
import { Button } from './Button'
import { cn, ICONE } from './cn'

/**
 * Barra de ferramentas de lista: busca à esquerda, filtros (fichas com
 * contagem ou seletores) no meio e ações à direita, com "Exportar" quando a
 * tela oferece. Fica no topo do painel da lista (`noPainel`) ou solta.
 * Não filtra nada sozinha: a tela continua dona do estado.
 */
export function BarraFerramentas({ busca, filtros, acoes, onExportar, resumo, noPainel, className }: {
  busca?: { valor: string; onChange: (v: string) => void; placeholder?: string; rotulo?: string }
  filtros?: ReactNode
  acoes?: ReactNode
  onExportar?: () => void
  /** texto curto à direita da busca (ex.: "32 turmas") */
  resumo?: ReactNode
  noPainel?: boolean
  className?: string
}) {
  return (
    <div
      role="toolbar"
      aria-label="Ferramentas da lista"
      className={cn(
        'flex flex-col gap-2 md:flex-row md:flex-wrap md:items-center md:gap-3',
        noPainel ? 'border-b border-line-subtle px-painel py-2.5' : 'mb-3',
        className
      )}
    >
      {busca && (
        <div className="relative min-w-0 md:w-72 lg:w-80">
          <Search {...ICONE} aria-hidden className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-fg-subtle" />
          <input
            type="search"
            value={busca.valor}
            onChange={(e) => busca.onChange(e.target.value)}
            placeholder={busca.placeholder ?? 'Buscar'}
            aria-label={busca.rotulo ?? busca.placeholder ?? 'Buscar'}
            className={cn(
              'h-11 w-full rounded-lg border border-line bg-surface pl-9 pr-9 text-base text-fg placeholder:text-fg-subtle md:h-8 md:text-13',
              'transition-[border-color,box-shadow] duration-150 hover:border-line-strong focus:border-accent focus:outline-none focus:ring-3 focus:ring-ring/40',
              'max-md:border-transparent max-md:bg-subtle [&::-webkit-search-cancel-button]:hidden'
            )}
          />
          {busca.valor && (
            <button type="button" onClick={() => busca.onChange('')} aria-label="Limpar busca" className="absolute right-1.5 top-1/2 flex size-7 -translate-y-1/2 items-center justify-center rounded-md text-fg-subtle hover:bg-subtle hover:text-fg md:size-6">
              <X size={14} strokeWidth={1.75} />
            </button>
          )}
        </div>
      )}
      {resumo && <span className="hidden text-13 text-fg-muted md:inline">{resumo}</span>}
      {filtros && <div className="flex min-w-0 flex-wrap items-center gap-2">{filtros}</div>}
      {(acoes || onExportar) && (
        <div className="flex flex-wrap items-center gap-2 md:ml-auto">
          {onExportar && (
            <Button variant="secondary" size="sm" onClick={onExportar} className="max-md:hidden">
              <Download size={14} strokeWidth={1.75} aria-hidden /> Exportar
            </Button>
          )}
          {acoes}
        </div>
      )}
    </div>
  )
}
