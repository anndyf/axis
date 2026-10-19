"use client"

import { useState, useTransition } from "react"
import { FileCheck2, Plus, Trash2, Loader2, CheckCircle2, AlertCircle } from "lucide-react"
import { criarJustificativa, removerJustificativa } from "./actions"

interface Props {
  alunos: { id: string; nome: string; matricula: string }[]
  justificativas: { id: string; aluno: string; inicio: string; fim: string; tipo: string; efeito: string; descricao: string; registradoPor: string }[]
}

const TIPOS = [
  { id: "ATESTADO", nome: "Atestado médico" },
  { id: "ABONO_LEGAL", nome: "Abono previsto em lei" },
  { id: "OUTRO", nome: "Outro" },
]
const EFEITOS = [
  { id: "ABONA", nome: "Abona (falta não conta)" },
  { id: "SO_JUSTIFICA", nome: "Só justifica (falta conta)" },
]
const nomeTipo = (id: string) => TIPOS.find((t) => t.id === id)?.nome ?? id
const card = "bg-white rounded-lg shadow-sm border border-zinc-200 p-6 space-y-4"
const input = "px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg outline-none text-sm text-fg-muted focus:bg-white focus:border-accent"
const botao = "flex items-center gap-2 bg-zinc-900 text-white px-4 py-2 rounded-lg text-xs font-medium uppercase tracking-wide hover:bg-zinc-800 disabled:opacity-50"
const dataBR = (iso: string) => iso.split("-").reverse().join("/")

export default function JustificativasClient({ alunos, justificativas }: Props) {
  const [pendente, startTransition] = useTransition()
  const [aviso, setAviso] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null)
  const [nova, setNova] = useState({ estudanteId: "", inicio: "", fim: "", tipo: "ATESTADO", efeito: "ABONA", descricao: "" })

  const executar = (acao: () => Promise<{ ok: true } | { erro: string }>, sucesso: string, depois?: () => void) =>
    startTransition(async () => {
      const r = await acao()
      setAviso("erro" in r ? { tipo: "erro", texto: r.erro } : { tipo: "ok", texto: sucesso })
      if (!("erro" in r)) depois?.()
    })

  return (
    <section className={card}>
      <h2 className="font-medium text-fg flex items-center gap-2"><FileCheck2 className="w-4 h-4" /> Atestados e justificativas</h2>
      <p className="text-xs text-fg-subtle">Vale para todas as faltas do aluno no período, inclusive as já lançadas.</p>

      {aviso && (
        <div className={`p-3 rounded-xl border text-sm flex items-center gap-2 ${aviso.tipo === "ok" ? "bg-success-subtle border-success-line text-success-fg" : "bg-danger-subtle border-danger-line text-danger-fg"}`}>
          {aviso.tipo === "ok" ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {aviso.texto}
        </div>
      )}

      <div className="flex flex-wrap items-end gap-3">
        <label className="text-xs text-fg-subtle space-y-1"><span className="block">Aluno</span>
          <select value={nova.estudanteId} onChange={(e) => setNova({ ...nova, estudanteId: e.target.value })} className={`${input} min-w-[14rem]`}>
            <option value="">Escolha…</option>
            {alunos.map((a) => <option key={a.id} value={a.id}>{a.nome} ({a.matricula})</option>)}
          </select>
        </label>
        <label className="text-xs text-fg-subtle space-y-1"><span className="block">De</span>
          <input type="date" value={nova.inicio} onChange={(e) => setNova({ ...nova, inicio: e.target.value, fim: nova.fim || e.target.value })} className={input} />
        </label>
        <label className="text-xs text-fg-subtle space-y-1"><span className="block">Até</span>
          <input type="date" value={nova.fim} min={nova.inicio} onChange={(e) => setNova({ ...nova, fim: e.target.value })} className={input} />
        </label>
        <label className="text-xs text-fg-subtle space-y-1"><span className="block">Tipo</span>
          <select value={nova.tipo} onChange={(e) => setNova({ ...nova, tipo: e.target.value })} className={input}>
            {TIPOS.map((t) => <option key={t.id} value={t.id}>{t.nome}</option>)}
          </select>
        </label>
        <label className="text-xs text-fg-subtle space-y-1"><span className="block">Efeito</span>
          <select value={nova.efeito} onChange={(e) => setNova({ ...nova, efeito: e.target.value })} className={input}>
            {EFEITOS.map((t) => <option key={t.id} value={t.id}>{t.nome}</option>)}
          </select>
        </label>
        <label className="text-xs text-fg-subtle space-y-1 flex-1 min-w-[12rem]"><span className="block">Observação</span>
          <input value={nova.descricao} maxLength={1000} onChange={(e) => setNova({ ...nova, descricao: e.target.value })} className={`${input} w-full`} placeholder="Ex.: CID não informado, 3 dias" />
        </label>
        <button disabled={pendente || !nova.estudanteId} className={botao} onClick={() => executar(
          () => criarJustificativa(nova), "Justificativa registrada.",
          () => setNova({ estudanteId: "", inicio: "", fim: "", tipo: "ATESTADO", efeito: "ABONA", descricao: "" })
        )}>
          {pendente ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Registrar
        </button>
      </div>

      {justificativas.length === 0 ? (
        <p className="text-sm text-fg-subtle">Nenhuma justificativa registrada nesta turma.</p>
      ) : (
        <div className="divide-y divide-zinc-100">
          {justificativas.map((j) => (
            <div key={j.id} className="flex flex-wrap items-center gap-3 py-2">
              <div className="flex-1 min-w-[12rem]">
                <p className="text-sm text-fg">{j.aluno}</p>
                <p className="text-xs text-fg-subtle">
                  {j.inicio === j.fim ? dataBR(j.inicio) : `${dataBR(j.inicio)} a ${dataBR(j.fim)}`} · {nomeTipo(j.tipo)} · {j.efeito === "ABONA" ? "abona" : "só justifica"}
                  {j.descricao && ` · ${j.descricao}`}
                  {j.registradoPor && ` · por ${j.registradoPor}`}
                </p>
              </div>
              <button disabled={pendente} aria-label="Remover justificativa" onClick={() => {
                if (window.confirm("Remover esta justificativa? As faltas do período voltam a contar.")) executar(() => removerJustificativa(j.id), "Justificativa removida.")
              }} className="p-2 rounded-lg hover:bg-danger-subtle text-fg-subtle hover:text-danger-fg">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
