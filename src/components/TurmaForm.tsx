"use client"

import { useState, useMemo, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { 
  ArrowLeft, Save, Loader2, School, GraduationCap, 
  Clock, Hash, Trash2, AlertCircle, Layers, Calendar, Plus, Calculator
} from "lucide-react"
import ConfirmModal from "./ConfirmModal"
import ErrorModal from "./ErrorModal"
import { CURSOS, TURNOS, SERIES } from "@/config/constants"


interface TurmaFormProps {
  turma?: {
    id: string
    nome: string
    curso?: string | null
    turno?: string | null
    modalidade?: string | null
    serie?: string | null
    numero?: number | null
    cursoId?: string | null
    esquemaAvaliacaoId?: string | null
  }
  isEdit?: boolean
  dbCursos?: any[]
}

// Siglas de fallback se o banco estiver vazio
const SIGLAS_FALLBACK: Record<string, string> = {
  "Informática": "I",
  "Enfermagem": "E",
  "Análises Clínicas": "AC",
  "Edificações": "ED",
  "Redes de Computadores": "RC",
  "Eletromecânica": "EL",
  "Química": "Q",
  "Agroecologia": "A",
  "Nutrição e Dietética": "ND"
}

export default function TurmaForm({ turma, isEdit = false, dbCursos = [] }: TurmaFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false)
  const [isErrorModalOpen, setIsErrorModalOpen] = useState(false)
  // Removido o estado `cursos` e o isLoading. Agora usando constantes direto da raiz.

  
  const [formData, setFormData] = useState({
    nome: turma?.nome || "",
    curso: turma?.curso || "",
    turno: turma?.turno || "",
    modalidade: turma?.modalidade || "",
    serie: turma?.serie || "1",
    numero: turma?.numero || 1,
    cursoId: turma?.cursoId || "",
    // "" = herda o esquema do curso; preenchido = override só desta turma
    esquemaAvaliacaoId: turma?.esquemaAvaliacaoId || ""
  })
  const [importarMatriz, setImportarMatriz] = useState(!isEdit)
  const [esquemas, setEsquemas] = useState<{ id: string; nome: string }[]>([])

  useEffect(() => {
    fetch('/api/esquemas-avaliacao')
      .then(res => res.ok ? res.json() : [])
      .then(data => setEsquemas(Array.isArray(data) ? data : []))
      .catch(() => setEsquemas([]))
  }, [])

  const esquemaDoCurso = useMemo(() => {
    const cursoSelecionado = dbCursos.find(c => c.id === formData.cursoId)
      || dbCursos.find(c => c.nome === formData.curso && c.modalidade === formData.modalidade)
    return esquemas.find(e => e.id === cursoSelecionado?.esquemaAvaliacaoId)?.nome
  }, [dbCursos, esquemas, formData.cursoId, formData.curso, formData.modalidade])

  // Removido useEffect que puxava /api/cursos, agora as constantes são síncronas.

  // Limite e Configuração Baseado na Modalidade
  const config = useMemo(() => {
    const res = {
      max: 3,
      label: "Ano",
      turnosPermitidos: ["Matutino", "Vespertino"]
    }

    if (formData.modalidade === "PROEJA") {
      res.max = 5
      res.label = "Semestre"
      res.turnosPermitidos = ["Vespertino", "Noturno"]
    } else if (formData.modalidade === "SUBSEQUENTE") {
      res.max = 4
      res.label = "Módulo"
      res.turnosPermitidos = ["Vespertino", "Noturno"]
    }
    
    return res
  }, [formData.modalidade])

  // Filtragem rápida dos turnos pela configuração
  const turnosDisponiveis = useMemo(() => {
    return TURNOS
      .filter((t) => config.turnosPermitidos.some(p => p.toLowerCase() === t.nome.toLowerCase()))
      .map((t) => t.nome)
  }, [config.turnosPermitidos])


  // Reset de inconsistências ao trocar modalidade/curso
  useEffect(() => {
    if (!formData.modalidade) return
    let updates: any = {}

    if (parseInt(formData.serie) > config.max) updates.serie = "1"
    if (formData.turno && !turnosDisponiveis.includes(formData.turno)) updates.turno = ""

    if (Object.keys(updates).length > 0) {
      setFormData(prev => ({ ...prev, ...updates }))
    }
  }, [config.max, turnosDisponiveis, formData.modalidade])

  // Geração Automática do Nome Técnico (EX: 1TIM1)
  useEffect(() => {
    if (formData.modalidade && formData.curso && formData.turno && formData.serie && formData.numero) {
      const { serie, curso, turno, numero, modalidade } = formData
      
      const dbCursoMatch = dbCursos.find(c => c.nome === curso && c.modalidade === modalidade)
      let siglaRaw = dbCursoMatch?.sigla || SIGLAS_FALLBACK[curso] || ""
      
      // Limpar TODOS os sufixos de modalidade da sigla
      // Casos: I_PRO → I  |  MA_EPT → MA  |  AC_SUB → AC
      //        INeja → IN  |  ADMsub → ADM  |  I-EPTM → I
      siglaRaw = siglaRaw
        .replace(/_PRO$/i, '')   // sufixo da API multi-modalidade (PROEJA)
        .replace(/_EPT$/i, '')   // sufixo da API (EPTM)
        .replace(/_SUB$/i, '')   // sufixo da API (SUBSEQUENTE)
        .replace(/eja$/i, '')    // sufixo antigo (INeja → IN)
        .replace(/sub$/i, '')    // sufixo antigo (ADMsub → ADM)
        .split('-')[0]           // remove traço (I-EPTM → I)
        .split('_')[0]           // remove underscore remanescente
        .toUpperCase()
        .trim()
      
      if (!siglaRaw && curso) {
        const words = curso.split(' ').filter(w => !['de', 'da', 'do', 'e', 'o', 'a', 'em', 'dos', 'das'].includes(w.toLowerCase()))
        if (words.length >= 2) {
          siglaRaw = ((words[0]?.[0] || "") + (words[1]?.[0] || "")).toUpperCase()
        } else if (words.length === 1 && words[0]) {
          siglaRaw = words[0][0].toUpperCase()
        }
      }

      const turnoInic = turno === "Matutino" ? "M" : 
                       turno === "Vespertino" ? "V" : 
                       turno === "Noturno" ? "N" : "I"
      
      // Evitar duplicidade caso a sigla já termine com a letra do turno (ex: IN + N -> IN)
      const combined = siglaRaw.endsWith(turnoInic) ? siglaRaw : siglaRaw + turnoInic
      
      let sufixo = ""
      if (modalidade === "PROEJA") sufixo = "E"
      if (modalidade === "SUBSEQUENTE") sufixo = "SUB"

      // Formato: Ano/Semestre + T + Curso/Turno + Numero + Sufixo
      const suggested = `${serie}T${combined}${numero}${sufixo}`
      
      if (formData.nome !== suggested) {
        setFormData(prev => ({ ...prev, nome: suggested }))
      }
    }
  }, [formData.modalidade, formData.curso, formData.turno, formData.serie, formData.numero, dbCursos])

  const cursosFiltrados = useMemo(() => {
    if (!dbCursos || dbCursos.length === 0) return CURSOS.map(c => c.nome)
    
    if (formData.modalidade) {
       return Array.from(new Set(dbCursos.filter(c => c.modalidade === formData.modalidade).map(c => c.nome)))
    }
    return Array.from(new Set(dbCursos.map(c => c.nome)))
  }, [dbCursos, formData.modalidade])


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    console.log('Enviando dados da turma:', formData)

    try {
      const url = isEdit ? `/api/turmas/${turma?.id}` : '/api/turmas'
      const method = isEdit ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, importarMatriz })
      })

      if (response.ok) {
        const savedTurma = await response.json()
        
        console.log('Turma salva com sucesso')
        router.refresh()
        router.push('/dashboard/turmas')
      } else {
        const data = await response.json()
        console.error('Erro ao salvar turma:', data)
        setError(data.message || 'Erro ao salvar turma')
      }
    } catch (err) {
      console.error('Erro de conexão:', err)
      setError('Erro ao conectar com o servidor')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    setLoading(true)
    setError("")
    
    try {
      console.log('Iniciando exclusão da turma:', turma?.id)
      const response = await fetch(`/api/turmas/${turma?.id}`, { 
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' }
      })
      
      const data = await response.json()

      if (response.ok) {
        setIsConfirmModalOpen(false)
        router.refresh()
        router.push('/dashboard/turmas')
      } else {
        setError(data.message || 'Erro ao excluir')
        setIsConfirmModalOpen(false)
        setIsErrorModalOpen(true)
      }
    } catch (err) {
      console.error('Erro na requisição:', err)
      setError('Erro de conexão com o servidor')
      setIsConfirmModalOpen(false)
      setIsErrorModalOpen(true)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] pb-20">
      <nav className="bg-white/80 backdrop-blur-md sticky top-0 z-50 border-b border-slate-200 uppercase">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/dashboard/turmas" className="flex items-center space-x-2 text-black hover:opacity-70 font-semibold transition-all text-xs">
            <ArrowLeft className="w-4 h-4" />
            <span>Voltar</span>
          </Link>
          <span className="text-[10px] font-semibold text-black tracking-widest">Áxis Control</span>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-6 mt-12">
        <div className="mb-10 text-center">
           <h1 className="text-5xl font-semibold text-black tracking-tight mb-3">
             {isEdit ? 'Editar Turma' : 'Lançar Turma'}
           </h1>
           <p className="text-black font-medium text-lg max-w-xl mx-auto leading-relaxed">
              Siga os passos abaixo para configurar a turma. O sistema gerará o código de identificação automaticamente.
           </p>
        </div>

        {/* Seção de Dicas Rápidas */}
        {!isEdit && (
          <div className="max-w-2xl mx-auto mb-8 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-blue-50/50 border border-blue-100 p-4 rounded-2xl flex items-start space-x-3">
              <div className="bg-blue-500 p-1.5 rounded-lg shrink-0">
                <Layers className="w-3.5 h-3.5 text-white" />
              </div>
              <div>
                <h4 className="text-[10px] font-semibold text-blue-900 uppercase tracking-wider mb-1">Modalidades</h4>
                <p className="text-xs text-blue-800/70 font-medium leading-tight">
                  <b>EPTM:</b> Cursos integrados ao Médio.<br/>
                  <b>SUBSEQUENTE/PROEJA:</b> Módulos ou Semestres.
                </p>
              </div>
            </div>
            <div className="bg-emerald-50/50 border border-emerald-100 p-4 rounded-2xl flex items-start space-x-3">
              <div className="bg-emerald-500 p-1.5 rounded-lg shrink-0">
                <Save className="w-3.5 h-3.5 text-white" />
              </div>
              <div>
                <h4 className="text-[10px] font-semibold text-emerald-900 uppercase tracking-wider mb-1">Código Automático</h4>
                <p className="text-xs text-emerald-800/70 font-medium leading-tight">
                  O nome da turma (ex: <b>1TIM1</b>) é criado conforme você seleciona as opções.
                </p>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="max-w-2xl mx-auto space-y-6">
          <div className="space-y-6">
            {error && (
              <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl text-rose-600 flex items-center shadow-sm">
                <AlertCircle className="w-5 h-5 mr-3 shrink-0" />
                <span className="text-sm font-semibold">{error}</span>
              </div>
            )}

            <div className="bg-white rounded-[1.5rem] p-8 shadow-xl shadow-slate-200/50 border border-slate-100 space-y-8">
              {/* 1. Modalidade */}
              <div className="space-y-3">
                <div className="ml-1">
                  <label className="flex items-center text-[10px] font-semibold text-black uppercase tracking-widest">
                    <Layers className="w-4 h-4 mr-2 text-blue-500" />
                    1. Modalidade
                  </label>
                  <p className="text-[9px] text-black/40 font-semibold mt-0.5 ml-6">Define a estrutura de ensino e duração do curso</p>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {["EPTM", "SUBSEQUENTE", "PROEJA"].map((mod) => (
                    <button
                      key={mod}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, modalidade: mod, curso: "", turno: "" }))}
                      className={`py-2.5 rounded-xl font-semibold text-xs transition-all border-2 ${
                        formData.modalidade === mod 
                        ? 'bg-black border-black text-white shadow-lg' 
                        : 'bg-slate-50 border-slate-50 text-black hover:border-slate-200 hover:bg-white'
                      }`}
                    >
                      {mod}
                    </button>
                  ))}
                </div>
              </div>

              {/* Grid 2 & 3 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <div className="flex items-center justify-between ml-1">
                    <div className="flex flex-col ml-1">
                      <label className="flex items-center text-[10px] font-semibold text-black uppercase tracking-widest">
                        <GraduationCap className="w-4 h-4 mr-2 text-indigo-500" />
                        2. Curso
                      </label>
                      <p className="text-[9px] text-black/40 font-semibold mt-0.5 ml-6">Escolha a habilitação técnica</p>
                    </div>
                  </div>

                  <select 
                    disabled={!formData.modalidade} required
                    value={formData.curso}
                    onChange={(e) => {
                      const selecionado = dbCursos?.find(c => c.nome === e.target.value && c.modalidade === formData.modalidade) || CURSOS.find(c => c.nome === e.target.value)
                      setFormData(prev => ({ 
                        ...prev, 
                        curso: e.target.value,
                        // Id temporário para não quebrar contrato do formData caso alguma func dependa
                        cursoId: selecionado?.id || "" 
                      }))
                    }}
                    className="w-full h-12 px-4 bg-slate-50 border border-slate-100 rounded-xl outline-none font-semibold text-sm text-black focus:bg-white focus:border-blue-500 transition-all appearance-none disabled:opacity-30"
                  >
                    <option value="">{formData.modalidade ? "Selecionar..." : "Aguardando modalidade"}</option>
                    {cursosFiltrados.map(c => (
                      <option key={c} value={c}>
                         {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <div className="flex flex-col ml-1">
                    <label className="flex items-center text-[10px] font-semibold text-black uppercase tracking-widest">
                      <Clock className="w-4 h-4 mr-2 text-orange-500" />
                      3. Turno
                    </label>
                    <p className="text-[9px] text-black/40 font-semibold mt-0.5 ml-6">Período de oferta das aulas</p>
                  </div>
                  <select 
                    disabled={!formData.curso} required
                    value={formData.turno}
                    onChange={(e) => setFormData(prev => ({ ...prev, turno: e.target.value }))}
                    className="w-full h-12 px-4 bg-slate-50 border border-slate-100 rounded-xl outline-none font-semibold text-sm text-black focus:bg-white focus:border-blue-500 transition-all appearance-none disabled:opacity-30"
                  >
                    <option value="">{formData.curso ? "Escolha..." : "Aguardando curso"}</option>
                    {turnosDisponiveis.map((t: string) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>

                {/* 4. Ano/Série */}
                <div className="space-y-2">
                  <div className="flex flex-col ml-1">
                    <label className="flex items-center text-[10px] font-semibold text-black uppercase tracking-widest">
                      <Calendar className="w-4 h-4 mr-2 text-emerald-500" />
                      4. {config.label}
                    </label>
                    <p className="text-[9px] text-black/40 font-semibold mt-0.5 ml-6">Posição atual da turma no curso</p>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {Array.from({ length: config.max }, (_, i) => (i + 1).toString()).map((s) => (
                      <button
                        key={s} type="button"
                        onClick={() => setFormData(p => ({ ...p, serie: s }))}
                        className={`flex-1 py-2.5 rounded-lg font-semibold text-sm transition-all border ${
                          formData.serie === s 
                          ? 'bg-emerald-500 border-emerald-500 text-white shadow-md' 
                          : 'bg-slate-50 border-transparent text-black hover:bg-slate-100'
                        }`}
                      >
                        {s}º
                      </button>
                    ))}
                  </div>
                </div>

                {/* 5. Número */}
                <div className="space-y-2">
                  <div className="flex flex-col ml-1">
                    <label className="flex items-center text-[10px] font-semibold text-black uppercase tracking-widest">
                      <Hash className="w-4 h-4 mr-2 text-pink-500" />
                      5. ID da Turma
                    </label>
                    <p className="text-[9px] text-black/40 font-semibold mt-0.5 ml-6">Diferencia turmas do mesmo ano/turno</p>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {[1, 2, 3, 4].map((n) => (
                      <button
                        key={n} type="button"
                        onClick={() => setFormData(p => ({ ...p, numero: n }))}
                        className={`flex-1 py-2.5 rounded-lg font-semibold text-sm transition-all border ${
                          formData.numero === n
                          ? 'bg-pink-500 border-pink-500 text-white shadow-md' 
                          : 'bg-slate-50 border-transparent text-black hover:bg-slate-100'
                        }`}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 6. Esquema de Avaliação */}
                <div className="md:col-span-2 space-y-2">
                  <div className="flex flex-col ml-1">
                    <label className="flex items-center text-[10px] font-semibold text-black uppercase tracking-widest">
                      <Calculator className="w-4 h-4 mr-2 text-violet-500" />
                      6. Esquema de Avaliação
                    </label>
                    <p className="text-[9px] text-black/40 font-semibold mt-0.5 ml-6">Unidades e atividades usadas no lançamento de notas</p>
                  </div>
                  <select
                    value={formData.esquemaAvaliacaoId}
                    onChange={(e) => setFormData(prev => ({ ...prev, esquemaAvaliacaoId: e.target.value }))}
                    className="w-full h-12 px-4 bg-slate-50 border border-slate-100 rounded-xl outline-none font-semibold text-sm text-black focus:bg-white focus:border-blue-500 transition-all appearance-none"
                  >
                    <option value="">Herdar do curso{esquemaDoCurso ? ` (${esquemaDoCurso})` : ""}</option>
                    {esquemas.map(esq => (
                      <option key={esq.id} value={esq.id}>{esq.nome}</option>
                    ))}
                  </select>
                </div>

                {/* Opção de Importar Matriz */}
                {!isEdit && (
                  <div className="md:col-span-2 bg-slate-50 p-4 rounded-2xl flex items-center justify-between group cursor-pointer" onClick={() => setImportarMatriz(!importarMatriz)}>
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${importarMatriz ? 'bg-blue-600 shadow-lg shadow-blue-200' : 'bg-slate-200'}`}>
                        <Layers className={`w-5 h-5 ${importarMatriz ? 'text-white' : 'text-slate-400'}`} />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-800 uppercase tracking-tight">Importar Matriz Curricular</p>
                        <p className="text-[10px] text-slate-500 font-medium leading-none">Cadastrar disciplinas padrão automaticamente</p>
                      </div>
                    </div>
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${importarMatriz ? 'bg-blue-600 border-blue-600' : 'border-slate-300'}`}>
                      {importarMatriz && <div className="w-2 h-2 bg-white rounded-full" />}
                    </div>
                  </div>
                )}
              </div>

              {/* Preview e Ações Integradas */}
              <div className="pt-6 border-t border-slate-100 space-y-4">
                <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
                  <div className="flex-1 flex flex-col items-center md:items-start justify-center p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <span className="text-[9px] font-semibold text-black uppercase tracking-widest">Código</span>
                    <div className="text-xl font-semibold tracking-tighter text-black font-mono">
                      {formData.nome || "---"}
                    </div>
                  </div>

                  <button
                    type="submit" disabled={loading}
                    className="flex-[1.5] flex items-center justify-center space-x-2 bg-blue-600 text-white py-4 px-6 rounded-2xl font-semibold hover:bg-blue-700 transition-all shadow-lg active:scale-[0.98] disabled:opacity-50"
                  >
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                    <span className="text-sm uppercase tracking-wide">
                      {loading ? 'Salvando...' : (isEdit ? 'Salvar Edição' : 'Lançar Turma')}
                    </span>
                  </button>
                </div>

                <div className="flex items-center justify-center gap-6">
                  <button
                    type="button"
                    onClick={() => router.push('/dashboard/turmas')}
                    className="text-black font-semibold text-[10px] uppercase tracking-widest hover:opacity-70 transition-colors"
                  >
                    Descartar
                  </button>
                  
                  {isEdit && (
                    <button
                      type="button" 
                      onClick={() => setIsConfirmModalOpen(true)}
                      disabled={loading}
                      className="flex items-center space-x-1.5 font-semibold text-[10px] uppercase tracking-widest text-rose-400 hover:text-rose-600 hover:bg-rose-50 px-3 py-1.5 rounded-lg transition-all"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Excluir Turma</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </form>
      </main>

      {/* Removido o Modal de Inserção de Cursos Local, Cursos agora são via Config */}

      <ConfirmModal
        isOpen={isConfirmModalOpen}
        onClose={() => setIsConfirmModalOpen(false)}
        onConfirm={handleDelete}
        title="Excluir Turma"
        message={`Tem certeza que deseja excluir a turma "${formData.nome}"? Esta ação é irreversível e apagará todos os estudantes e notas vinculadas.`}
        confirmText="Sim, excluir tudo"
        loading={loading}
      />

      <ErrorModal
        isOpen={isErrorModalOpen}
        onClose={() => setIsErrorModalOpen(false)}
        message={error}
      />
    </div>
  )
}
