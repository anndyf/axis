"use client"

import { useState, useEffect } from "react"
import { X, Save, Loader2, Plus, Trash2, ClipboardList } from "lucide-react"

// Ver plano-avaliacao-frequencia.md, seção 3.1 - cada campo aqui corresponde
// a um campo de EsquemaAvaliacao/EsquemaUnidade/EsquemaAtividade.
type FormaCalculo = "SOMA" | "MEDIA_ARITMETICA" | "MEDIA_PONDERADA" | "SOMA_COM_DIVISOR" | "MAIOR_NOTA"
type ModoRecUnidade = "SUBSTITUI_SE_MAIOR" | "MEDIA_COM_UNIDADE"
type ModoRecFinal = "NOTA_MINIMA_ISOLADA" | "SUBSTITUI_MENOR_UNIDADE" | "MEDIA_COM_FINAL"

interface AtividadeForm { nome: string; notaMaxima: string; peso: string }
interface UnidadeForm { nome: string; peso: string; formaCalculo: FormaCalculo; divisor: string; atividades: AtividadeForm[] }

/** Formato devolvido por GET/POST/PUT de api/esquemas-avaliacao */
export interface EsquemaParaEditar {
  id: string
  nome: string
  notaMinimaAprovacao: number
  notaMaxima: number
  casasDecimais: number
  formaCalculoFinal: FormaCalculo
  divisorFinal: number | null
  recuperacaoUnidadeAtiva: boolean
  modoRecuperacaoUnidade: string | null
  recuperacaoFinalAtiva: boolean
  modoRecuperacaoFinal: string | null
  notaMinimaExameFinal: number | null
  definicaoAtividades?: "ESCOLA" | "PROFESSOR"
  registroFrequencia: "POR_AULA" | "POR_DIA"
  apuracaoFrequencia: "GERAL" | "POR_COMPONENTE"
  frequenciaMinima: number
  unidades: {
    id?: string
    nome: string
    peso: number
    formaCalculo: FormaCalculo
    divisor: number | null
    atividades: { nome: string; notaMaxima: number; peso: number }[]
  }[]
}

interface Props {
  isOpen: boolean
  onClose: () => void
  onSuccess: (esquema: any) => void
  esquemaParaEditar?: EsquemaParaEditar | null
}

const FORMAS_ETAPA: { valor: FormaCalculo; rotulo: string; ajuda: string }[] = [
  { valor: "SOMA", rotulo: "Soma", ajuda: "Soma das atividades (ex.: prova 6 + trabalho 4)" },
  { valor: "MEDIA_ARITMETICA", rotulo: "Média", ajuda: "Média simples das atividades lançadas" },
  { valor: "MEDIA_PONDERADA", rotulo: "Média ponderada", ajuda: "Cada atividade tem um peso" },
  { valor: "SOMA_COM_DIVISOR", rotulo: "Soma ÷ divisor", ajuda: "Soma das atividades dividida por um número fixo" },
  { valor: "MAIOR_NOTA", rotulo: "Maior nota", ajuda: "Vale a melhor atividade" },
]

const FORMAS_FINAIS: { valor: FormaCalculo; rotulo: string; ajuda: string }[] = [
  { valor: "MEDIA_ARITMETICA", rotulo: "Média das unidades", ajuda: "(U1 + U2 + ... ) / N" },
  { valor: "MEDIA_PONDERADA", rotulo: "Média ponderada", ajuda: "Cada unidade tem um peso (ex.: 2 e 3)" },
  { valor: "SOMA", rotulo: "Soma de pontos", ajuda: "Ex.: ano de 100 pontos, aprova com 60" },
  { valor: "SOMA_COM_DIVISOR", rotulo: "Soma ÷ divisor", ajuda: "Soma das unidades dividida por um número fixo" },
]

const atividadePadrao = (notaMaxima = "10"): AtividadeForm => ({ nome: "Nota da Unidade", notaMaxima, peso: "1" })
const unidadePadrao = (n: number): UnidadeForm => ({ nome: `${n}ª Unidade`, peso: "1", formaCalculo: "SOMA", divisor: "", atividades: [atividadePadrao()] })

const num = (s: string) => parseFloat(s.replace(',', '.'))

function Opcoes<T extends string>({ valor, opcoes, onChange }: { valor: T; opcoes: { valor: T; rotulo: string; ajuda?: string }[]; onChange: (v: T) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {opcoes.map(o => (
        <button
          key={o.valor} type="button" title={o.ajuda} onClick={() => onChange(o.valor)}
          className={`px-3 py-2 rounded-xl text-[11px] font-bold uppercase tracking-wide transition-all border ${valor === o.valor ? 'bg-blue-500 text-white border-blue-500 shadow-lg shadow-blue-200' : 'bg-white text-slate-400 border-slate-200 hover:border-slate-300'}`}
        >
          {o.rotulo}
        </button>
      ))}
    </div>
  )
}

function Toggle({ ativo, onClick }: { ativo: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors shrink-0 ${ativo ? 'bg-blue-600' : 'bg-slate-300'}`}>
      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${ativo ? 'translate-x-6' : 'translate-x-1'}`} />
    </button>
  )
}

const inputClass = "w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-semibold text-slate-700 focus:bg-white focus:border-blue-500 transition-all"
const labelClass = "block text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1.5 ml-1"
const smallInput = "px-3 py-2 bg-white border border-slate-200 rounded-lg outline-none text-xs font-medium text-slate-700 focus:border-blue-500 text-center"

export default function EsquemaAvaliacaoModal({ isOpen, onClose, onSuccess, esquemaParaEditar }: Props) {
  const isEdit = !!esquemaParaEditar
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const [nome, setNome] = useState("")
  const [notaMinima, setNotaMinima] = useState("5")
  const [notaMaxima, setNotaMaxima] = useState("10")
  const [casasDecimais, setCasasDecimais] = useState(1)
  const [formaFinal, setFormaFinal] = useState<FormaCalculo>("MEDIA_ARITMETICA")
  const [divisorFinal, setDivisorFinal] = useState("")
  const [recUnidadeAtiva, setRecUnidadeAtiva] = useState(false)
  const [modoRecUnidade, setModoRecUnidade] = useState<ModoRecUnidade>("SUBSTITUI_SE_MAIOR")
  const [recFinalAtiva, setRecFinalAtiva] = useState(true)
  const [modoRecFinal, setModoRecFinal] = useState<ModoRecFinal>("NOTA_MINIMA_ISOLADA")
  const [notaMinimaExame, setNotaMinimaExame] = useState("")
  const [definicaoAtividades, setDefinicaoAtividades] = useState<"ESCOLA" | "PROFESSOR">("ESCOLA")
  const [registroFrequencia, setRegistroFrequencia] = useState<"POR_AULA" | "POR_DIA">("POR_AULA")
  const [apuracaoFrequencia, setApuracaoFrequencia] = useState<"GERAL" | "POR_COMPONENTE">("GERAL")
  const [frequenciaMinima, setFrequenciaMinima] = useState("75")
  const [unidades, setUnidades] = useState<UnidadeForm[]>([unidadePadrao(1)])

  useEffect(() => {
    const e = esquemaParaEditar
    setNome(e?.nome ?? "")
    setNotaMinima(String(e?.notaMinimaAprovacao ?? 5))
    setNotaMaxima(String(e?.notaMaxima ?? 10))
    setCasasDecimais(e?.casasDecimais ?? 1)
    setFormaFinal(e?.formaCalculoFinal ?? "MEDIA_ARITMETICA")
    setDivisorFinal(e?.divisorFinal ? String(e.divisorFinal) : "")
    setRecUnidadeAtiva(e?.recuperacaoUnidadeAtiva ?? false)
    setModoRecUnidade((e?.modoRecuperacaoUnidade as ModoRecUnidade) || "SUBSTITUI_SE_MAIOR")
    setRecFinalAtiva(e?.recuperacaoFinalAtiva ?? true)
    setModoRecFinal((e?.modoRecuperacaoFinal as ModoRecFinal) || "NOTA_MINIMA_ISOLADA")
    setNotaMinimaExame(e?.notaMinimaExameFinal ? String(e.notaMinimaExameFinal) : "")
    setDefinicaoAtividades(e?.definicaoAtividades ?? "ESCOLA")
    setRegistroFrequencia(e?.registroFrequencia ?? "POR_AULA")
    setApuracaoFrequencia(e?.apuracaoFrequencia ?? "GERAL")
    setFrequenciaMinima(String(e?.frequenciaMinima ?? 75))
    setUnidades(e
      ? e.unidades.map(u => ({
          nome: u.nome,
          peso: String(u.peso),
          formaCalculo: u.formaCalculo,
          divisor: u.divisor ? String(u.divisor) : "",
          atividades: u.atividades.map(a => ({ nome: a.nome, notaMaxima: String(a.notaMaxima), peso: String(a.peso) }))
        }))
      : [unidadePadrao(1)])
    setError("")
  }, [isOpen, esquemaParaEditar])

  if (!isOpen) return null

  const addUnidade = () => setUnidades(prev => [...prev, { ...unidadePadrao(prev.length + 1), atividades: [atividadePadrao(notaMaxima)] }])
  const removeUnidade = (i: number) => setUnidades(prev => prev.filter((_, idx) => idx !== i))
  const updateUnidade = (i: number, patch: Partial<UnidadeForm>) => setUnidades(prev => prev.map((u, idx) => idx === i ? { ...u, ...patch } : u))

  const addAtividade = (uIdx: number) => setUnidades(prev => prev.map((u, idx) => idx === uIdx ? { ...u, atividades: [...u.atividades, { nome: "", notaMaxima: "", peso: "1" }] } : u))
  const removeAtividade = (uIdx: number, aIdx: number) => setUnidades(prev => prev.map((u, idx) => idx === uIdx ? { ...u, atividades: u.atividades.filter((_, ai) => ai !== aIdx) } : u))
  const updateAtividade = (uIdx: number, aIdx: number, field: keyof AtividadeForm, value: string) =>
    setUnidades(prev => prev.map((u, idx) => idx === uIdx ? { ...u, atividades: u.atividades.map((a, ai) => ai === aIdx ? { ...a, [field]: value } : a) } : u))

  // Teto que a etapa alcança com todas as atividades no máximo - ajuda a
  // conferir se a configuração bate com a escala (ex.: soma deve dar 10).
  const tetoEtapa = (u: UnidadeForm) => {
    const maximos = u.atividades.map(a => num(a.notaMaxima) || 0)
    if (maximos.length === 0) return 0
    switch (u.formaCalculo) {
      case "SOMA": return maximos.reduce((a, b) => a + b, 0)
      case "SOMA_COM_DIVISOR": return maximos.reduce((a, b) => a + b, 0) / (num(u.divisor) || 1)
      default: return Math.max(...maximos)
    }
  }

  const handleSubmit = async () => {
    if (!nome.trim()) { setError("Nome é obrigatório"); return }
    if (unidades.length === 0) { setError("Adicione ao menos 1 unidade"); return }
    for (const u of unidades) {
      if (!u.nome.trim()) { setError("Toda unidade precisa de um nome"); return }
      if (u.atividades.length === 0) { setError(`A unidade "${u.nome}" precisa de ao menos 1 atividade`); return }
      for (const a of u.atividades) {
        if (!a.nome.trim() || !(num(a.notaMaxima) > 0)) { setError(`Toda atividade da unidade "${u.nome}" precisa de nome e nota máxima`); return }
      }
    }

    setLoading(true)
    setError("")
    try {
      const payload = {
        nome: nome.trim(),
        notaMinimaAprovacao: num(notaMinima) || 5,
        notaMaxima: num(notaMaxima) || 10,
        casasDecimais,
        formaCalculoFinal: formaFinal,
        divisorFinal: formaFinal === "SOMA_COM_DIVISOR" ? num(divisorFinal) || null : null,
        recuperacaoUnidadeAtiva: recUnidadeAtiva,
        modoRecuperacaoUnidade: recUnidadeAtiva ? modoRecUnidade : null,
        recuperacaoFinalAtiva: recFinalAtiva,
        modoRecuperacaoFinal: recFinalAtiva ? modoRecFinal : null,
        notaMinimaExameFinal: recFinalAtiva && modoRecFinal === "MEDIA_COM_FINAL" && notaMinimaExame ? num(notaMinimaExame) : null,
        definicaoAtividades,
        registroFrequencia,
        apuracaoFrequencia,
        frequenciaMinima: num(frequenciaMinima),
        unidades: unidades.map(u => ({
          nome: u.nome.trim(),
          peso: num(u.peso) || 1,
          formaCalculo: u.formaCalculo,
          divisor: u.formaCalculo === "SOMA_COM_DIVISOR" ? num(u.divisor) || null : null,
          atividades: u.atividades.map(a => ({ nome: a.nome.trim(), notaMaxima: num(a.notaMaxima), peso: num(a.peso) || 1 }))
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
                Unidades, cálculo da média, recuperação e frequência
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <div className="p-8 space-y-8 overflow-y-auto">
          {error && (
            <div className="p-4 bg-rose-50 border border-rose-100 rounded-xl text-rose-600 text-xs font-semibold animate-in slide-in-from-top-2">
              {error}
            </div>
          )}

          {/* Nome + escala */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="col-span-2">
              <label className={labelClass}>Nome do Esquema</label>
              <input required type="text" placeholder="Ex: Anual 4 Bimestres" value={nome} onChange={e => setNome(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Nota máxima</label>
              <input type="text" inputMode="decimal" value={notaMaxima} onChange={e => setNotaMaxima(e.target.value)} className={inputClass} title="Escala das notas: 10 ou 100" />
            </div>
            <div>
              <label className={labelClass}>Mínima p/ aprovar</label>
              <input type="text" inputMode="decimal" value={notaMinima} onChange={e => setNotaMinima(e.target.value)} className={inputClass} />
            </div>
          </div>

          {/* Média final */}
          <div className="space-y-2">
            <label className={labelClass}>Como as unidades formam a média final</label>
            <Opcoes valor={formaFinal} opcoes={FORMAS_FINAIS} onChange={setFormaFinal} />
            <p className="text-[10px] text-slate-400 ml-1">{FORMAS_FINAIS.find(f => f.valor === formaFinal)?.ajuda}</p>
            {formaFinal === "SOMA_COM_DIVISOR" && (
              <input type="text" inputMode="decimal" placeholder="Divisor" value={divisorFinal} onChange={e => setDivisorFinal(e.target.value)} className={`w-28 ${smallInput}`} />
            )}
            <div className="flex items-center gap-2 pt-1 ml-1">
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Casas decimais</span>
              <Opcoes valor={String(casasDecimais)} opcoes={[{ valor: "0", rotulo: "0" }, { valor: "1", rotulo: "1" }, { valor: "2", rotulo: "2" }]} onChange={v => setCasasDecimais(Number(v))} />
            </div>
          </div>

          {/* Unidades */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className={labelClass}>Unidades</label>
              <button type="button" onClick={addUnidade} className="flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:text-blue-700 uppercase tracking-wide">
                <Plus className="w-3.5 h-3.5" /> Unidade
              </button>
            </div>

            {unidades.map((u, uIdx) => (
              <div key={uIdx} className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                <div className="flex items-center gap-2">
                  <input
                    type="text" value={u.nome}
                    onChange={e => updateUnidade(uIdx, { nome: e.target.value })}
                    className="flex-1 px-4 py-2.5 bg-white border border-slate-200 rounded-xl outline-none font-semibold text-sm text-slate-700 focus:border-blue-500"
                    placeholder={`${uIdx + 1}ª Unidade`}
                  />
                  {formaFinal === "MEDIA_PONDERADA" && (
                    <input type="text" inputMode="decimal" title="Peso da unidade na média final" placeholder="Peso" value={u.peso} onChange={e => updateUnidade(uIdx, { peso: e.target.value })} className={`w-20 ${smallInput}`} />
                  )}
                  {unidades.length > 1 && (
                    <button type="button" onClick={() => removeUnidade(uIdx)} className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <div className="pl-2 space-y-1">
                  <Opcoes valor={u.formaCalculo} opcoes={FORMAS_ETAPA} onChange={v => updateUnidade(uIdx, { formaCalculo: v })} />
                  {u.formaCalculo === "SOMA_COM_DIVISOR" && (
                    <input type="text" inputMode="decimal" placeholder="Divisor" value={u.divisor} onChange={e => updateUnidade(uIdx, { divisor: e.target.value })} className={`w-28 ${smallInput}`} />
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
                      <input type="text" inputMode="decimal" placeholder="Vale" title="Nota máxima da atividade" value={a.notaMaxima} onChange={e => updateAtividade(uIdx, aIdx, 'notaMaxima', e.target.value)} className={`w-20 ${smallInput}`} />
                      {u.formaCalculo === "MEDIA_PONDERADA" && (
                        <input type="text" inputMode="decimal" placeholder="Peso" title="Peso na média ponderada" value={a.peso} onChange={e => updateAtividade(uIdx, aIdx, 'peso', e.target.value)} className={`w-16 ${smallInput}`} />
                      )}
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

                <p className="text-[10px] font-bold uppercase tracking-wide pl-1 text-slate-500">
                  Nota máxima da unidade: {Number(tetoEtapa(u).toFixed(2))}
                </p>
              </div>
            ))}
          </div>

          {/* Recuperação */}
          <div className="space-y-3">
            <label className={labelClass}>Recuperação</label>

            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-700">Recuperação por unidade (paralela)</p>
                  <p className="text-[10px] text-slate-400">Nunca baixa a nota da unidade</p>
                </div>
                <Toggle ativo={recUnidadeAtiva} onClick={() => setRecUnidadeAtiva(v => !v)} />
              </div>
              {recUnidadeAtiva && (
                <Opcoes valor={modoRecUnidade} onChange={setModoRecUnidade} opcoes={[
                  { valor: "SUBSTITUI_SE_MAIOR", rotulo: "Substitui se maior" },
                  { valor: "MEDIA_COM_UNIDADE", rotulo: "Média com a unidade", ajuda: "(nota + recuperação) / 2, se melhorar" },
                ]} />
              )}
            </div>

            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-700">Recuperação final / exame</p>
                  <p className="text-[10px] text-slate-400">Afeta o resultado geral da disciplina</p>
                </div>
                <Toggle ativo={recFinalAtiva} onClick={() => setRecFinalAtiva(v => !v)} />
              </div>
              {recFinalAtiva && (
                <>
                  <Opcoes valor={modoRecFinal} onChange={setModoRecFinal} opcoes={[
                    { valor: "NOTA_MINIMA_ISOLADA", rotulo: "Nota mínima isolada", ajuda: "Aprova se a recuperação atingir a nota mínima" },
                    { valor: "SUBSTITUI_MENOR_UNIDADE", rotulo: "Substitui a menor unidade" },
                    { valor: "MEDIA_COM_FINAL", rotulo: "Média com o exame", ajuda: "(média anual + exame) / 2" },
                  ]} />
                  {modoRecFinal === "MEDIA_COM_FINAL" && (
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-slate-500">Mínimo de (média + exame) / 2:</span>
                      <input type="text" inputMode="decimal" placeholder={notaMinima} value={notaMinimaExame} onChange={e => setNotaMinimaExame(e.target.value)} className={`w-20 ${smallInput}`} />
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Quem define as atividades de cada unidade */}
          <div className="space-y-3">
            <label className={labelClass}>Atividades das unidades</label>
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
              <Opcoes valor={definicaoAtividades} onChange={setDefinicaoAtividades} opcoes={[
                { valor: "ESCOLA", rotulo: "Definidas pela escola", ajuda: "As atividades abaixo valem para todas as disciplinas" },
                { valor: "PROFESSOR", rotulo: "Definidas pelo professor", ajuda: "Cada professor cria as avaliações; as atividades abaixo viram o máximo da unidade" },
              ]} />
            </div>
          </div>

          {/* Frequência */}
          <div className="space-y-3">
            <label className={labelClass}>Frequência</label>
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
              <div className="space-y-1">
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Chamada</p>
                <Opcoes valor={registroFrequencia} onChange={setRegistroFrequencia} opcoes={[
                  { valor: "POR_AULA", rotulo: "Por aula", ajuda: "Cada tempo do horário tem chamada" },
                  { valor: "POR_DIA", rotulo: "Por dia", ajuda: "Uma chamada por dia (anos iniciais)" },
                ]} />
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Frequência mínima para aprovar</p>
                <div className="flex flex-wrap items-center gap-2">
                  <Opcoes valor={apuracaoFrequencia} onChange={setApuracaoFrequencia} opcoes={[
                    { valor: "GERAL", rotulo: "Geral", ajuda: "Sobre o total de horas letivas (LDB)" },
                    { valor: "POR_COMPONENTE", rotulo: "Por disciplina" },
                  ]} />
                  <input type="text" inputMode="decimal" value={frequenciaMinima} onChange={e => setFrequenciaMinima(e.target.value)} className={`w-20 ${smallInput}`} />
                  <span className="text-xs text-slate-500">%</span>
                </div>
              </div>
            </div>
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
