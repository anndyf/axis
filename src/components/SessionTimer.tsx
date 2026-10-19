"use client"

import { useSessionTimer } from "@/contexts/SessionTimerContext"

export default function SessionTimer() {
  const { timeLeft, showWarning, resetTimer } = useSessionTimer()

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60)
    const s = Math.floor(seconds % 60)
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  // Apenas o modal de aviso, sem o badge flutuante
  if (!showWarning) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-lg shadow-overlay p-8 max-w-sm w-full mx-4 border border-zinc-200 text-center relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-warning animate-[pulse_1s_infinite]" />
        
        <h3 className="text-xl font-semibold text-fg mb-2">Sessão Expirando</h3>
        <p className="text-fg-muted mb-6">
          Por inatividade, você será desconectado em:
        </p>
        
        <div className="text-4xl font-semibold text-warning-fg mb-8 tabular-nums tracking-tight">
          {formatTime(timeLeft)}
        </div>
        
        <button
          onClick={resetTimer}
          className="w-full bg-zinc-900 text-white font-semibold py-3 px-4 rounded-xl hover:bg-zinc-800 transition-all active:scale-95 shadow-card"
        >
          Continuar Conectado
        </button>
      </div>
    </div>
  )
}
