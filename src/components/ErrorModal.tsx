"use client"

import { X, AlertCircle } from "lucide-react"

interface ErrorModalProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  message: string
}

export default function ErrorModal({ isOpen, onClose, title = "Atenção", message }: ErrorModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-zinc-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-surface rounded-xl w-full max-w-md shadow-overlay border border-danger-line overflow-hidden animate-pop-in">
        <div className="px-8 py-6 bg-danger-subtle border-b border-danger-line flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-danger rounded-xl shadow-card">
              <AlertCircle className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-xl font-semibold text-danger-fg tracking-tight">{title}</h2>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 hover:bg-danger-subtle rounded-full transition-colors group"
          >
            <X className="w-5 h-5 text-danger group-hover:text-danger-fg" />
          </button>
        </div>

        <div className="p-8">
          <p className="text-fg-muted font-medium leading-relaxed">
            {message}
          </p>
          
          <div className="mt-8">
            <button
              onClick={onClose}
              className="w-full bg-accent text-on-accent py-4 rounded-lg font-semibold text-sm flex items-center justify-center space-x-2 hover:bg-accent-hover transition-all shadow-card"
            >
              <span>Entendido</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
