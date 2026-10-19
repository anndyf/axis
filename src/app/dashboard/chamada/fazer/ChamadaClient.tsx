"use client"

import { useEffect, useState, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, Save, Minus, Plus, Ban, Users } from "lucide-react"
import { Alert, Avatar, Badge, Button, Card, CardBody, CardHeader, EmptyState, Label, PageHeader, SkeletonRows, Textarea, buttonClasses } from "@/components/ui"
import { abrirChamada, salvarChamada, cancelarAula, type ChamadaAberta } from "../actions"

interface Props {
  turmaId: string
  disciplinaId: string | null
  data: string
  hoje: string
}

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
    <div className="mx-auto max-w-3xl space-y-6 pb-24">
      <PageHeader
        title={chamada ? (chamada.disciplina?.nome ?? "Chamada diária") : "Chamada"}
        description={
          <>
            {chamada ? `${chamada.turma.nome} · ${dataBR(data)}` : dataBR(data)}
            {chamada && chamada.aula.tempos.length > 0 && ` · ${chamada.aula.tempos.map((t) => `${t}º`).join(", ")} ${chamada.aula.tempos.length > 1 ? "tempos" : "tempo"}`}
          </>
        }
        actions={
          <>
            <Link href={`/dashboard/chamada?data=${data}`} className={buttonClasses({ variant: "ghost", size: "md" })}><ArrowLeft size={16} strokeWidth={1.75} /> Voltar</Link>
            <input type="date" aria-label="Data da chamada" value={data} max={hoje} onChange={(e) => trocarData(e.target.value)} className="h-9 rounded-lg border border-line bg-surface px-3 text-sm text-fg shadow-card outline-none focus:border-accent focus:ring-3 focus:ring-ring/40" />
          </>
        }
      />

      {erroAbertura && <Alert tone="danger" title="Não foi possível abrir a chamada">{erroAbertura}</Alert>}
      {aviso && <Alert tone={aviso.tipo === "ok" ? "success" : "danger"}>{aviso.texto}</Alert>}

      {!chamada && !erroAbertura && (
        <Card><SkeletonRows linhas={8} colunas={2} /></Card>
      )}

      {chamada && (
        <>
          {chamada.aula.situacao === "CANCELADA" && (
            <Alert tone="info">Esta aula está marcada como não dada. Salvar a chamada volta a contá-la.</Alert>
          )}

          <Card>
            <CardHeader
              title={`${chamada.alunos.length} alunos`}
              actions={<Badge tone={totalFaltosos === 0 ? "success" : "danger"} dot>{totalFaltosos === 0 ? "Todos presentes" : `${totalFaltosos} com falta`}</Badge>}
            />
            {chamada.alunos.length === 0 ? (
              <EmptyState icon={Users} title="Nenhum aluno nesta turma" description="Cadastre os estudantes da turma para fazer a chamada." />
            ) : (
              <ul className="divide-y divide-line-subtle">
                {chamada.alunos.map((a) => {
                  const q = faltas[a.id] ?? 0
                  const just = chamada.justificados[a.id]
                  return (
                    <li key={a.id} className={`flex items-center gap-3 px-4 py-2 transition-colors duration-150 sm:px-5 ${q ? "bg-danger-subtle/60" : ""}`}>
                      <Avatar nome={a.nome} size="sm" />
                      <div className="min-w-0 flex-1">
                        <p className={`truncate text-13 ${q ? "font-medium text-danger-fg" : "text-fg"}`}>{a.nome}</p>
                        <p className="flex flex-wrap items-center gap-x-1.5 text-xs text-fg-subtle">
                          <span className="font-mono">{a.matricula}</span>
                          {a.status && a.status !== "ATIVO" && <span>· {a.status}</span>}
                          {just && <span className="text-info-fg">· {just === "ABONA" ? "falta abonada (atestado)" : "justificado"}</span>}
                        </p>
                      </div>
                      {q > 0 && quantidade > 1 && (
                        <div className="flex items-center gap-0.5">
                          <Button size="sm" variant="ghost" aria-label="Menos uma falta" onClick={() => ajustar(a.id, -1)}><Minus size={14} strokeWidth={1.75} /></Button>
                          <span className="w-12 text-center text-xs tabular-nums text-fg-muted">{q} de {quantidade}</span>
                          <Button size="sm" variant="ghost" aria-label="Mais uma falta" onClick={() => ajustar(a.id, 1)}><Plus size={14} strokeWidth={1.75} /></Button>
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() => alternar(a.id)}
                        aria-pressed={q > 0}
                        aria-label={`${a.nome}: ${q ? "faltou" : "presente"}. Tocar para ${q ? "marcar presença" : "marcar falta"}`}
                        className={`h-8 w-24 shrink-0 rounded-md border text-xs font-medium transition-colors duration-150 ${q ? "border-danger-line bg-surface text-danger-fg hover:bg-danger-subtle" : "border-line bg-surface text-fg-muted hover:border-line-strong hover:text-fg"}`}
                      >
                        {q ? "Faltou" : "Presente"}
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </Card>

          <Card>
            <CardBody className="space-y-2">
              <Label htmlFor="conteudo">Conteúdo ministrado</Label>
              <Textarea id="conteudo" value={conteudo} onChange={(e) => setConteudo(e.target.value)} rows={3} maxLength={5000} placeholder="Ex.: Equações do 1º grau — resolução de exercícios" />
            </CardBody>
          </Card>

          {/* Ações fixas no rodapé: alcançáveis com o polegar no celular */}
          <div className="sticky bottom-4 z-20 flex flex-wrap justify-end gap-2 rounded-lg border border-line bg-elevated/95 p-2 shadow-overlay backdrop-blur">
            {chamada.aula.situacao !== "CANCELADA" && (
              <Button variant="ghost" disabled={pendente} onClick={naoDada}><Ban size={16} strokeWidth={1.75} /> Aula não dada</Button>
            )}
            <Button loading={pendente} onClick={salvar}><Save size={16} strokeWidth={1.75} /> Salvar chamada</Button>
          </div>
        </>
      )}
    </div>
  )
}
