"use client"

import { useState } from "react"
import { Building2, Plus, Users, GraduationCap, Ban, PlayCircle, CreditCard } from "lucide-react"
import NovaEscolaModal from "@/components/NovaEscolaModal"
import ConfirmModal from "@/components/ConfirmModal"
import AssinaturaModal from "./AssinaturaModal"

interface Escola {
  id: string
  nome: string
  slug: string
  plano: string
  status: string
  createdAt: Date
  _count: { users: number; estudantes: number }
}

const labelPlano: Record<string, string> = { BASICO: "Básico", PRO: "Pro", ENTERPRISE: "Enterprise" }
const PLANOS = ["BASICO", "PRO", "ENTERPRISE"]

const statusBadge: Record<string, string> = {
  TRIAL: "bg-blue-50 text-blue-600 border-blue-200",
  ATIVA: "bg-emerald-50 text-emerald-600 border-emerald-200",
  SUSPENSA: "bg-amber-50 text-amber-600 border-amber-200",
  CANCELADA: "bg-rose-50 text-rose-600 border-rose-200",
}
const labelStatus: Record<string, string> = { TRIAL: "Trial", ATIVA: "Ativa", SUSPENSA: "Suspensa", CANCELADA: "Cancelada" }

export default function PlataformaClient({ escolasIniciais }: { escolasIniciais: Escola[] }) {
  const [escolas, setEscolas] = useState<Escola[]>(escolasIniciais)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [escolaParaSuspender, setEscolaParaSuspender] = useState<Escola | null>(null)
  const [processandoId, setProcessandoId] = useState<string | null>(null)
  const [assinaturaDe, setAssinaturaDe] = useState<string | null>(null)

  const atualizarEscola = async (id: string, data: { status?: string; plano?: string }) => {
    setProcessandoId(id)
    try {
      const res = await fetch(`/api/plataforma/escolas/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })
      if (res.ok) {
        const atualizada = await res.json()
        setEscolas(prev => prev.map(e => e.id === id ? { ...e, ...atualizada } : e))
      }
    } finally {
      setProcessandoId(null)
    }
  }

  const confirmarSuspensao = async () => {
    if (!escolaParaSuspender) return
    const novoStatus = escolaParaSuspender.status === 'SUSPENSA' ? 'ATIVA' : 'SUSPENSA'
    await atualizarEscola(escolaParaSuspender.id, { status: novoStatus })
    setEscolaParaSuspender(null)
  }

  const onSuccess = (escola: Escola) => {
    setEscolas(prev => [{ ...escola, _count: { users: 1, estudantes: 0 } }, ...prev])
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-medium text-blue-900 flex items-center gap-3">
            <Building2 className="text-slate-700" />
            Plataforma
          </h1>
          <p className="text-slate-600 mt-2">Gerencie todas as escolas cadastradas no Áxis.</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center space-x-2 bg-slate-900 text-white px-5 py-3 rounded-2xl font-medium hover:bg-slate-800 transition-all text-xs shadow-lg"
        >
          <Plus size={16} />
          <span>Nova escola</span>
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-4 text-xs font-medium text-slate-400">Escola</th>
                <th className="px-4 py-4 text-xs font-medium text-slate-400">Status</th>
                <th className="px-4 py-4 text-xs font-medium text-slate-400">Plano</th>
                <th className="px-4 py-4 text-xs font-medium text-slate-400 text-center">Usuários</th>
                <th className="px-4 py-4 text-xs font-medium text-slate-400 text-center">Estudantes</th>
                <th className="px-4 py-4 text-xs font-medium text-slate-400 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/80">
              {escolas.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-16 text-center text-slate-300">
                    <Building2 className="w-12 h-12 opacity-20 mx-auto mb-3" />
                    <p className="text-sm font-medium">Nenhuma escola cadastrada</p>
                  </td>
                </tr>
              ) : (
                escolas.map(escola => (
                  <tr key={escola.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-4">
                      <p className="font-medium text-slate-800">{escola.nome}</p>
                      <p className="text-[11px] text-slate-400 font-medium tracking-wide">{escola.slug}.axis.com</p>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold tracking-wide border ${statusBadge[escola.status] || 'bg-slate-50 text-slate-500 border-slate-200'}`}>
                        {labelStatus[escola.status] || escola.status}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <select
                        value={escola.plano}
                        disabled={processandoId === escola.id}
                        onChange={(e) => atualizarEscola(escola.id, { plano: e.target.value })}
                        className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-700 outline-none focus:border-blue-400"
                      >
                        {PLANOS.map(p => <option key={p} value={p}>{labelPlano[p]}</option>)}
                      </select>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <span className="inline-flex items-center gap-1.5 text-sm text-slate-600 font-medium">
                        <Users size={14} className="text-slate-300" /> {escola._count.users}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <span className="inline-flex items-center gap-1.5 text-sm text-slate-600 font-medium">
                        <GraduationCap size={14} className="text-slate-300" /> {escola._count.estudantes}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-right whitespace-nowrap">
                      <button
                        onClick={() => setAssinaturaDe(escola.id)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 mr-2 rounded-xl text-[11px] font-bold tracking-wide transition-all bg-slate-50 text-slate-600 hover:bg-slate-100"
                      >
                        <CreditCard size={13} />
                        Assinatura
                      </button>
                      {escola.status === 'CANCELADA' ? (
                        <span className="text-[11px] text-slate-300 font-medium">Cancelada</span>
                      ) : (
                        <button
                          onClick={() => setEscolaParaSuspender(escola)}
                          disabled={processandoId === escola.id}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold tracking-wide transition-all ${
                            escola.status === 'SUSPENSA'
                              ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
                              : 'bg-amber-50 text-amber-600 hover:bg-amber-100'
                          }`}
                        >
                          {escola.status === 'SUSPENSA' ? <PlayCircle size={13} /> : <Ban size={13} />}
                          {escola.status === 'SUSPENSA' ? 'Reativar' : 'Suspender'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <NovaEscolaModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={onSuccess}
      />

      <AssinaturaModal
        escolaId={assinaturaDe}
        onClose={() => setAssinaturaDe(null)}
        onAtualizada={(e) => setEscolas(prev => prev.map(x => x.id === e.id ? { ...x, plano: e.plano, status: e.status } : x))}
      />

      <ConfirmModal
        isOpen={!!escolaParaSuspender}
        onClose={() => setEscolaParaSuspender(null)}
        onConfirm={confirmarSuspensao}
        title={escolaParaSuspender?.status === 'SUSPENSA' ? "Reativar Escola" : "Suspender Escola"}
        message={
          escolaParaSuspender?.status === 'SUSPENSA'
            ? `Tem certeza que deseja reativar "${escolaParaSuspender?.nome}"? O acesso ao subdomínio volta a funcionar imediatamente.`
            : `Tem certeza que deseja suspender "${escolaParaSuspender?.nome}"? Os usuários dessa escola perdem acesso imediatamente, mas os dados são preservados.`
        }
        confirmText={escolaParaSuspender?.status === 'SUSPENSA' ? "Reativar" : "Suspender"}
        variant={escolaParaSuspender?.status === 'SUSPENSA' ? "info" : "warning"}
      />
    </div>
  )
}
