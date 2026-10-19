"use client"

import Link from "next/link"
import { MoreHorizontal } from "lucide-react"
import type { ItemNavegacao } from "@/lib/services/navegacao-mobile"
import { cn } from "@/components/ui/cn"

/** Altura da barra (sem a área segura): o conteúdo e as barras fixas de ação somam isto. */
export const ALTURA_BARRA = "4rem"

const ITEM = "relative flex min-h-11 w-full flex-col items-center justify-center gap-1 px-1 text-[11px] font-medium leading-none transition-colors duration-150"

/**
 * Barra de navegação inferior do celular (some a partir de md): ícone +
 * rótulo curto, item ativo na cor de destaque, "Mais" sempre por último.
 * Respeita a área segura do aparelho (env(safe-area-inset-bottom)).
 * Itens com `onClick` são abas da mesma tela (portal); os demais são links.
 */
export default function BarraInferior({ itens, ativo, maisAberto, onMais, onItem }: {
  itens: ItemNavegacao[]
  ativo: string | null
  maisAberto: boolean
  onMais: () => void
  /** troca de aba sem navegar (portal) */
  onItem?: (id: string) => void
}) {
  return (
    <nav data-barra-inferior aria-label="Navegação principal" className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur supports-[backdrop-filter]:bg-surface/85 md:hidden print:hidden">
      <ul className="mx-auto flex h-16 max-w-lg items-stretch px-1">
        {itens.map(({ id, rotulo, href, icone: Icone }) => {
          const atual = id === ativo && !maisAberto
          const conteudo = (
            <>
              <span className={cn("flex h-7 w-12 items-center justify-center rounded-full transition-colors duration-150", atual && "bg-accent-subtle")}>
                <Icone size={20} strokeWidth={atual ? 2 : 1.75} aria-hidden />
              </span>
              <span className="max-w-full truncate">{rotulo}</span>
            </>
          )
          const classe = cn(ITEM, atual ? "text-accent-fg" : "text-fg-subtle hover:text-fg")
          return (
            <li key={id} className="flex min-w-0 flex-1">
              {onItem ? (
                <button type="button" onClick={() => onItem(id)} aria-current={atual ? "page" : undefined} className={classe}>{conteudo}</button>
              ) : (
                <Link href={href} aria-current={atual ? "page" : undefined} className={classe}>{conteudo}</Link>
              )}
            </li>
          )
        })}
        <li className="flex min-w-0 flex-1">
          <button type="button" onClick={onMais} aria-haspopup="dialog" aria-expanded={maisAberto} className={cn(ITEM, maisAberto ? "text-accent-fg" : "text-fg-subtle hover:text-fg")}>
            <span className={cn("flex h-7 w-12 items-center justify-center rounded-full", maisAberto && "bg-accent-subtle")}>
              <MoreHorizontal size={20} strokeWidth={1.75} aria-hidden />
            </span>
            <span>Mais</span>
          </button>
        </li>
      </ul>
    </nav>
  )
}
