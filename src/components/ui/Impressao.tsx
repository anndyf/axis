'use client'

import { useEffect, useState } from 'react'
import { Printer } from 'lucide-react'
import { Button } from './Button'
import { ICONE } from './cn'

/**
 * Botão "Imprimir" das telas com folha de impressão própria. Marca a página
 * com data-folha-impressao: só nessas telas a folha do sistema vale
 * (globals.css: sem menu, sem fundo, cabeçalho com escola e data/hora e
 * paginação). Ctrl+P na mesma tela dá o mesmo resultado.
 */
export function BotaoImprimir({ rotulo = 'Imprimir' }: { rotulo?: string }) {
  return (
    <Button type="button" variant="secondary" size="sm" data-folha-impressao onClick={() => window.print()} className="print:hidden">
      <Printer {...ICONE} aria-hidden /> {rotulo}
    </Button>
  )
}

function agora() {
  const d = new Date()
  const data = d.toLocaleDateString('pt-BR')
  const hora = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  return `${data} às ${hora}`
}

/**
 * Cabeçalho que só aparece no papel (telas com BotaoImprimir): nome da
 * escola e data/hora da impressão, atualizada no momento de imprimir. Abre
 * as seções recolhidas (<details>) para o papel e as fecha de novo depois.
 */
export function CabecalhoImpressao({ escola }: { escola: string }) {
  const [quando, setQuando] = useState('')
  useEffect(() => {
    let abertas: HTMLDetailsElement[] = []
    const antes = () => {
      setQuando(agora())
      if (!document.querySelector('[data-folha-impressao]')) return
      abertas = [...document.querySelectorAll('main details:not([open])')] as HTMLDetailsElement[]
      abertas.forEach((d) => { d.open = true })
    }
    const depois = () => {
      abertas.forEach((d) => { d.open = false })
      abertas = []
    }
    setQuando(agora())
    window.addEventListener('beforeprint', antes)
    window.addEventListener('afterprint', depois)
    return () => {
      window.removeEventListener('beforeprint', antes)
      window.removeEventListener('afterprint', depois)
    }
  }, [])
  return (
    <div data-cabecalho-impressao aria-hidden className="hidden">
      <span className="font-semibold">{escola}</span>
      <span>Impresso em {quando}</span>
    </div>
  )
}
