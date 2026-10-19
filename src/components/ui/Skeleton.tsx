import { cn } from './cn'

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn('animate-skeleton rounded-md bg-subtle', className)} />
}

/** Linhas de tabela carregando. */
export function SkeletonRows({ linhas = 5, colunas = 4 }: { linhas?: number; colunas?: number }) {
  return (
    <div role="status" aria-label="Carregando" className="divide-y divide-line-subtle">
      {Array.from({ length: linhas }).map((_, i) => (
        <div key={i} className="flex h-10 items-center gap-4 px-3">
          {Array.from({ length: colunas }).map((__, j) => (
            <Skeleton key={j} className={cn('h-3', j === 0 ? 'w-1/3' : 'w-16')} />
          ))}
        </div>
      ))}
    </div>
  )
}
