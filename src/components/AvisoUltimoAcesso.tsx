"use client"

import { useEffect } from "react"
import { useToast } from "@/components/ui/Toast"

/**
 * Depois do login, um aviso discreto com o acesso anterior ("Seu último
 * acesso foi em ..."). Aparece uma vez por login: a chave é o horário do
 * login atual, guardada na sessão do navegador.
 */
export default function AvisoUltimoAcesso({ texto, loginAtual }: { texto: string | null; loginAtual: string | null }) {
  const toast = useToast()
  useEffect(() => {
    if (!texto || !loginAtual) return
    try {
      if (sessionStorage.getItem("axis_aviso_acesso") === loginAtual) return
      sessionStorage.setItem("axis_aviso_acesso", loginAtual)
    } catch { /* sem armazenamento: mostra mesmo assim */ }
    toast(texto, "info")
  }, [texto, loginAtual, toast])
  return null
}
