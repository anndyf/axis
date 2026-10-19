"use client"

import { useState } from "react"
import Link from "next/link"
import { ArrowLeft, Plus, Pencil, Trash2, ClipboardList, Layers } from "lucide-react"
import EsquemaAvaliacaoModal, { type EsquemaParaEditar } from "@/components/EsquemaAvaliacaoModal"
import ConfirmModal from "@/components/ConfirmModal"

type Esquema = EsquemaParaEditar & {
  numUnidades: number
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
    setEsquemaParaEditar(esquema)
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
    <div className="">
      <header className="mb-6">
        <div className="max-w-5xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <Link href="/dashboard/configuracoes" aria-label="Voltar" className="hidden sm:inline-flex p-1.5 rounded-md text-fg-subtle transition-colors duration-150 hover:bg-subtle hover:text-fg">
              <ArrowLeft size={16} strokeWidth={1.75} />
            </Link>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-fg">Esquemas de Avaliação</h1>
              <p className="text-sm text-fg-muted">Unidades, atividades e regras de recuperação por escola</p>
            </div>
          </div>
          <button
            onClick={abrirNovo}
            className="inline-flex h-9 shrink-0 items-center gap-2 rounded-md bg-accent px-3 text-sm font-medium text-on-accent transition-colors duration-150 hover:bg-accent-hover disabled:opacity-50"
          >
            <Plus size={16} strokeWidth={1.75} />
            <span>Novo Esquema</span>
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {esquemas.length === 0 ? (
          <div className="bg-surface rounded-xl shadow-card border border-line p-20 text-center">
            <div className="w-20 h-20 bg-canvas rounded-xl flex items-center justify-center mx-auto mb-6">
              <ClipboardList className="w-10 h-10 text-fg-disabled" />
            </div>
            <h3 className="text-2xl font-medium text-fg mb-2">Nenhum esquema cadastrado</h3>
            <p className="text-fg-muted font-medium mb-8 max-w-xs mx-auto text-sm">
              Crie o primeiro esquema de avaliação da escola.
            </p>
            <button
              onClick={abrirNovo}
              className="inline-flex items-center space-x-2 bg-accent text-on-accent px-8 py-4 rounded-lg hover:bg-accent-hover transition-all font-medium text-xs shadow-card active:scale-95"
            >
              <Plus size={16} />
              <span>Criar Esquema</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {esquemas.map(esquema => (
              <div key={esquema.id} className="bg-surface border border-line rounded-xl p-6 shadow-sm hover:shadow-card transition-all">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-lg bg-subtle text-fg-muted">
                      <Layers className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-fg">{esquema.nome}</h3>
                      <p className="text-xs text-fg-subtle font-medium">
                        {esquema.numUnidades} {esquema.numUnidades === 1 ? 'unidade' : 'unidades'} · nota mín. {esquema.notaMinimaAprovacao}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => abrirEdicao(esquema)} className="p-2 text-fg-subtle hover:text-accent-fg hover:bg-accent-subtle rounded-xl transition-colors">
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button onClick={() => { setEsquemaParaExcluir(esquema); setErroExclusao("") }} className="p-2 text-fg-subtle hover:text-danger-fg hover:bg-danger-subtle rounded-xl transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap gap-1.5 mb-4">
                  {esquema.unidades.map(u => (
                    <span key={u.id} className="px-2.5 py-1 bg-canvas border border-line rounded-lg text-xs font-medium text-fg-muted">
                      {u.nome} ({u.atividades.length} {u.atividades.length === 1 ? 'atividade' : 'atividades'})
                    </span>
                  ))}
                </div>

                <div className="flex items-center gap-3 text-xs font-medium text-fg-subtle">
                  <span>{esquema._count.cursos} {esquema._count.cursos === 1 ? 'curso' : 'cursos'}</span>
                  <span>·</span>
                  <span>{esquema._count.turmas} {esquema._count.turmas === 1 ? 'turma' : 'turmas'}</span>
                  {esquema.recuperacaoUnidadeAtiva && <span className="text-accent-fg">· Rec. unidade</span>}
                  {esquema.recuperacaoFinalAtiva && <span className="text-success-fg">· Rec. final</span>}
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
