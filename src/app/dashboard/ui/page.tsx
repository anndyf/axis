import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { can } from "@/lib/rbac"
import VitrineClient from "./VitrineClient"

export const metadata = { title: "Áxis - Componentes" }

// Vitrine do design system (src/components/ui) para revisão - só superuser.
export default async function UiPage() {
  const session = await auth()
  if (!session?.user || !can(session.user, "superuser")) redirect("/dashboard")
  return <VitrineClient />
}
