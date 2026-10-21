import { auth } from "@/lib/auth"
import { getMessages, getUsersForSelect, getTurmasForSelect } from "./actions"
import MessagesClient from "./MessagesClient"
import { redirect } from "next/navigation"
import { LifeBuoy } from "lucide-react"
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-4xl font-medium text-fg tracking-tighter">Mensagens</h1>
          <p className="text-fg-muted font-medium">Central de comunicação e comunicados oficiais.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-6 bg-surface border border-line px-6 py-3 rounded-xl shadow-sm">
           <div className="flex items-center gap-2 group">
              <span className="w-2 h-2 rounded-full bg-zinc-500 shadow-card group-hover:scale-125 transition-transform"></span>
              <p className="text-xs font-medium text-fg-muted">Suporte</p>
           </div>
           <div className="flex items-center gap-2 group">
              <span className="w-2 h-2 rounded-full bg-accent shadow-card group-hover:scale-125 transition-transform"></span>
              <p className="text-xs font-medium text-fg-muted">Direção</p>
           </div>
           <div className="flex items-center gap-2 group">
              <span className="w-2 h-2 rounded-full bg-success shadow-card group-hover:scale-125 transition-transform"></span>
              <p className="text-xs font-medium text-fg-muted">Geral</p>
           </div>
        </div>
      </div>

      {/* Alerta de Suporte Fixo */}
      <div className="bg-subtle border border-line rounded-xl p-6 flex flex-col md:flex-row items-center gap-6 animate-slide-up">
        <div className="w-14 h-14 bg-surface rounded-lg shadow-card flex items-center justify-center shrink-0">
          <LifeBuoy className="text-fg-muted w-7 h-7" />
        </div>
        <div className="flex-1 text-center md:text-left">
          <p className="text-xs font-medium text-accent-fg mb-1">
             Precisa de ajuda com os dados?
          </p>
          <p className="text-sm font-medium text-fg leading-relaxed">
            Se não estiver visualizando uma <span className="underline decoration-accent decoration-2 underline-offset-4">turma</span>, 
            <span className="ml-1 underline decoration-accent decoration-2 underline-offset-4">disciplina</span> ou 
            <span className="ml-1 underline decoration-accent decoration-2 underline-offset-4">estudante</span>, 
            selecione a categoria <span className="px-2 py-0.5 bg-zinc-700 text-white rounded-md text-xs font-medium">Suporte Técnico</span> ao enviar sua mensagem.
          </p>
        </div>
      </div>
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
