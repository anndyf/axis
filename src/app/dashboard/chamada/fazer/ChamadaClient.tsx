"use client"

import { useEffect, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Ban, CalendarDays, CalendarRange, Check, Copy, MessageSquareText, MoreVertical, Save, Users } from "lucide-react"
import { Alert, Avatar, BottomSheet, Button, Card, EmptyState, Label, SkeletonRows, Textarea, cn } from "@/components/ui"
import { Menu } from "@/components/ui/Menu"
import { rotuloTempos } from "@/lib/services/inicio-professor"
import type { DiaDoCalendario } from "@/lib/services/calendario-disciplina"
import CalendarioDisciplina from "@/components/CalendarioDisciplina"
import { abrirChamada, salvarChamada, cancelarAula, salvarObservacao, opcoesReplicacao, type AlvoReplicacao, type ChamadaAberta } from "../actions"
import ReplicarConteudo from "./ReplicarConteudo"

interface Props {
  turmaId: string
  disciplinaId: string | null
  data: string
  hoje: string
  calendario: { dias: DiaDoCalendario[]; linkBase: string } | null
}

type Falta = { tempos: number[]; quantidade: number }

const DIAS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"]
const dataBR = (iso: string) => iso.split("-").reverse().join("/")
const diaDaSemana = (iso: string) => DIAS[new Date(`${iso}T12:00:00Z`).getUTCDay()]

/**
 * Chamada (padrão de app, inspirada nos "Dados da Turma" do SIGEduc): todos
 * começam presentes e um toque no cartão marca a falta. Com 2+ tempos, o
 * cartão de quem faltou mostra uma ficha por tempo (o toque marca todos; cada
 * ficha pode ser desmarcada). Observação por aluno num painel que sobe de
 * baixo. Salvar fica fixo no rodapé, acima da barra de navegação.
 */
export default function ChamadaClient({ turmaId, disciplinaId, data, hoje, calendario }: Props) {
  const router = useRouter()
  const [pendente, startTransition] = useTransition()
  const [chamada, setChamada] = useState<ChamadaAberta | null>(null)
  const [erroAbertura, setErroAbertura] = useState<string | null>(null)
  const [faltas, setFaltas] = useState<Record<string, Falta>>({})
  const [observacoes, setObservacoes] = useState<Record<string, string>>({})
  const [conteudo, setConteudo] = useState("")
  const [aviso, setAviso] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null)
  const [obsAberta, setObsAberta] = useState<{ id: string; nome: string; texto: string } | null>(null)
  const [salvandoObs, setSalvandoObs] = useState(false)
  const [calendarioAberto, setCalendarioAberto] = useState(false)
  // Destinos possíveis do "Salvar e replicar" (mesma disciplina do professor em outras turmas)
  const [podeReplicar, setPodeReplicar] = useState(false)
  const [replicar, setReplicar] = useState<AlvoReplicacao[] | null>(null)

  useEffect(() => {
    let ativo = true
    abrirChamada(turmaId, disciplinaId, data).then((r) => {
      if (!ativo) return
      if ("erro" in r) { setErroAbertura(r.erro); return }
      setChamada(r)
      setFaltas(r.faltas)
      setObservacoes(r.observacoes)
      setConteudo(r.aula.conteudo)
      if (r.disciplina) opcoesReplicacao(r.aula.id).then((o) => { if (ativo && !("erro" in o)) setPodeReplicar(o.alvos.length > 0) })
    })
    return () => { ativo = false }
  }, [turmaId, disciplinaId, data])

  const temposDaAula = chamada ? [...chamada.aula.tempos].sort((a, b) => a - b) : []
  const porTempo = temposDaAula.length >= 2
  const totalFaltas = Object.keys(faltas).length
  const totalPresentes = (chamada?.alunos.length ?? 0) - totalFaltas

  /** Toque no cartão: presente <-> faltou (em todos os tempos). */
  const alternar = (id: string) => setFaltas((prev) => {
    const prox = { ...prev }
    if (prox[id]) delete prox[id]
    else prox[id] = { tempos: temposDaAula, quantidade: temposDaAula.length || 1 }
    return prox
  })
  /** Ficha de um tempo: desmarcar o último tempo volta o aluno para presente. */
  const alternarTempo = (id: string, tempo: number) => setFaltas((prev) => {
    const atual = prev[id]?.tempos ?? []
    const tempos = atual.includes(tempo) ? atual.filter((t) => t !== tempo) : [...atual, tempo].sort((a, b) => a - b)
    const prox = { ...prev }
    if (tempos.length === 0) delete prox[id]
    else prox[id] = { tempos, quantidade: tempos.length }
    return prox
  })

  /** Grava a chamada; true se deu certo. */
  const gravar = async (): Promise<boolean> => {
    if (!chamada) return false
    const lista = Object.entries(faltas).map(([estudanteId, f]) => (temposDaAula.length ? { estudanteId, tempos: f.tempos } : { estudanteId, quantidade: f.quantidade }))
    const r = await salvarChamada(chamada.aula.id, lista, conteudo)
    if ("erro" in r) { setAviso({ tipo: "erro", texto: r.erro }); return false }
    setChamada({ ...chamada, aula: { ...chamada.aula, situacao: "REALIZADA", conteudo: conteudo.trim() } })
    setAviso({ tipo: "ok", texto: `Chamada salva: ${lista.length === 0 ? "todos presentes" : `${lista.length} ${lista.length === 1 ? "falta" : "faltas"}`}.` })
    router.refresh()
    return true
  }
  const salvar = () => startTransition(async () => { await gravar() })

  /** "Salvar e replicar": salva e abre a escolha das outras turmas com o conteúdo já gravado. */
  const salvarEReplicar = () => startTransition(async () => {
    if (!chamada || !conteudo.trim()) { setAviso({ tipo: "erro", texto: "Escreva o conteúdo ministrado antes de replicar." }); return }
    if (!(await gravar())) return
    const r = await opcoesReplicacao(chamada.aula.id)
    if ("erro" in r) { setAviso({ tipo: "erro", texto: r.erro }); return }
    setReplicar(r.alvos)
  })

  const naoDada = () => startTransition(async () => {
    if (!chamada) return
    if (!window.confirm("Marcar esta aula como não dada? Ela deixa de contar na frequência.")) return
    const r = await cancelarAula(chamada.aula.id, conteudo)
    if ("erro" in r) { setAviso({ tipo: "erro", texto: r.erro }); return }
    setChamada({ ...chamada, aula: { ...chamada.aula, situacao: "CANCELADA" } })
    setAviso({ tipo: "ok", texto: "Aula marcada como não dada." })
  })

  const gravarObservacao = async (texto: string) => {
    if (!chamada || !obsAberta) return
    setSalvandoObs(true)
    const r = await salvarObservacao(chamada.aula.id, obsAberta.id, texto)
    setSalvandoObs(false)
    if ("erro" in r) { setAviso({ tipo: "erro", texto: r.erro }); return }
    setObservacoes((prev) => {
      const prox = { ...prev }
      if (texto.trim()) prox[obsAberta.id] = texto.trim()
      else delete prox[obsAberta.id]
      return prox
    })
    setObsAberta(null)
  }

  const trocarData = (nova: string) => {
    if (!nova) return
    router.push(`/dashboard/chamada/fazer?turma=${turmaId}${disciplinaId ? `&disciplina=${disciplinaId}` : ""}&data=${nova}`)
  }

  return (
    <div className={cn("mx-auto", calendario ? "max-w-5xl md:grid md:grid-cols-[15rem_minmax(0,1fr)] md:items-start md:gap-6" : "max-w-3xl")}>
      {/* Desktop: meses empilhados numa coluna à esquerda (como no SIGEduc) */}
      {calendario && (
        <aside aria-label="Calendário da disciplina" className="sticky top-20 hidden max-h-[calc(100dvh-6rem)] overflow-y-auto rounded-2xl border border-line bg-surface p-3 shadow-card md:block">
          <CalendarioDisciplina dias={calendario.dias} linkBase={calendario.linkBase} selecionada={data} hoje={hoje} modo="coluna" />
        </aside>
      )}
    <div className="min-w-0 space-y-4 pb-32 md:space-y-5 md:pb-6">
      {/* Dados da turma */}
      <section aria-label="Dados da aula" className="rounded-2xl border border-line bg-surface p-4 shadow-card md:p-5">
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <h1 className="break-words text-xl font-semibold leading-snug text-fg md:text-2xl">
              {chamada ? (chamada.disciplina?.nome ?? "Chamada diária") : "Chamada"}
            </h1>
            <p className="mt-1 text-sm text-fg-muted">
              {chamada && <><span className="font-mono">{chamada.turma.nome}</span> · </>}
              {diaDaSemana(data)}, {dataBR(data)}
              {chamada && chamada.aula.tempos.length > 0 && <> · {rotuloTempos(temposDaAula)}</>}
            </p>
          </div>
          {chamada && chamada.aula.situacao !== "CANCELADA" && (
            <Menu
              trigger={(p) => (
                <button {...p} type="button" aria-label="Mais opções da aula" className="-mr-2 -mt-1 flex size-11 shrink-0 items-center justify-center rounded-full text-fg-muted hover:bg-subtle hover:text-fg">
                  <MoreVertical size={18} strokeWidth={1.75} />
                </button>
              )}
              items={[{ label: "Aula não dada", icon: Ban, onSelect: naoDada }]}
            />
          )}
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-line-subtle pt-3">
          <label className="flex min-h-11 items-center gap-2 text-13 text-fg-muted">
            <CalendarDays size={16} strokeWidth={1.75} aria-hidden />
            <span className="sr-only">Data da chamada</span>
            <input type="date" value={data} max={hoje} onChange={(e) => trocarData(e.target.value)} className="h-10 rounded-lg border border-transparent bg-subtle px-2 text-sm text-fg outline-none focus:border-accent focus:ring-3 focus:ring-ring/40" />
          </label>
          {calendario && (
            <button type="button" onClick={() => setCalendarioAberto(true)} className="flex min-h-10 items-center gap-1.5 rounded-lg bg-subtle px-3 text-13 font-medium text-fg md:hidden">
              <CalendarRange size={16} strokeWidth={1.75} aria-hidden /> Calendário
            </button>
          )}
          <p className="w-full text-13 text-fg-subtle">Todos começam presentes; toque em quem faltou.</p>
        </div>
      </section>

      {erroAbertura && <Alert tone="danger" title="Não foi possível abrir a chamada">{erroAbertura}</Alert>}
      {aviso && <Alert tone={aviso.tipo === "ok" ? "success" : "danger"}>{aviso.texto}</Alert>}
      {chamada?.aula.situacao === "CANCELADA" && <Alert tone="info">Esta aula está marcada como não dada. Salvar a chamada volta a contá-la.</Alert>}

      {!chamada && !erroAbertura && <Card><SkeletonRows linhas={8} colunas={2} /></Card>}

      {chamada && (
        <>
          {chamada.alunos.length === 0 ? (
            <Card><EmptyState icon={Users} title="Nenhum aluno nesta turma" description="Cadastre os estudantes da turma para fazer a chamada." /></Card>
          ) : (
            <ul className="space-y-2" aria-label="Alunos">
              {chamada.alunos.map((a) => {
                const falta = faltas[a.id]
                const just = chamada.justificados[a.id]
                const obs = observacoes[a.id]
                return (
                  <li key={a.id} className={cn("rounded-2xl border transition-colors duration-150", falta ? "border-danger-line bg-danger-subtle" : "border-line bg-surface")}>
                    <div className="flex items-stretch">
                      <button
                        type="button"
                        onClick={() => alternar(a.id)}
                        aria-pressed={!!falta}
                        className="flex min-h-16 min-w-0 flex-1 items-center gap-3 rounded-l-2xl py-3 pl-4 pr-2 text-left"
                      >
                        <Avatar nome={a.nome} size="md" />
                        <span className="min-w-0 flex-1">
                          <span className={cn("block break-words text-sm font-medium", falta ? "text-danger-fg" : "text-fg")}>{a.nome}</span>
                          <span className="flex flex-wrap items-center gap-x-1.5 text-xs text-fg-subtle">
                            <span className="font-mono">{a.matricula}</span>
                            {a.status && a.status !== "ATIVO" && <span>· {a.status}</span>}
                            {just && <span className="text-info-fg">· {just === "ABONA" ? "falta abonada (atestado)" : "justificado"}</span>}
                          </span>
                        </span>
                        <span className={cn("shrink-0 text-13 font-semibold", falta ? "text-danger-fg" : "text-fg-subtle")}>
                          {falta ? "Faltou" : <span className="flex items-center gap-1 font-medium"><Check size={14} strokeWidth={2} aria-hidden />Presente</span>}
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setObsAberta({ id: a.id, nome: a.nome, texto: obs ?? "" })}
                        aria-label={obs ? `Observação de ${a.nome} (preenchida)` : `Adicionar observação para ${a.nome}`}
                        className={cn("flex w-12 shrink-0 items-center justify-center rounded-r-2xl transition-colors duration-150", obs ? "text-accent-fg" : "text-fg-subtle hover:text-fg")}
                      >
                        <MessageSquareText size={18} strokeWidth={obs ? 2.25 : 1.75} aria-hidden />
                      </button>
                    </div>
                    {falta && porTempo && (
                      <div role="group" aria-label={`Tempos em que ${a.nome} faltou`} className="flex flex-wrap items-center gap-2 px-4 pb-3">
                        <span className="text-xs text-danger-fg">Faltou em:</span>
                        {temposDaAula.map((t) => {
                          const marcado = falta.tempos.includes(t)
                          return (
                            <button
                              key={t}
                              type="button"
                              aria-pressed={marcado}
                              aria-label={`${t}º tempo: ${marcado ? "faltou" : "presente"}`}
                              onClick={() => alternarTempo(a.id, t)}
                              className={cn("flex h-9 min-w-12 items-center justify-center gap-1 rounded-full border px-3 text-13 font-medium transition-colors duration-150", marcado ? "border-danger-line bg-surface text-danger-fg" : "border-line bg-transparent text-fg-subtle line-through")}
                            >
                              {t}º
                            </button>
                          )
                        })}
                      </div>
                    )}
                    {obs && <p className="break-words px-4 pb-3 text-13 text-fg-muted"><span className="sr-only">Observação: </span>{obs}</p>}
                  </li>
                )
              })}
            </ul>
          )}

          <section className="rounded-2xl border border-line bg-surface p-4 shadow-card md:p-5">
            <Label htmlFor="conteudo">Conteúdo ministrado</Label>
            <Textarea id="conteudo" className="mt-2" value={conteudo} onChange={(e) => setConteudo(e.target.value)} rows={3} maxLength={5000} placeholder="Ex.: Equações do 1º grau — resolução de exercícios" />
            {podeReplicar && (
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                <p className="text-13 text-fg-subtle">Deu a mesma aula em outras turmas?</p>
                <Button variant="secondary" disabled={pendente} onClick={salvarEReplicar} className="min-h-11 w-full sm:w-auto">
                  <Copy size={16} strokeWidth={1.75} /> Salvar e replicar
                </Button>
              </div>
            )}
          </section>

          {/* Rodapé fixo acima da barra inferior (a lista tem padding equivalente); no desktop gruda no fim da área */}
          <div className="fixed inset-x-0 bottom-[var(--barra-inferior)] z-30 border-t border-line bg-surface/95 px-4 pt-2 pb-3 backdrop-blur md:sticky md:bottom-4 md:rounded-2xl md:border md:px-4 md:py-3 md:shadow-overlay">
            <div className="mx-auto flex max-w-3xl flex-col gap-2 md:flex-row md:items-center">
              <p className="text-center text-13 text-fg-muted tabular-nums md:flex-1 md:text-left" aria-live="polite">
                <span className="font-semibold text-fg">{totalPresentes}</span> {totalPresentes === 1 ? "presente" : "presentes"} · <span className={cn("font-semibold", totalFaltas ? "text-danger-fg" : "text-fg")}>{totalFaltas}</span> {totalFaltas === 1 ? "falta" : "faltas"}
              </p>
              <Button loading={pendente} onClick={salvar} className="h-12 w-full text-base md:h-10 md:w-auto md:text-sm">
                <Save size={18} strokeWidth={1.75} /> Salvar chamada
              </Button>
            </div>
          </div>
        </>
      )}

      <BottomSheet
        open={!!obsAberta}
        onClose={() => setObsAberta(null)}
        title={obsAberta ? `Observação · ${obsAberta.nome}` : "Observação"}
        description="Só o professor da disciplina e a gestão veem. Não aparece no portal do aluno."
        footer={obsAberta && (
          <>
            {observacoes[obsAberta.id] && <Button variant="ghost" disabled={salvandoObs} onClick={() => gravarObservacao("")}>Remover</Button>}
            <Button loading={salvandoObs} onClick={() => gravarObservacao(obsAberta.texto)} className="min-h-11 flex-1 md:flex-none">Salvar observação</Button>
          </>
        )}
      >
        {obsAberta && (
          <Textarea
            data-autofocus
            aria-label="Observação"
            value={obsAberta.texto}
            onChange={(e) => setObsAberta({ ...obsAberta, texto: e.target.value })}
            rows={4}
            maxLength={2000}
            placeholder="Ex.: chegou no 2º tempo; participou bem da atividade"
          />
        )}
      </BottomSheet>

      {chamada && replicar && (
        <ReplicarConteudo aulaId={chamada.aula.id} aberto alvosIniciais={replicar} onFechar={() => setReplicar(null)} />
      )}

      {/* Celular: um mês por vez, num painel que sobe de baixo */}
      {calendario && (
        <BottomSheet open={calendarioAberto} onClose={() => setCalendarioAberto(false)} title="Calendário da disciplina" description="Toque num dia com aula para abrir a chamada.">
          <CalendarioDisciplina dias={calendario.dias} linkBase={calendario.linkBase} selecionada={data} hoje={hoje} modo="mes" />
        </BottomSheet>
      )}
    </div>
    </div>
  )
}
