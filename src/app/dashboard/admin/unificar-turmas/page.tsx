'use client'

// @modulo NUC - página cliente; o Núcleo está sempre ativo (guarda nas rotas que ela chama)
import { useState, useEffect } from 'react'
import { ArrowRight, Trash2, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'

export default function MigracaoPage() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [merging, setMerging] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [selection, setSelection] = useState({ from: '', to: '' })

  useEffect(() => {
    fetch('/api/admin/merge-turmas')
      .then(res => res.json())
      .then(data => {
        setData(data)
        setLoading(false)
      })
  }, [])

  const handleMerge = async () => {
    if (!selection.from || !selection.to || selection.from === selection.to) {
      alert('Selecione turmas diferentes para migrar')
      return
    }

    if (!confirm('Deseja realmente migrar todos os dados da turma de origem para a de destino? Esta ação move questões e estudantes.')) {
      return
    }

    setMerging(true)
    try {
      const res = await fetch('/api/admin/merge-turmas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fromId: selection.from, toId: selection.to })
      })
      const detail = await res.json()
      setResult(detail)
      
      // Refresh data
      const refresh = await fetch('/api/admin/merge-turmas')
      setData(await refresh.json())
    } catch (error) {
      alert('Erro na migração')
    } finally {
      setMerging(false)
    }
  }

  if (loading) return <div className="p-4 flex justify-center"><Loader2 className="animate-spin" /></div>

  return (
    <div className="max-w-formulario">
      <h1 className="text-2xl font-bold mb-2 flex items-center gap-2">
        <Trash2 className="text-danger-fg" /> Assistente de Unificação de Turmas
      </h1>
      <p className="text-fg-muted mb-4">Utilize esta ferramenta para mover questões e alunos entre turmas duplicadas.</p>

      {result && (
        <div className="bg-success-subtle border border-success-line text-success-fg p-4 rounded-lg mb-4 flex items-center gap-3">
          <CheckCircle2 />
          <div>
            <p className="font-bold">Migração concluída!</p>
            <p className="text-sm">{result.movedQuestions} questões e {result.movedStudents} alunos movidos.</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div className="bg-surface p-4 rounded-xl border border-line">
          <label className="block text-sm font-bold text-fg-muted mb-4">
            1. Turma de Origem (A que será esvaziada)
          </label>
          <select 
            className="w-full p-3 border rounded-lg bg-canvas focus:ring-2 focus:ring-ring"
            value={selection.from}
            onChange={(e) => setSelection({ ...selection, from: e.target.value })}
          >
            <option value="">Selecione a turma antiga...</option>
            {data.duplicates.map((t: any) => (
              <option key={t.id} value={t.id}>
                {t.nome} ({t.counts.questoes} Q, {t.counts.estudantes} Alunos) - ID: {t.id.slice(0, 8)}
              </option>
            ))}
          </select>
          <p className="text-xs text-fg-subtle mt-2 italic">Dica: Escolha a turma que tem o ID que você deseja descartar.</p>
        </div>

        <div className="bg-surface p-4 rounded-xl border border-line">
          <label className="block text-sm font-bold text-fg-muted mb-4">
            2. Turma de Destino (A que será mantida)
          </label>
          <select 
            className="w-full p-3 border rounded-lg bg-canvas focus:ring-2 focus:ring-ring"
            value={selection.to}
            onChange={(e) => setSelection({ ...selection, to: e.target.value })}
          >
            <option value="">Selecione a turma oficial...</option>
            {data.duplicates.map((t: any) => (
              <option key={t.id} value={t.id}>
                {t.nome} ({t.counts.questoes} Q, {t.counts.estudantes} Alunos) - ID: {t.id.slice(0, 8)}
              </option>
            ))}
          </select>
          <p className="text-xs text-fg-subtle mt-2 italic">Dica: Esta é a turma que você seleciona no Gerador de Provas.</p>
        </div>
      </div>

      <button
        onClick={handleMerge}
        disabled={merging || !selection.from || !selection.to}
        className="w-full bg-accent hover:bg-accent-hover disabled:bg-zinc-400 text-on-accent font-bold py-4 rounded-xl transition-all flex items-center justify-center gap-3"
      >
        {merging ? <Loader2 className="animate-spin" /> : <ArrowRight />}
        {merging ? 'Processando Migração...' : 'Unificar Turmas Agora'}
      </button>

      <div className="mt-12 bg-warning-subtle border border-warning-line p-4 rounded-xl">
        <h3 className="text-warning-fg font-bold flex items-center gap-2 mb-2">
          <AlertCircle size={18} /> Importante
        </h3>
        <ul className="text-sm text-warning-fg list-disc ml-5 space-y-1">
          <li>Esta ferramenta move as <strong>Questões</strong> e os <strong>Estudantes</strong>.</li>
          <li>As <strong>Disciplinas</strong> não são movidas (você deve garantir que a turma de destino já tenha as matérias corretas).</li>
          <li>Após a migração, você poderá excluir a "Turma de Origem" manualmente no menu de Turmas sem medo de perder dados.</li>
        </ul>
      </div>
    </div>
  )
}
