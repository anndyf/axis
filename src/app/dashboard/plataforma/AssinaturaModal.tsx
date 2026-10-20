"use client"

import { useEffect, useState } from "react"
import { X, Save, Loader2, CreditCard, Lock, History } from "lucide-react"
import type { ResumoAssinatura } from "@/lib/modulos/assinatura-painel"

interface AssinaturaModalProps {
  escolaId: string | null
  onClose: () => void
  onAtualizada: (escola: ResumoAssinatura["escola"]) => void
}

const SITUACOES = ["TESTE", "ATIVA", "INADIMPLENTE", "SUSPENSA", "CANCELADA"]
const labelSituacao: Record<string, string> = { TESTE: "Teste", ATIVA: "Ativa", INADIMPLENTE: "Inadimplente (somente leitura)", SUSPENSA: "Suspensa", CANCELADA: "Cancelada" }
const labelEstado: Record<string, string> = { ATIVO: "Ativo", SOMENTE_LEITURA: "Somente leitura", INATIVO: "Inativo" }
const badgeEstado: Record<string, string> = {
  ATIVO: "bg-emerald-50 text-emerald-600 border-emerald-200",
  SOMENTE_LEITURA: "bg-amber-50 text-amber-600 border-amber-200",
  INATIVO: "bg-slate-50 text-slate-400 border-slate-200",
}
const ORIGENS = [["EXCECAO", "Exceção"], ["ADICIONAL", "Adicional"], ["CORTESIA", "Cortesia"], ["TESTE", "Teste"]]

type Form = { planoCodigo: string; situacao: string; fimTeste: string; limiteUsuarios: string; limiteEstudantes: string; observacoes: string }

function formDe(r: ResumoAssinatura): Form {
  const a = r.assinatura
  return {
    planoCodigo: a?.planoCodigo ?? r.escola.plano,
    situacao: a?.situacao ?? (r.escola.status === "TRIAL" ? "TESTE" : r.escola.status),
    fimTeste: a?.fimTeste ?? "",
    limiteUsuarios: a?.limiteUsuarios?.toString() ?? "",
    limiteEstudantes: a?.limiteEstudantes?.toString() ?? "",
    observacoes: a?.observacoes ?? "",
  }
}

const inputClass = "w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-semibold text-sm text-slate-700 focus:bg-white focus:border-blue-500 transition-all"
const labelClass = "block text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1.5 ml-1"

// Assinatura e módulos de uma escola (fase 2 do roteiro). Preços não entram aqui (decisão comercial).
export default function AssinaturaModal({ escolaId, onClose, onAtualizada }: AssinaturaModalProps) {
  const [resumo, setResumo] = useState<ResumoAssinatura | null>(null)
  const [form, setForm] = useState<Form | null>(null)
  const [erro, setErro] = useState("")
  const [salvando, setSalvando] = useState(false)
  const [moduloSalvando, setModuloSalvando] = useState<string | null>(null)

  useEffect(() => {
    if (!escolaId) return
    setResumo(null); setForm(null); setErro("")
    fetch(`/api/plataforma/escolas/${escolaId}/assinatura`)
      .then(async (res) => {
        const data = await res.json()
        if (!res.ok) throw new Error(data.message || "Erro ao carregar assinatura")
        setResumo(data); setForm(formDe(data))
      })
      .catch((e) => setErro(e.message))
  }, [escolaId])

  if (!escolaId) return null

  const aplicar = (data: ResumoAssinatura) => {
    setResumo(data)
    setForm(formDe(data))
    onAtualizada(data.escola)
  }

  const enviar = async (url: string, metodo: string, corpo: unknown) => {
    const res = await fetch(url, { method: metodo, headers: { "Content-Type": "application/json" }, body: JSON.stringify(corpo) })
    const data = await res.json()
    if (!res.ok) throw new Error(data.message || "Erro ao salvar")
    aplicar(data)
  }

  const salvarAssinatura = async (extra?: Partial<Form>) => {
    if (!resumo || !form) return
    const f = { ...form, ...extra }
    const original = formDe(resumo)
    const numero = (v: string) => (v.trim() === "" ? null : Number(v))
    const mudanca: Record<string, unknown> = {}
    if (f.planoCodigo !== original.planoCodigo || !resumo.assinatura) mudanca.planoCodigo = f.planoCodigo
    if (f.situacao !== original.situacao || !resumo.assinatura) mudanca.situacao = f.situacao
    if (f.fimTeste !== original.fimTeste) mudanca.fimTeste = f.fimTeste || null
    if (f.limiteUsuarios !== original.limiteUsuarios) mudanca.limiteUsuarios = numero(f.limiteUsuarios)
    if (f.limiteEstudantes !== original.limiteEstudantes) mudanca.limiteEstudantes = numero(f.limiteEstudantes)
    if (f.observacoes !== original.observacoes) mudanca.observacoes = f.observacoes || null
    if (!Object.keys(mudanca).length) return
    setSalvando(true); setErro("")
    try {
      await enviar(`/api/plataforma/escolas/${escolaId}/assinatura`, "PATCH", mudanca)
    } catch (e) {
      setErro((e as Error).message)
    } finally {
      setSalvando(false)
    }
  }

  const definirModulo = async (moduloId: string, estado: string, origem: string) => {
    setModuloSalvando(moduloId); setErro("")
    try {
      await enviar(`/api/plataforma/escolas/${escolaId}/assinatura/modulos`, "PUT", estado === "PLANO" ? { moduloId, estado: null } : { moduloId, estado, origem })
    } catch (e) {
      setErro((e as Error).message)
    } finally {
      setModuloSalvando(null)
    }
  }

  const emLeitura = form?.situacao === "INADIMPLENTE"

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white rounded-3xl w-full max-w-3xl shadow-2xl border border-slate-100 overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col max-h-[90vh]">

        <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-slate-50 shrink-0">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-slate-900">
              <CreditCard className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-slate-800 tracking-tight">Assinatura</h2>
              <p className="text-xs text-slate-400 font-medium">{resumo?.escola.nome ?? "Carregando..."}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors" aria-label="Fechar">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <div className="p-8 space-y-6 overflow-y-auto">
          {erro && (
            <div className="p-4 bg-rose-50 border border-rose-100 rounded-xl text-rose-600 text-xs font-semibold">{erro}</div>
          )}

          {!resumo || !form ? (
            !erro && <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>
          ) : (
            <>
              {!resumo.assinatura && (
                <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl text-blue-700 text-xs font-semibold">
                  Esta escola ainda não tem assinatura registrada: os módulos vêm do plano antigo. Ao salvar, a assinatura é criada.
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Plano</label>
                  <select value={form.planoCodigo} onChange={(e) => setForm({ ...form, planoCodigo: e.target.value })} className={inputClass}>
                    {resumo.planos.map((p) => <option key={p.codigo} value={p.codigo}>{p.nome}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Situação</label>
                  <select value={form.situacao} onChange={(e) => setForm({ ...form, situacao: e.target.value })} className={inputClass}>
                    {SITUACOES.map((s) => <option key={s} value={s}>{labelSituacao[s]}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Fim do teste</label>
                  <input type="date" value={form.fimTeste} onChange={(e) => setForm({ ...form, fimTeste: e.target.value })} className={inputClass} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelClass}>Limite usuários</label>
                    <input type="number" min={0} placeholder="do plano" value={form.limiteUsuarios} onChange={(e) => setForm({ ...form, limiteUsuarios: e.target.value })} className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Limite estudantes</label>
                    <input type="number" min={0} placeholder="do plano" value={form.limiteEstudantes} onChange={(e) => setForm({ ...form, limiteEstudantes: e.target.value })} className={inputClass} />
                  </div>
                </div>
                <div className="sm:col-span-2">
                  <label className={labelClass}>Observações</label>
                  <textarea rows={2} value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} className={inputClass} />
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="button" onClick={() => salvarAssinatura()} disabled={salvando}
                  className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-5 py-3 rounded-xl font-semibold text-sm transition-all disabled:opacity-50"
                >
                  {salvando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Salvar assinatura
                </button>
                <button
                  type="button" disabled={salvando}
                  onClick={() => salvarAssinatura({ situacao: emLeitura ? "ATIVA" : "INADIMPLENTE" })}
                  className="flex items-center gap-2 bg-amber-50 text-amber-700 hover:bg-amber-100 px-5 py-3 rounded-xl font-semibold text-sm transition-all disabled:opacity-50"
                >
                  <Lock className="w-4 h-4" />
                  {emLeitura ? "Tirar do somente leitura" : "Colocar em somente leitura"}
                </button>
              </div>

              <div className="pt-2 border-t border-slate-100">
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-3">Módulos</p>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">
                        <th className="py-2 pr-3">Módulo</th>
                        <th className="py-2 pr-3">No plano</th>
                        <th className="py-2 pr-3">Ajuste</th>
                        <th className="py-2 pr-3">Origem</th>
                        <th className="py-2">Estado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {resumo.modulos.map((m) => {
                        const ajuste = m.excecao?.estado ?? "PLANO"
                        const origem = m.excecao?.origem ?? "EXCECAO"
                        const nucleo = m.moduloId === "NUC"
                        return (
                          <tr key={m.moduloId}>
                            <td className="py-2.5 pr-3 font-medium text-slate-700">{m.nome}</td>
                            <td className="py-2.5 pr-3 text-slate-500">{nucleo ? "Sempre" : m.doPlano ? "Sim" : "Não"}</td>
                            <td className="py-2.5 pr-3">
                              {!nucleo && (
                                <select
                                  value={ajuste} disabled={moduloSalvando === m.moduloId}
                                  onChange={(e) => definirModulo(m.moduloId, e.target.value, origem)}
                                  className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-semibold text-slate-700 outline-none focus:border-blue-400"
                                >
                                  <option value="PLANO">Do plano</option>
                                  <option value="ATIVO">Ativo</option>
                                  <option value="SOMENTE_LEITURA">Somente leitura</option>
                                  <option value="INATIVO">Inativo</option>
                                </select>
                              )}
                            </td>
                            <td className="py-2.5 pr-3">
                              {!nucleo && m.excecao && (
                                <select
                                  value={origem} disabled={moduloSalvando === m.moduloId}
                                  onChange={(e) => definirModulo(m.moduloId, ajuste, e.target.value)}
                                  className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-semibold text-slate-700 outline-none focus:border-blue-400"
                                >
                                  {ORIGENS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                                </select>
                              )}
                            </td>
                            <td className="py-2.5">
                              <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wide border ${badgeEstado[m.estadoEfetivo]}`}>
                                {labelEstado[m.estadoEfetivo]}
                              </span>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {resumo.historico.length > 0 && (
                <div className="pt-2 border-t border-slate-100">
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-1.5"><History size={12} /> Histórico</p>
                  <ul className="space-y-1.5">
                    {resumo.historico.map((h) => (
                      <li key={h.id} className="text-xs text-slate-600">
                        <span className="text-slate-400">{new Date(h.data).toLocaleString("pt-BR")}</span> · {h.descricao}{h.autor ? ` · ${h.autor}` : ""}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
