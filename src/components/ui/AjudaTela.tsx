'use client'

import { useState } from 'react'
import { usePathname } from 'next/navigation'
import { HelpCircle } from 'lucide-react'
import { ajudaDaRota } from '@/lib/produto/ajuda'
import { BottomSheet } from './BottomSheet'

/**
 * Botão "?" da tela: abre um painel curto com para que a tela serve e os
 * passos principais. Some nas telas sem texto de ajuda.
 */
export function AjudaTela({ className }: { className?: string }) {
  const pathname = usePathname()
  const ajuda = ajudaDaRota(pathname)
  const [aberta, setAberta] = useState(false)
  if (!ajuda) return null
  return (
    <>
      <button
        type="button"
        onClick={() => setAberta(true)}
        aria-label={`Ajuda: ${ajuda.titulo}`}
        title="Ajuda desta tela"
        className={className ?? 'flex size-7 shrink-0 items-center justify-center rounded-full text-fg-subtle transition-colors duration-150 hover:bg-subtle hover:text-fg print:hidden'}
      >
        <HelpCircle size={16} strokeWidth={1.75} />
      </button>
      <BottomSheet open={aberta} onClose={() => setAberta(false)} title={`Ajuda: ${ajuda.titulo}`} description={ajuda.serve}>
        <ol className="space-y-2 text-sm text-fg">
          {ajuda.passos.map((p, i) => (
            <li key={i} className="flex gap-2.5">
              <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-accent-subtle text-xs font-medium text-accent-fg">{i + 1}</span>
              <span>{p}</span>
            </li>
          ))}
        </ol>
      </BottomSheet>
    </>
  )
}
