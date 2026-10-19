"use client"

import { useEffect, useState, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, ClipboardCheck, Save, Loader2, CheckCircle2, AlertCircle, Minus, Plus, Ban } from "lucide-react"
import { abrirChamada, salvarChamada, cancelarAula, type ChamadaAberta } from "../actions"

interface Props {
  turmaId: string
  disciplinaId: string | null
  data: string
  hoje: string
}

const input = "px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg outline-none text-sm text-fg-muted focus:bg-white focus:border-accent"
const botao = "flex items-center gap-2 bg-zinc-900 text-white px-4 py-2 rounded-lg text-xs font-medium uppercase tracking-wide hover:bg-zinc-800 disabled:opacity-50"
const dataBR = (iso: string) => iso.split("-").reverse().join("/")

export default function ChamadaClient({ turmaId, disciplinaId, data, hoje }: Props) {
  const router = useRouter()
  const [pendente, startTransition] = useTransition()
  const [chamada, setChamada] = useState<ChamadaAberta | null>(null)
  const [erroAbertura, setErroAbertura] = useState<string | null>(null)
  const [faltas, setFaltas] = useState<Record<string, number>>({})
  const [conteudo, setConteudo] = useState("")
  const [aviso, setAviso] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null)

  useEffect(() => {
    let ativo = true
    setChamada(null)
    setErroAbertura(null)
    abrirChamada(turmaId, disciplinaId, data).then((r) => {
      if (!ativo) return
      if ("erro" in r) { setErroAbertura(r.erro); return }
      setChamada(r)
      setFaltas(r.faltas)
      setConteudo(r.aula.conteudo)
    })
    return () => { ativo = false }
  }, [turmaId, disciplinaId, data])

  const quantidade = chamada?.aula.quantidade ?? 1
  const totalFaltosos = Object.values(faltas).filter((q) => q > 0).length

  const alternar = (id: string) => setFaltas((prev) => ({ ...prev, [id]: prev[id] ? 0 : quantidade }))
  const ajustar = (id: string, delta: number) => setFaltas((prev) => ({ ...prev, [id]: Math.max(0, Math.min(quantidade, (prev[id] ?? 0) + delta)) }))

  const salvar = () => startTransition(async () => {
    if (!chamada) return
    const lista = Object.entries(faltas).filter(([, q]) => q > 0).map(([estudanteId, q]) => ({ estudanteId, quantidade: q }))
    const r = await salvarChamada(chamada.aula.id, lista, conteudo)
    if ("erro" in r) { setAviso({ tipo: "erro", texto: r.erro }); return }
    setChamada({ ...chamada, aula: { ...chamada.aula, situacao: "REALIZADA" } })
    setAviso({ tipo: "ok", texto: `Chamada salva: ${lista.length === 0 ? "todos presentes" : `${lista.length} ${lista.length === 1 ? "falta" : "faltas"}`}.` })
    router.refresh()
  })

  const naoDada = () => startTransition(async () => {
    if (!chamada) return
    if (!window.confirm("Marcar esta aula como não dada? Ela deixa de contar na frequência.")) return
    const r = await cancelarAula(chamada.aula.id, conteudo)
    if ("erro" in r) { setAviso({ tipo: "erro", texto: r.erro }); return }
    setChamada({ ...chamada, aula: { ...chamada.aula, situacao: "CANCELADA" } })
    setAviso({ tipo: "ok", texto: "Aula marcada como não dada." })
  })

  const trocarData = (nova: string) => {
    if (!nova) return
    router.push(`/dashboard/chamada/fazer?turma=${turmaId}${disciplinaId ? `&disciplina=${disciplinaId}` : ""}&data=${nova}`)
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-16">
      <div className="flex items-center gap-4">
        <Link href={`/dashboard/chamada?data=${data}`} className="p-2 hover:bg-zinc-200 rounded-lg transition-colors">
          <ArrowLeft className="w-5 h-5 text-fg-muted" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-medium text-accent-fg flex items-center gap-2">
            <ClipboardCheck className="w-6 h-6 text-fg-muted" /> {chamada ? (chamada.disciplina?.nome ?? "Chamada diária") : "Chamada"}
          </h1>
          <p className="text-sm text-fg-muted">
            {chamada ? `${chamada.turma.nome} · ${dataBR(data)}` : dataBR(data)}
            {chamada && chamada.aula.tempos.length > 0 && ` · ${chamada.aula.tempos.map((t) => `${t}º`).join(", ")} ${chamada.aula.tempos.length > 1 ? "tempos" : "tempo"}`}
          </p>
        </div>
        <input type="date" aria-label="Data da chamada" value={data} max={hoje} onChange={(e) => trocarData(e.target.value)} className={input} />
      </div>

      {erroAbertura && (
        <div className="p-4 rounded-xl border text-sm flex items-center gap-2 bg-danger-subtle border-danger-line text-danger-fg">
          <AlertCircle className="w-4 h-4" /> {erroAbertura}
        </div>
      )}
      {!chamada && !erroAbertura && (
        <div className="flex items-center gap-2 text-sm text-fg-subtle"><Loader2 className="w-4 h-4 animate-spin" /> Abrindo chamada…</div>
      )}

      {aviso && (
        <div className={`p-4 rounded-xl border text-sm flex items-center gap-2 ${aviso.tipo === "ok" ? "bg-success-subtle border-success-line text-success-fg" : "bg-danger-subtle border-danger-line text-danger-fg"}`}>
          {aviso.tipo === "ok" ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {aviso.texto}
        </div>
      )}

      {chamada && (
        <>
          {chamada.aula.situacao === "CANCELADA" && (
            <p className="text-sm text-fg-muted bg-zinc-100 border border-zinc-200 rounded-xl p-3">Esta aula está marcada como não dada. Salvar a chamada volta a contá-la.</p>
          )}

          <section className="bg-white rounded-lg shadow-sm border border-zinc-200 p-6 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-medium text-fg">{chamada.alunos.length} alunos</h2>
              <span className="text-xs text-fg-subtle">{totalFaltosos === 0 ? "Todos presentes" : `${totalFaltosos} com falta`}</span>
            </div>
            <div className="divide-y divide-zinc-100">
              {chamada.alunos.map((a) => {
                const q = faltas[a.id] ?? 0
                const just = chamada.justificados[a.id]
                return (
                  <div key={a.id} className="flex items-center gap-3 py-2">
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm truncate ${q ? "text-danger-fg font-medium" : "text-fg"}`}>{a.nome}</p>
                      <p className="text-xs text-fg-subtle">
                        {a.matricula}
                        {a.status && a.status !== "ATIVO" && ` · ${a.status}`}
                        {just && <span className="ml-1 text-accent-fg">· {just === "ABONA" ? "falta abonada (atestado)" : "justificado"}</span>}
                      </p>
                    </div>
                    {q > 0 && quantidade > 1 && (
                      <div className="flex items-center gap-1">
                        <button type="button" aria-label="Menos uma falta" onClick={() => ajustar(a.id, -1)} className="p-1 rounded hover:bg-zinc-100"><Minus className="w-3 h-3" /></button>
                        <span className="text-xs text-fg-muted w-12 text-center">{q} de {quantidade}</span>
                        <button type="button" aria-label="Mais uma falta" onClick={() => ajustar(a.id, 1)} className="p-1 rounded hover:bg-zinc-100"><Plus className="w-3 h-3" /></button>
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => alternar(a.id)}
                      aria-pressed={q > 0}
                      className={`w-24 py-2 rounded-lg text-xs font-medium uppercase tracking-wide border ${q ? "bg-danger-subtle border-danger-line text-danger-fg" : "bg-success-subtle border-success-line text-success-fg"}`}
                    >
                      {q ? "Faltou" : "Presente"}
                    </button>
                  </div>
                )
              })}
            </div>
          </section>

          <section className="bg-white rounded-lg shadow-sm border border-zinc-200 p-6 space-y-3">
            <label className="block text-sm font-medium text-fg" htmlFor="conteudo">Conteúdo ministrado</label>
            <textarea id="conteudo" value={conteudo} onChange={(e) => setConteudo(e.target.value)} rows={3} maxLength={5000} className={`${input} w-full`} placeholder="Ex.: Equações do 1º grau — resolução de exercícios" />
            <div className="flex flex-wrap gap-2">
              <button disabled={pendente} onClick={salvar} className={botao}>
                {pendente ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Salvar chamada
              </button>
              {chamada.aula.situacao !== "CANCELADA" && (
                <button disabled={pendente} onClick={naoDada} className="flex items-center gap-2 border border-zinc-200 text-fg-muted px-4 py-2 rounded-lg text-xs font-medium uppercase tracking-wide hover:bg-zinc-50 disabled:opacity-50">
                  <Ban className="w-4 h-4" /> Aula não dada
                </button>
              )}
            </div>
          </section>
        </>
      )}
    </div>
  )
}
