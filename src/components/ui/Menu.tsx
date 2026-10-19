'use client'

import Link from 'next/link'
import { useEffect, useId, useRef, useState, type ComponentType, type ReactNode } from 'react'
import { Check } from 'lucide-react'
import { cn } from './cn'

export interface ItemMenu {
  label: ReactNode
  icon?: ComponentType<{ size?: number; strokeWidth?: number; className?: string }>
  onSelect?: () => void
  href?: string
  perigo?: boolean
  separadorAntes?: boolean
  /** Opção de escolha única (ex.: tema): vira menuitemradio com marca de seleção */
  marcado?: boolean
}

/**
 * Menu suspenso: abre no botão, setas navegam, Esc fecha e devolve o foco,
 * clique fora fecha. `trigger` recebe as props do botão.
 */
export function Menu({ trigger, items, align = 'end', side = 'bottom', className }: {
  trigger: (props: { onClick: () => void; 'aria-expanded': boolean; 'aria-haspopup': 'menu'; 'aria-controls': string; ref: (el: HTMLButtonElement | null) => void }) => ReactNode
  items: ItemMenu[]
  align?: 'start' | 'end'
  side?: 'top' | 'bottom'
  className?: string
}) {
  const [aberto, setAberto] = useState(false)
  const id = useId()
  const raiz = useRef<HTMLDivElement>(null)
  const botao = useRef<HTMLButtonElement | null>(null)
  const itens = useRef<(HTMLElement | null)[]>([])

  useEffect(() => {
    if (!aberto) return
    itens.current[0]?.focus()
    const fora = (e: MouseEvent) => { if (!raiz.current?.contains(e.target as Node)) setAberto(false) }
    const tecla = (e: KeyboardEvent) => {
      const lista = itens.current.filter(Boolean) as HTMLElement[]
      const i = lista.indexOf(document.activeElement as HTMLElement)
      if (e.key === 'Escape') { setAberto(false); botao.current?.focus() }
      else if (e.key === 'ArrowDown') { e.preventDefault(); lista[(i + 1) % lista.length]?.focus() }
      else if (e.key === 'ArrowUp') { e.preventDefault(); lista[(i - 1 + lista.length) % lista.length]?.focus() }
      else if (e.key === 'Tab') setAberto(false)
    }
    document.addEventListener('mousedown', fora)
    document.addEventListener('keydown', tecla)
    return () => {
      document.removeEventListener('mousedown', fora)
      document.removeEventListener('keydown', tecla)
    }
  }, [aberto])

  const classeItem = (perigo?: boolean) => cn(
    'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-13 outline-none transition-colors duration-150',
    perigo ? 'text-danger-fg hover:bg-danger-subtle focus:bg-danger-subtle' : 'text-fg hover:bg-subtle focus:bg-subtle'
  )

  return (
    <div ref={raiz} className={cn('relative inline-block', className)}>
      {trigger({ onClick: () => setAberto((v) => !v), 'aria-expanded': aberto, 'aria-haspopup': 'menu', 'aria-controls': id, ref: (el) => { botao.current = el } })}
      {aberto && (
        <div
          id={id}
          role="menu"
          className={cn(
            'absolute z-50 min-w-48 rounded-lg border border-line bg-elevated p-1 shadow-overlay animate-fade-in',
            align === 'end' ? 'right-0' : 'left-0',
            side === 'bottom' ? 'top-full mt-1' : 'bottom-full mb-1'
          )}
        >
          {items.map((item, i) => {
            const Icone = item.icon
            const conteudo = <>{Icone && <Icone size={16} strokeWidth={1.75} className="shrink-0 text-fg-subtle" />}{item.label}{item.marcado && <Check size={14} strokeWidth={1.75} className="ml-auto shrink-0 text-accent-fg" aria-hidden />}</>
            return (
              <div key={i}>
                {item.separadorAntes && <div role="separator" className="my-1 h-px bg-line-subtle" />}
                {item.href ? (
                  <Link role="menuitem" href={item.href} ref={(el) => { itens.current[i] = el }} onClick={() => setAberto(false)} className={classeItem(item.perigo)}>{conteudo}</Link>
                ) : (
                  <button role={item.marcado === undefined ? "menuitem" : "menuitemradio"} aria-checked={item.marcado} type="button" ref={(el) => { itens.current[i] = el }} onClick={() => { setAberto(false); item.onSelect?.() }} className={classeItem(item.perigo)}>{conteudo}</button>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
