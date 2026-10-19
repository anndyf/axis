import { Skeleton, SkeletonRows } from "@/components/ui"

/** Carregamento entre telas: o menu e a barra superior continuam; só o conteúdo vira esqueleto. */
export default function Loading() {
  return (
    <div className="space-y-6" role="status" aria-label="Carregando">
      <div className="space-y-2">
        <Skeleton className="h-7 w-56" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-lg" />
        ))}
      </div>
      <div className="rounded-lg border border-line bg-surface">
        <SkeletonRows linhas={6} colunas={4} />
      </div>
    </div>
  )
}
