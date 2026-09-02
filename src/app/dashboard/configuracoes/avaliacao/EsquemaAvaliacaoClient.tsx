"use client"

import { useState } from "react"
import Link from "next/link"
import { ArrowLeft, Plus, Pencil, Trash2, ClipboardList, Layers } from "lucide-react"
import EsquemaAvaliacaoModal, { type EsquemaParaEditar } from "@/components/EsquemaAvaliacaoModal"
import ConfirmModal from "@/components/ConfirmModal"

interface Atividade { id: string; nome: string; peso: number }
interface Unidade { id: string; nome: string; atividades: Atividade[] }
interface Esquema {
  id: string
  nome: string
  numUnidades: number
  notaMinimaAprovacao: number
  recuperacaoUnidadeAtiva: boolean
  modoRecuperacaoUnidade: string | null
  recuperacaoFinalAtiva: boolean
  modoRecuperacaoFinal: string | null
  unidades: Unidade[]
  _count: { cursos: number; turmas: number }
}

export default function EsquemaAvaliacaoClient({ esquemasIniciais }: { esquemasIniciais: Esquema[] }) {
  const [esquemas, setEsquemas] = useState<Esquema[]>(esquemasIniciais)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [esquemaParaEditar, setEsquemaParaEditar] = useState<EsquemaParaEditar | null>(null)
  const [esquemaParaExcluir, setEsquemaParaExcluir] = useState<Esquema | null>(null)
  const [excluindo, setExcluindo] = useState(false)
  const [erroExclusao, setErroExclusao] = useState("")

  const abrirNovo = () => {
    setEsquemaParaEditar(null)
    setIsModalOpen(true)
  }

  const abrirEdicao = (esquema: Esquema) => {
    setEsquemaParaEditar({
      id: esquema.id,
      nome: esquema.nome,
      notaMinimaAprovacao: esquema.notaMinimaAprovacao,
      recuperacaoUnidadeAtiva: esquema.recuperacaoUnidadeAtiva,
      modoRecuperacaoUnidade: esquema.modoRecuperacaoUnidade,
      recuperacaoFinalAtiva: esquema.recuperacaoFinalAtiva,
      modoRecuperacaoFinal: esquema.modoRecuperacaoFinal,
      unidades: esquema.unidades.map(u => ({
        nome: u.nome,
        atividades: u.atividades.map(a => ({ nome: a.nome, peso: a.peso }))
      }))
    })
    setIsModalOpen(true)
  }

  const onSuccess = (esquemaSalvo: Esquema) => {
    setEsquemas(prev => {
      const existe = prev.some(e => e.id === esquemaSalvo.id)
      if (existe) return prev.map(e => e.id === esquemaSalvo.id ? { ...esquemaSalvo, _count: e._count } : e)
      return [...prev, { ...esquemaSalvo, _count: { cursos: 0, turmas: 0 } }].sort((a, b) => a.nome.localeCompare(b.nome))
    })
  }

  const confirmarExclusao = async () => {
    if (!esquemaParaExcluir) return
    setExcluindo(true)
    setErroExclusao("")
    try {
      const res = await fetch(`/api/esquemas-avaliacao/${esquemaParaExcluir.id}`, { method: 'DELETE' })
      const data = await res.json()
      if (res.ok) {
        setEsquemas(prev => prev.filter(e => e.id !== esquemaParaExcluir.id))
        setEsquemaParaExcluir(null)
      } else {
        setErroExclusao(data.message || 'Erro ao excluir esquema')
      }
    } catch {
      setErroExclusao('Erro ao conectar com o servidor')
    } finally {
      setExcluindo(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white/80 backdrop-blur-xl border-b border-slate-300 sticky top-0 z-40 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto py-4 flex items-center justify-between">
          <div className="flex items-center space-x-5">
            <Link href="/dashboard/configuracoes" className="p-2 hover:bg-slate-200 rounded-lg transition-colors text-slate-400 hover:text-slate-700">
              <ArrowLeft size={20} />
            </Link>
            <div>
              <h1 className="text-2xl font-medium text-slate-800 tracking-tight">Esquemas de Avaliação</h1>
              <p className="text-sm text-slate-600 font-medium">Unidades, atividades e regras de recuperação por escola</p>
            </div>
          </div>
          <button
            onClick={abrirNovo}
            className="flex items-center space-x-2 bg-slate-900 text-white px-5 py-3 rounded-2xl font-medium hover:bg-slate-800 transition-all text-xs uppercase tracking-widest active:scale-95 shadow-lg"
          >
            <Plus size={16} />
            <span>Novo Esquema</span>
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {esquemas.length === 0 ? (
          <div className="bg-white rounded-[2.5rem] shadow-xl shadow-slate-300/50 border border-slate-200 p-20 text-center">
            <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center mx-auto mb-6">
              <ClipboardList className="w-10 h-10 text-slate-300" />
            </div>
            <h3 className="text-2xl font-medium text-slate-800 mb-2">Nenhum esquema cadastrado</h3>
            <p className="text-slate-700 font-medium mb-8 max-w-xs mx-auto text-sm">
              Crie o primeiro esquema de avaliação da escola.
            </p>
            <button
              onClick={abrirNovo}
              className="inline-flex items-center space-x-2 bg-slate-900 text-white px-8 py-4 rounded-2xl hover:bg-slate-800 transition-all font-medium text-xs uppercase tracking-widest shadow-xl active:scale-95"
            >
              <Plus size={16} />
              <span>Criar Esquema</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {esquemas.map(esquema => (
              <div key={esquema.id} className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm hover:shadow-lg transition-all">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-2xl bg-slate-100 text-slate-600">
                      <Layers className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-800">{esquema.nome}</h3>
                      <p className="text-[11px] text-slate-400 font-medium uppercase tracking-wide">
                        {esquema.numUnidades} {esquema.numUnidades === 1 ? 'unidade' : 'unidades'} · nota mín. {esquema.notaMinimaAprovacao}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => abrirEdicao(esquema)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors">
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button onClick={() => { setEsquemaParaExcluir(esquema); setErroExclusao("") }} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap gap-1.5 mb-4">
                  {esquema.unidades.map(u => (
                    <span key={u.id} className="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-[10px] font-medium text-slate-600">
                      {u.nome} ({u.atividades.length} {u.atividades.length === 1 ? 'atividade' : 'atividades'})
                    </span>
                  ))}
                </div>

                <div className="flex items-center gap-3 text-[10px] font-medium text-slate-400 uppercase tracking-wide">
                  <span>{esquema._count.cursos} {esquema._count.cursos === 1 ? 'curso' : 'cursos'}</span>
                  <span>·</span>
                  <span>{esquema._count.turmas} {esquema._count.turmas === 1 ? 'turma' : 'turmas'}</span>
                  {esquema.recuperacaoUnidadeAtiva && <span className="text-blue-500">· Rec. unidade</span>}
                  {esquema.recuperacaoFinalAtiva && <span className="text-emerald-500">· Rec. final</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <EsquemaAvaliacaoModal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setEsquemaParaEditar(null) }}
        onSuccess={onSuccess}
        esquemaParaEditar={esquemaParaEditar}
      />

      <ConfirmModal
        isOpen={!!esquemaParaExcluir}
        onClose={() => setEsquemaParaExcluir(null)}
        onConfirm={confirmarExclusao}
        title="Excluir Esquema"
        message={erroExclusao || `Tem certeza que deseja excluir "${esquemaParaExcluir?.nome}"? Essa ação não pode ser desfeita.`}
        confirmText="Excluir"
        variant="danger"
        loading={excluindo}
      />
    </div>
  )
}
