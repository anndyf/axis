import type { ReactNode } from 'react'
import { cn } from './cn'

export interface ItemDescritivo {
  rotulo: ReactNode
  valor: ReactNode
  /** ocupa a linha inteira (ex.: observações) */
  largo?: boolean
}

const COLUNAS = { 1: '', 2: 'sm:grid-cols-2', 3: 'sm:grid-cols-2 lg:grid-cols-3', 4: 'sm:grid-cols-2 lg:grid-cols-4' } as const

/**
 * Ficha em modo leitura: rótulo sobre valor, em grade. Valor vazio aparece
 * como travessão, para a grade não "pular".
 */
export function ListaDescritiva({ itens, colunas = 3, className }: { itens: ItemDescritivo[]; colunas?: keyof typeof COLUNAS; className?: string }) {
  return (
    <dl className={cn('grid grid-cols-1 gap-x-6 gap-y-3.5', COLUNAS[colunas], className)}>
      {itens.map((item, i) => {
        const vazio = item.valor === null || item.valor === undefined || item.valor === ''
        return (
          <div key={i} className={cn('min-w-0', item.largo && 'sm:col-span-full')}>
            <dt className="text-rotulo text-fg-muted">{item.rotulo}</dt>
            <dd className={cn('mt-0.5 break-words text-sm', vazio ? 'text-fg-disabled' : 'text-fg')}>{vazio ? '—' : item.valor}</dd>
          </div>
        )
      })}
    </dl>
  )
}
