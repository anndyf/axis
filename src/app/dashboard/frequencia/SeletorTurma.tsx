"use client"

import { useRouter } from "next/navigation"
import { Select } from "@/components/ui"

export default function SeletorTurma({ turmas, atual }: { turmas: { id: string; nome: string }[]; atual: string }) {
  const router = useRouter()
  return (
    <Select
      aria-label="Turma"
      value={atual}
      onChange={(e) => router.push(e.target.value ? `/dashboard/frequencia?turma=${e.target.value}` : "/dashboard/frequencia")}
      className="min-w-48"
    >
      <option value="">Escolha a turma…</option>
      {turmas.map((t) => <option key={t.id} value={t.id}>{t.nome}</option>)}
    </Select>
  )
}
