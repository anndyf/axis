"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { ArrowLeft, CalendarDays, Clock, Plus, Trash2, Save, Loader2, CheckCircle2, AlertCircle } from "lucide-react"
import {
  salvarPeriodoLetivo, salvarEtapas, adicionarDiaNaoLetivo, removerDiaNaoLetivo,
  adicionarDiaLetivoExtra, removerDiaLetivoExtra, salvarTemposAula,
} from "./actions"

interface Props {
  anoLetivo: number
  periodo: { inicio: string; fim: string } | null
  totalDiasLetivos: number | null
  esquemas: { id: string; nome: string; unidades: { id: string; nome: string; inicio: string; fim: string; prazoLancamento: string }[] }[]
  naoLetivos: { id: string; data: string; tipo: string; descricao: string }[]
  extras: { id: string; data: string; seguirHorarioDe: number; descricao: string }[]
  tempos: { turno: string; ordem: number; inicio: string; fim: string }[]
}

const TURNOS = [
  { id: "MATUTINO", nome: "Matutino" },
  { id: "VESPERTINO", nome: "Vespertino" },
  { id: "NOTURNO", nome: "Noturno" },
  { id: "INTEGRAL", nome: "Integral" },
]
const DIAS = ["", "Segunda", "Terça", "Quarta", "Quinta", "Sexta"]
const TIPOS = [
  { id: "FERIADO", nome: "Feriado" },
  { id: "RECESSO", nome: "Recesso" },
  { id: "PLANEJAMENTO", nome: "Planejamento" },
  { id: "OUTRO", nome: "Outro" },
]

const card = "bg-white rounded-lg shadow-sm border border-zinc-200 p-6 space-y-4"
const input = "px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg outline-none text-sm text-fg-muted focus:bg-white focus:border-accent"
const botao = "flex items-center gap-2 bg-zinc-900 text-white px-4 py-2 rounded-lg text-xs font-medium uppercase tracking-wide hover:bg-zinc-800 disabled:opacity-50"

const dataBR = (iso: string) => iso.split("-").reverse().join("/")

export default function CalendarioClient(props: Props) {
  const [pendente, startTransition] = useTransition()
  const [aviso, setAviso] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null)

  // Executa uma server action e mostra o resultado
  const executar = (acao: () => Promise<{ ok: true } | { erro: string }>, sucesso: string) =>
    startTransition(async () => {
      const r = await acao()
      setAviso("erro" in r ? { tipo: "erro", texto: r.erro } : { tipo: "ok", texto: sucesso })
    })

  // Período letivo
  const [inicio, setInicio] = useState(props.periodo?.inicio ?? "")
  const [fim, setFim] = useState(props.periodo?.fim ?? "")

  // Etapas: chave = esquemaUnidadeId
  const [etapas, setEtapas] = useState(() =>
    Object.fromEntries(props.esquemas.flatMap((e) => e.unidades.map((u) => [u.id, { inicio: u.inicio, fim: u.fim, prazoLancamento: u.prazoLancamento }])))
  )
  const setEtapa = (id: string, campo: "inicio" | "fim" | "prazoLancamento", valor: string) =>
    setEtapas((prev) => ({ ...prev, [id]: { ...prev[id], [campo]: valor } }))

  // Novo dia não letivo / extra
  const [novoNaoLetivo, setNovoNaoLetivo] = useState({ data: "", tipo: "FERIADO", descricao: "" })
  const [novoExtra, setNovoExtra] = useState({ data: "", seguirHorarioDe: 1, descricao: "" })

  // Tempos de aula por turno
  const [turno, setTurno] = useState("MATUTINO")
  const [tempos, setTempos] = useState(() =>
    Object.fromEntries(TURNOS.map((t) => [t.id, props.tempos.filter((x) => x.turno === t.id).map((x) => ({ inicio: x.inicio, fim: x.fim }))]))
  )
  const temposDoTurno = tempos[turno] ?? []
  const setTempo = (i: number, campo: "inicio" | "fim", valor: string) =>
    setTempos((prev) => ({ ...prev, [turno]: prev[turno].map((t, idx) => (idx === i ? { ...t, [campo]: valor } : t)) }))

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-16">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/configuracoes" className="p-2 hover:bg-zinc-200 rounded-lg transition-colors">
          <ArrowLeft className="w-5 h-5 text-fg-muted" />
        </Link>
        <div>
          <h1 className="text-2xl font-medium text-accent-fg flex items-center gap-2">
            <CalendarDays className="w-6 h-6 text-fg-muted" /> Calendário letivo {props.anoLetivo}
          </h1>
          <p className="text-sm text-fg-muted">Base das aulas previstas e da frequência: dias letivos × horário das turmas.</p>
        </div>
      </div>

      {aviso && (
        <div className={`p-4 rounded-xl border text-sm flex items-center gap-2 ${aviso.tipo === "ok" ? "bg-success-subtle border-success-line text-success-fg" : "bg-danger-subtle border-danger-line text-danger-fg"}`}>
          {aviso.tipo === "ok" ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {aviso.texto}
        </div>
      )}

      {/* Período letivo */}
      <section className={card}>
        <h2 className="font-medium text-fg">Ano letivo</h2>
        <div className="flex flex-wrap items-end gap-3">
          <label className="text-xs text-fg-subtle space-y-1"><span className="block">Início</span>
            <input type="date" value={inicio} onChange={(e) => setInicio(e.target.value)} className={input} />
          </label>
          <label className="text-xs text-fg-subtle space-y-1"><span className="block">Fim</span>
            <input type="date" value={fim} onChange={(e) => setFim(e.target.value)} className={input} />
          </label>
          <button disabled={pendente} className={botao} onClick={() => executar(() => salvarPeriodoLetivo(props.anoLetivo, inicio, fim), "Ano letivo salvo.")}>
            {pendente ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Salvar
          </button>
        </div>
        {props.totalDiasLetivos !== null && (
          <p className="text-sm text-fg-muted">
            <strong className="text-fg">{props.totalDiasLetivos}</strong> dias letivos no ano
            {props.totalDiasLetivos < 200 && <span className="text-warning-fg"> — a LDB exige no mínimo 200 dias de efetivo trabalho escolar</span>}
          </p>
        )}
      </section>

      {/* Etapas por esquema */}
      <section className={card}>
        <h2 className="font-medium text-fg">Datas das unidades</h2>
        {!props.periodo && <p className="text-sm text-warning-fg">Salve o início e o fim do ano letivo antes.</p>}
        {props.esquemas.map((esq) => (
          <div key={esq.id} className="space-y-2">
            <p className="text-xs font-semibold text-fg-subtle">{esq.nome}</p>
            {esq.unidades.map((u) => (
              <div key={u.id} className="flex flex-wrap items-center gap-2">
                <span className="w-32 text-sm text-fg-muted">{u.nome}</span>
                <input type="date" aria-label={`${u.nome} início`} value={etapas[u.id].inicio} onChange={(e) => setEtapa(u.id, "inicio", e.target.value)} className={input} />
                <span className="text-xs text-fg-subtle">até</span>
                <input type="date" aria-label={`${u.nome} fim`} value={etapas[u.id].fim} onChange={(e) => setEtapa(u.id, "fim", e.target.value)} className={input} />
                <span className="text-xs text-fg-subtle">prazo de notas</span>
                <input type="date" aria-label={`${u.nome} prazo de lançamento`} value={etapas[u.id].prazoLancamento} onChange={(e) => setEtapa(u.id, "prazoLancamento", e.target.value)} className={input} />
              </div>
            ))}
          </div>
        ))}
        <button disabled={pendente || !props.periodo} className={botao} onClick={() => executar(
          () => salvarEtapas(props.anoLetivo, Object.entries(etapas).map(([esquemaUnidadeId, e]) => ({ esquemaUnidadeId, ...e }))),
          "Datas das unidades salvas."
        )}>
          <Save className="w-4 h-4" /> Salvar datas
        </button>
      </section>

      {/* Dias não letivos */}
      <section className={card}>
        <h2 className="font-medium text-fg">Feriados, recessos e dias sem aula</h2>
        <div className="flex flex-wrap items-center gap-2">
          <input type="date" value={novoNaoLetivo.data} onChange={(e) => setNovoNaoLetivo({ ...novoNaoLetivo, data: e.target.value })} className={input} />
          <select value={novoNaoLetivo.tipo} onChange={(e) => setNovoNaoLetivo({ ...novoNaoLetivo, tipo: e.target.value })} className={input}>
            {TIPOS.map((t) => <option key={t.id} value={t.id}>{t.nome}</option>)}
          </select>
          <input placeholder="Descrição (ex.: Tiradentes)" value={novoNaoLetivo.descricao} onChange={(e) => setNovoNaoLetivo({ ...novoNaoLetivo, descricao: e.target.value })} className={`${input} flex-1 min-w-48`} />
          <button disabled={pendente} className={botao} onClick={() => executar(async () => {
            const r = await adicionarDiaNaoLetivo(novoNaoLetivo.data, novoNaoLetivo.tipo, novoNaoLetivo.descricao)
            if ("ok" in r) setNovoNaoLetivo({ data: "", tipo: "FERIADO", descricao: "" })
            return r
          }, "Dia adicionado.")}>
            <Plus className="w-4 h-4" /> Adicionar
          </button>
        </div>
        <ul className="divide-y divide-zinc-100">
          {props.naoLetivos.map((d) => (
            <li key={d.id} className="flex items-center justify-between py-2 text-sm">
              <span><strong className="text-fg">{dataBR(d.data)}</strong> · <span className="text-fg-subtle">{TIPOS.find((t) => t.id === d.tipo)?.nome}</span> · {d.descricao}</span>
              <button aria-label="Remover" disabled={pendente} onClick={() => executar(() => removerDiaNaoLetivo(d.id), "Dia removido.")} className="p-1.5 text-danger-fg hover:bg-danger-subtle rounded-lg">
                <Trash2 className="w-4 h-4" />
              </button>
            </li>
          ))}
          {props.naoLetivos.length === 0 && <li className="py-2 text-sm text-fg-subtle">Nenhum dia cadastrado.</li>}
        </ul>
      </section>

      {/* Dias letivos extras */}
      <section className={card}>
        <h2 className="font-medium text-fg">Sábados letivos e reposições</h2>
        <div className="flex flex-wrap items-center gap-2">
          <input type="date" value={novoExtra.data} onChange={(e) => setNovoExtra({ ...novoExtra, data: e.target.value })} className={input} />
          <select value={novoExtra.seguirHorarioDe} onChange={(e) => setNovoExtra({ ...novoExtra, seguirHorarioDe: Number(e.target.value) })} className={input}>
            {[1, 2, 3, 4, 5].map((d) => <option key={d} value={d}>Horário de {DIAS[d]}</option>)}
          </select>
          <input placeholder="Descrição" value={novoExtra.descricao} onChange={(e) => setNovoExtra({ ...novoExtra, descricao: e.target.value })} className={`${input} flex-1 min-w-48`} />
          <button disabled={pendente} className={botao} onClick={() => executar(async () => {
            const r = await adicionarDiaLetivoExtra(novoExtra.data, novoExtra.seguirHorarioDe, novoExtra.descricao)
            if ("ok" in r) setNovoExtra({ data: "", seguirHorarioDe: 1, descricao: "" })
            return r
          }, "Dia letivo adicionado.")}>
            <Plus className="w-4 h-4" /> Adicionar
          </button>
        </div>
        <ul className="divide-y divide-zinc-100">
          {props.extras.map((d) => (
            <li key={d.id} className="flex items-center justify-between py-2 text-sm">
              <span><strong className="text-fg">{dataBR(d.data)}</strong> · horário de {DIAS[d.seguirHorarioDe]} · {d.descricao}</span>
              <button aria-label="Remover" disabled={pendente} onClick={() => executar(() => removerDiaLetivoExtra(d.id), "Dia removido.")} className="p-1.5 text-danger-fg hover:bg-danger-subtle rounded-lg">
                <Trash2 className="w-4 h-4" />
              </button>
            </li>
          ))}
          {props.extras.length === 0 && <li className="py-2 text-sm text-fg-subtle">Nenhum dia cadastrado.</li>}
        </ul>
      </section>

      {/* Tempos de aula */}
      <section className={card}>
        <h2 className="font-medium text-fg flex items-center gap-2"><Clock className="w-4 h-4" /> Tempos de aula</h2>
        <p className="text-xs text-fg-subtle">O 1º, 2º, 3º... horário da grade de cada turma usa os tempos do turno dela.</p>
        <div className="flex flex-wrap gap-2">
          {TURNOS.map((t) => (
            <button key={t.id} onClick={() => setTurno(t.id)} className={`px-3 py-1.5 rounded-lg text-xs font-medium border ${turno === t.id ? "bg-zinc-900 text-white border-zinc-900" : "bg-white text-fg-muted border-zinc-200"}`}>
              {t.nome} ({(tempos[t.id] ?? []).length})
            </button>
          ))}
        </div>
        <div className="space-y-2">
          {temposDoTurno.map((t, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="w-16 text-sm text-fg-muted">{i + 1}º</span>
              <input type="time" aria-label={`${i + 1}º tempo início`} value={t.inicio} onChange={(e) => setTempo(i, "inicio", e.target.value)} className={input} />
              <span className="text-xs text-fg-subtle">às</span>
              <input type="time" aria-label={`${i + 1}º tempo fim`} value={t.fim} onChange={(e) => setTempo(i, "fim", e.target.value)} className={input} />
              <button aria-label="Remover tempo" onClick={() => setTempos((prev) => ({ ...prev, [turno]: prev[turno].filter((_, idx) => idx !== i) }))} className="p-1.5 text-danger-fg hover:bg-danger-subtle rounded-lg">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <button onClick={() => setTempos((prev) => ({ ...prev, [turno]: [...(prev[turno] ?? []), { inicio: "", fim: "" }] }))} className="flex items-center gap-1 text-xs font-bold text-accent-fg">
            <Plus className="w-3.5 h-3.5" /> Tempo
          </button>
          <button disabled={pendente} className={botao} onClick={() => executar(() => salvarTemposAula(turno, temposDoTurno), "Tempos de aula salvos.")}>
            <Save className="w-4 h-4" /> Salvar tempos do turno
          </button>
        </div>
      </section>
    </div>
  )
}
