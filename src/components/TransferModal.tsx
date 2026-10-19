"use client"

import { useState, useEffect } from "react"
import { X, ArrowRight, User as UserIcon, Loader2, AlertTriangle } from "lucide-react"

interface User {
  id: string
  name: string | null
  email: string
}

interface TransferModalProps {
  isOpen: boolean
  onClose: () => void
  fromUserId: string
  fromUserName: string
}

export default function TransferModal({ isOpen, onClose, fromUserId, fromUserName }: TransferModalProps) {
  const [users, setUsers] = useState<User[]>([])
  const [selectedToUserId, setSelectedToUserId] = useState("")
  const [loading, setLoading] = useState(false)
  const [fetchingUsers, setFetchingUsers] = useState(false)

  useEffect(() => {
    if (isOpen) {
      fetchUsers()
    }
  }, [isOpen])

  const fetchUsers = async () => {
    setFetchingUsers(true)
    try {
      const res = await fetch("/api/usuarios")
      if (res.ok) {
        const data = await res.json()
        // Filtrar o próprio usuário de origem da lista de destino
        setUsers(data.filter((u: User) => u.id !== fromUserId))
      }
    } catch (err) {
      console.error("Erro ao buscar usuários:", err)
    } finally {
      setFetchingUsers(false)
    }
  }

  const handleTransfer = async () => {
    if (!selectedToUserId) return

    const targetUser = users.find(u => u.id === selectedToUserId)
    if (!confirm(`Confirmar transferência de TODAS as notas, auditorias e permissões de "${fromUserName}" para "${targetUser?.name}"?\n\nO usuário "${fromUserName}" será desativado automaticamente após a conclusão.`)) {
      return
    }

    setLoading(true)
    try {
      const res = await fetch("/api/usuarios/transferir", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fromUserId,
          toUserId: selectedToUserId
        })
      })

      const data = await res.json()
      if (res.ok) {
        alert(data.message)
        onClose()
        window.location.reload()
      } else {
        alert(data.message || "Erro na transferência")
      }
    } catch (err) {
      alert("Erro na conexão com o servidor")
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-xl w-full max-w-md shadow-card border border-zinc-200 overflow-hidden transform animate-in slide-in-from-bottom-4 duration-300">
        <div className="p-6 border-b border-zinc-100 flex items-center justify-between bg-zinc-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-warning-subtle rounded-lg flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-warning-fg" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-fg tracking-tight">Transferir Posse</h3>
              <p className="text-xs text-fg-subtle font-semibold uppercase tracking-wider">Segurança de Dados</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-zinc-200 rounded-xl transition-colors text-fg-subtle">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="flex items-center justify-between p-4 bg-zinc-50 rounded-lg border border-zinc-100">
            <div className="text-center flex-1">
              <div className="text-[10px] font-semibold text-fg-subtle uppercase tracking-widest mb-1">Origem</div>
              <div className="text-sm font-semibold text-fg-muted truncate">{fromUserName}</div>
            </div>
            <div className="px-4">
              <ArrowRight className="w-5 h-5 text-zinc-300" />
            </div>
            <div className="text-center flex-1">
              <div className="text-[10px] font-semibold text-fg-subtle uppercase tracking-widest mb-1">Destino</div>
              {selectedToUserId ? (
                <div className="text-sm font-semibold text-accent-fg truncate">
                  {users.find(u => u.id === selectedToUserId)?.name}
                </div>
              ) : (
                <div className="text-sm font-semibold text-zinc-300 italic">Selecionar...</div>
              )}
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-xs font-semibold text-fg-subtle uppercase tracking-widest flex items-center gap-2">
              <UserIcon className="w-3 h-3" /> Selecionar Usuário de Destino
            </label>
            <select
              value={selectedToUserId}
              onChange={(e) => setSelectedToUserId(e.target.value)}
              className="w-full h-12 px-4 rounded-xl border border-zinc-200 bg-white text-fg-muted font-semibold text-sm focus:ring-4 focus:ring-ring focus:border-accent transition-all outline-none"
              disabled={fetchingUsers || loading}
            >
              <option value="">Selecione um administrador ou professor...</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name} ({user.email})
                </option>
              ))}
            </select>
            {fetchingUsers && <p className="text-[10px] text-accent-fg font-semibold animate-pulse">Carregando usuários...</p>}
          </div>

          <div className="bg-warning-subtle rounded-lg p-4 border border-warning-line space-y-2 overflow-hidden">
            <h4 className="text-xs font-semibold text-warning-fg uppercase tracking-widest flex items-center gap-2">
              ⚠️ Observação Crítica
            </h4>
            <p className="text-[11px] text-warning-fg font-medium leading-relaxed whitespace-normal break-words">
              Esta ação transferirá permanentemente a autoria de todas as notas e registros. 
              O usuário de origem será <span className="font-semibold underline">desativado</span> por segurança.
            </p>
          </div>
        </div>

        <div className="p-6 bg-zinc-50 border-t border-zinc-100 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 h-12 rounded-xl text-fg-subtle font-semibold hover:bg-zinc-200 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleTransfer}
            disabled={!selectedToUserId || loading}
            className="flex-2 px-8 h-12 bg-zinc-900 text-white rounded-xl font-semibold shadow-card hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Confirmar Transferência"}
          </button>
        </div>
      </div>
    </div>
  )
}
