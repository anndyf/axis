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
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-300 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Link href="/dashboard/turmas" className="p-2 hover:bg-slate-200 rounded-lg transition-colors">
                <ArrowLeft className="w-5 h-5 text-slate-700" />
              </Link>
              <div>
                <h1 className="text-2xl font-medium text-slate-800 tracking-tight flex items-center gap-2">
                  <Calendar className="w-6 h-6 text-slate-700" />
                  Horário: {turma.nome}
                </h1>
                <p className="text-xs font-medium text-slate-400 uppercase tracking-widest">
                  {turma.curso} • {turma.anoLetivo}
                </p>
              </div>
            </div>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 bg-slate-900 text-white px-6 py-3 rounded-xl hover:bg-slate-800 transition-all shadow-lg active:scale-95 disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span className="text-xs font-medium uppercase tracking-wide">Salvar Alterações</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {aviso && (
          <div className={`p-4 rounded-xl border text-sm flex items-center gap-2 ${aviso.tipo === "ok" ? "bg-green-50 border-green-200 text-green-700" : "bg-red-50 border-red-200 text-red-700"}`}>
            {aviso.tipo === "ok" ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
            {aviso.texto}
          </div>
        )}

        <div className="bg-slate-100 border border-slate-200 rounded-[2rem] p-6 flex items-start gap-4">
          <div className="w-10 h-10 bg-slate-200 rounded-2xl flex items-center justify-center shrink-0">
            <Info className="w-5 h-5 text-slate-700" />
          </div>
          <div>
            <h4 className="text-sm font-medium text-blue-900 uppercase tracking-tight mb-1">Como preencher</h4>
            <p className="text-xs text-slate-700 font-medium leading-relaxed">
              Selecione a <span className="font-medium">disciplina</span> de cada horário. O professor vem do vínculo da disciplina com a turma.
              Este horário, junto com o <Link href="/dashboard/configuracoes/calendario" className="underline">calendário letivo</Link>,
              define as aulas previstas e a chamada de cada dia.
            </p>
            {tempos.length === 0 && (
              <p className="text-[11px] text-amber-700 font-medium mt-2">
                Os tempos de aula (hora de início e fim) do turno desta turma ainda não foram cadastrados no calendário letivo.
              </p>
            )}
          </div>
        </div>

        {naoVinculadas.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-sm text-amber-800">
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

        <div className="bg-white rounded-[2rem] shadow-xl border border-slate-300 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1000px]">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-300">
                  <th className="p-4 text-center w-24">
                    <span className="text-[10px] font-medium text-slate-400 uppercase tracking-widest">Horário</span>
                  </th>
                  {DAYS.map((day) => (
                    <th key={day.id} className="p-4 w-[18%]">
                      <span className="text-sm font-medium text-slate-800 uppercase tracking-tight block text-center bg-slate-100/50 py-2 rounded-xl border border-slate-200/50">
                        {day.label}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {periodos.map((period) => {
                  const tempo = tempoDe(period)
                  return (
                    <tr key={period} className="hover:bg-slate-50/30 transition-colors">
                      <td className="p-4 text-center border-r border-slate-200 bg-slate-50/30">
                        <span className="font-medium text-slate-500">{period}º</span>
                        {tempo && <span className="block text-[10px] text-slate-400">{tempo.inicio}–{tempo.fim}</span>}
                      </td>
                      {DAYS.map((day) => {
                        const key = `${day.id}-${period}`
                        const disciplinaId = schedule[key] ?? ""
                        const professor = disciplinaPorId.get(disciplinaId)?.professor
                        return (
                          <td key={day.id} className="p-2 border-r border-slate-200 last:border-0 h-20">
                            <div className="h-full flex flex-col items-center justify-center text-center">
                              <select
                                aria-label={`${day.label}, ${period}º horário`}
                                value={disciplinaId}
                                onChange={(e) => setSchedule((prev) => ({ ...prev, [key]: e.target.value }))}
                                className="w-full text-[10px] font-medium text-slate-800 bg-transparent outline-none text-center appearance-none cursor-pointer"
                              >
                                <option value="">--------</option>
                                {turma.disciplinas.map((d) => (
                                  <option key={d.id} value={d.id}>{d.nome}</option>
                                ))}
                              </select>
                              {disciplinaId && (
                                <span className={`text-[9px] font-medium uppercase tracking-tighter mt-0.5 truncate w-full px-1 ${professor ? "text-slate-400" : "text-amber-600"}`}>
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
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-200">
            <h2 className="font-medium text-slate-800">Aulas por disciplina</h2>
            <p className="text-xs text-slate-500">
              {previstas
                ? "Previstas no ano = horário salvo × dias letivos do calendário (já descontando feriados e recessos)."
                : "Cadastre o início e o fim do ano no calendário letivo para ver as aulas previstas no ano."}
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
                <tr>
                  <th className="px-4 py-2 text-left">Disciplina</th>
                  <th className="px-4 py-2 text-center">Tempos/semana</th>
                  <th className="px-4 py-2 text-center">Previstas no ano</th>
                  <th className="px-4 py-2 text-center">Carga horária</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {turma.disciplinas.map((d) => {
                  const prev = previstas?.[d.id] ?? 0
                  const abaixo = d.cargaHoraria !== null && previstas !== null && prev < d.cargaHoraria
                  return (
                    <tr key={d.id}>
                      <td className="px-4 py-2 text-slate-800">{d.nome}</td>
                      <td className="px-4 py-2 text-center">{temposSemana.get(d.id) ?? 0}</td>
                      <td className={`px-4 py-2 text-center ${abaixo ? "text-rose-600 font-medium" : ""}`}>{previstas ? prev : "—"}</td>
                      <td className="px-4 py-2 text-center text-slate-500">{d.cargaHoraria ?? "—"}</td>
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
