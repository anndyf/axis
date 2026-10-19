"use client"

import Link from "next/link"
import { useEffect, useRef, useState } from "react"
import { Check, ChevronLeft, ChevronRight, Plus, X } from "lucide-react"
import { ESTADOS_COM_CHAMADA, ROTULO_ESTADO, mesesDoCalendario, type DiaDoCalendario, type EstadoDia } from "@/lib/services/calendario-disciplina"
import { cn } from "@/components/ui/cn"

const MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"]
const SEMANA = ["D", "S", "T", "Q", "Q", "S", "S"]
const SEMANA_LONGA = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"]

// Cor + marca (ícone, traço ou borda) para não depender só da cor
const CELULA: Record<EstadoDia, string> = {
  feita: "bg-success-subtle text-success-fg font-medium",
  pendente: "bg-warning-subtle text-warning-fg font-semibold",
  futura: "border border-dashed border-line-strong text-fg-muted",
  "nao-letivo": "bg-subtle text-fg-subtle line-through",
  cancelada: "bg-subtle text-fg-muted",
  "sem-aula": "text-fg-disabled",
}

function Marca({ estado, extra }: { estado: EstadoDia; extra: boolean }) {
  const cls = "absolute bottom-0.5 left-1/2 -translate-x-1/2"
  if (estado === "feita") return <Check size={9} strokeWidth={3} aria-hidden className={cls} />
  if (estado === "pendente") return <span aria-hidden className={cn(cls, "bottom-1 size-1 rounded-full bg-warning-fg")} />
  if (estado === "cancelada") return <X size={9} strokeWidth={3} aria-hidden className={cls} />
  if (extra) return <Plus size={9} strokeWidth={3} aria-hidden className={cls} />
  return null
}

const descreverDia = (d: DiaDoCalendario) => {
  const [ano, mes, dia] = d.data.split("-").map(Number)
  const semana = SEMANA_LONGA[new Date(Date.UTC(ano, mes - 1, dia)).getUTCDay()]
  return `${semana}, ${dia} de ${MESES[mes - 1]}: ${ROTULO_ESTADO[d.estado]}${d.extra ? " (dia letivo extra)" : ""}${d.descricao ? ` — ${d.descricao}` : ""}`
}

function Mes({ mes, linkBase, selecionada, hoje, compacto }: { mes: ReturnType<typeof mesesDoCalendario>[number]; linkBase: string; selecionada?: string; hoje: string; compacto?: boolean }) {
  return (
    <table className="w-full table-fixed border-separate border-spacing-1 text-center">
      <caption className="sr-only">{MESES[mes.mes - 1]} de {mes.ano}</caption>
      <thead>
        <tr>{SEMANA.map((d, i) => <th key={i} scope="col" className="text-[11px] font-medium text-fg-subtle"><abbr title={SEMANA_LONGA[i]} className="no-underline">{d}</abbr></th>)}</tr>
      </thead>
      <tbody>
        {mes.semanas.map((semana, i) => (
          <tr key={i}>
            {semana.map((d, j) => {
              if (!d) return <td key={j} />
              const numero = Number(d.data.slice(8))
              const sel = d.data === selecionada
              const classe = cn(
                "relative mx-auto flex items-center justify-center rounded-lg tabular-nums",
                compacto ? "h-8 w-full text-xs" : "h-11 w-full text-sm",
                sel ? "bg-accent font-semibold text-on-accent" : CELULA[d.estado],
                d.extra && !sel && "ring-2 ring-inset ring-accent",
                d.data === hoje && !sel && "underline decoration-2 underline-offset-2"
              )
              const conteudo = <>{numero}{!sel && <Marca estado={d.estado} extra={d.extra} />}</>
              return (
                <td key={j} className="p-0">
                  {ESTADOS_COM_CHAMADA.includes(d.estado) ? (
                    <Link href={`${linkBase}${d.data}`} aria-label={descreverDia(d)} title={descreverDia(d)} aria-current={sel ? "date" : undefined} className={cn(classe, "transition-opacity duration-150 hover:opacity-80")}>{conteudo}</Link>
                  ) : (
                    <span aria-label={descreverDia(d)} title={descreverDia(d)} className={classe}>{conteudo}</span>
                  )}
                </td>
              )
            })}
          </tr>
        ))}
      </tbody>
    </table>
  )
}

export function LegendaCalendario({ className }: { className?: string }) {
  const itens: { rotulo: string; amostra: React.ReactNode }[] = [
    { rotulo: ROTULO_ESTADO.feita, amostra: <span className={cn("relative flex size-5 items-center justify-center rounded", CELULA.feita)}><Check size={9} strokeWidth={3} aria-hidden /></span> },
    { rotulo: ROTULO_ESTADO.pendente, amostra: <span className={cn("relative flex size-5 items-center justify-center rounded", CELULA.pendente)}><span aria-hidden className="size-1 rounded-full bg-warning-fg" /></span> },
    { rotulo: ROTULO_ESTADO.futura, amostra: <span className={cn("block size-5 rounded", CELULA.futura)} /> },
    { rotulo: ROTULO_ESTADO["nao-letivo"], amostra: <span className={cn("flex size-5 items-center justify-center rounded text-[10px]", CELULA["nao-letivo"])}>12</span> },
    { rotulo: "Dia letivo extra", amostra: <span className="flex size-5 items-center justify-center rounded text-accent-fg ring-2 ring-inset ring-accent"><Plus size={9} strokeWidth={3} aria-hidden /></span> },
    { rotulo: ROTULO_ESTADO.cancelada, amostra: <span className={cn("flex size-5 items-center justify-center rounded", CELULA.cancelada)}><X size={9} strokeWidth={3} aria-hidden /></span> },
    { rotulo: ROTULO_ESTADO["sem-aula"], amostra: <span className="flex size-5 items-center justify-center rounded text-[10px] text-fg-disabled">12</span> },
  ]
  return (
    <ul aria-label="Legenda do calendário" className={cn("grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs text-fg-muted", className)}>
      {itens.map((i) => <li key={i.rotulo} className="flex items-center gap-2">{i.amostra}<span>{i.rotulo}</span></li>)}
    </ul>
  )
}

/**
 * Calendário do ano letivo da disciplina com legenda. `modo="coluna"`: meses
 * empilhados (coluna à esquerda no desktop, como no SIGEduc). `modo="mes"`:
 * um mês por vez com setas (celular). Tocar num dia com aula já passado abre
 * a chamada daquela data.
 */
export default function CalendarioDisciplina({ dias, linkBase, selecionada, hoje, modo, className }: {
  dias: DiaDoCalendario[]
  /** link da chamada sem a data: "...&data=" (o dia é somado no fim) */
  linkBase: string
  selecionada?: string
  hoje: string
  modo: "coluna" | "mes"
  className?: string
}) {
  const meses = mesesDoCalendario(dias)
  const alvo = (selecionada ?? hoje).slice(0, 7)
  // Mês da data escolhida (ou de hoje); depois do fim do ano, o último mês
  const [indice, setIndice] = useState(() => {
    const i = meses.findIndex((m) => m.chave === alvo)
    return i >= 0 ? i : meses.length && alvo > meses[meses.length - 1].chave ? meses.length - 1 : 0
  })

  // Coluna: a área que rola (o aside) já abre no mês da data escolhida/hoje, sem rolar a página
  const coluna = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (modo !== "coluna") return
    const el = coluna.current?.querySelector<HTMLElement>(`[data-mes="${alvo}"]`)
    const area = coluna.current?.parentElement
    // o aside é sticky (posicionado): offsetTop do mês já é relativo a ele
    if (el && area) area.scrollTop = el.offsetTop - 8
  }, [modo, alvo])

  if (meses.length === 0) return null

  if (modo === "coluna") {
    return (
      <div ref={coluna} className={cn("space-y-4", className)}>
        <LegendaCalendario />
        {meses.map((m) => (
          <section key={m.chave} data-mes={m.chave} aria-label={`${MESES[m.mes - 1]} de ${m.ano}`}>
            <h3 className="mb-1 px-1 text-13 font-semibold capitalize text-fg">{MESES[m.mes - 1]} {m.ano}</h3>
            <Mes mes={m} linkBase={linkBase} selecionada={selecionada} hoje={hoje} compacto />
          </section>
        ))}
      </div>
    )
  }

  const mes = meses[Math.min(indice, meses.length - 1)]
  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center gap-2">
        <button type="button" onClick={() => setIndice((i) => Math.max(0, i - 1))} disabled={indice === 0} aria-label="Mês anterior" className="flex size-11 items-center justify-center rounded-full text-fg-muted hover:bg-subtle disabled:opacity-30">
          <ChevronLeft size={20} strokeWidth={1.75} />
        </button>
        <h3 className="flex-1 text-center text-sm font-semibold capitalize text-fg" aria-live="polite">{MESES[mes.mes - 1]} {mes.ano}</h3>
        <button type="button" onClick={() => setIndice((i) => Math.min(meses.length - 1, i + 1))} disabled={indice >= meses.length - 1} aria-label="Próximo mês" className="flex size-11 items-center justify-center rounded-full text-fg-muted hover:bg-subtle disabled:opacity-30">
          <ChevronRight size={20} strokeWidth={1.75} />
        </button>
      </div>
      <Mes mes={mes} linkBase={linkBase} selecionada={selecionada} hoje={hoje} />
      <LegendaCalendario className="border-t border-line-subtle pt-3" />
    </div>
  )
}
