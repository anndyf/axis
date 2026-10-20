import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import Link from "next/link"
import { ArrowLeft, Plus } from "lucide-react"
import UsuariosClient from "@/components/UsuariosClient"
import { paginaDoModulo } from '@/lib/modulos/guarda'

export const metadata = {
  title: 'Áxis - Usuarios'
}

export const runtime = 'nodejs'

async function getUsuarios(escolaId: string) {
  const users = await prisma.$queryRaw<any[]>`
    SELECT
      u.id, u.name, u.email, u.username,
      u.is_superuser as "isSuperuser",
      u.is_staff as "isStaff",
      u.is_active as "isActive",
      u.is_approved as "isApproved",
      u.is_aee as "isAEE",
      (SELECT COUNT(*)::int FROM "_DisciplinaUsuarios" du WHERE du."B" = u.id) as "disciplinasCount"
    FROM users u
    WHERE u.escola_id = ${escolaId} AND u.estudante_id IS NULL AND u.is_portal_user = false AND u.id NOT LIKE 'GROUP_%'
    ORDER BY u.is_approved ASC, u.name ASC
  `

  // Mapear para o formato que o componente Cliente espera (_count.disciplinasPermitidas)
  return users.map(u => ({
    ...u,
    _count: {
      disciplinasPermitidas: u.disciplinasCount || 0
    }
  }))
}

export default async function UsuariosPage() {
  await paginaDoModulo('NUC')
  const session = await auth()
  if (!session?.user?.escolaId || !session.user.isSuperuser) redirect("/dashboard")

  const usuarios = await getUsuarios(session.user.escolaId)
  const pendentes = usuarios.filter(u => !u.isApproved).length

  return (
    <div className="pb-20">
      {/* Header */}
      <header className="mb-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <Link href="/dashboard" aria-label="Voltar" className="hidden sm:inline-flex p-1.5 rounded-md text-fg-subtle transition-colors duration-150 hover:bg-subtle hover:text-fg">
                <ArrowLeft className="w-5 h-5 text-fg-muted" />
              </Link>
              <div>
                <h1 className="text-2xl font-semibold tracking-tight text-fg">
                  Gerenciar Usuários
                  {pendentes > 0 && (
                    <span className="px-2.5 py-0.5 text-xs font-bold bg-warning-subtle text-warning-fg border border-warning-line rounded-full animate-pulse">
                      {pendentes} pendente{pendentes !== 1 ? 's' : ''}
                    </span>
                  )}
                </h1>
                <p className="text-sm text-fg-muted">Administradores e Professores</p>
              </div>
            </div>
            <Link
              href="/dashboard/usuarios/novo"
              className="inline-flex h-9 shrink-0 items-center gap-2 rounded-md bg-accent px-3 text-sm font-medium text-on-accent transition-colors duration-150 hover:bg-accent-hover disabled:opacity-50"
            >
              <Plus size={16} strokeWidth={1.75} />
              <span>Novo Usuário</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <UsuariosClient usuarios={usuarios} />
      </main>
    </div>
  )
}
