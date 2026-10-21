import Link from "next/link"
import type { ReactNode } from "react"
import { ArrowLeft } from "lucide-react"
import { Alert } from "@/components/ui"

/**
 * Página institucional simples (termos, privacidade): leitura longa em
 * coluna limitada, sem o menu do sistema. `provisorio` mostra o aviso de
 * texto provisório.
 */
export default function PaginaInstitucional({ titulo, atualizadoEm, provisorio, children }: { titulo: string; atualizadoEm?: string; provisorio?: boolean; children: ReactNode }) {
  return (
    <div className="min-h-screen bg-canvas px-4 py-8 md:py-12">
      <article className="mx-auto max-w-leitura space-y-5">
        <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-13 text-fg-muted hover:text-fg">
          <ArrowLeft size={14} strokeWidth={1.75} aria-hidden /> Voltar ao sistema
        </Link>
        <header className="space-y-1">
          <h1 className="text-xl font-semibold tracking-tight text-fg">{titulo}</h1>
          {atualizadoEm && <p className="text-13 text-fg-subtle">Atualizado em {atualizadoEm}</p>}
        </header>
        {provisorio && (
          <Alert tone="warning" title="Texto provisório">
            Este texto é um rascunho e ainda será revisado juridicamente. Não substitui o documento oficial.
          </Alert>
        )}
        <div className="space-y-4 rounded-painel border border-line bg-surface p-5 text-sm leading-relaxed text-fg [&_h2]:pt-2 [&_h2]:text-[15px] [&_h2]:font-semibold [&_li]:ml-5 [&_li]:list-disc [&_ul]:space-y-1">
          {children}
        </div>
      </article>
    </div>
  )
}
