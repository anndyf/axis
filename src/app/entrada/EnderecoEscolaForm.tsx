"use client"

import { useState } from "react"
import { ArrowRight } from "lucide-react"
import { Button } from "@/components/ui"
import { enderecoDaEscola, normalizarSlug, type Origem } from "@/lib/services/dominio"

/**
 * Leva para https://<endereço>.<domínio>. Não consulta se a escola existe
 * (não revela quais escolas usam o sistema): se o endereço estiver errado, a
 * própria página de "escola não encontrada" orienta.
 */
export default function EnderecoEscolaForm({ origem }: { origem: Origem }) {
  const [slug, setSlug] = useState("")
  const [erro, setErro] = useState("")
  const sufixo = `.${origem.raiz.split(":")[0]}`

  const ir = (e: React.FormEvent) => {
    e.preventDefault()
    const s = normalizarSlug(slug)
    if (!s) { setErro("Use só letras, números e hífen, como em “minhaescola”."); return }
    window.location.href = enderecoDaEscola(s, origem)
  }

  return (
    <form onSubmit={ir} className="space-y-3">
      <label htmlFor="endereco" className="block text-13 font-medium text-fg">Endereço da sua escola</label>
      <div className="flex h-10 items-center overflow-hidden rounded-lg border border-line bg-surface shadow-card transition-[border-color,box-shadow] duration-150 focus-within:border-accent focus-within:ring-3 focus-within:ring-ring/40" aria-invalid={!!erro}>
        <input
          id="endereco"
          value={slug}
          onChange={(e) => { setSlug(e.target.value); setErro("") }}
          placeholder="minhaescola"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          autoComplete="off"
          aria-describedby={erro ? "endereco-erro" : "endereco-ajuda"}
          className="h-full min-w-0 flex-1 bg-transparent px-3 text-sm text-fg outline-none placeholder:text-fg-subtle"
        />
        <span className="shrink-0 pr-3 text-sm text-fg-subtle">{sufixo}</span>
      </div>
      {erro
        ? <p id="endereco-erro" role="alert" className="text-xs text-danger-fg">{erro}</p>
        : <p id="endereco-ajuda" className="text-xs text-fg-subtle">Não sabe o endereço? Pergunte à secretaria da escola.</p>}
      <Button type="submit" className="w-full">Continuar <ArrowRight size={16} strokeWidth={1.75} /></Button>
    </form>
  )
}
