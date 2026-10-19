"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Edit, Trash2, Pause, Play, Loader2, Plus, Share2, CheckCircle } from "lucide-react"
import Link from "next/link"
import TransferModal from "./TransferModal"

interface UserActionsProps {
  userId: string
  userName: string
  isActive: boolean
  isApproved: boolean
  isSuperuser: boolean
  isStaff: boolean
}

export default function UserActions({ 
  userId, 
  userName, 
  isActive, 
  isApproved,
  isSuperuser,
  isStaff
}: UserActionsProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false)

  const handleApprove = async () => {
    if (!confirm(`Deseja aprovar o cadastro de ${userName}? Uma senha de acesso será gerada e enviada por e-mail.`)) {
      return
    }

    setLoading(true)
    try {
      const res = await fetch(`/api/usuarios/${userId}/aprovar`, {
        method: "POST"
      })

      const data = await res.json()
      if (res.ok) {
        alert(data.message)
        router.refresh()
      } else {
        alert(data.message || "Erro ao aprovar usuário")
      }
    } catch (err) {
      alert("Erro na conexão com o servidor")
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm(`Tem certeza que deseja excluir o usuário ${userName}? Esta ação não pode ser desfeita.`)) {
      return
    }

    setLoading(true)
    try {
      const res = await fetch(`/api/usuarios/${userId}`, {
        method: 'DELETE'
      })

      if (res.ok) {
        router.refresh()
      } else {
        const error = await res.json()
        alert(error.message || 'Erro ao excluir usuário')
      }
    } catch (err) {
      alert('Erro na conexão com o servidor')
    } finally {
      setLoading(false)
    }
  }

  const handleToggleActive = async () => {
    const action = isActive ? 'pausar' : 'reativar'
    if (!confirm(`Deseja realmente ${action} o acesso do usuário ${userName}? \n\n${isActive ? 'O usuário verá um aviso de "Sistema em Manutenção/Conta Pausada" ao tentar logar.' : 'O usuário voltará a ter acesso normal ao sistema.'}`)) {
      return
    }

    setLoading(true)
    try {
      const res = await fetch(`/api/usuarios/${userId}/toggle-status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ isActive: !isActive })
      })

      if (res.ok) {
        router.refresh()
        alert(`Usuário ${isActive ? 'pausado' : 'reativado'} com sucesso!`)
      } else {
        const error = await res.json()
        alert(error.message || `Erro ao ${action} usuário`)
      }
    } catch (err) {
      alert('Erro na conexão com o servidor')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center justify-end gap-0.5">
      {loading ? (
        <Loader2 size={16} strokeWidth={1.75} className="text-fg-subtle animate-spin" />
      ) : (
        <>
          {!isApproved && (
            <button
              onClick={handleApprove}
              className="p-1.5 rounded-md text-success-fg transition-colors duration-150 hover:bg-success-subtle"
              title="Aprovar cadastro"
              aria-label="Aprovar cadastro"
            >
              <CheckCircle size={16} strokeWidth={1.75} />
            </button>
          )}

          {isStaff && !isSuperuser && isApproved && (
            <Link
              href={`/dashboard/usuarios/${userId}/disciplinas`}
              className="p-1.5 rounded-md text-fg-subtle transition-colors duration-150 hover:bg-subtle hover:text-fg"
              title="Gerenciar disciplinas"
              aria-label="Gerenciar disciplinas"
            >
              <Plus size={16} strokeWidth={1.75} />
            </Link>
          )}

          <button
            onClick={() => setIsTransferModalOpen(true)}
            className="p-1.5 rounded-md text-fg-subtle transition-colors duration-150 hover:bg-subtle hover:text-fg"
            title="Transferir posse dos dados"
            aria-label="Transferir posse dos dados"
          >
            <Share2 size={16} strokeWidth={1.75} />
          </button>
          
          <button
            onClick={handleToggleActive}
            className="p-1.5 rounded-md text-fg-subtle transition-colors duration-150 hover:bg-subtle hover:text-fg"
            title={isActive ? 'Pausar acesso' : 'Reativar acesso'}
            aria-label={isActive ? 'Pausar acesso' : 'Reativar acesso'}
          >
            {isActive ? <Pause size={16} strokeWidth={1.75} /> : <Play size={16} strokeWidth={1.75} />}
          </button>

          <Link
            href={`/dashboard/usuarios/${userId}/editar`}
            className="p-1.5 rounded-md text-fg-subtle transition-colors duration-150 hover:bg-subtle hover:text-fg"
            title="Editar usuário"
            aria-label="Editar usuário"
          >
            <Edit size={16} strokeWidth={1.75} />
          </Link>

          <button
            onClick={handleDelete}
            className="p-1.5 rounded-md text-fg-subtle transition-colors duration-150 hover:bg-danger-subtle hover:text-danger-fg"
            title="Excluir usuário"
            aria-label="Excluir usuário"
          >
            <Trash2 size={16} strokeWidth={1.75} />
          </button>
        </>
      )}

      <TransferModal 
        isOpen={isTransferModalOpen} 
        onClose={() => setIsTransferModalOpen(false)}
        fromUserId={userId}
        fromUserName={userName}
      />
    </div>
  )
}
