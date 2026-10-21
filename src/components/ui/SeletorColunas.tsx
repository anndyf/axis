'use client'

import { useCallback, useEffect, useState } from 'react'
import { Columns3 } from 'lucide-react'
import { cn } from './cn'

export interface ColunaOpcional {
  id: string
  rotulo: string
}

const chaveLocal = (chave: string) => `axis_colunas_${chave}`

/**
 * Colunas visíveis de uma tabela, guardadas no navegador (por tela). As
 * colunas essenciais (nome, ações) não entram aqui e ficam sempre.
 */
export function useColunasVisiveis(chave: string, opcionais: ColunaOpcional[], ocultasPorPadrao: string[] = []) {
  const [ocultas, setOcultas] = useState<string[]>(ocultasPorPadrao)
  useEffect(() => {
    try {
      const salvo = localStorage.getItem(chaveLocal(chave))
      if (salvo) setOcultas(JSON.parse(salvo))
    } catch { /* navegador sem armazenamento: fica o padrão */ }
  }, [chave])
  const alternar = useCallback((id: string) => {
    setOcultas((atual) => {
      const prox = atual.includes(id) ? atual.filter((x) => x !== id) : [...atual, id]
      try { localStorage.setItem(chaveLocal(chave), JSON.stringify(prox)) } catch { /* idem */ }
      return prox
    })
  }, [chave])
  const visivel = useCallback((id: string) => !ocultas.includes(id), [ocultas])
  return { visivel, alternar, opcionais }
}

/** Botão "Colunas" com a lista de colunas opcionais (desktop). */
export function SeletorColunas({ opcionais, visivel, alternar, className }: {
  opcionais: ColunaOpcional[]
  visivel: (id: string) => boolean
  alternar: (id: string) => void
  className?: string
}) {
  return (
    <details className={cn('relative max-md:hidden [&[open]>summary]:bg-subtle', className)}>
      <summary className="inline-flex h-7 cursor-pointer list-none items-center gap-1.5 rounded-control border border-line bg-surface px-2.5 text-xs font-medium text-fg hover:bg-subtle [&::-webkit-details-marker]:hidden">
        <Columns3 size={14} strokeWidth={1.75} aria-hidden /> Colunas
      </summary>
      <div className="absolute right-0 z-30 mt-1 w-56 rounded-painel border border-line bg-elevated p-1 shadow-overlay" role="group" aria-label="Colunas visíveis">
        {opcionais.map((c) => (
          <label key={c.id} className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-13 text-fg hover:bg-subtle">
            <input type="checkbox" className="size-4 accent-[var(--accent)]" checked={visivel(c.id)} onChange={() => alternar(c.id)} />
            {c.rotulo}
          </label>
        ))}
      </div>
    </details>
  )
}
