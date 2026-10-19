"use client"

import { X, AlertTriangle, Loader2 } from "lucide-react"

interface ConfirmModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title?: string
  message: string
  confirmText?: string
  cancelText?: string
  variant?: "danger" | "warning" | "info"
  loading?: boolean
}

export default function ConfirmModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title = "Confirmação", 
  message, 
  confirmText = "Confirmar", 
  cancelText = "Cancelar",
  variant = "danger",
  loading = false
}: ConfirmModalProps) {
  if (!isOpen) return null

  const variantStyles = {
    danger: "bg-danger  border-danger-line",
    warning: "bg-warning  border-warning-line",
    info: "bg-accent  border-accent/25"
  }

  const buttonStyles = {
    danger: "bg-danger hover:bg-danger",
    warning: "bg-warning hover:bg-warning",
    info: "bg-accent hover:bg-accent"
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-zinc-900/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white rounded-xl w-full max-w-md shadow-card border border-zinc-100 overflow-hidden animate-in zoom-in-95 duration-300">
        <div className={`px-8 py-6 flex items-center justify-between border-b ${variant === 'danger' ? 'bg-danger-subtle border-danger-line' : 'bg-zinc-50 border-zinc-100'}`}>
          <div className="flex items-center space-x-3">
            <div className={`p-2 rounded-xl shadow-card ${variantStyles[variant]}`}>
              <AlertTriangle className="w-5 h-5 text-white" />
            </div>
            <h2 className={`text-xl font-semibold tracking-tight ${variant === 'danger' ? 'text-danger-fg' : 'text-fg'}`}>{title}</h2>
          </div>
          <button 
            disabled={loading}
            onClick={onClose} 
            className="p-2 hover:bg-white/50 rounded-full transition-colors group disabled:opacity-50"
          >
            <X className="w-5 h-5 text-fg-subtle group-hover:text-fg-muted" />
          </button>
        </div>

        <div className="p-8">
          <p className="text-fg-muted font-medium leading-relaxed">
            {message}
          </p>
          
          <div className="mt-8 flex flex-col sm:flex-row gap-3">
            <button
              disabled={loading}
              onClick={onClose}
              className="flex-1 px-6 py-4 bg-zinc-100 text-fg-muted rounded-lg font-semibold text-sm hover:bg-zinc-200 transition-all disabled:opacity-50"
            >
              {cancelText}
            </button>
            <button
              disabled={loading}
              onClick={onConfirm}
              className={`flex-1 px-6 py-4 text-white rounded-lg font-semibold text-sm flex items-center justify-center space-x-2 transition-all shadow-card disabled:opacity-50 ${buttonStyles[variant]}`}
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>{confirmText}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
