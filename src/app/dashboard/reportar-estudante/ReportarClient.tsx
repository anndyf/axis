"use client"

import { useState } from "react"
import { UserPlus, Send, Loader2, CheckCircle2, ArrowLeft } from "lucide-react"
import Link from "next/link"
import { reportarEstudanteFaltante } from "@/app/dashboard/simulados/actions"

export default function ReportarClient({ turmas }: { turmas: any[] }) {
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [form, setForm] = useState({ turmaId: "", nome: "", matricula: "", observacao: "" })
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.turmaId || !form.nome) return

    setSubmitting(true)
    setError(null)

    try {
      const res = await reportarEstudanteFaltante(
        form.turmaId, 
        form.nome, 
        form.matricula, 
        form.observacao
      )

      if (res.error) {
        setError(res.error)
      } else {
        setSuccess(true)
      }
    } catch (err) {
      setError("Erro ao enviar a solicitação. Tente novamente.")
    } finally {
      setSubmitting(false)
    }
  }

  if (success) {
    return (
      <div className="bg-zinc-50 p-4 sm:p-8 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-xl p-8 text-center shadow-card border border-zinc-100">
          <div className="w-20 h-20 bg-success-subtle text-success-fg rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 size={40} />
          </div>
          <h2 className="text-2xl font-bold text-fg mb-2">Solicitação Enviada!</h2>
          <p className="text-fg-subtle mb-8 leading-relaxed">
            A equipe da secretaria recebeu seu chamado e em breve o aluno <strong>{form.nome}</strong> será adicionado à turma correta.
          </p>
          <div className="flex flex-col gap-3">
            <button 
              onClick={() => {
                setSuccess(false)
                setForm({ turmaId: "", nome: "", matricula: "", observacao: "" })
              }}
              className="px-6 py-3 bg-zinc-100 text-fg-muted font-medium rounded-xl hover:bg-zinc-200 transition-all"
            >
              Reportar Outro Aluno
            </button>
            <Link 
              href="/dashboard"
              className="px-6 py-3 bg-accent text-on-accent font-medium rounded-xl hover:bg-accent-hover shadow-card transition-all"
            >
              Voltar ao Painel
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-zinc-50 p-4 sm:p-8">
      <div className="max-w-3xl mx-auto space-y-8">
        
        {/* Header */}
        <div>
          <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm font-medium text-fg-subtle hover:text-fg mb-6 transition-colors">
            <ArrowLeft size={16} /> Voltar ao Painel
          </Link>
          <h1 className="text-3xl font-bold text-fg tracking-tight flex items-center gap-3">
            <div className="p-3 bg-accent-subtle text-accent-fg rounded-lg">
              <UserPlus size={24} />
            </div>
            Estudante Faltando na Lista?
          </h1>
          <p className="text-fg-subtle font-medium mt-2 ml-1 max-w-xl leading-relaxed">
            Se algum estudante não estiver aparecendo na sua lista de frequência ou notas, preencha os dados abaixo. Nós o cadastraremos imediatamente.
          </p>
        </div>

        {/* Form */}
        <div className="bg-white p-6 sm:p-8 rounded-xl shadow-sm border border-zinc-200">
          <form onSubmit={handleSubmit} className="space-y-6">
            
            {error && (
              <div className="p-4 bg-danger-subtle text-danger-fg border border-danger-line rounded-xl text-sm font-medium">
                {error}
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-fg-subtle uppercase tracking-widest ml-1">Turma do Aluno *</label>
              <select
                required
                value={form.turmaId}
                onChange={e => setForm(p => ({ ...p, turmaId: e.target.value }))}
                className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3.5 text-sm focus:ring-2 focus:ring-ring focus:border-accent outline-none transition-all text-fg-muted appearance-none"
              >
                <option value="" disabled>Selecione a turma...</option>
                {turmas.map(t => (
                  <option key={t.id} value={t.id}>{t.nome}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-fg-subtle uppercase tracking-widest ml-1">Nome Completo do Estudante *</label>
              <input
                type="text"
                required
                value={form.nome}
                onChange={e => setForm(p => ({ ...p, nome: e.target.value }))}
                placeholder="Ex: Maria Clara Silva Oliveira"
                className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3.5 text-sm focus:ring-2 focus:ring-ring focus:border-accent outline-none transition-all text-fg-muted"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-fg-subtle uppercase tracking-widest ml-1">Matrícula *</label>
                <input
                  type="text"
                  required
                  value={form.matricula}
                  onChange={e => setForm(p => ({ ...p, matricula: e.target.value }))}
                  placeholder="Informe a matrícula"
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3.5 text-sm focus:ring-2 focus:ring-ring focus:border-accent outline-none transition-all text-fg-muted"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-fg-subtle uppercase tracking-widest ml-1">Motivo da Solicitação *</label>
                <input
                  type="text"
                  required
                  value={form.observacao}
                  onChange={e => setForm(p => ({ ...p, observacao: e.target.value }))}
                  placeholder="Ex: Aluno novo no sistema"
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3.5 text-sm focus:ring-2 focus:ring-ring focus:border-accent outline-none transition-all text-fg-muted"
                />
                
                {/* Sugestões de Motivos */}
                <div className="flex flex-wrap gap-2 mt-2">
                  {[
                    "Aluno novo na turma",
                    "Transferência interna",
                    "Remanejamento",
                    "Erro no cadastro",
                    "Matrícula recente"
                  ].map((motivo) => (
                    <button
                      key={motivo}
                      type="button"
                      onClick={() => setForm(p => ({ ...p, observacao: motivo }))}
                      className="text-[10px] font-bold bg-zinc-100 hover:bg-accent-subtle hover:text-accent-fg text-fg-subtle px-3 py-1.5 rounded-lg border border-zinc-200 hover:border-accent/25 transition-all cursor-pointer"
                    >
                      {motivo}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-zinc-100 flex justify-end">
              <button
                type="submit"
                disabled={submitting || !form.turmaId || !form.nome}
                className="w-full sm:w-auto px-8 py-4 bg-accent hover:bg-accent-hover text-on-accent font-medium rounded-xl transition-all shadow-card disabled:opacity-50 disabled:shadow-none active:scale-95 flex items-center justify-center gap-2"
              >
                {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                Enviar Solicitação
              </button>
            </div>
          </form>
        </div>

      </div>
    </div>
  )
}
