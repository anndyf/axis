"use client"

import { useRouter } from "next/navigation"

export default function SeletorTurma({ turmas, atual }: { turmas: { id: string; nome: string }[]; atual: string }) {
  const router = useRouter()
  return (
    <select
      aria-label="Turma"
      value={atual}
      onChange={(e) => router.push(e.target.value ? `/dashboard/frequencia?turma=${e.target.value}` : "/dashboard/frequencia")}
      className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none text-sm text-slate-700 focus:bg-white focus:border-blue-500"
    >
      <option value="">Escolha a turma…</option>
      {turmas.map((t) => <option key={t.id} value={t.id}>{t.nome}</option>)}
    </select>
  )
}
