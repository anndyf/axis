"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Save, CheckCheck, X } from "lucide-react"
import { Alert, Button, CabecalhoPagina, Field, Input, Painel, Select, buttonClasses } from "@/components/ui"

interface Turma {
  id: string
  nome: string
}

interface EstudanteFormProps {
  estudante?: {
    nome: string
    turmaId: string
    matricula: string
  }
  isEdit?: boolean
}

export default function EstudanteForm({ estudante, isEdit = false }: EstudanteFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [resultMsg, setResultMsg] = useState<{ text: string; ok: boolean } | null>(null)
  const [turmas, setTurmas] = useState<Turma[]>([])
  const [formData, setFormData] = useState({
    nome: estudante?.nome || "",
    turmaId: estudante?.turmaId || "",
    matricula: estudante?.matricula || ""
  })

  useEffect(() => {
    // Carregar turmas
    fetch('/api/turmas')
      .then(res => res.json())
      .then(data => setTurmas(data))
      .catch(console.error)
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")
    setResultMsg(null)

    try {
      const url = isEdit ? `/api/estudantes/${estudante?.matricula}` : '/api/estudantes'
      const method = isEdit ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      })

      const data = await response.json()

      if (response.ok) {
        setResultMsg({ 
          text: isEdit ? 'Estudante atualizado com sucesso.' : 'Estudante cadastrado com sucesso.', 
          ok: true 
        })
        
        // Recarrega a página ou redireciona para a edição para o usuário confirmar os dados
        setTimeout(() => {
          if (!isEdit && data?.matricula) {
            router.push(`/dashboard/estudantes/${data.matricula}/editar`)
          } else {
            router.refresh()
          }
        }, 1500)
      } else {
        setError(data.message || 'Não foi possível salvar o estudante. Tente novamente.')
        setResultMsg({ text: data.message || 'Não foi possível salvar o estudante. Tente novamente.', ok: false })
      }
    } catch (err) {
      setError('Não foi possível conectar ao servidor. Tente novamente.')
      setResultMsg({ text: 'Não foi possível conectar ao servidor. Tente novamente.', ok: false })
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Tem certeza que deseja excluir este estudante?')) return

    setLoading(true)
    setError("")
    setResultMsg(null)

    try {
      const response = await fetch(`/api/estudantes/${estudante?.matricula}`, {
        method: 'DELETE'
      })

      const data = await response.json()

      if (response.ok) {
        setResultMsg({ text: 'Estudante excluído.', ok: true })
        
        setTimeout(() => {
          router.push('/dashboard/estudantes')
          router.refresh()
        }, 1500)
      } else {
        setError(data.message || 'Não foi possível excluir o estudante. Tente novamente.')
        setResultMsg({ text: data.message || 'Não foi possível excluir o estudante. Tente novamente.', ok: false })
      }
    } catch (err) {
      setError('Não foi possível conectar ao servidor. Tente novamente.')
      setResultMsg({ text: 'Não foi possível conectar ao servidor. Tente novamente.', ok: false })
    } finally {
      setLoading(false)
    }
  }

  const voltar = isEdit ? `/dashboard/estudantes/${encodeURIComponent(estudante?.matricula ?? "")}` : "/dashboard/estudantes"

  return (
    <div>
      {!isEdit && <CabecalhoPagina titulo="Novo estudante" descricao="Cadastre o estudante e vincule a uma turma." />}

      <form onSubmit={handleSubmit} className="max-w-formulario">
        <Painel
          titulo={isEdit ? "Editar dados do estudante" : "Dados do estudante"}
          rodape={
            <>
              <div>
                {isEdit && (
                  <Button variant="ghost" onClick={handleDelete} disabled={loading} className="text-danger-fg hover:bg-danger-subtle hover:text-danger-fg">
                    Excluir estudante
                  </Button>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Link href={voltar} className={buttonClasses({ variant: "secondary" })}>Cancelar</Link>
                <Button type="submit" loading={loading}>
                  {!loading && <Save size={16} strokeWidth={1.75} aria-hidden />}
                  {loading ? "Salvando…" : isEdit ? "Salvar alterações" : "Cadastrar estudante"}
                </Button>
              </div>
            </>
          }
        >
          {error && <Alert tone="danger" className="mb-4">{error}</Alert>}
          <div className="space-y-4">
            <Field label="Nome completo" obrigatorio>
              {(p) => <Input {...p} required value={formData.nome} onChange={(e) => setFormData({ ...formData, nome: e.target.value })} placeholder="Ex.: João Silva Santos" />}
            </Field>
            <Field label="Matrícula" obrigatorio hint="Identificador único do estudante; também é o usuário de acesso ao portal.">
              {(p) => <Input {...p} required value={formData.matricula} onChange={(e) => setFormData({ ...formData, matricula: e.target.value })} placeholder="Ex.: 2024001234" className="font-mono" />}
            </Field>
            <Field label="Turma" obrigatorio>
              {(p) => (
                <Select {...p} required value={formData.turmaId} onChange={(e) => setFormData({ ...formData, turmaId: e.target.value })}>
                  <option value="">Selecione uma turma</option>
                  {turmas.map((turma) => <option key={turma.id} value={turma.id}>{turma.nome}</option>)}
                </Select>
              )}
            </Field>
          </div>
        </Painel>
      </form>

      {/* Toast Notification */}
      {resultMsg && (
        <div className="fixed bottom-[calc(var(--barra-inferior)+1.5rem)] right-6 z-50 animate-slide-up">
          <div className={`flex items-center gap-3 bg-elevated text-fg px-4 py-3 rounded-lg shadow-overlay max-w-sm border border-line`} role="status">
            <div className={`w-7 h-7 rounded-md flex items-center justify-center shrink-0 ${resultMsg.ok ? 'bg-success-subtle text-success-fg' : 'bg-danger-subtle text-danger-fg'}`}>
              {resultMsg.ok ? <CheckCheck size={16} /> : <X size={16} />}
            </div>
            <p className="text-13 font-medium leading-tight flex-1">{resultMsg.text}</p>
            <button
              onClick={() => setResultMsg(null)}
              aria-label="Fechar aviso"
              className="shrink-0 rounded-md p-1 text-fg-subtle hover:bg-subtle hover:text-fg transition-colors duration-150"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
