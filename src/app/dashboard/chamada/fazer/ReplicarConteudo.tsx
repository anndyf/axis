"use client"

import { useState } from "react"
import { AlertTriangle, Check } from "lucide-react"
import { BottomSheet, Button, Checkbox, cn } from "@/components/ui"
import { opcoesReplicacao, replicarConteudo, type AlvoReplicacao, type ResultadoReplicacao } from "../actions"

type Linha = AlvoReplicacao & { marcado: boolean; sobrescrever: boolean }

const STATUS: Record<ResultadoReplicacao["status"], string> = {
  criado: "Conteúdo gravado (aula prevista criada)",
  gravado: "Conteúdo gravado",
  igual: "Já estava com este conteúdo",
  conflito: "Não gravado: já tem outro conteúdo",
  erro: "Não gravado",
}

/**
 * "Salvar e replicar": depois de salvar a chamada, leva o mesmo conteúdo
 * para a mesma disciplina do professor em outras turmas. A data sugerida
 * pode ser trocada; conteúdo existente só é substituído se marcado.
 */
export default function ReplicarConteudo({ aulaId, aberto, alvosIniciais, onFechar }: {
  aulaId: string
  aberto: boolean
  alvosIniciais: AlvoReplicacao[]
  onFechar: () => void
}) {
  const [linhas, setLinhas] = useState<Linha[]>(() => alvosIniciais.map((a) => ({ ...a, marcado: a.temAula && !a.conteudoAtual, sobrescrever: false })))
  const [resultados, setResultados] = useState<Record<string, ResultadoReplicacao>>({})
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const mudar = (id: string, parcial: Partial<Linha>) => setLinhas((ls) => ls.map((l) => (l.disciplinaId === id ? { ...l, ...parcial } : l)))

  const trocarData = async (id: string, data: string) => {
    mudar(id, { data })
    if (!data) return
    const r = await opcoesReplicacao(aulaId, { [id]: data })
    if ("erro" in r) { setErro(r.erro); return }
    const novo = r.alvos.find((a) => a.disciplinaId === id)
    if (novo) mudar(id, { data: novo.data, temAula: novo.temAula, conteudoAtual: novo.conteudoAtual, marcado: novo.temAula && !novo.conteudoAtual, sobrescrever: false })
  }

  const escolhidas = linhas.filter((l) => l.marcado && l.data && l.temAula && (!l.conteudoAtual || l.sobrescrever))

  const replicar = async () => {
    setEnviando(true)
    setErro(null)
    const r = await replicarConteudo(aulaId, escolhidas.map((l) => ({ disciplinaId: l.disciplinaId, data: l.data!, sobrescrever: l.sobrescrever })))
    setEnviando(false)
    if ("erro" in r) { setErro(r.erro); return }
    setResultados(Object.fromEntries(r.resultados.map((x) => [x.disciplinaId, x])))
  }

  const terminou = Object.keys(resultados).length > 0

  return (
    <BottomSheet
      open={aberto}
      onClose={onFechar}
      title="Replicar conteúdo"
      description="A mesma disciplina nas suas outras turmas. Só o conteúdo é copiado; as faltas não mudam."
      footer={terminou ? (
        <Button onClick={onFechar} className="min-h-11 flex-1 md:flex-none">Concluir</Button>
      ) : (
        <>
          <Button variant="ghost" onClick={onFechar}>Agora não</Button>
          <Button loading={enviando} disabled={escolhidas.length === 0} onClick={replicar} className="min-h-11 flex-1 md:flex-none">
            Replicar em {escolhidas.length} {escolhidas.length === 1 ? "turma" : "turmas"}
          </Button>
        </>
      )}
    >
      {erro && <p role="alert" className="mb-3 rounded-xl bg-danger-subtle px-3 py-2 text-13 text-danger-fg">{erro}</p>}
      <ul className="space-y-3">
        {linhas.map((l) => {
          const res = resultados[l.disciplinaId]
          return (
            <li key={l.disciplinaId} className="rounded-2xl border border-line p-3">
              <div className="flex items-start gap-3">
                <span className="pt-0.5">
                  <Checkbox
                    aria-label={`Replicar em ${l.turmaNome}`}
                    checked={l.marcado}
                    disabled={!l.temAula || terminou}
                    onChange={(e) => mudar(l.disciplinaId, { marcado: e.target.checked })}
                    className="size-5"
                  />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="break-words text-sm font-medium text-fg"><span className="font-mono">{l.turmaNome}</span> · {l.nome}</p>
                  <label className="mt-2 flex flex-wrap items-center gap-2 text-13 text-fg-muted">
                    Aula de
                    <input type="date" value={l.data ?? ""} disabled={terminou} onChange={(e) => trocarData(l.disciplinaId, e.target.value)} className="h-10 rounded-lg border border-transparent bg-subtle px-2 text-sm text-fg outline-none focus:border-accent focus:ring-3 focus:ring-ring/40" />
                  </label>
                  {!l.data && <p className="mt-1.5 text-13 text-fg-subtle">Nenhuma aula anterior sem conteúdo. Escolha uma data.</p>}
                  {l.data && !l.temAula && (
                    <p className="mt-1.5 flex items-center gap-1.5 text-13 text-warning-fg"><AlertTriangle size={14} strokeWidth={1.75} aria-hidden /> Esta turma não tem esta disciplina no horário nesse dia.</p>
                  )}
                  {l.conteudoAtual && !res && (
                    <div className="mt-2 rounded-xl bg-warning-subtle px-3 py-2 text-13 text-warning-fg">
                      <p className="break-words">Já tem conteúdo: “{l.conteudoAtual}”</p>
                      <div className="mt-1.5">
                        <Checkbox label="Substituir pelo novo conteúdo" checked={l.sobrescrever} onChange={(e) => mudar(l.disciplinaId, { sobrescrever: e.target.checked, marcado: e.target.checked || l.marcado })} />
                      </div>
                    </div>
                  )}
                  {res && (
                    <p className={cn("mt-2 flex items-center gap-1.5 text-13", res.status === "criado" || res.status === "gravado" || res.status === "igual" ? "text-success-fg" : "text-danger-fg")} role="status">
                      {res.status === "criado" || res.status === "gravado" || res.status === "igual" ? <Check size={14} strokeWidth={2} aria-hidden /> : <AlertTriangle size={14} strokeWidth={1.75} aria-hidden />}
                      {STATUS[res.status]}{res.mensagem && res.status === "erro" ? `: ${res.mensagem}` : ""}
                    </p>
                  )}
                </div>
              </div>
            </li>
          )
        })}
      </ul>
    </BottomSheet>
  )
}
