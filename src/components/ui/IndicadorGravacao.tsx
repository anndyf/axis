import { Check, Loader2 } from 'lucide-react'
import { cn } from './cn'

/** "14:32" no fuso da escola (horário de Brasília). */
export function horaCurta(d: Date): string {
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' })
}

/**
 * Estado de gravação de um formulário longo ou lançamento: "Alterações não
 * salvas" enquanto houver mudança pendente, "Salvando…" durante a gravação e
 * "Salvo às 14:32" depois. Nada antes da primeira alteração.
 */
export function IndicadorGravacao({ pendente, salvando, salvoEm, className }: {
  pendente: boolean
  salvando?: boolean
  salvoEm?: Date | null
  className?: string
}) {
  let conteudo: React.ReactNode = null
  if (salvando) conteudo = <><Loader2 size={14} strokeWidth={1.75} className="animate-spin" aria-hidden /> Salvando…</>
  else if (pendente) conteudo = <><span aria-hidden className="size-2 rounded-full bg-warning" /> Alterações não salvas</>
  else if (salvoEm) conteudo = <><Check size={14} strokeWidth={2} aria-hidden className="text-success-fg" /> Salvo às {horaCurta(salvoEm)}</>
  return (
    <span role="status" aria-live="polite" className={cn('inline-flex items-center gap-1.5 text-13 text-fg-muted tabular-nums', pendente && !salvando && 'text-warning-fg', className)}>
      {conteudo}
    </span>
  )
}
