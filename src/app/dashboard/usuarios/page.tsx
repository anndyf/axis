import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import Link from "next/link"
import { Plus } from "lucide-react"
import { CabecalhoPagina, buttonClasses } from "@/components/ui"
import UsuariosClient from "@/components/UsuariosClient"
import { paginaDoModulo } from '@/lib/modulos/guarda'
import { can } from '@/lib/rbac'
import { papeisDasContas } from '@/lib/papeis'

export const metadata = {
  title: 'Áxis - Usuarios'
}

export const runtime = 'nodejs'

async function getUsuarios(escolaId: string) {
  const users = await prisma.$queryRaw<any[]>`
    SELECT
      u.id, u.name, u.email, u.username,
      u.is_superuser as "isSuperuser",
      u.is_direcao as "isDirecao",
      u.is_staff as "isStaff",
      u.is_active as "isActive",
      u.is_approved as "isApproved",
      u.is_aee as "isAEE",
      (SELECT COUNT(*)::int FROM "_DisciplinaUsuarios" du WHERE du."B" = u.id) as "disciplinasCount"
    FROM users u
    WHERE u.escola_id = ${escolaId} AND u.estudante_id IS NULL AND u.is_portal_user = false AND u.id NOT LIKE 'GROUP_%'
    ORDER BY u.is_approved ASC, u.name ASC
  `

  const papeis = await papeisDasContas(escolaId, users)

  // Só o que a lista mostra (os papéis no lugar dos booleanos)
  return users.map(u => ({
    id: u.id as string,
    name: u.name as string | null,
    email: u.email as string,
    username: u.username as string | null,
    isActive: u.isActive as boolean,
    isApproved: u.isApproved as boolean,
    papeis: papeis.get(u.id) ?? [],
    _count: {
      disciplinasPermitidas: u.disciplinasCount || 0
    }
  }))
}

export default async function UsuariosPage() {
  await paginaDoModulo('NUC')
  const session = await auth()
  if (!session?.user?.escolaId || !can(session.user, 'usuario.gerenciar')) redirect("/dashboard")

  const usuarios = await getUsuarios(session.user.escolaId)
  const pendentes = usuarios.filter(u => !u.isApproved).length

  return (
    <div className="pb-20 md:pb-0">
      <CabecalhoPagina
        titulo="Usuários"
        descricao="Contas da equipe, papéis e aprovação de cadastros."
        dados={[
          { rotulo: "Contas", valor: usuarios.length },
          ...(pendentes > 0 ? [{ rotulo: "Pendentes", valor: <span className="text-warning-fg">{pendentes}</span> }] : []),
        ]}
        acoes={
          <Link href="/dashboard/usuarios/novo" className={buttonClasses()}>
            <Plus size={16} strokeWidth={1.75} aria-hidden /> Novo usuário
          </Link>
        }
      />
      <UsuariosClient usuarios={usuarios} />
    </div>
  )
}
