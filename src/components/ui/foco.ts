'use client'

import { useEffect, useRef, type RefObject } from 'react'

export const FOCAVEIS = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

/**
 * Camada modal (Dialog, BottomSheet): foco preso dentro, Esc fecha, rolagem
 * da página travada e foco de volta em quem abriu.
 */
export function useFocoPreso(painel: RefObject<HTMLElement | null>, aberto: boolean, onClose: () => void) {
  // onClose numa ref: um onClose novo a cada render não reabre o efeito (o foco não pula)
  const fechar = useRef(onClose)
  useEffect(() => { fechar.current = onClose }, [onClose])
  useEffect(() => {
    if (!aberto) return
    const anterior = document.activeElement as HTMLElement | null
    const el = painel.current
    const primeiro = el?.querySelector<HTMLElement>('[data-autofocus]') ?? el?.querySelector<HTMLElement>(FOCAVEIS)
    ;(primeiro ?? el)?.focus()
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const tecla = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        fechar.current()
        return
      }
      if (e.key !== 'Tab' || !el) return
      const itens = Array.from(el.querySelectorAll<HTMLElement>(FOCAVEIS)).filter((x) => x.offsetParent !== null)
      if (itens.length === 0) {
        e.preventDefault()
        return
      }
      const [ini, fim] = [itens[0], itens[itens.length - 1]]
      if (e.shiftKey && document.activeElement === ini) {
        e.preventDefault()
        fim.focus()
      } else if (!e.shiftKey && document.activeElement === fim) {
        e.preventDefault()
        ini.focus()
      }
    }
    document.addEventListener('keydown', tecla)
    return () => {
      document.removeEventListener('keydown', tecla)
      document.body.style.overflow = overflow
      anterior?.focus?.()
    }
  }, [painel, aberto])
}
