"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Save, Loader2, CheckSquare, Square, Sun, Sunset, Moon } from "lucide-react"
import ErrorModal from "./ErrorModal"
import ConfirmModal from "./ConfirmModal"

interface Turma {
  id: string
  nome: string
  curso?: string | null
  turno?: string | null
}

interface Area {
  id: string
  nome: string
}

interface DisciplinaFormProps {
  disciplina?: {
    id: string
    nome: string
    turmaId: string
    areaId?: string | null
  }
  isEdit?: boolean
}

export default function DisciplinaForm({ disciplina, isEdit = false }: DisciplinaFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [error, setError] = useState("")
  const [isErrorModalOpen, setIsErrorModalOpen] = useState(false)
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false)
  const [turmas, setTurmas] = useState<Turma[]>([])
  const [areas, setAreas] = useState<Area[]>([])
  const [formData, setFormData] = useState({
    nome: disciplina?.nome || "",
    turmaId: disciplina?.turmaId || "",
    areaId: disciplina?.areaId || ""
  })
  
  const [bulkMode, setBulkMode] = useState(false)
  const [nomesBulk, setNomesBulk] = useState("")
  const [selectedTurmas, setSelectedTurmas] = useState<string[]>(
    isEdit && disciplina?.turmaId ? [disciplina.turmaId] : []
  )

  useEffect(() => {
    // Carregar turmas
    fetch('/api/turmas')
      .then(res => res.json())
      .then(data => setTurmas(data))
      .catch(console.error)

    // Carregar áreas
    fetch('/api/areas')
      .then(res => res.json())
      .then(data => setAreas(data))
      .catch(console.error)
  }, [])

  const groupedTurmas = turmas.reduce((acc, turma) => {
      const turno = turma.turno || 'Outros'
      const curso = turma.curso || 'Geral'
      
      if (!acc[turno]) acc[turno] = {}
      if (!acc[turno][curso]) acc[turno][curso] = []
      
      acc[turno][curso].push(turma)
      return acc
  }, {} as Record<string, Record<string, Turma[]>>)

  const sortedTurnos = Object.keys(groupedTurmas).sort((a, b) => {
      const order = ['Matutino', 'Vespertino', 'Noturno', 'Integral', 'Outros']
      return order.indexOf(a) - order.indexOf(b)
  })

  const toggleAllTurmas = () => {
    if (selectedTurmas.length === turmas.length) {
      setSelectedTurmas([])
    } else {
      setSelectedTurmas(turmas.map(t => t.id))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    if (!isEdit && selectedTurmas.length === 0) {
      setError("Selecione pelo menos uma turma")
      setLoading(false)
      return
    }

    try {
      const url = isEdit ? `/api/disciplinas/${disciplina?.id}` : '/api/disciplinas'
      const method = isEdit ? 'PUT' : 'POST'

      let body: any = {}

      if (isEdit) {
        // Na edição, mantemos o comportamento padrão de editar um único registro
        body = formData
      } else {
        // Na criação, usamos a lógica de multi-seleção
        body = {
            nome: formData.nome,
            nomes: bulkMode ? nomesBulk.split('\n') : undefined,
            turmaIds: selectedTurmas,
            areaId: formData.areaId || undefined
        }
      }

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      })

      if (response.ok) {
        router.push('/dashboard/disciplinas')
        router.refresh()
      } else {
        const data = await response.json()
        const errorMsg = data.message || 'Erro ao salvar disciplina'
        setError(errorMsg)
        setIsErrorModalOpen(true)
      }
    } catch (err) {
      setError('Erro ao conectar com o servidor')
      setIsErrorModalOpen(true)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!disciplina?.id) {
      setError("ID da disciplina não encontrado")
      setIsErrorModalOpen(true)
      return
    }

    setDeleteLoading(true)
    try {
      const response = await fetch(`/api/disciplinas/${disciplina.id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        setIsConfirmModalOpen(false)
        router.push('/dashboard/disciplinas')
        router.refresh()
      } else {
        const data = await response.json()
        setError(data.message || 'Erro ao excluir disciplina')
        setIsErrorModalOpen(true)
        setIsConfirmModalOpen(false)
      }
    } catch (err) {
      console.error('Erro ao excluir:', err)
      setError('Erro ao conectar com o servidor')
      setIsErrorModalOpen(true)
      setIsConfirmModalOpen(false)
    } finally {
      setDeleteLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-canvas">
      <ErrorModal 
        isOpen={isErrorModalOpen}
        onClose={() => setIsErrorModalOpen(false)}
        message={error}
      />
      <ConfirmModal
        isOpen={isConfirmModalOpen}
        onClose={() => setIsConfirmModalOpen(false)}
        onConfirm={handleDelete}
        title="Excluir Disciplina"
        message={`Tem certeza que deseja excluir a disciplina "${disciplina?.nome}"? Esta ação não pode ser desfeita.`}
        confirmText="Sim, Excluir"
        cancelText="Não, Cancelar"
        loading={deleteLoading}
      />
      {/* Header */}
      <header className="bg-surface shadow-sm border-b border-line">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center space-x-4">
            <Link
              href="/dashboard/disciplinas"
              className="p-2 hover:bg-subtle rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-fg-muted" />
            </Link>
            <div>
              <h1 className="text-2xl font-semibold text-fg">
                {isEdit ? 'Editar Disciplina' : 'Nova Disciplina'}
              </h1>
              <p className="text-sm text-fg-muted">
                {isEdit ? 'Atualize as informações da disciplina' : 'Cadastre uma nova disciplina em uma ou mais turmas'}
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <form onSubmit={handleSubmit} className="bg-surface rounded-xl shadow-sm border border-line p-6">
          <div className="space-y-8">
            {/* Seção 1: Dados da Disciplina */}
            <div>
              <h3 className="text-lg font-semibold text-fg mb-4 flex items-center">
                <span className="w-8 h-8 rounded-full bg-accent-subtle text-accent-fg flex items-center justify-center text-sm mr-3">1</span>
                Informações da Disciplina
              </h3>
              
              <div className="pl-11">
                {!isEdit && (
                  <div className="flex items-center mb-4">
                    <input
                      type="checkbox"
                      id="bulkMode"
                      checked={bulkMode}
                      onChange={(e) => setBulkMode(e.target.checked)}
                      className="h-4 w-4 text-accent-fg focus:ring-ring border-line-strong rounded cursor-pointer"
                    />
                    <label htmlFor="bulkMode" className="ml-2 block text-sm text-fg cursor-pointer select-none">
                      Cadastrar múltiplas disciplinas (em lote)
                    </label>
                  </div>
                )}

                <label htmlFor="nome" className="block text-sm font-medium text-fg-muted mb-2">
                  {bulkMode ? 'Nomes das Disciplinas (uma por linha)' : 'Nome da Disciplina *'}
                </label>
                
                {bulkMode ? (
                  <textarea
                    id="nomes"
                    rows={5}
                    value={nomesBulk}
                    onChange={(e) => setNomesBulk(e.target.value)}
                    className="w-full px-4 py-3 border border-line-strong rounded-lg focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
                    placeholder="Matemática&#10;Português&#10;História"
                    required
                  />
                ) : (
                  <input
                    type="text"
                    id="nome"
                    required
                    value={formData.nome}
                    onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                    className="w-full px-4 py-3 border border-line-strong rounded-lg focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
                    placeholder="Ex: Programação Web"
                  />
                )}
                {bulkMode && (
                  <p className="mt-1 text-sm text-fg-subtle">
                    Digite o nome de cada disciplina em uma nova linha. Todas as disciplinas listadas serão criadas para as turmas selecionadas.
                  </p>
                )}

                <div className="mt-6">
                  <label htmlFor="areaId" className="block text-sm font-medium text-fg-muted mb-2">
                    Área do Conhecimento (Simulado)
                  </label>
                  <select
                    id="areaId"
                    value={formData.areaId}
                    onChange={(e) => setFormData({ ...formData, areaId: e.target.value })}
                    className="w-full px-4 py-3 border border-line-strong rounded-lg focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
                  >
                    <option value="">Nenhuma área selecionada</option>
                    {areas.map((area) => (
                      <option key={area.id} value={area.id}>
                        {area.nome}
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-xs text-fg-subtle">
                    Opcional. Vincule a uma área para que as notas de simulado desta área apareçam para o professor.
                  </p>
                </div>
              </div>
            </div>

            <div className="border-t border-line-subtle pt-6"></div>

            {/* Seção 2: Seleção de Turmas */}
            <div>
               <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-fg flex items-center">
                    <span className="w-8 h-8 rounded-full bg-accent-subtle text-accent-fg flex items-center justify-center text-sm mr-3">2</span>
                    {isEdit ? 'Turma' : 'Turmas de Destino'}
                  </h3>
                  
                  {!isEdit && turmas.length > 0 && (
                    <button
                      type="button"
                      onClick={toggleAllTurmas}
                      className="text-sm font-medium text-accent-fg hover:text-accent-fg flex items-center transition-colors"
                    >
                      {selectedTurmas.length === turmas.length ? (
                        <><CheckSquare className="w-4 h-4 mr-1" /> Desmarcar Todas</>
                      ) : (
                        <><Square className="w-4 h-4 mr-1" /> Selecionar Todas</>
                      )}
                    </button>
                  )}
               </div>

               <div className="pl-11">
                 {isEdit ? (
                    <select
                      id="turmaId"
                      required
                      value={formData.turmaId}
                      onChange={(e) => setFormData({ ...formData, turmaId: e.target.value })}
                      className="w-full px-4 py-3 border border-line-strong rounded-lg focus:ring-2 focus:ring-ring focus:border-transparent"
                    >
                      <option value="">Selecione uma turma...</option>
                      {turmas.map((turma) => (
                        <option key={turma.id} value={turma.id}>
                          {turma.nome}
                        </option>
                      ))}
                    </select>
                 ) : (
                   <div className="max-h-[500px] overflow-y-auto pr-2 custom-scrollbar space-y-6">
                     {sortedTurnos.map(turno => (
                        <div key={turno}>
                           <h4 className="flex items-center text-sm font-semibold text-fg mb-3 pb-1 border-b border-line-subtle">
                                {turno === 'Matutino' && <Sun className="w-4 h-4 mr-2 text-warning-fg"/>}
                                {turno === 'Vespertino' && <Sunset className="w-4 h-4 mr-2 text-warning-fg"/>}
                                {turno === 'Noturno' && <Moon className="w-4 h-4 mr-2 text-accent-fg"/>}
                                {turno}
                           </h4>
                           <div className="space-y-4 pl-2">
                               {Object.keys(groupedTurmas[turno]).sort().map(curso => (
                                   <div key={curso}>
                                      {curso !== 'Geral' && (
                                          <h5 className="text-xs font-semibold text-fg-subtle mb-2">{curso}</h5>
                                      )}
                                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                                          {groupedTurmas[turno][curso].map(t => {
                                              const isSelected = selectedTurmas.includes(t.id)
                                              return (
                                                <label 
                                                  key={t.id} 
                                                  className={`flex items-center p-2 rounded border cursor-pointer transition-all duration-200 group ${
                                                    isSelected 
                                                      ? 'bg-accent-subtle border-accent/25 ring-1 ring-ring' 
                                                      : 'hover:bg-canvas border-line'
                                                  }`}
                                                >
                                                  <div className={`flex-shrink-0 w-4 h-4 rounded border flex items-center justify-center mr-2 transition-colors ${
                                                    isSelected ? 'bg-accent border-accent' : 'border-line-strong bg-surface'
                                                  }`}>
                                                    {isSelected && <CheckSquare className="w-3 h-3 text-white" />}
                                                    <input
                                                      type="checkbox"
                                                      className="hidden"
                                                      checked={isSelected}
                                                      onChange={(e) => {
                                                         if (e.target.checked) setSelectedTurmas([...selectedTurmas, t.id])
                                                         else setSelectedTurmas(selectedTurmas.filter(id => id !== t.id))
                                                      }}
                                                    />
                                                  </div>
                                                  <span className={`text-xs font-medium ${isSelected ? 'text-accent-fg' : 'text-fg-muted'}`}>
                                                    {t.nome}
                                                  </span>
                                                </label>
                                              )
                                          })}
                                      </div>
                                   </div>
                               ))}
                           </div>
                        </div>
                     ))}
                   </div>
                 )}
               </div>
            </div>
          </div>

          <div className="mt-8 flex items-center justify-between pt-6 border-t border-line-subtle">
            <div>
              {isEdit && (
                <button
                  type="button"
                  onClick={() => setIsConfirmModalOpen(true)}
                  disabled={loading || deleteLoading}
                  className="px-6 py-3 text-danger-fg hover:bg-danger-subtle rounded-lg transition-colors disabled:opacity-50 font-medium"
                >
                  Excluir
                </button>
              )}
            </div>
            <div className="flex space-x-4">
              <Link
                href="/dashboard/disciplinas"
                className="px-6 py-3 text-fg-muted hover:bg-subtle rounded-lg transition-colors font-medium"
              >
                Cancelar
              </Link>
              <button
                type="submit"
                disabled={loading || (!isEdit && selectedTurmas.length === 0)}
                className="flex items-center space-x-2 bg-accent text-on-accent px-8 py-3 rounded-lg hover:bg-accent-hover transition-all shadow-card disabled:opacity-50 font-medium"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Salvando...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-5 h-5" />
                    <span>{isEdit ? 'Atualizar Disciplina' : 'Cadastrar Disciplinas'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </main>
    </div>
  )
}
