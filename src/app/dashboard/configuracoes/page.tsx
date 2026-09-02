"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Shield, Database, Check, AlertCircle, Save, ClipboardList, ChevronRight } from "lucide-react"

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
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-700"></div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-medium text-blue-900 flex items-center gap-3">
          <Shield className="text-slate-700" />
          Configurações do Sistema
        </h1>
        <p className="text-slate-600 mt-2">Gerencie as funcionalidades globais e acessos dos professores.</p>
      </div>

      <Link
        href="/dashboard/configuracoes/avaliacao"
        className="flex items-center justify-between bg-white rounded-2xl shadow-sm border border-slate-200 p-6 hover:border-slate-300 hover:shadow-md transition-all group"
      >
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-xl bg-slate-100 text-slate-700 group-hover:bg-slate-700 group-hover:text-white transition-colors">
            <ClipboardList className="w-5 h-5" />
          </div>
          <div>
            <p className="font-medium text-blue-900">Esquemas de Avaliação</p>
            <p className="text-sm text-slate-600">Configure unidades, atividades e regras de recuperação por escola.</p>
          </div>
        </div>
        <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-slate-600 transition-colors" />
      </Link>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-200 bg-slate-100/50">
          <h2 className="text-lg font-medium flex items-center gap-2">
            <Database className="w-5 h-5 text-slate-700" />
            Módulos Pedagógicos
          </h2>
        </div>
        
        <div className="p-6 space-y-6">
          <div className="flex items-center justify-between p-4 rounded-xl border border-slate-200 hover:bg-slate-100 transition-colors">
            <div className="space-y-1">
              <p className="font-medium text-blue-900">Banco de Questões</p>
              <p className="text-sm text-slate-600">Permitir que professores enviem e visualizem o banco de questões.</p>
            </div>
            <button
              onClick={() => setIsBancoAtivo(!isBancoAtivo)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ring-2 ring-offset-2 ${
                isBancoAtivo ? 'bg-slate-700 ring-slate-500' : 'bg-slate-300 ring-transparent'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  isBancoAtivo ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between p-4 rounded-xl border border-slate-200 hover:bg-slate-100 transition-colors">
            <div className="space-y-1">
              <p className="font-medium text-blue-900">Ano Letivo Ativo</p>
              <p className="text-sm text-slate-600">Define qual ano letivo será exibido e gerenciado no sistema.</p>
            </div>
            <select
              value={anoLetivo}
              onChange={(e) => setAnoLetivo(Number(e.target.value))}
              className="bg-white border border-blue-300 text-blue-900 text-sm rounded-lg focus:ring-slate-500 focus:border-slate-500 block w-32 p-2.5"
            >
              {availableYears.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="p-6 bg-slate-100 border-t border-slate-200 flex items-center justify-between">
          <div>
            {message && (
              <div className={`flex items-center gap-2 text-sm font-medium ${
                message.type === 'success' ? 'text-green-600' : 'text-red-600'
              }`}>
                {message.type === 'success' ? <Check size={16} /> : <AlertCircle size={16} />}
                {message.text}
              </div>
            )}
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-slate-700 hover:bg-slate-800 disabled:opacity-50 text-white px-6 py-2.5 rounded-xl font-medium flex items-center gap-2 transition-all shadow-md active:scale-95"
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
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-sm rounded-3xl p-8 shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="w-16 h-16 bg-slate-100 text-slate-700 rounded-2xl flex items-center justify-center mb-6">
              <Shield className="w-8 h-8" />
            </div>
            <h3 className="text-2xl font-medium text-slate-800 mb-2">Salvar Configurações?</h3>
            <p className="text-slate-600 font-medium mb-8">
              Estas alterações afetarão o comportamento global do sistema para todos os usuários. Deseja confirmar?
            </p>
            <div className="grid grid-cols-2 gap-4">
              <button 
                onClick={() => setShowConfirm(false)}
                className="py-4 rounded-2xl font-medium text-slate-600 hover:bg-slate-50 transition-all"
              >
                Cancelar
              </button>
              <button 
                onClick={() => handleSave()}
                className="py-4 rounded-2xl font-medium bg-slate-900 text-white hover:bg-slate-800 transition-all shadow-lg"
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
