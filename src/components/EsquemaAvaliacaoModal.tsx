"use client"

import { useState, useEffect } from "react"
import { X, Save, Loader2, Plus, Trash2, ClipboardList } from "lucide-react"

interface AtividadeForm { nome: string; peso: string }
interface UnidadeForm { nome: string; atividades: AtividadeForm[] }

export interface EsquemaParaEditar {
  id: string
  nome: string
  notaMinimaAprovacao: number
  recuperacaoUnidadeAtiva: boolean
  modoRecuperacaoUnidade: string | null
  recuperacaoFinalAtiva: boolean
  modoRecuperacaoFinal: string | null
  unidades: { nome: string; atividades: { nome: string; peso: number }[] }[]
}

interface Props {
  isOpen: boolean
  onClose: () => void
  onSuccess: (esquema: any) => void
  esquemaParaEditar?: EsquemaParaEditar | null
}

const UNIDADE_PADRAO = (): UnidadeForm => ({ nome: "1ª Unidade", atividades: [{ nome: "Nota da Unidade", peso: "10" }] })

export default function EsquemaAvaliacaoModal({ isOpen, onClose, onSuccess, esquemaParaEditar }: Props) {
  const isEdit = !!esquemaParaEditar
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const [nome, setNome] = useState("")
  const [notaMinima, setNotaMinima] = useState("5")
  const [recUnidadeAtiva, setRecUnidadeAtiva] = useState(false)
  const [recFinalAtiva, setRecFinalAtiva] = useState(true)
  const [modoRecFinal, setModoRecFinal] = useState<"SUBSTITUI_MENOR_UNIDADE" | "NOTA_MINIMA_ISOLADA">("NOTA_MINIMA_ISOLADA")
  const [unidades, setUnidades] = useState<UnidadeForm[]>([UNIDADE_PADRAO()])

  useEffect(() => {
    if (isEdit && esquemaParaEditar) {
      setNome(esquemaParaEditar.nome)
      setNotaMinima(String(esquemaParaEditar.notaMinimaAprovacao))
      setRecUnidadeAtiva(esquemaParaEditar.recuperacaoUnidadeAtiva)
      setRecFinalAtiva(esquemaParaEditar.recuperacaoFinalAtiva)
      setModoRecFinal((esquemaParaEditar.modoRecuperacaoFinal as any) || "NOTA_MINIMA_ISOLADA")
      setUnidades(esquemaParaEditar.unidades.map(u => ({
        nome: u.nome,
        atividades: u.atividades.map(a => ({ nome: a.nome, peso: String(a.peso) }))
      })))
    } else {
      setNome("")
      setNotaMinima("5")
      setRecUnidadeAtiva(false)
      setRecFinalAtiva(true)
      setModoRecFinal("NOTA_MINIMA_ISOLADA")
      setUnidades([UNIDADE_PADRAO()])
    }
    setError("")
  }, [isOpen, esquemaParaEditar, isEdit])

  if (!isOpen) return null

  const addUnidade = () => setUnidades(prev => [...prev, { nome: `${prev.length + 1}ª Unidade`, atividades: [{ nome: "Nota da Unidade", peso: "10" }] }])
  const removeUnidade = (i: number) => setUnidades(prev => prev.filter((_, idx) => idx !== i))
  const updateUnidadeNome = (i: number, nome: string) => setUnidades(prev => prev.map((u, idx) => idx === i ? { ...u, nome } : u))

  const addAtividade = (uIdx: number) => setUnidades(prev => prev.map((u, idx) => idx === uIdx ? { ...u, atividades: [...u.atividades, { nome: "", peso: "" }] } : u))
  const removeAtividade = (uIdx: number, aIdx: number) => setUnidades(prev => prev.map((u, idx) => idx === uIdx ? { ...u, atividades: u.atividades.filter((_, ai) => ai !== aIdx) } : u))
  const updateAtividade = (uIdx: number, aIdx: number, field: "nome" | "peso", value: string) =>
    setUnidades(prev => prev.map((u, idx) => idx === uIdx ? { ...u, atividades: u.atividades.map((a, ai) => ai === aIdx ? { ...a, [field]: value } : a) } : u))

  const somaPeso = (u: UnidadeForm) => u.atividades.reduce((acc, a) => acc + (parseFloat(a.peso.replace(',', '.')) || 0), 0)

  const handleSubmit = async () => {
    if (!nome.trim()) { setError("Nome é obrigatório"); return }
    if (unidades.length === 0) { setError("Adicione ao menos 1 unidade"); return }
    for (const u of unidades) {
      if (!u.nome.trim()) { setError("Toda unidade precisa de um nome"); return }
      if (u.atividades.length === 0) { setError(`A unidade "${u.nome}" precisa de ao menos 1 atividade`); return }
      for (const a of u.atividades) {
        if (!a.nome.trim() || a.peso === "") { setError(`Toda atividade da unidade "${u.nome}" precisa de nome e peso`); return }
      }
    }

    setLoading(true)
    setError("")
    try {
      const payload = {
        nome: nome.trim(),
        notaMinimaAprovacao: parseFloat(notaMinima.replace(',', '.')) || 5,
        recuperacaoUnidadeAtiva: recUnidadeAtiva,
        modoRecuperacaoUnidade: recUnidadeAtiva ? "SUBSTITUI_SE_MAIOR" : null,
        recuperacaoFinalAtiva: recFinalAtiva,
        modoRecuperacaoFinal: recFinalAtiva ? modoRecFinal : null,
        unidades: unidades.map(u => ({
          nome: u.nome.trim(),
          atividades: u.atividades.map(a => ({ nome: a.nome.trim(), peso: parseFloat(a.peso.replace(',', '.')) || 0 }))
        }))
      }

      const response = await fetch(
        isEdit ? `/api/esquemas-avaliacao/${esquemaParaEditar!.id}` : '/api/esquemas-avaliacao',
        {
          method: isEdit ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        }
      )
      const data = await response.json()
      if (response.ok) {
        onSuccess(data)
        onClose()
      } else {
        setError(data.message || 'Erro ao salvar esquema')
      }
    } catch {
      setError('Erro ao conectar com o servidor')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl border border-slate-100 overflow-hidden animate-in zoom-in-95 duration-300 my-8 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className={`px-8 py-6 border-b border-slate-100 flex items-center justify-between shrink-0 ${isEdit ? 'bg-amber-50' : 'bg-slate-50'}`}>
          <div className="flex items-center space-x-3">
            <div className={`p-2 rounded-xl ${isEdit ? 'bg-amber-500' : 'bg-blue-500'}`}>
              <ClipboardList className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-slate-800 tracking-tight">
                {isEdit ? 'Editar Esquema' : 'Novo Esquema de Avaliação'}
              </h2>
              <p className="text-xs text-slate-400 font-medium">
                Defina as unidades, atividades e regras de recuperação
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <div className="p-8 space-y-6 overflow-y-auto">
          {error && (
            <div className="p-4 bg-rose-50 border border-rose-100 rounded-xl text-rose-600 text-xs font-semibold animate-in slide-in-from-top-2">
              {error}
            </div>
          )}

          {/* Nome + nota mínima */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Nome do Esquema</label>
              <input
                required type="text" placeholder="Ex: Anual 4 Unidades"
                value={nome}
                onChange={e => setNome(e.target.value)}
                className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-semibold text-slate-700 focus:bg-white focus:border-blue-500 transition-all"
              />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Nota Mínima</label>
              <input
                required type="text" inputMode="decimal"
                value={notaMinima}
                onChange={e => setNotaMinima(e.target.value)}
                className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-semibold text-slate-700 focus:bg-white focus:border-blue-500 transition-all"
              />
            </div>
          </div>

          {/* Unidades */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-widest ml-1">Unidades</label>
              <button type="button" onClick={addUnidade} className="flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:text-blue-700 uppercase tracking-wide">
                <Plus className="w-3.5 h-3.5" /> Unidade
              </button>
            </div>

            {unidades.map((u, uIdx) => {
              const soma = somaPeso(u)
              return (
                <div key={uIdx} className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                  <div className="flex items-center gap-2">
                    <input
                      type="text" value={u.nome}
                      onChange={e => updateUnidadeNome(uIdx, e.target.value)}
                      className="flex-1 px-4 py-2.5 bg-white border border-slate-200 rounded-xl outline-none font-semibold text-sm text-slate-700 focus:border-blue-500"
                      placeholder={`${uIdx + 1}ª Unidade`}
                    />
                    {unidades.length > 1 && (
                      <button type="button" onClick={() => removeUnidade(uIdx)} className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  <div className="space-y-2 pl-2">
                    {u.atividades.map((a, aIdx) => (
                      <div key={aIdx} className="flex items-center gap-2">
                        <input
                          type="text" placeholder="Nome (ex: Prova)"
                          value={a.nome}
                          onChange={e => updateAtividade(uIdx, aIdx, 'nome', e.target.value)}
                          className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-lg outline-none text-xs font-medium text-slate-700 focus:border-blue-500"
                        />
                        <input
                          type="text" inputMode="decimal" placeholder="Peso"
                          value={a.peso}
                          onChange={e => updateAtividade(uIdx, aIdx, 'peso', e.target.value)}
                          className="w-20 px-3 py-2 bg-white border border-slate-200 rounded-lg outline-none text-xs font-medium text-slate-700 focus:border-blue-500 text-center"
                        />
                        {u.atividades.length > 1 && (
                          <button type="button" onClick={() => removeAtividade(uIdx, aIdx)} className="p-1.5 text-rose-400 hover:bg-rose-50 rounded-lg transition-colors">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                    <button type="button" onClick={() => addAtividade(uIdx)} className="flex items-center gap-1 text-[10px] font-bold text-blue-600 hover:text-blue-700 uppercase tracking-wide pl-1">
                      <Plus className="w-3 h-3" /> Atividade
                    </button>
                  </div>

                  <p className={`text-[10px] font-bold uppercase tracking-wide pl-1 ${soma === 10 ? 'text-emerald-600' : 'text-amber-600'}`}>
                    Soma dos pesos: {soma.toFixed(1)} {soma !== 10 && '(normalmente soma 10)'}
                  </p>
                </div>
              )
            })}
          </div>

          {/* Recuperação */}
          <div className="space-y-3">
            <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-widest ml-1">Recuperação</label>

            <div className="flex items-center justify-between p-4 bg-slate-50 border border-slate-200 rounded-2xl">
              <div>
                <p className="text-sm font-semibold text-slate-700">Recuperação por unidade</p>
                <p className="text-[10px] text-slate-400">Reforça a nota de uma unidade específica, se maior</p>
              </div>
              <button
                type="button"
                onClick={() => setRecUnidadeAtiva(v => !v)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors shrink-0 ${recUnidadeAtiva ? 'bg-blue-600' : 'bg-slate-300'}`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${recUnidadeAtiva ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>

            <div className="flex items-center justify-between p-4 bg-slate-50 border border-slate-200 rounded-2xl">
              <div>
                <p className="text-sm font-semibold text-slate-700">Recuperação final</p>
                <p className="text-[10px] text-slate-400">Afeta o resultado geral da disciplina</p>
              </div>
              <button
                type="button"
                onClick={() => setRecFinalAtiva(v => !v)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors shrink-0 ${recFinalAtiva ? 'bg-blue-600' : 'bg-slate-300'}`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${recFinalAtiva ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>

            {recFinalAtiva && (
              <div className="pl-4 space-y-2">
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Como a recuperação final aprova?</p>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button" onClick={() => setModoRecFinal("NOTA_MINIMA_ISOLADA")}
                    className={`px-4 py-2.5 rounded-xl text-[11px] font-bold uppercase tracking-wide transition-all border ${modoRecFinal === "NOTA_MINIMA_ISOLADA" ? 'bg-blue-500 text-white border-blue-500 shadow-lg shadow-blue-200' : 'bg-white text-slate-400 border-slate-200 hover:border-slate-300'}`}
                  >
                    Nota mínima isolada
                  </button>
                  <button
                    type="button" onClick={() => setModoRecFinal("SUBSTITUI_MENOR_UNIDADE")}
                    className={`px-4 py-2.5 rounded-xl text-[11px] font-bold uppercase tracking-wide transition-all border ${modoRecFinal === "SUBSTITUI_MENOR_UNIDADE" ? 'bg-blue-500 text-white border-blue-500 shadow-lg shadow-blue-200' : 'bg-white text-slate-400 border-slate-200 hover:border-slate-300'}`}
                  >
                    Substitui a menor unidade
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="p-8 pt-4 border-t border-slate-100 flex gap-3 shrink-0">
          <button
            type="button" onClick={onClose}
            className="px-6 py-4 rounded-2xl font-semibold text-sm text-slate-500 hover:bg-slate-100 transition-all"
          >
            Cancelar
          </button>
          <button
            type="button" onClick={handleSubmit} disabled={loading}
            className={`flex-1 text-white py-4 rounded-2xl font-semibold text-sm flex items-center justify-center space-x-2 transition-all disabled:opacity-50 ${isEdit ? 'bg-amber-500 hover:bg-amber-600' : 'bg-slate-900 hover:bg-slate-800'}`}
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
            <span>{isEdit ? 'Salvar Alterações' : 'Criar Esquema'}</span>
          </button>
        </div>
      </div>
    </div>
  )
}
