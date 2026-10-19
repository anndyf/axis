"use client"

import { useState, useEffect, useMemo, useTransition } from "react"
import { 
  MessageSquare, 
  Send, 
  Inbox, 
  User, 
  Search, 
  CheckCheck, 
  AlertCircle,
  Megaphone,
  LifeBuoy,
  Plus,
  ArrowLeft,
  Clock,
  MoreVertical,
  X,
  Tag,
  Check,
  Loader2,
  ChevronRight
} from "lucide-react"
import RichTextEditor from "@/components/RichTextEditor"
import MarkdownContent from "@/components/MarkdownContent"
import { sendMessage, markAsRead, getMessageThread, deleteMessage, markAllAsRead } from "./actions"
import { useRouter } from "next/navigation"

/** Formata data/hora sempre no fuso de Brasília */
const TIMEZONE = 'America/Sao_Paulo'

function formatarData(val: Date | string): string {
  return new Date(val).toLocaleDateString('pt-BR', { timeZone: TIMEZONE, day: '2-digit', month: '2-digit', year: '2-digit' })
}

function formatarHora(val: Date | string): string {
  return new Date(val).toLocaleTimeString('pt-BR', { timeZone: TIMEZONE, hour: '2-digit', minute: '2-digit' })
}

export default function MessagesClient({ 
  receivedMessages, 
  sentMessages,
  users,
  turmas = [],
  currentUserRole,
  currentUserId
}: { 
  receivedMessages: any[], 
  sentMessages: any[],
  users: any[],
  turmas?: any[],
  currentUserRole: { isSuperuser: boolean, isDirecao: boolean, isStaff: boolean }
  currentUserId: string
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  // States
  const [activeTab, setActiveTab] = useState<"inbox" | "sent" | "new">("inbox")
  const [inboxMessages, setInboxMessages] = useState<any[]>(receivedMessages)
  const [sentMessagesList, setSentMessagesList] = useState<any[]>(sentMessages)
  const [selectedMessage, setSelectedMessage] = useState<any>(null)
  const [threadMessages, setThreadMessages] = useState<any[]>([])
  
  const [newMsgSubject, setNewMsgSubject] = useState("")
  const [predefinedSubject, setPredefinedSubject] = useState("")
  const [newMsgContent, setNewMsgContent] = useState("")
  const isTeacherOnly = currentUserRole.isStaff && !currentUserRole.isSuperuser && !currentUserRole.isDirecao
  const [newMsgCategory, setNewMsgCategory] = useState(isTeacherOnly ? "SUPORTE" : "GERAL")
  const [newMsgReceiver, setNewMsgReceiver] = useState("")
  const [newMsgPriority, setNewMsgPriority] = useState("MEDIA")
  const [sending, setSending] = useState(false)
  const [replying, setReplying] = useState(false)
  const [replyContent, setReplyContent] = useState("")
  const [filterCategory, setFilterCategory] = useState<string>("ALL")
  const [searchQuery, setSearchQuery] = useState("")
  
  const [selectedTurmaId, setSelectedTurmaId] = useState("")
  const [selectedDisciplinaId, setSelectedDisciplinaId] = useState("")
  const [selectedEstudanteId, setSelectedEstudanteId] = useState("")
  const [turmaDetails, setTurmaDetails] = useState<{disciplinas: any[], estudantes: any[]}>({ disciplinas: [], estudantes: [] })

  useEffect(() => {
    if (selectedTurmaId) {
        import('./actions').then(m => m.getTurmaDetails(selectedTurmaId)).then(setTurmaDetails)
    } else {
        setTurmaDetails({ disciplinas: [], estudantes: [] })
    }
  }, [selectedTurmaId])
  
  const [page, setPage] = useState(1)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(receivedMessages.length === 20 || sentMessages.length === 20)

  useEffect(() => {
    setInboxMessages(receivedMessages)
    setSentMessagesList(sentMessages)
  }, [receivedMessages, sentMessages])

  const filteredBySearchAndCategory = useMemo(() => {
    let list: any[] = activeTab === "inbox" ? inboxMessages : sentMessagesList
    
    if (filterCategory !== "ALL") {
        list = list.filter((m: any) => m.category === filterCategory)
    }

    if (!searchQuery) return list
    return list.filter((m: any) => 
      m.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (m.sender?.name || '').toLowerCase().includes(searchQuery.toLowerCase())
    )
  }, [activeTab, inboxMessages, sentMessagesList, searchQuery, filterCategory])

  const loadMore = async () => {
    setLoadingMore(true)
    try {
      const nextPage = page + 1
      const { getMessages } = await import('./actions')
      const { received, sent } = await getMessages({ page: nextPage, limit: 20 })
      
      if (received.length === 0 && sent.length === 0) {
        setHasMore(false)
      } else {
        setInboxMessages(prev => {
            const newItems = received.filter((r: any) => !prev.some(p => p.id === r.id))
            return [...prev, ...newItems].sort((a: any, b: any) => new Date(b.updatedAt ?? b.createdAt).getTime() - new Date(a.updatedAt ?? a.createdAt).getTime())
        })
        setSentMessagesList(prev => {
            const newItems = sent.filter((s: any) => !prev.some(p => p.id === s.id))
            return [...prev, ...newItems].sort((a: any, b: any) => new Date(b.updatedAt ?? b.createdAt).getTime() - new Date(a.updatedAt ?? a.createdAt).getTime())
        })
        setPage(nextPage)
        if (received.length < 20 && sent.length < 20) setHasMore(false)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoadingMore(false)
    }
  }

  const [loadingThread, setLoadingThread] = useState(false)

  const handleSelectMessage = async (msg: any) => {
    setSelectedMessage(msg)
    setThreadMessages([msg])
    setLoadingThread(true)
    
    if (activeTab === "inbox" && !msg.isRead) {
      setInboxMessages(prev => prev.map(m => m.id === msg.id ? { ...m, isRead: true } : m))
      markAsRead(msg.id).catch(err => console.error("Erro ao marcar como lida:", err))
    }

    try {
      const { getMessageThread } = await import('./actions')
      const thread = await getMessageThread(msg.id)
      setThreadMessages(thread)
    } finally {
      setLoadingThread(false)
    }
  }

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    
    let finalSubject = newMsgSubject;
    if (newMsgCategory === "SUPORTE" || newMsgCategory === "DIRECAO") {
        if (!predefinedSubject) return;
        const details = [];
        if (selectedTurmaId) details.push(turmas?.find(t => t.id === selectedTurmaId)?.nome || selectedTurmaId)
        if (selectedDisciplinaId) details.push(turmaDetails.disciplinas.find(d => d.id === selectedDisciplinaId)?.nome || selectedDisciplinaId)
        if (selectedEstudanteId) details.push(turmaDetails.estudantes.find(s => s.id === selectedEstudanteId)?.nome || selectedEstudanteId)
        
        const detailsStr = details.length > 0 ? ` - ${details.join(' | ')}` : '';
        finalSubject = `[${predefinedSubject}] ${newMsgSubject ? newMsgSubject : ''}${detailsStr}`.trim()
    }

    if (!finalSubject || !newMsgContent || sending) return

    setSending(true)
    const formData = new FormData()
    formData.append("subject", finalSubject)
    formData.append("content", newMsgContent)
    formData.append("priority", newMsgPriority)
    
    if (newMsgCategory.startsWith("COMUNICADO_")) {
        formData.append("category", "COMUNICADO")
        if (newMsgCategory === "COMUNICADO_ESTUDANTES") formData.append("receiverId", "GROUP_STUDENTS")
        if (newMsgCategory === "COMUNICADO_PROFESSORES") formData.append("receiverId", "GROUP_TEACHERS")
        if (newMsgCategory === "COMUNICADO_TURMA") formData.append("receiverId", `TURMA_${newMsgReceiver}`)
    } else {
        formData.append("category", newMsgCategory)
        if (newMsgCategory === "GERAL") formData.append("receiverId", newMsgReceiver)
    }
    
    const res = await sendMessage(formData)
    setSending(false)

    if (res?.success) {
      setNewMsgSubject("")
      setPredefinedSubject("")
      setNewMsgContent("")
      setNewMsgCategory(isTeacherOnly ? "SUPORTE" : "GERAL")
      setNewMsgReceiver("")
      setSelectedTurmaId("")
      setSelectedDisciplinaId("")
      setSelectedEstudanteId("")
      setActiveTab("sent")
      startTransition(() => {
        router.refresh()
      })
    }
  }

  const handleQuickReply = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!replyContent.trim() || !selectedMessage || replying) return

    const content = replyContent.trim()
    setReplying(true)
    setReplyContent("")

    try {
        const rootId = selectedMessage.id
        let targetReceiverId = ""
        const lastOther = [...threadMessages].reverse().find(m => m.senderId !== currentUserId)
        if (lastOther) targetReceiverId = lastOther.senderId
        else if (selectedMessage.senderId !== currentUserId) targetReceiverId = selectedMessage.senderId

        const formData = new FormData()
        formData.append("subject", `Re: ${selectedMessage.subject}`)
        formData.append("content", content)
        formData.append("category", selectedMessage.category)
        if (rootId) formData.append("parentId", rootId)
        if (targetReceiverId) formData.append("receiverId", targetReceiverId)

        const res = await sendMessage(formData)
        if (res?.success) {
            const newThread = await getMessageThread(selectedMessage.id)
            setThreadMessages(newThread)
        }
    } finally {
        setReplying(false)
    }
  }

  const getCatStyles = (cat: string) => {
    switch(cat) {
      case "COMUNICADO": return { bg: "bg-warning-subtle", text: "text-warning-fg", dot: "bg-warning", border: "border-warning-line", label: "📢 Comunicado" }
      case "SUPORTE": return { bg: "bg-accent-subtle", text: "text-accent-fg", dot: "bg-accent", border: "border-accent/25", label: "🛠️ Chamado Técnico" }
      case "DIRECAO": return { bg: "bg-accent-subtle", text: "text-accent-fg", dot: "bg-accent", border: "border-accent/25", label: "🏛️ Chamado Direção" }
      default: return { bg: "bg-success-subtle", text: "text-success-fg", dot: "bg-success", border: "border-success-line", label: "💬 Mensagem Geral" }
    }
  }

  const ticketStatuses = [
    { value: "ABERTO", label: "Aberto", color: "bg-zinc-100 text-fg-muted" },
    { value: "EM_ATENDIMENTO", label: "Em Atendimento", color: "bg-accent-subtle text-accent-fg" },
    { value: "AGUARDANDO_RESPOSTA", label: "Aguardando Resposta", color: "bg-warning-subtle text-warning-fg" },
    { value: "RESOLVIDO", label: "Resolvido", color: "bg-success-subtle text-success-fg" }
  ]

  const priorities = [
    { value: "BAIXA", label: "Baixa", color: "text-fg-subtle" },
    { value: "MEDIA", label: "Média", color: "text-accent-fg" },
    { value: "ALTA", label: "Alta", color: "text-warning-fg font-bold" },
    { value: "CRITICA", label: "Crítica", color: "text-danger-fg font-semibold" }
  ]

  return (
    <div className="flex flex-col bg-white rounded-xl shadow-card border border-zinc-200 min-h-[calc(100vh-180px)] overflow-hidden animate-fade-in">
      
      {/* View 1: Listagem de Chamados (Full Width) */}
      {!selectedMessage && activeTab !== 'new' && (
        <div className="flex flex-col h-full bg-zinc-50/20">
          <div className="p-8 md:px-12 border-b border-zinc-100 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <h2 className="text-3xl font-semibold text-fg tracking-tight">Painel de Chamados</h2>
              <button 
                onClick={async () => {
                  startTransition(async () => {
                    await markAllAsRead()
                    setInboxMessages(prev => prev.map(m => ({ ...m, isRead: true })))
                    router.refresh()
                  })
                }}
                disabled={isPending}
                className="text-xs font-bold text-accent-fg hover:text-accent-fg transition-colors mt-3 flex items-center gap-2"
              >
                <CheckCheck size={14} /> Marcar todos como lidos
              </button>
            </div>
            
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <div className="flex bg-zinc-100 p-1.5 rounded-lg w-full sm:w-auto">
                <button
                  onClick={() => setActiveTab("inbox")}
                  className={`px-8 py-3 text-xs font-bold rounded-xl transition-all ${activeTab === 'inbox' ? 'bg-white text-accent-fg shadow-sm' : 'text-fg-subtle hover:text-fg-muted'}`}
                >
                  Fila de Chamados
                </button>
                <button
                  onClick={() => setActiveTab("sent")}
                  className={`px-8 py-3 text-xs font-bold rounded-xl transition-all ${activeTab === 'sent' ? 'bg-white text-accent-fg shadow-sm' : 'text-fg-subtle hover:text-fg-muted'}`}
                >
                  Meus Chamados
                </button>
              </div>
              <button
                onClick={() => { setActiveTab("new"); setSelectedMessage(null); }}
                className="w-full sm:w-auto px-6 py-3 bg-accent text-on-accent rounded-lg hover:bg-accent-hover transition-all shadow-card active:scale-95 flex items-center justify-center gap-2 font-bold text-sm"
              >
                <Plus size={18} /> Novo Chamado
              </button>
            </div>
          </div>

          <div className="p-8 md:px-12">
            <div className="relative max-w-md mb-8">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-fg-subtle w-5 h-5" />
              <input 
                type="text" 
                placeholder="Buscar ticket por assunto ou remetente..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-4 bg-white border border-zinc-200 rounded-lg text-sm font-medium focus:ring-2 focus:ring-ring outline-none transition-all shadow-sm"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredBySearchAndCategory.map((msg: any) => {
                const style = getCatStyles(msg.category)
                const isUnread = !msg.isRead && activeTab === 'inbox'
                const statusData = ticketStatuses.find(s => s.value === msg.status) || ticketStatuses[0]
                const priorityData = priorities.find(p => p.value === msg.priority) || priorities[1]

                return (
                  <div 
                    key={msg.id}
                    onClick={() => handleSelectMessage(msg)}
                    className={`group p-6 rounded-xl cursor-pointer transition-all border flex flex-col justify-between min-h-[160px] ${
                      isUnread 
                        ? 'bg-accent-subtle border-accent/25 shadow-card ' 
                        : 'bg-white border-zinc-200 hover:border-accent/25 hover:shadow-card '
                    }`}
                  >
                    <div>
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`px-2 py-1 rounded-lg text-xs font-semibold border ${style.bg} ${style.text} ${style.border}`}>
                            {style.label}
                          </span>
                          {!msg.isResolved && msg.category !== 'GERAL' && (
                            <span className={`px-2 py-1 rounded-lg text-xs font-semibold ${statusData.color} border border-current opacity-80`}>
                              {statusData.label}
                            </span>
                          )}
                        </div>
                        {isUnread && (
                          <div className="flex items-center gap-1.5 shrink-0">
                            <div className="w-2 h-2 bg-accent rounded-full animate-pulse"></div>
                            <span className="text-xs font-semibold text-accent-fg">Novo</span>
                          </div>
                        )}
                      </div>
                      
                      <h4 className={`text-base leading-tight mb-2 ${isUnread ? 'font-semibold text-fg' : 'font-bold text-fg'}`}>
                        {msg.ticketNumber ? <span className="text-accent-fg mr-2">#{msg.ticketNumber}</span> : ''}
                        {msg.subject.replace(/\[Ticket\]|\[Cadastro Pendente\]/gi, '').trim() || 'Sem Assunto'}
                      </h4>
                      
                      <div className="flex items-center gap-2 mb-4">
                        <div className="w-6 h-6 rounded-full bg-zinc-100 flex items-center justify-center text-xs font-bold text-fg-muted">
                           {activeTab === 'inbox' ? (msg.sender?.name?.charAt(0) || msg.sender?.username?.charAt(0)) : (msg.receiver?.name?.charAt(0) || 'G')}
                        </div>
                        <span className="text-xs font-medium text-fg-subtle truncate">
                          {activeTab === 'inbox' ? (msg.sender?.name || msg.sender?.username) : (msg.receiver?.name || 'Geral')}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between mt-auto pt-4 border-t border-zinc-100/80">
                      <span className={`text-xs font-semibold ${priorityData.color}`}>
                        Prio: {priorityData.label}
                      </span>
                      <span className="text-xs font-bold text-fg-subtle">
                        {formatarData(msg.updatedAt || msg.createdAt)}
                      </span>
                    </div>
                  </div>
                )
              })}
              
              {filteredBySearchAndCategory.length === 0 && (
                <div className="col-span-full py-20 flex flex-col items-center justify-center text-center bg-white rounded-xl border border-dashed border-zinc-200">
                  <div className="w-24 h-24 bg-zinc-50 rounded-xl flex items-center justify-center mb-6">
                    <Inbox className="w-10 h-10 text-zinc-300" />
                  </div>
                  <h3 className="text-xl font-semibold text-fg-muted">Nenhum chamado encontrado</h3>
                  <p className="text-sm font-medium text-fg-subtle mt-2">Você não tem chamados pendentes nesta categoria.</p>
                </div>
              )}
            </div>

            {hasMore && filteredBySearchAndCategory.length > 0 && !searchQuery && (
              <div className="flex justify-center mt-12 mb-4">
                <button
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="px-8 py-3 bg-white border border-zinc-200 text-fg-muted rounded-xl text-sm font-bold shadow-sm hover:bg-zinc-50 hover:text-accent-fg transition-colors flex items-center gap-2 disabled:opacity-50"
                >
                  {loadingMore ? (
                    <><Loader2 size={16} className="animate-spin" /> Carregando...</>
                  ) : (
                    "Carregar mais antigos"
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* View 2: Criação de Novo Chamado (Full Width) */}
      {activeTab === "new" && (
        <div className="flex-1 flex flex-col bg-zinc-50/30 overflow-y-auto">
          <div className="px-8 py-6 bg-white border-b border-zinc-100 flex items-center gap-4 sticky top-0 z-10">
            <button onClick={() => setActiveTab("inbox")} className="p-3 bg-zinc-50 hover:bg-zinc-100 rounded-lg transition-all">
              <ArrowLeft size={20} className="text-fg-muted" />
            </button>
            <div>
              <h2 className="text-2xl font-semibold text-fg tracking-tight leading-none">Abrir Novo Chamado</h2>
              <p className="text-xs font-bold text-fg-subtle mt-1.5">Preencha os detalhes do seu ticket</p>
            </div>
          </div>

          <div className="flex-1 p-8 md:p-12">
            <div className="max-w-3xl mx-auto space-y-8 bg-white p-8 md:p-10 rounded-xl shadow-sm border border-zinc-100">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-3">
                  <label className="text-xs font-semibold text-fg-subtle ml-1">Categoria / Departamento</label>
                  <select 
                    value={newMsgCategory} 
                    onChange={e => setNewMsgCategory(e.target.value)}
                    className="w-full p-4 bg-zinc-50 border-2 border-transparent rounded-lg font-bold text-fg-muted focus:bg-white focus:border-accent transition-all outline-none"
                  >
                    <option value="SUPORTE">Suporte Técnico (Sistema)</option>
                    <option value="DIRECAO">Direção (Pedagógico)</option>
                    {(currentUserRole.isDirecao || currentUserRole.isSuperuser) && (
                      <>
                        <option value="GERAL">Mensagem Privada</option>
                        <option value="COMUNICADO">Comunicado Oficial</option>
                        <option value="COMUNICADO_TURMA">Aviso para Turma</option>
                      </>
                    )}
                  </select>
                </div>

                <div className="space-y-3">
                  <label className="text-xs font-semibold text-fg-subtle ml-1">Nível de Urgência</label>
                  <select 
                    value={newMsgPriority} 
                    onChange={e => setNewMsgPriority(e.target.value)}
                    className="w-full p-4 bg-zinc-50 border-2 border-transparent rounded-lg font-bold text-fg-muted focus:bg-white focus:border-accent transition-all outline-none"
                  >
                    <option value="BAIXA">Baixa (Pode esperar)</option>
                    <option value="MEDIA">Normal</option>
                    <option value="ALTA">Alta (Importante)</option>
                    <option value="CRITICA">Crítica (Impedimento)</option>
                  </select>
                </div>

                {newMsgCategory === "GERAL" && (
                  <div className="md:col-span-2 space-y-3">
                    <label className="text-xs font-semibold text-fg-subtle ml-1">Atribuir A / Destinatário</label>
                    <select 
                      value={newMsgReceiver} 
                      onChange={e => setNewMsgReceiver(e.target.value)}
                      className="w-full p-4 bg-zinc-50 border-2 border-transparent rounded-lg font-bold text-fg-muted focus:bg-white focus:border-accent transition-all outline-none"
                    >
                      <option value="">Selecione o usuário responsável...</option>
                      {users.filter(u => u.id !== currentUserId).map(u => (
                        <option key={u.id} value={u.id}>{u.name || u.username} ({u.role})</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div className="space-y-6">
                <div className="space-y-3">
                  <label className="text-xs font-semibold text-fg-subtle ml-1">Assunto / Tópico</label>
                  {newMsgCategory === 'SUPORTE' ? (
                    <select
                      value={predefinedSubject}
                      onChange={e => {
                         const val = e.target.value;
                         if (val === 'ESTUDANTE_FALTANDO') {
                             router.push('/dashboard/reportar-estudante');
                         } else {
                             setPredefinedSubject(val);
                             setNewMsgSubject('');
                         }
                      }}
                      className="w-full p-4 bg-zinc-50 border-2 border-transparent rounded-lg font-bold text-fg focus:bg-white focus:border-accent transition-all outline-none"
                    >
                      <option value="">Selecione o tópico principal...</option>
                      <option value="Lançamento de Notas/Faltas">Problema no Lançamento de Notas/Faltas</option>
                      <option value="Gerador de Provas">Problema no Gerador de Provas</option>
                      <option value="Dúvida de Uso">Dúvida sobre uso do sistema</option>
                      <option value="Erro Inesperado (Bug)">Erro Inesperado (Bug) / Tela Travada</option>
                      <option value="ESTUDANTE_FALTANDO">Estudante Faltando na Lista / Turma Errada</option>
                      <option value="Outro Problema">Outro problema técnico</option>
                    </select>
                  ) : newMsgCategory === 'DIRECAO' ? (
                    <select
                      value={predefinedSubject}
                      onChange={e => { setPredefinedSubject(e.target.value); setNewMsgSubject(''); }}
                      className="w-full p-4 bg-zinc-50 border-2 border-transparent rounded-lg font-bold text-fg focus:bg-white focus:border-accent transition-all outline-none"
                    >
                      <option value="">Selecione o tópico principal...</option>
                      <option value="Ajuste de Notas">Solicitação de Ajuste de Notas (Fora do Prazo)</option>
                      <option value="Ocorrência Grave">Ocorrência / Indisciplina Grave</option>
                      <option value="Solicitação de Material">Solicitação de Material / Infraestrutura</option>
                      <option value="Dúvida Pedagógica">Dúvida ou Orientação Pedagógica</option>
                    </select>
                  ) : (
                    <input 
                      type="text" 
                      value={newMsgSubject} 
                      onChange={e => setNewMsgSubject(e.target.value)}
                      placeholder="Assunto da mensagem"
                      className="w-full p-4 bg-zinc-50 border-2 border-transparent rounded-lg font-bold text-fg focus:bg-white focus:border-accent transition-all outline-none"
                    />
                  )}
                </div>

                {(newMsgCategory === 'SUPORTE' || newMsgCategory === 'DIRECAO') && predefinedSubject && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-slide-up">
                    {/* Campos Dinâmicos baseados no Assunto */}
                    {(predefinedSubject === 'Lançamento de Notas/Faltas' || predefinedSubject === 'Ajuste de Notas' || predefinedSubject === 'Gerador de Provas' || predefinedSubject === 'Ocorrência Grave') && (
                      <div className="space-y-3">
                        <label className="text-xs font-semibold text-fg-subtle ml-1">Turma (Opcional para provas)</label>
                        <select 
                          value={selectedTurmaId} 
                          onChange={e => setSelectedTurmaId(e.target.value)}
                          className="w-full p-3.5 bg-zinc-50 border-2 border-transparent rounded-xl font-bold text-sm text-fg-muted focus:bg-white focus:border-accent transition-all outline-none"
                        >
                          <option value="">Selecione a Turma...</option>
                          {turmas?.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
                        </select>
                      </div>
                    )}
                    
                    {(predefinedSubject === 'Lançamento de Notas/Faltas' || predefinedSubject === 'Ajuste de Notas' || predefinedSubject === 'Gerador de Provas') && (
                      <div className="space-y-3">
                        <label className="text-xs font-semibold text-fg-subtle ml-1">Disciplina</label>
                        <select 
                          value={selectedDisciplinaId} 
                          onChange={e => setSelectedDisciplinaId(e.target.value)}
                          disabled={!selectedTurmaId || turmaDetails.disciplinas.length === 0}
                          className="w-full p-3.5 bg-zinc-50 border-2 border-transparent rounded-xl font-bold text-sm text-fg-muted focus:bg-white focus:border-accent transition-all outline-none disabled:opacity-50"
                        >
                          <option value="">Selecione a Disciplina...</option>
                          {turmaDetails.disciplinas.map(d => <option key={d.id} value={d.id}>{d.nome}</option>)}
                        </select>
                      </div>
                    )}

                    {predefinedSubject === 'Ocorrência Grave' && (
                      <div className="space-y-3">
                        <label className="text-xs font-semibold text-fg-subtle ml-1">Estudante</label>
                        <select 
                          value={selectedEstudanteId} 
                          onChange={e => setSelectedEstudanteId(e.target.value)}
                          disabled={!selectedTurmaId || turmaDetails.estudantes.length === 0}
                          className="w-full p-3.5 bg-zinc-50 border-2 border-transparent rounded-xl font-bold text-sm text-fg-muted focus:bg-white focus:border-accent transition-all outline-none disabled:opacity-50"
                        >
                          <option value="">Selecione o Estudante...</option>
                          {turmaDetails.estudantes.map((e: any) => <option key={e.matricula} value={e.matricula}>{e.nome}</option>)}
                        </select>
                      </div>
                    )}

                    {(predefinedSubject === 'Outro Problema' || predefinedSubject === 'Solicitação de Material' || predefinedSubject === 'Dúvida Pedagógica' || predefinedSubject === 'Gerador de Provas') && (
                      <div className="space-y-3 md:col-span-2">
                        <label className="text-xs font-semibold text-fg-subtle ml-1">Detalhes Rápidos / Título</label>
                        <input 
                          type="text" 
                          value={newMsgSubject} 
                          onChange={e => setNewMsgSubject(e.target.value)}
                          placeholder="Ex: Laboratório de Informática / Não consigo cadastrar questão"
                          className="w-full p-3.5 bg-zinc-50 border-2 border-transparent rounded-xl font-bold text-sm text-fg-muted focus:bg-white focus:border-accent transition-all outline-none"
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <label className="text-xs font-semibold text-fg-subtle ml-1">Descrição Completa da Ocorrência</label>
                <div className="rounded-lg overflow-hidden border border-zinc-200">
                  <RichTextEditor
                    value={newMsgContent}
                    onChange={setNewMsgContent}
                    className="min-h-[300px] border-none"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <button 
                  onClick={() => handleSendMessage()}
                  disabled={sending}
                  className="w-full md:w-auto px-12 bg-accent text-on-accent py-5 rounded-lg font-semibold text-sm hover:bg-accent-hover transition-all shadow-card disabled:opacity-50 active:scale-95 flex items-center justify-center gap-3"
                >
                  {sending ? <Loader2 className="animate-spin w-5 h-5" /> : <Send size={20} />}
                  {sending ? "Enviando..." : "Registrar Chamado"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* View 3: Detalhes do Chamado (Full Width) */}
      {selectedMessage && (
        <div className="flex-1 flex flex-col h-full bg-zinc-50/30 overflow-hidden">
          <div className="px-8 py-6 bg-white border-b border-zinc-100 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-sm z-10 shrink-0">
            <div className="flex items-center gap-5">
               <button 
                 onClick={() => { setSelectedMessage(null); setThreadMessages([]); }} 
                 className="p-3 bg-zinc-50 hover:bg-zinc-100 rounded-lg transition-all"
               >
                 <ArrowLeft size={20} className="text-fg-muted" />
               </button>
               <div>
                  <div className="flex items-center gap-3 mb-1.5">
                    <span className="text-xs font-semibold text-fg-subtle">
                      CHAMADO #{selectedMessage.ticketNumber || selectedMessage.id.substring(selectedMessage.id.length - 6).toUpperCase()}
                    </span>
                    <span className={`px-2 py-0.5 rounded-md text-xs font-semibold border ${getCatStyles(selectedMessage.category).bg} ${getCatStyles(selectedMessage.category).text} ${getCatStyles(selectedMessage.category).border}`}>
                      {getCatStyles(selectedMessage.category).label}
                    </span>
                  </div>
                  <h3 className="text-2xl font-semibold text-fg tracking-tight leading-none">
                    {selectedMessage.subject.replace(/\[Ticket\]|\[Cadastro Pendente\]/gi, '').trim()}
                  </h3>
               </div>
            </div>
            
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="flex items-center gap-2 bg-zinc-50 px-4 py-2.5 rounded-xl border border-zinc-100">
                <Clock size={16} className="text-fg-subtle" />
                <div className="flex flex-col">
                  <span className="text-xs font-semibold text-fg-subtle">Aberto em</span>
                  <span className="text-xs font-bold text-fg-muted">{formatarData(selectedMessage.createdAt)}</span>
                </div>
              </div>
              
              <div className="flex flex-wrap items-center gap-2">
                {selectedMessage.assignedTo && (
                  <div className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-accent-subtle text-accent-fg border border-accent/25 flex items-center gap-1.5">
                    <User size={12} />
                    {selectedMessage.assignedTo.name}
                  </div>
                )}
                
                {(currentUserRole.isSuperuser || currentUserRole.isDirecao) && !selectedMessage.assignedToId && (
                  <button 
                    onClick={async () => {
                      const { assignTicket } = await import('./actions')
                      await assignTicket(selectedMessage.id)
                      const newThread = await getMessageThread(selectedMessage.id)
                      setThreadMessages(newThread)
                      setSelectedMessage({...selectedMessage, assignedToId: currentUserId, assignedTo: { name: 'Você' }})
                    }}
                    className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-accent-subtle hover:bg-accent-subtle text-accent-fg border border-accent/25 transition-colors cursor-pointer flex items-center gap-1"
                  >
                    <User size={12} /> Assumir Chamado
                  </button>
                )}

                {!selectedMessage.isResolved && selectedMessage.category !== 'GERAL' && (
                  <span className={`px-4 py-2.5 rounded-xl text-xs font-semibold bg-warning-subtle text-warning-fg border border-warning-line`}>
                    Em Aberto
                  </span>
                )}
                
                {(currentUserRole.isSuperuser || currentUserRole.isDirecao || selectedMessage.senderId === currentUserId) && !selectedMessage.isResolved && selectedMessage.category !== 'GERAL' && (
                  <button
                    onClick={async () => {
                      const { updateTicketStatus } = await import('./actions')
                      await updateTicketStatus(selectedMessage.id, 'RESOLVIDO')
                      setSelectedMessage({...selectedMessage, isResolved: true, status: 'RESOLVIDO'})
                    }}
                    className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-accent hover:bg-accent-hover text-on-accent transition-colors shadow-sm cursor-pointer flex items-center gap-1"
                  >
                    <Check size={12} /> Marcar Resolvido
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-8 md:p-12 space-y-6 custom-scrollbar bg-zinc-50/50">
            <div className="max-w-4xl mx-auto space-y-6">
              {threadMessages.map((m, idx) => {
                const isMe = m.senderId === currentUserId
                return (
                  <div key={m.id} className="animate-slide-up">
                    <div className={`w-full p-8 rounded-xl shadow-sm border ${
                      isMe ? 'bg-white border-accent/25' : 'bg-white border-zinc-200'
                    }`}>
                      <div className="flex items-center justify-between mb-6 pb-5 border-b border-zinc-100">
                        <div className="flex items-center gap-4">
                           <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-semibold text-lg ${
                             isMe ? 'bg-accent text-on-accent shadow-card ' : 'bg-zinc-100 text-fg-muted'
                           }`}>
                             {m.sender?.name?.charAt(0) || m.sender?.username?.charAt(0) || '?'}
                           </div>
                           <div>
                              <p className="text-base font-semibold text-fg">{m.sender?.name || m.sender?.username}</p>
                              <p className="text-xs font-bold text-fg-subtle">{formatarData(m.createdAt)} às {formatarHora(m.createdAt)}</p>
                           </div>
                        </div>
                        {isMe && <CheckCheck size={20} className="text-accent" />}
                      </div>
                      <div className="text-sm font-medium text-fg-muted leading-relaxed max-w-none prose prose-slate">
                        <MarkdownContent content={m.content} />
                      </div>
                    </div>
                  </div>
                )
              })}
              
              {loadingThread && (
                <div className="flex flex-col items-center justify-center py-12 gap-3 opacity-60 animate-fade-in">
                  <Loader2 className="w-8 h-8 text-accent-fg animate-spin" />
                  <span className="text-xs font-bold text-fg-subtle">Carregando histórico...</span>
                </div>
              )}
            </div>
          </div>

          <div className="p-8 md:px-12 bg-white border-t border-zinc-100 shrink-0">
            <div className="max-w-4xl mx-auto">
              <form onSubmit={handleQuickReply} className="flex flex-col md:flex-row gap-4">
                <input 
                  type="text"
                  value={replyContent}
                  onChange={e => setReplyContent(e.target.value)}
                  placeholder="Escreva sua interação ou resposta para este chamado..."
                  className="flex-1 px-8 py-5 bg-zinc-50 border-2 border-transparent rounded-xl font-bold text-fg-muted focus:bg-white focus:border-accent transition-all outline-none"
                />
                <button 
                  type="submit"
                  disabled={!replyContent.trim() || replying}
                  className="px-10 py-5 bg-accent text-on-accent rounded-xl font-semibold text-xs hover:bg-accent-hover transition-all shadow-card active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3"
                >
                  {replying ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
                  {replying ? 'Enviando...' : 'Responder'}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
      `}</style>
    </div>
  )
}
