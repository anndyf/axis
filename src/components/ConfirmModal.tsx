"use client"

import { Button } from "@/components/ui/Button"
import { Dialog } from "@/components/ui/Dialog"

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

/** Confirmação simples sobre o Dialog do design system (foco preso, Esc fecha). */
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
  return (
    <Dialog
      open={isOpen}
      onClose={() => { if (!loading) onClose() }}
      title={title}
      size="sm"
      footer={
        <>
          {/* foco inicial: em ação destrutiva, no Cancelar */}
          <Button variant="secondary" disabled={loading} onClick={onClose} data-autofocus={variant === "danger" ? true : undefined}>{cancelText}</Button>
          <Button variant={variant === "danger" ? "danger" : "primary"} loading={loading} onClick={onConfirm} data-autofocus={variant === "danger" ? undefined : true}>{confirmText}</Button>
        </>
      }
    >
      <p className="text-fg-muted leading-relaxed">{message}</p>
    </Dialog>
  )
}
