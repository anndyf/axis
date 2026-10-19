'use client'

import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react'
import { cn } from './cn'

type TipoToast = 'success' | 'error' | 'info'
interface ToastItem { id: number; tipo: TipoToast; texto: ReactNode }

const Contexto = createContext<((texto: ReactNode, tipo?: TipoToast) => void) | null>(null)

/** Avisos temporários no canto da tela (5s). Use `const toast = useToast()`. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [itens, setItens] = useState<ToastItem[]>([])
  const fechar = useCallback((id: number) => setItens((l) => l.filter((t) => t.id !== id)), [])
  const mostrar = useCallback((texto: ReactNode, tipo: TipoToast = 'success') => {
    const id = Date.now() + Math.random()
    setItens((l) => [...l.slice(-3), { id, tipo, texto }])
    setTimeout(() => fechar(id), 5000)
  }, [fechar])

  return (
    <Contexto.Provider value={mostrar}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-[calc(var(--barra-inferior)+1rem)] z-[110] flex flex-col items-center gap-2 px-4 sm:inset-x-auto sm:right-4 sm:items-end">
        {itens.map((t) => {
          const Icone = t.tipo === 'success' ? CheckCircle2 : t.tipo === 'error' ? AlertCircle : Info
          return (
            <div key={t.id} role={t.tipo === 'error' ? 'alert' : 'status'} className="pointer-events-auto flex w-full max-w-sm items-start gap-2.5 rounded-lg border border-line bg-elevated px-3.5 py-3 text-13 text-fg shadow-overlay animate-slide-up">
              <Icone size={16} strokeWidth={1.75} className={cn('mt-px shrink-0', t.tipo === 'success' ? 'text-success' : t.tipo === 'error' ? 'text-danger' : 'text-info')} />
              <div className="min-w-0 flex-1">{t.texto}</div>
              <button type="button" aria-label="Fechar aviso" onClick={() => fechar(t.id)} className="-mr-1 rounded p-0.5 text-fg-subtle hover:text-fg"><X size={14} strokeWidth={1.75} /></button>
            </div>
          )
        })}
      </div>
    </Contexto.Provider>
  )
}

export function useToast() {
  const ctx = useContext(Contexto)
  return ctx ?? ((texto: ReactNode) => { if (typeof window !== 'undefined') console.warn('ToastProvider ausente:', texto) })
}
