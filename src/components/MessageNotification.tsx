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

    const checkMessages = async () => {
      try {
        const msg = await getLatestUnreadMessage()
        
        if (msg && msg.id !== lastNotificationId) {
          setLatestMessage(msg)
          setLastNotificationId(msg.id)
          setShow(true)
        }
      } catch (e) {
        console.error("Error checking for notifications", e)
      }
    }

    // Check immediately and then every 30 seconds
    checkMessages()
    const interval = setInterval(checkMessages, 30000)

    return () => clearInterval(interval)
  }, [lastNotificationId, isMessagesPage])

  if (!show || !latestMessage || isMessagesPage) return null

  return (
    <div className="fixed bottom-6 right-6 z-[9999] animate-in slide-in-from-right-10 duration-500 print:hidden">
      <div className="bg-white border border-zinc-200 rounded-xl shadow-card p-1 flex items-center gap-4 max-w-sm overflow-hidden ring-1 ring-zinc-900/5">
        
        <div className="relative shrink-0 ml-1">
          <div className="w-14 h-14 bg-accent rounded-xl flex items-center justify-center text-white shadow-card">
            <MessageSquare size={24} />
          </div>
          <div className="absolute -top-1 -right-1 w-5 h-5 bg-danger border-2 border-white rounded-full flex items-center justify-center">
            <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
          </div>
        </div>

        <div className="flex-1 min-w-0 py-2 pr-4">
          <div className="flex items-center justify-between mb-0.5">
            <p className="text-[10px] font-semibold text-accent-fg uppercase tracking-widest leading-none">Nova Mensagem</p>
            <button onClick={() => setShow(false)} className="p-1 hover:bg-zinc-100 rounded-lg transition-all -mr-2">
              <X size={14} className="text-fg-subtle" />
            </button>
          </div>
          <h4 className="text-sm font-semibold text-fg truncate tracking-tight">{latestMessage.subject}</h4>
          <p className="text-[11px] font-medium text-fg-subtle truncate mt-0.5">De: {latestMessage.sender?.name || latestMessage.sender?.username}</p>
          
          <Link 
            href="/dashboard/mensagens" 
            onClick={() => setShow(false)}
            className="mt-2 flex items-center gap-1.5 text-[10px] font-semibold text-fg uppercase tracking-tight hover:text-accent-fg transition-colors group"
          >
            Ver Mensagem 
            <ArrowRight size={12} className="group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </div>
    </div>
  )
}
