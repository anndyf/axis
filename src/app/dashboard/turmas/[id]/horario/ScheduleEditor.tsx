"use client"

import { useState } from "react"
import { ArrowLeft, Save, Loader2, Calendar, Info, AlertTriangle, CheckCircle2 } from "lucide-react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { saveSchedule } from "../../schedule-actions"

// 1 = segunda ... 5 = sexta (mesma convenção do calendário letivo)
const DAYS = [
  { id: 1, label: "Seg" },
  { id: 2, label: "Ter" },
  { id: 3, label: "Qua" },
  { id: 4, label: "Qui" },
  { id: 5, label: "Sex" },
]

// Sem tempos de aula cadastrados para o turno, mostra 6 horários
const PERIODOS_PADRAO = 6

interface Props {
  turma: {
    id: string
    nome: string
    curso: string | null
    anoLetivo: number
    disciplinas: { id: string; nome: string; cargaHoraria: number | null; professor: string | null }[]
  }
  initialSchedule: { diaSemana: number; horario: number; disciplinaId: string | null; disciplina: string }[]
  tempos: { ordem: number; inicio: string; fim: string }[]
  /** aulas previstas no ano por disciplina (horário SALVO × calendário); null sem calendário */
  previstas: Record<string, number> | null
}

export default function ScheduleEditor({ turma, initialSchedule, tempos, previstas }: Props) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [aviso, setAviso] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null)

  // chave "dia-horario" -> disciplinaId
  const [schedule, setSchedule] = useState<Record<string, string>>(() =>
    Object.fromEntries(initialSchedule.filter((h) => h.disciplinaId).map((h) => [`${h.diaSemana}-${h.horario}`, h.disciplinaId!]))
  )
  // Células antigas cujo texto não casou com nenhuma disciplina da turma
  const naoVinculadas = initialSchedule.filter((h) => !h.disciplinaId)

  const disciplinaPorId = new Map(turma.disciplinas.map((d) => [d.id, d]))
  const maiorHorario = Math.max(0, ...initialSchedule.map((h) => h.horario))
  const periodos = Array.from({ length: Math.max(tempos.length || PERIODOS_PADRAO, maiorHorario) }, (_, i) => i + 1)
  const tempoDe = (ordem: number) => tempos.find((t) => t.ordem === ordem)

  // Tempos por semana no quadro atual (ainda não salvo)
  const temposSemana = new Map<string, number>()
  for (const id of Object.values(schedule)) if (id) temposSemana.set(id, (temposSemana.get(id) ?? 0) + 1)

  const handleSave = async () => {
    setSaving(true)
    setAviso(null)
    try {
      const items = Object.entries(schedule)
        .filter(([, disciplinaId]) => disciplinaId)
        .map(([key, disciplinaId]) => {
          const [diaSemana, horario] = key.split("-").map(Number)
          return { diaSemana, horario, disciplinaId }
        })
      const r = await saveSchedule(turma.id, items)
      if ("error" in r) {
        setAviso({ tipo: "erro", texto: r.error ?? "Erro ao salvar" })
      } else {
        setAviso({ tipo: "ok", texto: "Horário salvo." })
        router.refresh()
      }
    } catch {
      setAviso({ tipo: "erro", texto: "Erro ao salvar" })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="">
      <header className="mb-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Link href="/dashboard/turmas" aria-label="Voltar" className="hidden sm:inline-flex p-1.5 rounded-md text-fg-subtle transition-colors duration-150 hover:bg-subtle hover:text-fg">
                <ArrowLeft className="w-5 h-5 text-fg-muted" />
              </Link>
              <div>
                <h1 className="text-2xl font-semibold tracking-tight text-fg">
                  <Calendar className="w-6 h-6 text-fg-muted" />
                  Horário: {turma.nome}
                </h1>
                <p className="text-sm text-fg-muted">
                  {turma.curso} • {turma.anoLetivo}
                </p>
              </div>
            </div>
            <button
              onClick={handleSave}
              disabled={saving}
              className="inline-flex h-9 shrink-0 items-center gap-2 rounded-md bg-accent px-3 text-sm font-medium text-on-accent transition-colors duration-150 hover:bg-accent-hover disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span className="text-xs font-medium">Salvar Alterações</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {aviso && (
          <div className={`p-4 rounded-xl border text-sm flex items-center gap-2 ${aviso.tipo === "ok" ? "bg-success-subtle border-success-line text-success-fg" : "bg-danger-subtle border-danger-line text-danger-fg"}`}>
            {aviso.tipo === "ok" ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
            {aviso.texto}
          </div>
        )}

        <div className="bg-subtle border border-line rounded-xl p-6 flex items-start gap-4">
          <div className="w-10 h-10 bg-subtle-hover rounded-lg flex items-center justify-center shrink-0">
            <Info className="w-5 h-5 text-fg-muted" />
          </div>
          <div>
            <h4 className="text-sm font-medium text-fg mb-1">Como preencher</h4>
            <p className="text-xs text-fg-muted font-medium leading-relaxed">
              Selecione a <span className="font-medium">disciplina</span> de cada horário. O professor vem do vínculo da disciplina com a turma.
              Este horário, junto com o <Link href="/dashboard/configuracoes/calendario" className="underline">calendário letivo</Link>,
              define as aulas previstas e a chamada de cada dia.
            </p>
            {tempos.length === 0 && (
              <p className="text-xs text-warning-fg font-medium mt-2">
                Os tempos de aula (hora de início e fim) do turno desta turma ainda não foram cadastrados no calendário letivo.
              </p>
            )}
          </div>
        </div>

        {naoVinculadas.length > 0 && (
          <div className="bg-warning-subtle border border-warning-line rounded-lg p-4 text-sm text-warning-fg">
            <p className="font-medium flex items-center gap-2"><AlertTriangle className="w-4 h-4" /> Horários antigos sem disciplina vinculada</p>
            <p className="text-xs mt-1">
              O texto destes horários não corresponde a nenhuma disciplina da turma. Escolha a disciplina certa nas células (vazias abaixo) e salve:
            </p>
            <ul className="text-xs mt-2 list-disc pl-5">
              {naoVinculadas.map((h) => (
                <li key={`${h.diaSemana}-${h.horario}`}>{DAYS.find((d) => d.id === h.diaSemana)?.label}, {h.horario}º horário: “{h.disciplina}”</li>
              ))}
            </ul>
          </div>
        )}

        <div className="bg-surface rounded-xl shadow-card border border-line-strong overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1000px]">
              <thead>
                <tr className="bg-canvas border-b border-line-strong">
                  <th className="p-4 text-center w-24">
                    <span className="text-xs font-medium text-fg-subtle">Horário</span>
                  </th>
                  {DAYS.map((day) => (
                    <th key={day.id} className="p-4 w-[18%]">
                      <span className="text-sm font-medium text-fg block text-center bg-subtle/50 py-2 rounded-xl border border-line/50">
                        {day.label}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {periodos.map((period) => {
                  const tempo = tempoDe(period)
                  return (
                    <tr key={period} className="hover:bg-canvas/30 transition-colors">
                      <td className="p-4 text-center border-r border-line bg-canvas/30">
                        <span className="font-medium text-fg-subtle">{period}º</span>
                        {tempo && <span className="block text-xs text-fg-subtle">{tempo.inicio}–{tempo.fim}</span>}
                      </td>
                      {DAYS.map((day) => {
                        const key = `${day.id}-${period}`
                        const disciplinaId = schedule[key] ?? ""
                        const professor = disciplinaPorId.get(disciplinaId)?.professor
                        return (
                          <td key={day.id} className="p-2 border-r border-line last:border-0 h-20">
                            <div className="h-full flex flex-col items-center justify-center text-center">
                              <select
                                aria-label={`${day.label}, ${period}º horário`}
                                value={disciplinaId}
                                onChange={(e) => setSchedule((prev) => ({ ...prev, [key]: e.target.value }))}
                                className="w-full text-xs font-medium text-fg bg-transparent outline-none text-center appearance-none cursor-pointer"
                              >
                                <option value="">--------</option>
                                {turma.disciplinas.map((d) => (
                                  <option key={d.id} value={d.id}>{d.nome}</option>
                                ))}
                              </select>
                              {disciplinaId && (
                                <span className={`text-xs font-medium mt-0.5 truncate w-full px-1 ${professor ? "text-fg-subtle" : "text-warning-fg"}`}>
                                  {professor ?? "sem professor vinculado"}
                                </span>
                              )}
                            </div>
                          </td>
                        )
                      })}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Carga horária */}
        <div className="bg-surface rounded-2xl shadow-sm border border-line overflow-hidden">
          <div className="p-4 border-b border-line">
            <h2 className="font-medium text-fg">Aulas por disciplina</h2>
            <p className="text-xs text-fg-subtle">
              {previstas
                ? "Previstas no ano = horário salvo × dias letivos do calendário (já descontando feriados e recessos)."
                : "Cadastre o início e o fim do ano no calendário letivo para ver as aulas previstas no ano."}
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-canvas text-fg-subtle text-xs">
                <tr>
                  <th className="px-4 py-2 text-left">Disciplina</th>
                  <th className="px-4 py-2 text-center">Tempos/semana</th>
                  <th className="px-4 py-2 text-center">Previstas no ano</th>
                  <th className="px-4 py-2 text-center">Carga horária</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line-subtle">
                {turma.disciplinas.map((d) => {
                  const prev = previstas?.[d.id] ?? 0
                  const abaixo = d.cargaHoraria !== null && previstas !== null && prev < d.cargaHoraria
                  return (
                    <tr key={d.id}>
                      <td className="px-4 py-2 text-fg">{d.nome}</td>
                      <td className="px-4 py-2 text-center">{temposSemana.get(d.id) ?? 0}</td>
                      <td className={`px-4 py-2 text-center ${abaixo ? "text-danger-fg font-medium" : ""}`}>{previstas ? prev : "—"}</td>
                      <td className="px-4 py-2 text-center text-fg-subtle">{d.cargaHoraria ?? "—"}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  )
}
