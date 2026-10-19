import Link from "next/link"
import type { ReactNode } from "react"
import type { LucideIcon } from "lucide-react"
import { ChevronRight } from "lucide-react"
import { cn } from "@/components/ui/cn"

/**
 * Peças do painel inicial por perfil (modelo A "Institucional"): cartões
 * brancos com raio de 16px, indicadores com ícone em círculo suave e número
 * grande, listas de atividade e cartões com barra de progresso.
 */

export type Tom = "accent" | "success" | "warning" | "danger" | "violet" | "neutro"

export const TOM: Record<Tom, string> = {
  accent: "bg-accent-subtle text-accent-fg",
  success: "bg-success-subtle text-success-fg",
  warning: "bg-warning-subtle text-warning-fg",
  danger: "bg-danger-subtle text-danger-fg",
  violet: "bg-violet-subtle text-violet-fg",
  neutro: "bg-subtle text-fg-muted",
}

const CARTAO = "rounded-2xl border border-line bg-surface shadow-card"

export function Cartao({ children, className, as: Tag = "div", id }: { children: ReactNode; className?: string; as?: "div" | "section" | "ul"; id?: string }) {
  return <Tag id={id} className={cn(CARTAO, "min-w-0", className)}>{children}</Tag>
}

export function Indicador({ icone: Icone, tom, valor, rotulo, detalhe, href }: { icone: LucideIcon; tom: Tom; valor: ReactNode; rotulo: string; detalhe?: string; href?: string }) {
  const corpo = (
    <>
      <span className={cn("flex size-10 items-center justify-center rounded-full", TOM[tom])}>
        <Icone size={18} strokeWidth={1.75} aria-hidden />
      </span>
      <p className="mt-4 truncate text-2xl font-semibold tracking-tight text-fg tabular-nums sm:text-3xl">{valor}</p>
      <p className="mt-0.5 text-sm text-fg-muted">{rotulo}</p>
      {detalhe && <p className="mt-1 truncate text-xs text-fg-subtle">{detalhe}</p>}
    </>
  )
  const classe = cn(CARTAO, "block min-w-0 p-4 sm:p-5")
  return href ? (
    <Link href={href} className={cn(classe, "transition-colors duration-150 hover:border-accent")}>{corpo}</Link>
  ) : (
    <div className={classe}>{corpo}</div>
  )
}

export function Secao({ titulo, descricao, acao, children, id }: { titulo: string; descricao?: string; acao?: { rotulo: string; href: string }; children: ReactNode; id?: string }) {
  return (
    <section id={id} className="min-w-0 scroll-mt-24 space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-1">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold text-fg">{titulo}</h2>
          {descricao && <p className="text-sm text-fg-subtle">{descricao}</p>}
        </div>
        {acao && (
          <Link href={acao.href} className="shrink-0 rounded-full border border-line bg-surface px-3 py-1 text-13 font-medium text-accent-fg hover:border-accent">
            {acao.rotulo}
          </Link>
        )}
      </div>
      {children}
    </section>
  )
}

/** Linha de lista: ícone, título, subtítulo e algo à direita (horário, contagem, botão). */
export function Item({ icone: Icone, tom = "neutro", titulo, subtitulo, direita, href, extra }: { icone: LucideIcon; tom?: Tom; titulo: string; subtitulo?: string; direita?: ReactNode; href?: string; extra?: ReactNode }) {
  const corpo = (
    <>
      <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-full", TOM[tom])}>
        <Icone size={16} strokeWidth={1.75} aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium text-fg">{titulo}</span>
        {subtitulo && <span className="block truncate text-13 text-fg-subtle">{subtitulo}</span>}
        {extra}
      </span>
      {direita && <span className="shrink-0 text-right text-xs text-fg-subtle tabular-nums">{direita}</span>}
    </>
  )
  return (
    <li className="border-b border-line-subtle last:border-0">
      {href ? (
        <Link href={href} className="flex min-w-0 items-center gap-3 px-4 py-3 transition-colors duration-150 hover:bg-subtle sm:px-5">{corpo}</Link>
      ) : (
        <div className="flex min-w-0 items-center gap-3 px-4 py-3 sm:px-5">{corpo}</div>
      )}
    </li>
  )
}

export function Lista({ children, vazio }: { children: ReactNode[]; vazio: string }) {
  return (
    <Cartao className="overflow-hidden">
      {children.length ? <ul>{children}</ul> : <p className="px-5 py-8 text-center text-sm text-fg-subtle">{vazio}</p>}
    </Cartao>
  )
}

/** Cartão de disciplina ou turma: código em mono, título, barra de progresso, rodapé com contagem e seta. */
export function CartaoProgresso({ codigo, detalheCodigo, titulo, rotulo, percentual, rodape, href, alerta }: {
  codigo: string; detalheCodigo?: string; titulo: string; rotulo: string; percentual: number | null; rodape: string; href: string; alerta?: { valor: number; rotulo: string }
}) {
  const p = percentual === null ? null : Math.max(0, Math.min(100, percentual))
  return (
    <Link href={href} className={cn(CARTAO, "group relative block min-w-0 p-5 transition-colors duration-150 hover:border-accent")}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-mono text-xs text-fg-subtle">
            {codigo}{detalheCodigo && <span className="font-sans"> · {detalheCodigo}</span>}
          </p>
          <p className="mt-1 truncate font-semibold text-fg">{titulo}</p>
        </div>
        {alerta && alerta.valor > 0 && (
          <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums", TOM.danger)} title={alerta.rotulo}>
            {alerta.valor}<span className="sr-only"> {alerta.rotulo}</span>
          </span>
        )}
      </div>
      <div className="mt-4 flex items-baseline justify-between gap-3 text-13">
        <span className="truncate text-fg-muted">{rotulo}</span>
        <span className="shrink-0 font-semibold text-fg tabular-nums">{p === null ? "—" : `${Math.round(p)}%`}</span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-subtle" role="progressbar" aria-label={rotulo} aria-valuemin={0} aria-valuemax={100} aria-valuenow={p ?? undefined}>
        <div className="h-full rounded-full bg-accent" style={{ width: `${p ?? 0}%` }} />
      </div>
      <div className="mt-4 flex items-center justify-between gap-3 border-t border-line-subtle pt-3 text-13 text-fg-subtle">
        <span className="truncate">{rodape}</span>
        <ChevronRight size={16} strokeWidth={1.75} className="shrink-0 transition-transform duration-150 group-hover:translate-x-0.5" aria-hidden />
      </div>
    </Link>
  )
}

/** Grade de cartões que se ajusta à largura (sem largura fixa). */
export function GradeCartoes({ children }: { children: ReactNode }) {
  return <div className="grid gap-4 grid-cols-[repeat(auto-fill,minmax(min(100%,18rem),1fr))]">{children}</div>
}

export function Chip({ children, ativo, href, tom }: { children: ReactNode; ativo?: boolean; href?: string; tom?: Tom }) {
  const classe = cn(
    "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-13 font-medium transition-colors duration-150",
    ativo ? "bg-accent text-on-accent" : tom ? TOM[tom] : "border border-line bg-surface text-fg-muted hover:text-fg"
  )
  return href ? <Link href={href} aria-current={ativo ? "page" : undefined} className={classe}>{children}</Link> : <span className={classe}>{children}</span>
}

export function Atalhos({ itens }: { itens: { rotulo: string; href: string; icone: LucideIcon }[] }) {
  if (!itens.length) return null
  return (
    <div className="grid gap-3 grid-cols-[repeat(auto-fill,minmax(min(100%,15rem),1fr))]">
      {itens.map((a) => (
        <Link key={a.href + a.rotulo} href={a.href} className={cn(CARTAO, "group flex min-w-0 items-center gap-3 p-3 pr-4 transition-colors duration-150 hover:border-accent")}>
          <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-full", TOM.accent)}>
            <a.icone size={16} strokeWidth={1.75} aria-hidden />
          </span>
          <span className="min-w-0 flex-1 truncate text-sm font-medium text-fg">{a.rotulo}</span>
          <ChevronRight size={16} strokeWidth={1.75} className="shrink-0 text-fg-subtle" aria-hidden />
        </Link>
      ))}
    </div>
  )
}

export function Aviso({ children }: { children: ReactNode }) {
  return <p className={cn("rounded-xl px-4 py-3 text-sm", TOM.accent)}>{children}</p>
}

/** "12 out". Texto "AAAA-MM-DD" é data pura (UTC); Date é instante, no fuso da escola. */
export const dataCurta = (d: Date | string) =>
  (typeof d === "string" ? new Date(`${d}T12:00:00Z`) : d)
    .toLocaleDateString("pt-BR", { day: "2-digit", month: "short", timeZone: typeof d === "string" ? "UTC" : "America/Sao_Paulo" })
    .replace(".", "")
