import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { can } from "@/lib/rbac"
import VitrineClient from "./VitrineClient"
import { paginaDoModulo } from '@/lib/modulos/guarda'

export const metadata = { title: "Áxis - Componentes" }

// Vitrine do design system (src/components/ui) para revisão - só superuser.
export default async function UiPage() {
  await paginaDoModulo('NUC')
  const session = await auth()
  if (!session?.user || !can(session.user, "superuser")) redirect("/dashboard")
  return <VitrineClient />
}
