"use client"

import { useState, useEffect } from "react"
import { X, ChevronRight, ChevronLeft, Lightbulb, CheckCircle2 } from "lucide-react"

interface Tip {
  title: string
  description: string
  icon: React.ReactNode
  color: string
}

interface TeacherTipsModalProps {
  storageKey: string
  tips: Tip[]
  title: string
}

export default function TeacherTipsModal({ storageKey, tips, title }: TeacherTipsModalProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)

  useEffect(() => {
    const hasSeen = localStorage.getItem(storageKey)
    if (!hasSeen) {
      setIsOpen(true)
    }
  }, [storageKey])

  const handleClose = () => {
    localStorage.setItem(storageKey, "true")
    setIsOpen(false)
  }

  const nextStep = () => {
    if (currentStep < tips.length - 1) {
      setCurrentStep(currentStep + 1)
    } else {
      handleClose()
    }
  }

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  if (!isOpen) return null

  const currentTip = tips[currentStep]

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-zinc-900/80 backdrop-blur-md animate-fade-in">
      <div className="bg-white rounded-xl w-full max-w-lg shadow-overlay overflow-hidden border border-zinc-100 flex flex-col animate-slide-up">
        
        {/* Header com gradiente sutil */}
        <div className="p-8 pb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-lg flex items-center justify-center shadow-card ${currentTip.color}`}>
              <Lightbulb className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-xs font-semibold text-fg-subtle">Dica do sistema</p>
              <h3 className="text-xl font-semibold text-fg leading-tight">{title}</h3>
            </div>
          </div>
          <button 
            onClick={handleClose}
            className="p-2 hover:bg-zinc-100 rounded-full transition-colors text-fg-subtle"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content Area */}
        <div className="px-8 py-10 flex flex-col items-center text-center">
          <div className={`w-24 h-24 mb-8 rounded-xl flex items-center justify-center bg-zinc-50 border-2 border-dashed border-zinc-200`}>
             {currentTip.icon}
          </div>
          
          <h4 className="text-2xl font-semibold text-fg mb-4 tracking-tight">
            {currentTip.title}
          </h4>
          <p className="text-fg-muted leading-relaxed text-base font-medium max-w-sm">
            {currentTip.description}
          </p>
        </div>

        {/* Footer / Stepper */}
        <div className="p-8 pt-0 mt-auto">
          <div className="flex items-center justify-between mb-8">
            <div className="flex gap-2">
              {tips.map((_, i) => (
                <div 
                  key={i} 
                  className={`h-2 rounded-full transition-all duration-300 ${i === currentStep ? "w-8 bg-zinc-900" : "w-2 bg-zinc-200"}`} 
                />
              ))}
            </div>
            <span className="text-xs font-semibold text-fg-subtle">
              Passo {currentStep + 1} de {tips.length}
            </span>
          </div>

          <div className="flex gap-4">
            {currentStep > 0 && (
              <button
                onClick={prevStep}
                className="flex-1 py-4 px-6 rounded-lg text-sm font-semibold text-fg-muted bg-zinc-50 hover:bg-zinc-100 transition-all flex items-center justify-center gap-2 border border-zinc-200"
              >
                <ChevronLeft size={20} />
                Anterior
              </button>
            )}
            <button
              onClick={nextStep}
              className={`flex-[2] py-4 px-6 rounded-lg text-sm font-semibold text-on-accent transition-all flex items-center justify-center gap-2 shadow-card ${currentStep === tips.length - 1 ? "bg-accent " : "bg-accent "}`}
            >
              {currentStep === tips.length - 1 ? (
                <>
                  Entendi tudo!
                  <CheckCircle2 size={20} />
                </>
              ) : (
                <>
                  Próximo
                  <ChevronRight size={20} />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
