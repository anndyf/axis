import { Loader2 } from "lucide-react"

/** Carregamento de rotas fora do painel (login, acesso): discreto, sem cobrir a tela. */
export default function Loading() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-canvas" role="status" aria-label="Carregando">
      <Loader2 size={20} strokeWidth={1.75} className="animate-spin text-fg-subtle" />
    </div>
  )
}
