"use client"

import { SessionProvider } from "next-auth/react"
import { SessionTimerProvider } from "@/contexts/SessionTimerContext"
import { ToastProvider } from "@/components/ui/Toast"

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <SessionTimerProvider>
        <ToastProvider>{children}</ToastProvider>
      </SessionTimerProvider>
    </SessionProvider>
  )
}
