import { History } from 'lucide-react'
import { cn } from './cn'

const FUSO = 'America/Sao_Paulo'
const dia = (d: Date) => d.toLocaleDateString('pt-BR', { timeZone: FUSO, day: '2-digit', month: '2-digit', year: 'numeric' })
const diaHora = (d: Date) => `${dia(d)}, ${d.toLocaleTimeString('pt-BR', { timeZone: FUSO, hour: '2-digit', minute: '2-digit' })}`

/**
 * Rastreabilidade discreta no pé de fichas e registros:
 * "Criado por Fulana em 12/03/2026 · Última alteração por Beltrano em
 * 18/10/2026, 14:32". Onde o autor não é gravado, só a data (nunca se
 * inventa autor). Sempre no horário de Brasília.
 */
export function RodapeRastreio({ criadoEm, criadoPor, alteradoEm, alteradoPor, className }: {
  criadoEm?: Date | null
  criadoPor?: string | null
  alteradoEm?: Date | null
  alteradoPor?: string | null
  className?: string
}) {
  const partes: string[] = []
  if (criadoEm) partes.push(`Criado${criadoPor ? ` por ${criadoPor}` : ''} em ${dia(criadoEm)}`)
  if (alteradoEm) partes.push(`Última alteração${alteradoPor ? ` por ${alteradoPor}` : ''} em ${diaHora(alteradoEm)}`)
  if (!partes.length) return null
  return (
    <p className={cn('flex items-start gap-1.5 text-xs text-fg-subtle print:text-[9pt]', className)}>
      <History size={13} strokeWidth={1.75} aria-hidden className="mt-px shrink-0" />
      <span>{partes.join(' · ')}</span>
    </p>
  )
}
