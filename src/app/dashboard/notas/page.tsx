import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { ArrowLeft, Award, TrendingUp, FileText } from "lucide-react"
import NotasClient from "./NotasClient"

export const metadata = {
  title: 'Áxis - Notas'
}

import { getTurmasPermitidas } from "@/lib/data-fetching"
import { paginaDoModulo } from '@/lib/modulos/guarda'

export const runtime = 'nodejs'



export default async function LancarNotasPage() {
  await paginaDoModulo('NOT')
  const session = await auth()
  
  if (!session) {
    redirect("/login")
  }

  const turmas = await getTurmasPermitidas(session)

  return <NotasClient turmas={turmas} />
}
