"use client"

import { useState, useEffect } from "react"
import { Bell, MessageSquare, X, ArrowRight } from "lucide-react"
import { getLatestUnreadMessage } from "@/app/dashboard/mensagens/actions"
import Link from "next/link"
import { usePathname } from "next/navigation"

export default function MessageNotification() {
  const [latestMessage, setLatestMessage] = useState<any>(null)
  const [show, setShow] = useState(false)
  const [lastNotificationId, setLastNotificationId] = useState<string | null>(null)
  const pathname = usePathname()

  // Don't show if already on the messages page
  const isMessagesPage = pathname === "/dashboard/mensagens"

  useEffect(() => {
    if (isMessagesPage) {
        setShow(false);
        return;
    }

    let ativo = true
    const checkMessages = async () => {
      // Aba em segundo plano: não consulta (volta a consultar quando ficar visível)
      if (document.visibilityState === "hidden") return
      try {
        const msg = await getLatestUnreadMessage()
        if (!ativo) return
        if (msg && msg.id !== lastNotificationId) {
          setLatestMessage(msg)
          setLastNotificationId(msg.id)
          setShow(true)
        }
      } catch (e) {
        // "Failed to fetch": a consulta foi interrompida (troca de página, aba
        // fechando, rede caiu). Não é erro: a próxima rodada tenta de novo.
        if (!ativo || e instanceof TypeError) return
        console.error("Erro ao verificar notificações", e)
      }
    }

    // Verifica logo, a cada 30 s e quando a aba volta a ficar visível
    checkMessages()
    const interval = setInterval(checkMessages, 30000)
    document.addEventListener("visibilitychange", checkMessages)

    return () => {
      ativo = false
      clearInterval(interval)
      document.removeEventListener("visibilitychange", checkMessages)
    }
  }, [lastNotificationId, isMessagesPage])

  if (!show || !latestMessage || isMessagesPage) return null

  return (
    <div className="fixed bottom-6 right-6 z-[9999] animate-slide-up print:hidden">
      <div className="bg-surface border border-line rounded-xl shadow-card p-1 flex items-center gap-4 max-w-sm overflow-hidden ring-1 ring-zinc-900/5">
        
        <div className="relative shrink-0 ml-1">
          <div className="w-14 h-14 bg-accent rounded-xl flex items-center justify-center text-on-accent shadow-card">
            <MessageSquare size={24} />
          </div>
          <div className="absolute -top-1 -right-1 w-5 h-5 bg-danger border-2 border-white rounded-full flex items-center justify-center">
            <span className="w-2 h-2 rounded-full bg-surface animate-pulse" />
          </div>
        </div>

        <div className="flex-1 min-w-0 py-2 pr-4">
          <div className="flex items-center justify-between mb-0.5">
            <p className="text-xs font-semibold text-accent-fg leading-none">Nova Mensagem</p>
            <button onClick={() => setShow(false)} className="p-1 hover:bg-subtle rounded-lg transition-all -mr-2">
              <X size={14} className="text-fg-subtle" />
            </button>
          </div>
          <h4 className="text-sm font-semibold text-fg truncate tracking-tight">{latestMessage.subject}</h4>
          <p className="text-xs font-medium text-fg-subtle truncate mt-0.5">De: {latestMessage.sender?.name || latestMessage.sender?.username}</p>
          
          <Link 
            href="/dashboard/mensagens" 
            onClick={() => setShow(false)}
            className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-fg hover:text-accent-fg transition-colors group"
          >
            Ver Mensagem 
            <ArrowRight size={12} className="group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </div>
    </div>
  )
}
