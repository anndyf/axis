import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { getTurmasForSelect } from "@/app/dashboard/mensagens/actions"
import ReportarClient from "./ReportarClient"
import { paginaDoModulo } from '@/lib/modulos/guarda'

export const metadata = {
  title: "Reportar Estudante Faltando | Sistema de Notas",
}

export default async function ReportarEstudantePage() {
  await paginaDoModulo('NUC')
  const session = await auth()
  
  if (!session?.user) {
    redirect("/login")
  }

  const turmas = await getTurmasForSelect()

  return <ReportarClient turmas={turmas} />
}
