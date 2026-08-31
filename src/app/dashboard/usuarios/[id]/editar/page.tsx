import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import UsuarioForm from "@/components/UsuarioForm"

export const metadata = {
  title: 'Áxis - Usuarios'
}

export const runtime = 'nodejs'

async function getUsuario(id: string, escolaId: string) {
  try {
    // Fallback para SQL Bruto para evitar erro de cache do Prisma Client (isDirecao, lastLogin)
    const users = await prisma.$queryRaw<any[]>`
      SELECT
        id, email, username, name,
        is_superuser as "isSuperuser",
        is_staff as "isStaff",
        is_direcao as "isDirecao",
        is_aee as "isAEE",
        last_login as "lastLogin"
      FROM users
      WHERE id = ${id} AND escola_id = ${escolaId}
      LIMIT 1
    `
    
    if (!users || users.length === 0) return null
    const user = users[0]

    // Buscar IDs das disciplinas permitidas via SQL (relação Many-to-Many implícita do Prisma)
    const disciplinas = await prisma.$queryRaw<any[]>`
      SELECT "A" as id FROM "_DisciplinaUsuarios" WHERE "B" = ${id}
    `

    return {
      ...user,
      disciplinasPermitidas: disciplinas
    }
  } catch (error) {
    console.error("Erro ao buscar usuário via SQL:", error)
    return null
  }
}

export default async function EditarUsuarioPage({
  params
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()

  if (!session?.user?.escolaId || !session.user.isSuperuser) {
    redirect("/dashboard")
  }

  const { id } = await params
  const usuario = await getUsuario(id, session.user.escolaId)

  if (!usuario) {
    redirect("/dashboard/usuarios")
  }

  return <UsuarioForm usuario={usuario} isEdit={true} />
}
