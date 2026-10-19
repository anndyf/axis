"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { Plus, Trash2, Save, Loader2, CheckCircle2, AlertCircle, Pencil, X } from "lucide-react"
import { criarAvaliacao, editarAvaliacao, removerAvaliacao } from "./actions"
import { buttonClasses } from "@/components/ui"

interface Avaliacao { id: string; nome: string; data: string; notaMaxima: number; peso: number; temNotas: boolean }
interface Etapa { id: string; nome: string; formaCalculo: string; teto: number; avaliacoes: Avaliacao[] }

const card = "bg-white rounded-lg shadow-sm border border-zinc-200 p-6 space-y-3"
const input = "px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg outline-none text-sm text-fg-muted focus:bg-white focus:border-accent"
const botao = buttonClasses({ size: "sm" })
const num = (n: number) => String(Math.round(n * 100) / 100).replace(".", ",")
const dataBR = (iso: string) => iso.split("-").reverse().join("/")
const FORMA: Record<string, string> = {
  SOMA: "soma das avaliações", MEDIA_ARITMETICA: "média das avaliações", MEDIA_PONDERADA: "média ponderada (peso)",
  SOMA_COM_DIVISOR: "soma com divisor", MAIOR_NOTA: "maior nota",
}
const vazio = { nome: "", data: "", notaMaxima: "", peso: "1" }

export default function AvaliacoesClient({ disciplinaId, turmaId, etapas }: { disciplinaId: string; turmaId: string; etapas: Etapa[] }) {
  const [pendente, startTransition] = useTransition()
  const [aviso, setAviso] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null)
  const [novas, setNovas] = useState<Record<string, typeof vazio>>({})
  const [editando, setEditando] = useState<{ id: string; dados: typeof vazio } | null>(null)

  const executar = (acao: () => Promise<{ ok: true } | { erro: string }>, sucesso: string, depois?: () => void) =>
    startTransition(async () => {
      const r = await acao()
      setAviso("erro" in r ? { tipo: "erro", texto: r.erro } : { tipo: "ok", texto: sucesso })
      if (!("erro" in r)) depois?.()
    })

  return (
    <div className="space-y-6">
      <p className="text-sm text-fg-muted">
        Depois de criar as avaliações, lance as notas em <Link href={`/dashboard/notas/lancar/${turmaId}`} className="text-accent-fg hover:underline">Lançar notas</Link>: cada avaliação vira uma coluna da unidade.
      </p>
      {aviso && (
        <div className={`p-3 rounded-xl border text-sm flex items-center gap-2 ${aviso.tipo === "ok" ? "bg-success-subtle border-success-line text-success-fg" : "bg-danger-subtle border-danger-line text-danger-fg"}`}>
          {aviso.tipo === "ok" ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {aviso.texto}
        </div>
      )}

      {etapas.map((etapa) => {
        const nova = novas[etapa.id] ?? vazio
        const setNova = (campo: keyof typeof vazio, valor: string) => setNovas((p) => ({ ...p, [etapa.id]: { ...(p[etapa.id] ?? vazio), [campo]: valor } }))
        const soma = etapa.avaliacoes.reduce((s, a) => s + a.notaMaxima, 0)
        const ehSoma = etapa.formaCalculo === "SOMA"
        return (
          <section key={etapa.id} className={card}>
            <div className="flex flex-wrap items-baseline gap-2">
              <h2 className="font-medium text-fg flex-1">{etapa.nome}</h2>
              <span className="text-xs text-fg-subtle">
                Nota da unidade: {FORMA[etapa.formaCalculo] ?? etapa.formaCalculo} · máximo {num(etapa.teto)}
                {ehSoma && <> · <strong className={soma > etapa.teto ? "text-danger-fg" : "text-fg-muted"}>{num(soma)}</strong> distribuídos</>}
              </span>
            </div>

            {etapa.avaliacoes.length === 0 && <p className="text-sm text-fg-subtle">Nenhuma avaliação nesta unidade ainda.</p>}
            <div className="divide-y divide-zinc-100">
              {etapa.avaliacoes.map((a) => editando?.id === a.id ? (
                <div key={a.id} className="flex flex-wrap items-end gap-2 py-2">
                  <input aria-label="Nome" value={editando.dados.nome} onChange={(e) => setEditando({ ...editando, dados: { ...editando.dados, nome: e.target.value } })} className={`${input} flex-1 min-w-[10rem]`} />
                  <input aria-label="Data" type="date" value={editando.dados.data} onChange={(e) => setEditando({ ...editando, dados: { ...editando.dados, data: e.target.value } })} className={input} />
                  <input aria-label="Vale" value={editando.dados.notaMaxima} disabled={a.temNotas} onChange={(e) => setEditando({ ...editando, dados: { ...editando.dados, notaMaxima: e.target.value } })} className={`${input} w-20`} />
                  <input aria-label="Peso" value={editando.dados.peso} disabled={a.temNotas} onChange={(e) => setEditando({ ...editando, dados: { ...editando.dados, peso: e.target.value } })} className={`${input} w-16`} />
                  <button disabled={pendente} className={botao} onClick={() => executar(() => editarAvaliacao(a.id, editando.dados), "Avaliação atualizada.", () => setEditando(null))}><Save className="w-4 h-4" /> Salvar</button>
                  <button aria-label="Cancelar" onClick={() => setEditando(null)} className="p-2 rounded-lg hover:bg-zinc-100"><X className="w-4 h-4" /></button>
                </div>
              ) : (
                <div key={a.id} className="flex flex-wrap items-center gap-3 py-2">
                  <div className="flex-1 min-w-[10rem]">
                    <p className="text-sm text-fg">{a.nome}</p>
                    <p className="text-xs text-fg-subtle">
                      vale {num(a.notaMaxima)}{etapa.formaCalculo === "MEDIA_PONDERADA" && ` · peso ${num(a.peso)}`}{a.data && ` · ${dataBR(a.data)}`}{a.temNotas && " · com notas lançadas"}
                    </p>
                  </div>
                  <button aria-label="Editar" onClick={() => setEditando({ id: a.id, dados: { nome: a.nome, data: a.data, notaMaxima: String(a.notaMaxima), peso: String(a.peso) } })} className="p-2 rounded-lg hover:bg-zinc-100 text-fg-subtle"><Pencil className="w-4 h-4" /></button>
                  <button aria-label="Remover" disabled={pendente || a.temNotas} title={a.temNotas ? "Já há notas lançadas" : undefined} onClick={() => {
                    if (window.confirm(`Remover "${a.nome}"?`)) executar(() => removerAvaliacao(a.id), "Avaliação removida.")
                  }} className="p-2 rounded-lg hover:bg-danger-subtle text-fg-subtle hover:text-danger-fg disabled:opacity-30"><Trash2 className="w-4 h-4" /></button>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap items-end gap-2 pt-2 border-t border-zinc-100">
              <label className="text-xs text-fg-subtle space-y-1 flex-1 min-w-[10rem]"><span className="block">Nova avaliação</span>
                <input value={nova.nome} onChange={(e) => setNova("nome", e.target.value)} className={`${input} w-full`} placeholder="Ex.: Prova 1, Seminário" />
              </label>
              <label className="text-xs text-fg-subtle space-y-1"><span className="block">Data</span>
                <input type="date" value={nova.data} onChange={(e) => setNova("data", e.target.value)} className={input} />
              </label>
              <label className="text-xs text-fg-subtle space-y-1"><span className="block">Vale</span>
                <input value={nova.notaMaxima} onChange={(e) => setNova("notaMaxima", e.target.value)} className={`${input} w-20`} inputMode="decimal" placeholder={num(Math.max(0, ehSoma ? etapa.teto - soma : etapa.teto))} />
              </label>
              {etapa.formaCalculo === "MEDIA_PONDERADA" && (
                <label className="text-xs text-fg-subtle space-y-1"><span className="block">Peso</span>
                  <input value={nova.peso} onChange={(e) => setNova("peso", e.target.value)} className={`${input} w-16`} inputMode="decimal" />
                </label>
              )}
              <button disabled={pendente || !nova.nome} className={botao} onClick={() => executar(
                () => criarAvaliacao(disciplinaId, etapa.id, nova), "Avaliação criada.",
                () => setNovas((p) => ({ ...p, [etapa.id]: vazio }))
              )}>
                {pendente ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Adicionar
              </button>
            </div>
          </section>
        )
      })}
    </div>
  )
}
