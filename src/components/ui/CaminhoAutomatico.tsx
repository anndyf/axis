'use client'

import { usePathname } from 'next/navigation'
import { migalhasDaRota } from '@/lib/navegacao-migalhas'
import { Breadcrumb } from './PageHeader'

/** Caminho da tela derivado da rota (Início › módulo › subpágina). */
export function CaminhoAutomatico({ className }: { className?: string }) {
  const migalhas = migalhasDaRota(usePathname())
  if (migalhas.length < 2) return null
  return <Breadcrumb items={migalhas} className={className} />
}
