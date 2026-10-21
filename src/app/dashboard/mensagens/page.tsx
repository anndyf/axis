import { auth } from "@/lib/auth"
import { getMessages, getUsersForSelect, getTurmasForSelect } from "./actions"
import { Alert, CabecalhoPagina } from "@/components/ui"
import MessagesClient from "./MessagesClient"
import { redirect } from "next/navigation"
import { paginaDoModulo } from '@/lib/modulos/guarda'

export const metadata = {
  title: 'Áxis - Mensagens'
}

export default async function MessagesPage() {
  await paginaDoModulo('NUC')
  const session = await auth()
  
  if (!session?.user) {
    redirect("/login")
  }

  const { received, sent } = await getMessages()
  const users = await getUsersForSelect()
  const turmas = await getTurmasForSelect()

  // Transform User[] to the shape MessagesClient expects
  const userOptions = users.map(u => ({
    id: u.id,
    name: u.name,
    username: u.username,
    role: u.isSuperuser ? "Admin" : u.isDirecao ? "Direção" : u.isStaff ? "Professor" : "Usuário",
    isStudent: !!u.estudanteId || u.isPortalUser
  }))

  // Só o que o cliente precisa para decidir os botões (nunca o registro inteiro)
  const currentUserRole = {
    isSuperuser: session.user.isSuperuser,
    isDirecao: session.user.isDirecao,
    isStaff: session.user.isStaff,
    papeis: session.user.papeis ?? null,
    permissoes: session.user.permissoes ?? null
  }

  return (
    <div className="space-y-4">
      <CabecalhoPagina
        titulo="Mensagens"
        descricao="Chamados, mensagens internas e comunicados oficiais."
      />

      <Alert tone="info" title="Precisa de ajuda com os dados?">
        Se uma turma, disciplina ou estudante não aparecer para você, envie a mensagem na categoria <strong className="font-medium">Suporte técnico</strong>.
      </Alert>
      <MessagesClient 
        receivedMessages={received as any} 
        sentMessages={sent as any}
        users={userOptions}
        turmas={turmas}
        currentUserRole={currentUserRole}
        currentUserId={session.user.id}
      />
    </div>
  )
}
