"use client"

import { createContext, useContext, useEffect, useRef, useState, ReactNode } from "react"
import { useSession, signOut } from "next-auth/react"
import { useRouter } from "next/navigation"

const TIMEOUT_DURATION = 20 * 60 * 1000 // 20 minutos em milissegundos
const WARNING_DURATION = 60 * 1000 // Aviso de 1 minuto antes

interface SessionTimerContextType {
  timeLeft: number
  showWarning: boolean
  resetTimer: () => void
}

const SessionTimerContext = createContext<SessionTimerContextType | undefined>(undefined)

export function SessionTimerProvider({ children }: { children: ReactNode }) {
  const { data: session } = useSession()
  const router = useRouter()
  const [timeLeft, setTimeLeft] = useState(TIMEOUT_DURATION / 1000)
  const [showWarning, setShowWarning] = useState(false)
  
  const idleTimeout = useRef<NodeJS.Timeout | null>(null)
  const warningTimeout = useRef<NodeJS.Timeout | null>(null)

  const handleLogout = () => {
    signOut({ redirectTo: '/login?timeout=true' })
  }

  const resetTimer = () => {
    if (!session) return

    setShowWarning(false)
    setTimeLeft(TIMEOUT_DURATION / 1000)

    if (idleTimeout.current) clearTimeout(idleTimeout.current)
    if (warningTimeout.current) clearTimeout(warningTimeout.current)

    warningTimeout.current = setTimeout(() => {
      setShowWarning(true)
    }, TIMEOUT_DURATION - WARNING_DURATION)

    idleTimeout.current = setTimeout(() => {
      handleLogout()
    }, TIMEOUT_DURATION)
  }

  // Countdown principal
  useEffect(() => {
    if (!session) return

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          handleLogout()
          return 0
        }
        
        if (prev <= WARNING_DURATION / 1000 && !showWarning) {
          setShowWarning(true)
        }
        
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [session, showWarning])

  // Events listeners
  useEffect(() => {
    if (!session) return

    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click']
    
    let isThrottled = false
    const handleActivity = () => {
      if (!isThrottled) {
        resetTimer()
        isThrottled = true
        setTimeout(() => { isThrottled = false }, 1000)
      }
    }

    events.forEach(event => window.addEventListener(event, handleActivity))
    resetTimer()

    return () => {
      if (idleTimeout.current) clearTimeout(idleTimeout.current)
      if (warningTimeout.current) clearTimeout(warningTimeout.current)
      events.forEach(event => window.removeEventListener(event, handleActivity))
    }
  }, [session])

  return (
    <SessionTimerContext.Provider value={{ timeLeft, showWarning, resetTimer }}>
      {children}
    </SessionTimerContext.Provider>
  )
}

// Temporizador neutro para renderizações fora do provedor. O provedor envolve
// o app inteiro (src/components/Providers.tsx), mas uma navegação no meio do
// carregamento interrompe a renderização e o React pode montar um trecho da
// página sem ele; lançar erro aí derrubava a tela (selo "1 Issue" do Next).
const TIMER_NEUTRO: SessionTimerContextType = { timeLeft: TIMEOUT_DURATION / 1000, showWarning: false, resetTimer: () => {} }

export function useSessionTimer() {
  return useContext(SessionTimerContext) ?? TIMER_NEUTRO
}
