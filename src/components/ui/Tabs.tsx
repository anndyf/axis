'use client'

import { useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import { cn } from './cn'

export interface Aba {
  id: string
  label: ReactNode
  conteudo: ReactNode
  contador?: number
}

/** Abas com navegação por setas (padrão WAI-ARIA). Controladas ou não. */
export function Tabs({ abas, valor, onChange, className }: { abas: Aba[]; valor?: string; onChange?: (id: string) => void; className?: string }) {
  const [interno, setInterno] = useState(abas[0]?.id)
  const atual = valor ?? interno
  const base = useId()
  const refs = useRef<(HTMLButtonElement | null)[]>([])

  const escolher = (id: string) => {
    setInterno(id)
    onChange?.(id)
  }

  const tecla = (e: KeyboardEvent, i: number) => {
    const delta = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0
    if (!delta && e.key !== 'Home' && e.key !== 'End') return
    e.preventDefault()
    const n = e.key === 'Home' ? 0 : e.key === 'End' ? abas.length - 1 : (i + delta + abas.length) % abas.length
    refs.current[n]?.focus()
    escolher(abas[n].id)
  }

  return (
    <div className={className}>
      <div role="tablist" className="flex gap-1 overflow-x-auto border-b border-line">
        {abas.map((a, i) => {
          const ativa = a.id === atual
          return (
            <button
              key={a.id}
              ref={(el) => { refs.current[i] = el }}
              role="tab"
              type="button"
              id={`${base}-aba-${a.id}`}
              aria-selected={ativa}
              aria-controls={`${base}-painel-${a.id}`}
              tabIndex={ativa ? 0 : -1}
              onClick={() => escolher(a.id)}
              onKeyDown={(e) => tecla(e, i)}
              className={cn(
                '-mb-px inline-flex h-9 items-center gap-2 whitespace-nowrap border-b-2 px-3 text-sm transition-colors duration-150',
                ativa ? 'border-accent font-medium text-fg' : 'border-transparent text-fg-muted hover:text-fg'
              )}
            >
              {a.label}
              {a.contador !== undefined && <span className="rounded-full bg-subtle px-1.5 text-xs tabular-nums text-fg-muted">{a.contador}</span>}
            </button>
          )
        })}
      </div>
      {abas.map((a) => (
        <div key={a.id} role="tabpanel" id={`${base}-painel-${a.id}`} aria-labelledby={`${base}-aba-${a.id}`} hidden={a.id !== atual} className="pt-4">
          {a.id === atual && a.conteudo}
        </div>
      ))}
    </div>
  )
}
