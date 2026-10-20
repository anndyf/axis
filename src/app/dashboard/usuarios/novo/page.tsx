import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import UsuarioForm from "@/components/UsuarioForm"
import { paginaDoModulo } from '@/lib/modulos/guarda'

export const metadata = {
  title: 'Áxis - Usuarios'
}

export const runtime = 'nodejs'

export default async function NovoUsuarioPage() {
  await paginaDoModulo('NUC')
  const session = await auth()
  
  if (!session || !session.user.isSuperuser) {
    redirect("/dashboard")
  }

  return <UsuarioForm />
}
