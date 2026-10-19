"use client"

import { useState, useTransition } from "react"
import { FileCheck2, Plus, Trash2 } from "lucide-react"
import { Alert, Badge, Button, Card, CardBody, CardHeader, EmptyState, Field, Input, Select } from "@/components/ui"
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
    <Card>
      <CardHeader title="Atestados e justificativas" description="Valem para todas as faltas do aluno no período, inclusive as já lançadas." />
      <CardBody className="space-y-4">
        {aviso && <Alert tone={aviso.tipo === "ok" ? "success" : "danger"}>{aviso.texto}</Alert>}

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,2fr)_repeat(2,minmax(0,1fr))]">
          <Field label="Aluno">
            {(p) => (
              <Select {...p} value={nova.estudanteId} onChange={(e) => setNova({ ...nova, estudanteId: e.target.value })}>
                <option value="">Escolha…</option>
                {alunos.map((a) => <option key={a.id} value={a.id}>{a.nome} ({a.matricula})</option>)}
              </Select>
            )}
          </Field>
          <Field label="De">{(p) => <Input {...p} type="date" value={nova.inicio} onChange={(e) => setNova({ ...nova, inicio: e.target.value, fim: nova.fim || e.target.value })} />}</Field>
          <Field label="Até">{(p) => <Input {...p} type="date" value={nova.fim} min={nova.inicio} onChange={(e) => setNova({ ...nova, fim: e.target.value })} />}</Field>
          <Field label="Tipo">
            {(p) => <Select {...p} value={nova.tipo} onChange={(e) => setNova({ ...nova, tipo: e.target.value })}>{TIPOS.map((t) => <option key={t.id} value={t.id}>{t.nome}</option>)}</Select>}
          </Field>
          <Field label="Efeito">
            {(p) => <Select {...p} value={nova.efeito} onChange={(e) => setNova({ ...nova, efeito: e.target.value })}>{EFEITOS.map((t) => <option key={t.id} value={t.id}>{t.nome}</option>)}</Select>}
          </Field>
          <Field label="Observação" opcional>
            {(p) => <Input {...p} value={nova.descricao} maxLength={1000} onChange={(e) => setNova({ ...nova, descricao: e.target.value })} placeholder="Ex.: 3 dias, sem CID" />}
          </Field>
        </div>
        <div className="flex justify-end">
          <Button loading={pendente} disabled={!nova.estudanteId} onClick={() => executar(
            () => criarJustificativa(nova), "Justificativa registrada.",
            () => setNova({ estudanteId: "", inicio: "", fim: "", tipo: "ATESTADO", efeito: "ABONA", descricao: "" })
          )}>
            <Plus size={16} strokeWidth={1.75} /> Registrar
          </Button>
        </div>
      </CardBody>

      {justificativas.length === 0 ? (
        <EmptyState icon={FileCheck2} title="Nenhuma justificativa registrada nesta turma" className="border-t border-line-subtle py-8" />
      ) : (
        <ul className="divide-y divide-line-subtle border-t border-line-subtle">
          {justificativas.map((j) => (
            <li key={j.id} className="flex flex-wrap items-center gap-3 px-4 py-2.5 sm:px-5">
              <div className="min-w-[12rem] flex-1">
                <p className="text-13 font-medium text-fg">{j.aluno}</p>
                <p className="text-xs text-fg-subtle">
                  <span className="tabular-nums">{j.inicio === j.fim ? dataBR(j.inicio) : `${dataBR(j.inicio)} a ${dataBR(j.fim)}`}</span> · {nomeTipo(j.tipo)}
                  {j.descricao && ` · ${j.descricao}`}
                  {j.registradoPor && ` · por ${j.registradoPor}`}
                </p>
              </div>
              <Badge tone={j.efeito === "ABONA" ? "info" : "neutral"}>{j.efeito === "ABONA" ? "Abona" : "Só justifica"}</Badge>
              <Button size="sm" variant="ghost" disabled={pendente} aria-label={`Remover justificativa de ${j.aluno}`} onClick={() => {
                if (window.confirm("Remover esta justificativa? As faltas do período voltam a contar.")) executar(() => removerJustificativa(j.id), "Justificativa removida.")
              }}>
                <Trash2 size={16} strokeWidth={1.75} />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}
