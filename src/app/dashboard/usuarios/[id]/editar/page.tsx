import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import UsuarioForm, { type UsuarioDoFormulario } from "@/components/UsuarioForm"
import { papeisDoUsuarioNoBanco } from "@/lib/papeis"
import { papeisDosBooleanos } from "@/lib/permissoes"
import { contaProtegidaDaPlataforma } from "@/lib/plataforma"
import { paginaDoModulo } from '@/lib/modulos/guarda'
import { can } from '@/lib/rbac'

export const metadata = {
  title: 'Áxis - Usuarios'
}

export const runtime = 'nodejs'

async function getUsuario(id: string, escolaId: string, ator: { isPlatformAdmin?: boolean }): Promise<UsuarioDoFormulario | null> {
  const user = await prisma.user.findFirst({
    where: { id, escolaId },
    select: {
      id: true, email: true, username: true, name: true, lastLogin: true, isPlatformAdmin: true,
      isSuperuser: true, isDirecao: true, isStaff: true, isAEE: true, isPortalUser: true,
    },
  })
  if (!user) return null
  const noBanco = await papeisDoUsuarioNoBanco(prisma, user.id, escolaId)
  // Só o necessário vai para o navegador
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    username: user.username,
    lastLogin: user.lastLogin,
    papeis: noBanco.length ? noBanco : papeisDosBooleanos(user),
    protegida: contaProtegidaDaPlataforma(user, ator),
  }
}

export default async function EditarUsuarioPage({
  params
}: {
  params: Promise<{ id: string }>
}) {
  await paginaDoModulo('NUC')
  const session = await auth()

  if (!session?.user?.escolaId || !can(session.user, 'usuario.gerenciar')) {
    redirect("/dashboard")
  }

  const { id } = await params
  const usuario = await getUsuario(id, session.user.escolaId, session.user)

  if (!usuario) {
    redirect("/dashboard/usuarios")
  }

  return <UsuarioForm usuario={usuario} isEdit={true} />
}
