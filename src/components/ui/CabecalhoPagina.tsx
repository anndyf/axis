import type { ReactNode } from 'react'
import { Breadcrumb, type Migalha } from './PageHeader'
import { cn } from './cn'
import { CaminhoAutomatico } from './CaminhoAutomatico'

export interface DadoChave {
  rotulo: ReactNode
  valor: ReactNode
}

/**
 * Cabeçalho de tela de trabalho: caminho, título, dados-chave em linha
 * ("Turno Matutino · 32 estudantes · Ano letivo 2026") e ações à direita.
 * Sem `caminho`, o caminho vem da rota. `ajuda` recebe o botão "?" da
 * tela. Marca a página com
 * data-cabecalho-pagina: o caminho automático do layout se esconde quando a
 * tela traz o próprio cabeçalho.
 */
export function CabecalhoPagina({ titulo, descricao, caminho, dados, acoes, ajuda, abas, className }: {
  titulo: ReactNode
  descricao?: ReactNode
  caminho?: Migalha[]
  dados?: DadoChave[]
  acoes?: ReactNode
  ajuda?: ReactNode
  /** <Abas /> da ficha, logo abaixo do título */
  abas?: ReactNode
  className?: string
}) {
  return (
    <header data-cabecalho-pagina className={cn('mb-4 space-y-1.5 md:mb-5', className)}>
      {caminho ? <Breadcrumb items={caminho} className="hidden md:block" /> : <CaminhoAutomatico className="hidden md:block" />}
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-1.5">
            <h1 className="min-w-0 break-words text-xl font-semibold tracking-tight text-fg">{titulo}</h1>
            {ajuda}
          </div>
          {descricao && <p className="mt-0.5 max-w-3xl text-sm text-fg-muted">{descricao}</p>}
          {dados && dados.length > 0 && (
            <dl className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-13">
              {dados.map((d, i) => (
                <div key={i} className="flex items-baseline gap-1.5">
                  <dt className="text-fg-muted">{d.rotulo}</dt>
                  <dd className="font-medium tabular-nums text-fg">{d.valor}</dd>
                </div>
              ))}
            </dl>
          )}
        </div>
        {acoes && <div className="flex flex-wrap items-center gap-2">{acoes}</div>}
      </div>
      {abas && <div className="pt-2">{abas}</div>}
    </header>
  )
}
