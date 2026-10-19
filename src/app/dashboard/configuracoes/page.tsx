"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Shield, Database, Check, AlertCircle, Save, ClipboardList, ChevronRight, CalendarDays, Palette } from "lucide-react"

export default function ConfiguracoesPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [isBancoAtivo, setIsBancoAtivo] = useState(true)
  const [anoLetivo, setAnoLetivo] = useState(new Date().getFullYear())
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [availableYears, setAvailableYears] = useState<number[]>([])
  const [showConfirm, setShowConfirm] = useState(false)

  useEffect(() => {
    fetch('/api/config')
      .then(res => res.json())
      .then(data => {
        setIsBancoAtivo(data.bancoQuestoesAtivo)
        setAnoLetivo(data.anoLetivoAtual || new Date().getFullYear())
        setAvailableYears(data.availableYears || [new Date().getFullYear()])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const handleSave = async () => {
    if (!showConfirm) {
      setShowConfirm(true)
      return
    }

    setSaving(true)
    setShowConfirm(false)
    setMessage(null)
    try {
      const res = await fetch('/api/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          isBancoQuestoesAtivo: isBancoAtivo,
          anoLetivoAtual: Number(anoLetivo)
        })
      })

      if (res.ok) {
        setMessage({ type: 'success', text: 'Configurações atualizadas com sucesso!' })
        // Força atualização da página para refletir no sidebar se necessário
        window.location.reload()
      } else {
        setMessage({ type: 'error', text: 'Erro ao salvar configurações.' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Erro de conexão.' })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-zinc-700"></div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-medium text-accent-fg flex items-center gap-3">
          <Shield className="text-fg-muted" />
          Configurações do Sistema
        </h1>
        <p className="text-fg-muted mt-2">Gerencie as funcionalidades globais e acessos dos professores.</p>
      </div>

      <Link
        href="/dashboard/configuracoes/avaliacao"
        className="flex items-center justify-between bg-white rounded-lg shadow-sm border border-zinc-200 p-6 hover:border-zinc-300 hover:shadow-card transition-all group"
      >
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-xl bg-zinc-100 text-fg-muted group-hover:bg-zinc-700 group-hover:text-white transition-colors">
            <ClipboardList className="w-5 h-5" />
          </div>
          <div>
            <p className="font-medium text-accent-fg">Esquemas de Avaliação</p>
            <p className="text-sm text-fg-muted">Configure unidades, atividades e regras de recuperação por escola.</p>
          </div>
        </div>
        <ChevronRight className="w-5 h-5 text-zinc-300 group-hover:text-fg-muted transition-colors" />
      </Link>

      <Link
        href="/dashboard/configuracoes/calendario"
        className="flex items-center justify-between bg-white rounded-lg shadow-sm border border-zinc-200 p-6 hover:border-zinc-300 hover:shadow-card transition-all group"
      >
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-xl bg-zinc-100 text-fg-muted group-hover:bg-zinc-700 group-hover:text-white transition-colors">
            <CalendarDays className="w-5 h-5" />
          </div>
          <div>
            <p className="font-medium text-accent-fg">Calendário Letivo</p>
            <p className="text-sm text-fg-muted">Início e fim do ano, datas das unidades, feriados, sábados letivos e tempos de aula.</p>
          </div>
        </div>
        <ChevronRight className="w-5 h-5 text-zinc-300 group-hover:text-fg-muted transition-colors" />
      </Link>

      <Link
        href="/dashboard/configuracoes/identidade"
        className="flex items-center justify-between bg-white rounded-lg shadow-sm border border-zinc-200 p-6 hover:border-zinc-300 hover:shadow-card transition-all group"
      >
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-xl bg-zinc-100 text-fg-muted group-hover:bg-zinc-700 group-hover:text-white transition-colors">
            <Palette className="w-5 h-5" />
          </div>
          <div>
            <p className="font-medium text-accent-fg">Identidade visual</p>
            <p className="text-sm text-fg-muted">Logo e cor de destaque da escola no sistema, no login e nos PDFs.</p>
          </div>
        </div>
        <ChevronRight className="w-5 h-5 text-zinc-300 group-hover:text-fg-muted transition-colors" />
      </Link>

      <div className="bg-white rounded-lg shadow-sm border border-zinc-200 overflow-hidden">
        <div className="p-6 border-b border-zinc-200 bg-zinc-100/50">
          <h2 className="text-lg font-medium flex items-center gap-2">
            <Database className="w-5 h-5 text-fg-muted" />
            Módulos Pedagógicos
          </h2>
        </div>
        
        <div className="p-6 space-y-6">
          <div className="flex items-center justify-between p-4 rounded-xl border border-zinc-200 hover:bg-zinc-100 transition-colors">
            <div className="space-y-1">
              <p className="font-medium text-accent-fg">Banco de Questões</p>
              <p className="text-sm text-fg-muted">Permitir que professores enviem e visualizem o banco de questões.</p>
            </div>
            <button
              onClick={() => setIsBancoAtivo(!isBancoAtivo)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ring-2 ring-offset-2 ${
                isBancoAtivo ? 'bg-zinc-700 ring-zinc-500' : 'bg-zinc-300 ring-transparent'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  isBancoAtivo ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between p-4 rounded-xl border border-zinc-200 hover:bg-zinc-100 transition-colors">
            <div className="space-y-1">
              <p className="font-medium text-accent-fg">Ano Letivo Ativo</p>
              <p className="text-sm text-fg-muted">Define qual ano letivo será exibido e gerenciado no sistema.</p>
            </div>
            <select
              value={anoLetivo}
              onChange={(e) => setAnoLetivo(Number(e.target.value))}
              className="bg-white border border-accent/25 text-accent-fg text-sm rounded-lg focus:ring-zinc-500 focus:border-zinc-500 block w-32 p-2.5"
            >
              {availableYears.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="p-6 bg-zinc-100 border-t border-zinc-200 flex items-center justify-between">
          <div>
            {message && (
              <div className={`flex items-center gap-2 text-sm font-medium ${
                message.type === 'success' ? 'text-success-fg' : 'text-danger-fg'
              }`}>
                {message.type === 'success' ? <Check size={16} /> : <AlertCircle size={16} />}
                {message.text}
              </div>
            )}
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-zinc-700 hover:bg-zinc-800 disabled:opacity-50 text-white px-6 py-2.5 rounded-xl font-medium flex items-center gap-2 transition-all shadow-card active:scale-95"
          >
            {saving ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Save size={20} />
            )}
            Salvar Alterações
          </button>
        </div>
      </div>

      {/* Modal de Confirmação para Configurações */}
      {showConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-zinc-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-sm rounded-xl p-8 shadow-card animate-in zoom-in-95 duration-300">
            <div className="w-16 h-16 bg-zinc-100 text-fg-muted rounded-lg flex items-center justify-center mb-6">
              <Shield className="w-8 h-8" />
            </div>
            <h3 className="text-2xl font-medium text-fg mb-2">Salvar Configurações?</h3>
            <p className="text-fg-muted font-medium mb-8">
              Estas alterações afetarão o comportamento global do sistema para todos os usuários. Deseja confirmar?
            </p>
            <div className="grid grid-cols-2 gap-4">
              <button 
                onClick={() => setShowConfirm(false)}
                className="py-4 rounded-lg font-medium text-fg-muted hover:bg-zinc-50 transition-all"
              >
                Cancelar
              </button>
              <button 
                onClick={() => handleSave()}
                className="py-4 rounded-lg font-medium bg-zinc-900 text-white hover:bg-zinc-800 transition-all shadow-card"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
