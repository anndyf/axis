"use client"

import { useMemo, useState, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Lock, LockOpen, RotateCcw, Unlock, Ban } from "lucide-react"
import {
  Alert, Badge, Button, CabecalhoPagina, EmptyState, Field, Input, Painel, Select, Textarea, buttonClasses,
  TableContainer, Table, THead, TBody, TR, TH, TD,
} from "@/components/ui"
import { Dialog } from "@/components/ui/Dialog"
import { encerrarUnidade, desfazerEncerramento, reabrirUnidade, revogarReabertura } from "./actions"

export interface UnidadeTela {
  id: string
  etapaId: string | null
  nome: string
  inicio: string | null
  fim: string | null
  prazo: string | null
  encerrada: { data: string; origem: "PRAZO" | "MANUAL"; por: string | null } | null
  podeDesfazer: boolean
}
export interface EsquemaTela { id: string; nome: string; unidades: UnidadeTela[] }
export interface TurmaTela { id: string; nome: string; esquemaId: string; chamadaDiaria: boolean; disciplinas: { id: string; nome: string }[] }
export interface ReaberturaTela {
  id: string
  unidade: string
  esquema: string
  turma: string
  disciplina: string | null
  ate: string
  motivo: string
  criadoPor: string | null
  criadoEm: string
  situacao: "ATIVA" | "VENCIDA" | "REVOGADA"
  revogadaPor: string | null
}

const dataBR = (iso: string) => iso.split("-").reverse().join("/")
const CHAMADA_DIARIA = "__DIA__"

type Modal =
  | { tipo: "encerrar"; unidade: UnidadeTela; esquema: string }
  | { tipo: "desfazer"; unidade: UnidadeTela; esquema: string }
  | { tipo: "reabrir"; etapaId?: string }
  | { tipo: "revogar"; reabertura: ReaberturaTela }
  | null

function Situacao({ u }: { u: UnidadeTela }) {
  if (!u.etapaId) return <span className="text-fg-subtle">Sem datas no calendário</span>
  if (u.encerrada) {
    return (
      <span className="inline-flex flex-wrap items-center gap-1.5">
        <Badge tone="danger"><Lock size={11} strokeWidth={2} aria-hidden />Encerrada</Badge>
        <span className="text-fg-muted">em {dataBR(u.encerrada.data)} {u.encerrada.origem === "MANUAL" ? `por ${u.encerrada.por ?? "—"}` : "(prazo)"}</span>
      </span>
    )
  }
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      <Badge tone="success" dot>Aberta</Badge>
      <span className="text-fg-muted">{u.prazo ? `prazo em ${dataBR(u.prazo)}` : "sem prazo de lançamento"}</span>
    </span>
  )
}

export default function EncerramentoClient(props: {
  anoLetivo: number
  temCalendario: boolean
  podeGerir: boolean
  esquemas: EsquemaTela[]
  reaberturas: ReaberturaTela[]
  turmas: TurmaTela[]
  ateSugerido: string
  ateMinimo: string
  ateMaximo: string
}) {
  const router = useRouter()
  const [pendente, startTransition] = useTransition()
  const [aviso, setAviso] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null)
  const [modal, setModal] = useState<Modal>(null)
  const [erroModal, setErroModal] = useState<string | null>(null)
  const [motivo, setMotivo] = useState("")
  const [form, setForm] = useState({ etapaId: "", turmaId: "", disciplinaId: "", ate: props.ateSugerido })
  const [mostrarTodas, setMostrarTodas] = useState(false)

  // Unidades encerradas (as que podem ser reabertas), com o esquema de cada
  const encerradas = useMemo(
    () => props.esquemas.flatMap((e) => e.unidades.filter((u) => u.etapaId && u.encerrada).map((u) => ({ etapaId: u.etapaId!, nome: `${u.nome} · ${e.nome}`, esquemaId: e.id }))),
    [props.esquemas]
  )
  const esquemaDaEtapa = encerradas.find((e) => e.etapaId === form.etapaId)?.esquemaId
  const turmasDaEtapa = props.turmas.filter((t) => t.esquemaId === esquemaDaEtapa)
  const turma = turmasDaEtapa.find((t) => t.id === form.turmaId)

  function abrir(m: Modal) {
    setErroModal(null)
    setMotivo("")
    if (m?.tipo === "reabrir") setForm({ etapaId: m.etapaId ?? encerradas[0]?.etapaId ?? "", turmaId: "", disciplinaId: "", ate: props.ateSugerido })
    setModal(m)
  }

  const executar = (acao: () => Promise<{ ok: true } | { erro: string }>, sucesso: string) =>
    startTransition(async () => {
      const r = await acao()
      if ("erro" in r) { setErroModal(r.erro); return }
      setModal(null)
      setAviso({ tipo: "ok", texto: sucesso })
      router.refresh()
    })

  const reaberturasVisiveis = mostrarTodas ? props.reaberturas : props.reaberturas.filter((r) => r.situacao === "ATIVA")

  return (
    <div className="space-y-5">
      <CabecalhoPagina
        titulo="Encerramento de unidades"
        descricao="Unidade encerrada fica trancada: notas, chamadas, recuperação e conselho não podem ser alterados. A gestão reabre de forma pontual, por turma e disciplina."
        dados={[{ rotulo: "Ano letivo", valor: props.anoLetivo }]}
        acoes={<Link href="/dashboard/configuracoes/calendario" className={buttonClasses({ variant: "secondary", size: "sm" })}>Calendário letivo</Link>}
      />

      {aviso && <Alert tone={aviso.tipo === "ok" ? "success" : "danger"}>{aviso.texto}</Alert>}
      {!props.podeGerir && (
        <Alert tone="info">Você pode acompanhar a situação das unidades. Encerrar e reabrir é feito pela Direção ou pela Coordenação.</Alert>
      )}
      {!props.temCalendario && (
        <Alert tone="warning" title="Calendário não cadastrado">
          Sem o calendário letivo de {props.anoLetivo}, nenhuma unidade é encerrada. Cadastre o período e as datas das unidades em Calendário letivo.
        </Alert>
      )}

      {props.esquemas.map((esq) => (
        <Painel key={esq.id} titulo={esq.nome} semRecuo>
          <TableContainer semBorda>
            <Table>
              <THead>
                <tr>
                  <TH>Unidade</TH>
                  <TH>Período</TH>
                  <TH>Situação</TH>
                  {props.podeGerir && <TH className="text-right">Ação</TH>}
                </tr>
              </THead>
              <TBody>
                {esq.unidades.map((u) => (
                  <TR key={u.id}>
                    <TD className="font-medium text-fg whitespace-nowrap">{u.nome}</TD>
                    <TD className="whitespace-nowrap tabular-nums text-fg-muted">{u.inicio && u.fim ? `${dataBR(u.inicio)} a ${dataBR(u.fim)}` : "—"}</TD>
                    <TD><Situacao u={u} /></TD>
                    {props.podeGerir && (
                      <TD className="text-right whitespace-nowrap">
                        {u.etapaId && !u.encerrada && (
                          <Button size="sm" variant="secondary" onClick={() => abrir({ tipo: "encerrar", unidade: u, esquema: esq.nome })}>
                            <Lock size={13} strokeWidth={1.75} aria-hidden />Encerrar agora
                          </Button>
                        )}
                        {u.encerrada && u.podeDesfazer && (
                          <Button size="sm" variant="ghost" onClick={() => abrir({ tipo: "desfazer", unidade: u, esquema: esq.nome })}>
                            <RotateCcw size={13} strokeWidth={1.75} aria-hidden />Desfazer encerramento
                          </Button>
                        )}
                        {u.encerrada && !u.podeDesfazer && (
                          <Button size="sm" variant="ghost" onClick={() => abrir({ tipo: "reabrir", etapaId: u.etapaId! })}>
                            <Unlock size={13} strokeWidth={1.75} aria-hidden />Reabrir
                          </Button>
                        )}
                      </TD>
                    )}
                  </TR>
                ))}
              </TBody>
            </Table>
          </TableContainer>
        </Painel>
      ))}

      <Painel
        titulo="Reaberturas"
        descricao="Liberam uma unidade encerrada só para uma turma e disciplina, até a data escolhida. Depois da data, trancam de novo sozinhas."
        acoes={
          <>
            <Button size="sm" variant="ghost" onClick={() => setMostrarTodas((v) => !v)}>{mostrarTodas ? "Só as ativas" : "Mostrar encerradas"}</Button>
            {props.podeGerir && (
              <Button size="sm" onClick={() => abrir({ tipo: "reabrir" })} disabled={!encerradas.length}>
                <LockOpen size={13} strokeWidth={1.75} aria-hidden />Reabrir para turma e disciplina
              </Button>
            )}
          </>
        }
        semRecuo
      >
        {reaberturasVisiveis.length === 0 ? (
          <EmptyState title={mostrarTodas ? "Nenhuma reabertura neste ano letivo" : "Nenhuma reabertura ativa"} description={encerradas.length ? undefined : "Nenhuma unidade está encerrada."} />
        ) : (
          <TableContainer semBorda>
            <Table>
              <THead>
                <tr>
                  <TH>Turma</TH>
                  <TH>Disciplina</TH>
                  <TH>Unidade</TH>
                  <TH>Até</TH>
                  <TH>Motivo</TH>
                  <TH>Quem</TH>
                  <TH>Situação</TH>
                  {props.podeGerir && <TH className="text-right">Ação</TH>}
                </tr>
              </THead>
              <TBody>
                {reaberturasVisiveis.map((r) => (
                  <TR key={r.id}>
                    <TD className="font-medium text-fg whitespace-nowrap">{r.turma}</TD>
                    <TD className="whitespace-nowrap">{r.disciplina ?? "Chamada diária"}</TD>
                    <TD className="whitespace-nowrap text-fg-muted">{r.unidade}</TD>
                    <TD className="whitespace-nowrap tabular-nums">{dataBR(r.ate)}</TD>
                    <TD className="min-w-48 text-fg-muted">{r.motivo}</TD>
                    <TD className="whitespace-nowrap text-fg-muted">{r.criadoPor ?? "—"} · {dataBR(r.criadoEm)}</TD>
                    <TD className="whitespace-nowrap">
                      {r.situacao === "ATIVA" ? <Badge tone="warning" dot>Ativa</Badge> : r.situacao === "REVOGADA" ? <Badge>Revogada{r.revogadaPor ? ` por ${r.revogadaPor}` : ""}</Badge> : <Badge>Vencida</Badge>}
                    </TD>
                    {props.podeGerir && (
                      <TD className="text-right whitespace-nowrap">
                        {r.situacao === "ATIVA" && (
                          <Button size="sm" variant="ghost" onClick={() => abrir({ tipo: "revogar", reabertura: r })}>
                            <Ban size={13} strokeWidth={1.75} aria-hidden />Revogar
                          </Button>
                        )}
                      </TD>
                    )}
                  </TR>
                ))}
              </TBody>
            </Table>
          </TableContainer>
        )}
      </Painel>

      {/* Encerrar agora */}
      <Dialog
        open={modal?.tipo === "encerrar"}
        onClose={() => setModal(null)}
        title={modal?.tipo === "encerrar" ? `Encerrar a ${modal.unidade.nome}?` : ""}
        description={modal?.tipo === "encerrar" ? `${modal.esquema}. Notas, chamadas e avaliações do período ficam trancadas para toda a escola${modal.unidade.prazo ? ` antes do prazo (${dataBR(modal.unidade.prazo)})` : ""}. Enquanto o prazo não passar, é possível desfazer.` : undefined}
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setModal(null)}>Cancelar</Button>
            <Button loading={pendente} onClick={() => modal?.tipo === "encerrar" && executar(() => encerrarUnidade(modal.unidade.etapaId!), `${modal.unidade.nome} encerrada.`)}>Encerrar agora</Button>
          </>
        }
      >
        {erroModal && <Alert tone="danger">{erroModal}</Alert>}
      </Dialog>

      {/* Desfazer encerramento */}
      <Dialog
        open={modal?.tipo === "desfazer"}
        onClose={() => setModal(null)}
        title={modal?.tipo === "desfazer" ? `Desfazer o encerramento da ${modal.unidade.nome}?` : ""}
        description="Use quando a unidade foi encerrada antes do prazo por engano. A unidade volta a ficar aberta para toda a escola. Fica registrado na auditoria."
        footer={
          <>
            <Button variant="secondary" onClick={() => setModal(null)}>Cancelar</Button>
            <Button loading={pendente} onClick={() => modal?.tipo === "desfazer" && executar(() => desfazerEncerramento(modal.unidade.etapaId!, motivo), `Encerramento da ${modal.unidade.nome} desfeito.`)}>Desfazer encerramento</Button>
          </>
        }
      >
        <div className="space-y-3">
          {erroModal && <Alert tone="danger">{erroModal}</Alert>}
          <Field label="Motivo" obrigatorio>
            {(p) => <Textarea {...p} value={motivo} onChange={(e) => setMotivo(e.target.value)} maxLength={1000} />}
          </Field>
        </div>
      </Dialog>

      {/* Reabrir para turma e disciplina */}
      <Dialog
        open={modal?.tipo === "reabrir"}
        onClose={() => setModal(null)}
        title="Reabrir para turma e disciplina"
        description="Só a turma e a disciplina escolhidas poderão alterar notas, chamadas, recuperação e conselho da unidade, até a data informada."
        footer={
          <>
            <Button variant="secondary" onClick={() => setModal(null)}>Cancelar</Button>
            <Button
              loading={pendente}
              disabled={!form.etapaId || !form.turmaId || !form.disciplinaId}
              onClick={() => executar(() => reabrirUnidade({ etapaId: form.etapaId, turmaId: form.turmaId, disciplinaId: form.disciplinaId === CHAMADA_DIARIA ? null : form.disciplinaId, ate: form.ate, motivo }), "Unidade reaberta para a turma e a disciplina.")}
            >
              Reabrir
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          {erroModal && <Alert tone="danger">{erroModal}</Alert>}
          <Field label="Unidade encerrada" obrigatorio>
            {(p) => (
              <Select {...p} value={form.etapaId} onChange={(e) => setForm({ ...form, etapaId: e.target.value, turmaId: "", disciplinaId: "" })}>
                {encerradas.map((e) => <option key={e.etapaId} value={e.etapaId}>{e.nome}</option>)}
              </Select>
            )}
          </Field>
          <Field label="Turma" obrigatorio hint={turmasDaEtapa.length ? undefined : "Nenhuma turma segue o esquema desta unidade."}>
            {(p) => (
              <Select {...p} value={form.turmaId} onChange={(e) => setForm({ ...form, turmaId: e.target.value, disciplinaId: "" })}>
                <option value="">Selecione…</option>
                {turmasDaEtapa.map((t) => <option key={t.id} value={t.id}>{t.nome}</option>)}
              </Select>
            )}
          </Field>
          <Field label="Disciplina" obrigatorio>
            {(p) => (
              <Select {...p} value={form.disciplinaId} disabled={!turma} onChange={(e) => setForm({ ...form, disciplinaId: e.target.value })}>
                <option value="">Selecione…</option>
                {turma?.chamadaDiaria && <option value={CHAMADA_DIARIA}>Chamada diária da turma</option>}
                {turma?.disciplinas.map((d) => <option key={d.id} value={d.id}>{d.nome}</option>)}
              </Select>
            )}
          </Field>
          <Field label="Reaberta até" obrigatorio hint={`Padrão de 7 dias; no máximo até ${dataBR(props.ateMaximo)}.`}>
            {(p) => <Input {...p} type="date" value={form.ate} min={props.ateMinimo} max={props.ateMaximo} onChange={(e) => setForm({ ...form, ate: e.target.value })} />}
          </Field>
          <Field label="Motivo" obrigatorio>
            {(p) => <Textarea {...p} value={motivo} onChange={(e) => setMotivo(e.target.value)} maxLength={1000} />}
          </Field>
        </div>
      </Dialog>

      {/* Revogar */}
      <Dialog
        open={modal?.tipo === "revogar"}
        onClose={() => setModal(null)}
        title="Revogar a reabertura?"
        description={modal?.tipo === "revogar" ? `${modal.reabertura.turma} · ${modal.reabertura.disciplina ?? "Chamada diária"} · ${modal.reabertura.unidade}. A unidade volta a ficar trancada para esta turma e disciplina.` : undefined}
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setModal(null)}>Cancelar</Button>
            <Button variant="danger" loading={pendente} onClick={() => modal?.tipo === "revogar" && executar(() => revogarReabertura(modal.reabertura.id), "Reabertura revogada.")}>Revogar</Button>
          </>
        }
      >
        {erroModal && <Alert tone="danger">{erroModal}</Alert>}
      </Dialog>
    </div>
  )
}
