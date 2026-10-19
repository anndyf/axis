import { Skeleton } from "@/components/ui"

export default function Loading() {
  return (
    <div className="min-h-dvh bg-canvas" role="status" aria-label="Carregando">
      <div className="h-14 border-b border-line bg-surface" />
      <div className="mx-auto max-w-5xl space-y-4 px-4 pt-6 md:px-6">
        <Skeleton className="h-6 w-40" />
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          <Skeleton className="h-20 rounded-lg" />
          <Skeleton className="h-20 rounded-lg" />
          <Skeleton className="col-span-2 h-20 rounded-lg md:col-span-1" />
        </div>
        <Skeleton className="h-40 rounded-lg" />
      </div>
    </div>
  )
}
