
"use client"

import { useState, useEffect } from "react"
import { 
  GraduationCap, 
  LogOut, 
  Bell, 
  BookOpen, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle2, 
  Info,
  User as UserIcon,
  Calendar,
  X,
  Home,
  MessageSquare,
  ArrowLeft,
  Code
} from "lucide-react"
import { signOut } from "next-auth/react"
import { analyzeRisk } from "@/lib/risk-analysis"
import { formatarFrequencia } from "@/lib/services/frequencia"
import type { EtapaDaNota } from "@/lib/services/notas"
import MarkdownContent from "@/components/MarkdownContent"

export default function PortalClient({ initialData, user, nomeEscola }: { initialData: any, user: any, nomeEscola: string }) {
  const { estudante, mensagens = [], error, nomesEtapas = [], numUnidades = 3, notaMinimaAprovacao = 5, frequencia = null } = initialData
  const [selectedMessage, setSelectedMessage] = useState<any>(null)
  const [readMessageIds, setReadMessageIds] = useState<Set<string>>(new Set())
  const [isScheduleOpen, setIsScheduleOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<'home' | 'messages' | 'grades' | 'profile'>('home')

  useEffect(() => {
    if (user?.id) {
      const saved = localStorage.getItem(`portal_read_msgs_${user.id}`)
      if (saved) {
        try {
          setReadMessageIds(new Set(JSON.parse(saved)))
        } catch (e) {
          console.error("Failed to parse read messages", e)
        }
      }
    }
  }, [user?.id])

  const markAsRead = (id: string) => {
    if (!user?.id) return
    const newSet = new Set(readMessageIds)
    newSet.add(id)
    setReadMessageIds(newSet)
    localStorage.setItem(`portal_read_msgs_${user.id}`, JSON.stringify(Array.from(newSet)))
  }

  const isMessageNew = (msg: any) => !readMessageIds.has(msg.id)
  const hasUnreadMessages = mensagens.some((m: any) => isMessageNew(m))

  if (error) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-xl shadow-card border border-zinc-200 max-w-md text-center">
          <AlertTriangle className="w-16 h-16 text-danger-fg mx-auto mb-4" />
          <h1 className="text-2xl font-semibold text-fg mb-2">Ops! Algo deu errado</h1>
          <p className="text-fg-muted mb-6">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="px-6 py-3 bg-zinc-900 text-white rounded-lg font-semibold text-[10px] uppercase tracking-widest hover:bg-zinc-800 transition-all"
          >
            Tentar Novamente
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col font-sans text-fg overflow-x-hidden">
      {/* Mobile-First Header */}
      <header className="bg-white/80 backdrop-blur-xl border-b border-zinc-100 px-6 py-4 sticky top-0 md:top-auto z-50 flex justify-between items-center transition-all">
        <div className="flex items-center gap-3">
          {activeTab !== 'home' && (
            <button 
              onClick={() => setActiveTab('home')}
              className="p-2 hover:bg-zinc-100 rounded-xl transition-all md:flex hidden mr-2 group"
              title="Voltar para o Início"
            >
              <ArrowLeft className="w-5 h-5 text-fg-subtle group-hover:text-accent-fg transition-colors" />
            </button>
          )}
          <div className="w-20 h-10 flex items-center justify-center">
            <img src="/images/logo_axis.png" alt="Áxis" className="w-full h-full object-contain" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-fg tracking-tight leading-none uppercase">
               {activeTab === 'home' ? '' : 
                activeTab === 'messages' ? 'Mensagens' :
                activeTab === 'grades' ? 'Boletim' : 'Meu Perfil'}
            </h1>
            <span className="text-[9px] font-semibold text-accent-fg uppercase tracking-widest opacity-70">
              {activeTab === 'home' ? `Olá, ${estudante.nome.split(' ')[0]} • ${nomeEscola}` : `Portal do Aluno • ${nomeEscola}`}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
            <div className="relative group cursor-pointer" onClick={() => setActiveTab('messages')}>
                <Bell className="w-5 h-5 text-fg-subtle group-hover:text-accent-fg transition-colors" />
                {hasUnreadMessages && (
                    <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-danger rounded-full border-2 border-white animate-pulse" />
                )}
            </div>
            <div 
              className="w-8 h-8 rounded-full bg-zinc-100 border border-zinc-200 flex items-center justify-center cursor-pointer overflow-hidden"
              onClick={() => setActiveTab('profile')}
            >
                <UserIcon className="w-4 h-4 text-fg-subtle" />
            </div>
        </div>
      </header>

      <main className="flex-1 pb-24 md:pb-8 pt-4 md:pt-8 px-4 md:px-8 max-w-7xl mx-auto w-full animate-fade-in">
        
        {/* Tab: Home */}
        {activeTab === 'home' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
               {/* Status Acadêmico */}
               <div className="bg-accent rounded-xl p-8 text-on-accent shadow-card relative overflow-hidden group flex flex-col justify-between min-h-[200px]">
                 <div className="relative z-10">
                   <h2 className="text-2xl font-semibold mb-1 tracking-tight">Status Atual</h2>
                   <p className="text-on-accent/80 font-medium text-xs mb-6 opacity-80">Seu resumo acadêmico.</p>
                   
                   <div className="space-y-3">
                     <div className="bg-white/10 backdrop-blur-md rounded-lg px-5 py-3 border border-white/20">
                       <span className="text-[9px] font-semibold uppercase tracking-widest block opacity-70 mb-0.5 text-on-accent/80">Minha Turma</span>
                       <p className="text-xl font-semibold tracking-tight leading-none">{estudante.turma.nome}</p>
                     </div>
                     
                     <div 
                       className="bg-white/10 backdrop-blur-md rounded-lg px-5 py-4 border border-white/20 hover:bg-white/20 transition-colors flex justify-between items-center group/btn cursor-pointer"
                       onClick={() => setIsScheduleOpen(true)}
                     >
                       <div>
                         <span className="text-[9px] font-semibold uppercase tracking-widest block opacity-70 text-on-accent/80">Horário de Aulas</span>
                         <p className="text-xs font-semibold mt-1 flex items-center gap-1 group-hover/btn:translate-x-1 transition-transform">
                           Ver Quadro →
                         </p>
                       </div>
                       <Calendar className="text-white/80 w-6 h-6 group-hover/btn:scale-110 transition-transform" />
                     </div>
                   </div>
                 </div>
                 <div className="absolute -bottom-4 -right-4 w-40 h-40 opacity-10 rotate-12 group-hover:scale-110 transition-transform duration-700 pointer-events-none">
                    <img src="/images/logo_axis_branco.png" alt="" className="w-full h-full object-contain" />
                 </div>
               </div>

               {/* Quick Messages Pre-view */}
               <div className="md:col-span-2 bg-white rounded-xl p-6 shadow-card border border-zinc-100">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-warning-subtle rounded-xl flex items-center justify-center text-warning-fg">
                           <Bell className="w-4 h-4" />
                        </div>
                        <h3 className="text-sm font-semibold text-fg uppercase tracking-tight">Recentes</h3>
                    </div>
                    <button 
                        onClick={() => setActiveTab('messages')}
                        className="text-[10px] font-semibold text-accent-fg uppercase tracking-widest hover:underline"
                    >
                        Ver Todas
                    </button>
                  </div>
                  <div className="space-y-3">
                     {mensagens.slice(0, 2).map((msg: any) => (
                        <div 
                           key={msg.id}
                           onClick={() => { setSelectedMessage(msg); markAsRead(msg.id); }}
                           className="p-4 rounded-lg bg-zinc-50 border border-zinc-100 hover:border-accent/25 transition-all cursor-pointer group active:scale-[0.98]"
                        >
                           <h4 className="text-xs font-semibold text-fg group-hover:text-accent-fg transition-colors truncate">{msg.subject}</h4>
                           <p className="text-[11px] text-fg-subtle line-clamp-1 mt-1 font-medium">{msg.content}</p>
                        </div>
                     ))}
                  </div>
               </div>
            </div>

            {/* Banner de Risco/Boas-vindas Moblie */}
            <div className="bg-white p-6 rounded-xl border border-zinc-100 shadow-sm flex items-center gap-4">
                <div className="w-12 h-12 bg-accent-subtle rounded-lg flex items-center justify-center shrink-0">
                    <TrendingUp className="text-accent-fg w-6 h-6" />
                </div>
                <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-semibold text-fg leading-none mb-1">Análise de Desempenho</h4>
                    <p className="text-[11px] text-fg-subtle font-medium truncate">Confira suas médias e alertas de risco no boletim.</p>
                </div>
                <button 
                    onClick={() => setActiveTab('grades')}
                    className="w-10 h-10 bg-zinc-900 text-white rounded-xl flex items-center justify-center shadow-card active:scale-90 transition-all"
                >
                    →
                </button>
            </div>
          </div>
        )}

        {/* Tab: Messages */}
        {activeTab === 'messages' && (
          <div className="space-y-4 animate-slide-up">
            <div className="hidden md:flex mb-6">
               <button 
                 onClick={() => setActiveTab('home')}
                 className="flex items-center gap-2 px-4 py-2 bg-white border border-zinc-200 rounded-xl text-xs font-semibold uppercase tracking-widest text-fg-subtle hover:text-accent-fg hover:border-accent/25 transition-all shadow-sm"
               >
                 <ArrowLeft size={14} /> Voltar ao Início
               </button>
            </div>
            <h2 className="text-2xl font-semibold text-fg px-2">Comunicados</h2>
            <div className="space-y-3 pb-4">
               {mensagens.length > 0 ? mensagens.map((msg: any) => (
                <div 
                  key={msg.id} 
                  onClick={() => {
                    setSelectedMessage(msg)
                    markAsRead(msg.id)
                  }}
                  className={`p-5 rounded-xl border-2 transition-all active:scale-[0.98] relative ${
                    isMessageNew(msg) 
                      ? 'bg-accent-subtle border-accent/25 shadow-card ' 
                      : 'bg-white border-zinc-100'
                  }`}
                >
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-[9px] font-semibold text-fg-subtle uppercase tracking-widest">
                       {new Date(msg.createdAt).toLocaleDateString()}
                    </span>
                    {isMessageNew(msg) && (
                        <span className="px-2 py-0.5 bg-accent text-on-accent text-[8px] font-semibold uppercase tracking-widest rounded-full">Nova</span>
                    )}
                  </div>
                  <h4 className="text-sm font-semibold text-fg mb-1 leading-tight">{msg.subject}</h4>
                  <p className="text-xs font-medium text-fg-subtle line-clamp-2 leading-relaxed">{msg.content}</p>
                </div>
               )) : (
                <div className="text-center py-20 opacity-50">
                    <Bell className="w-12 h-12 mx-auto mb-3 text-zinc-300" />
                    <p className="text-xs font-semibold uppercase tracking-widest">Nada por aqui</p>
                </div>
               )}
            </div>
          </div>
        )}

        {/* Tab: Grades */}
        {activeTab === 'grades' && (
          <div className="space-y-6 animate-slide-up">
            <div className="hidden md:flex mb-2">
               <button 
                 onClick={() => setActiveTab('home')}
                 className="flex items-center gap-2 px-4 py-2 bg-white border border-zinc-200 rounded-xl text-xs font-semibold uppercase tracking-widest text-fg-subtle hover:text-accent-fg hover:border-accent/25 transition-all shadow-sm"
               >
                 <ArrowLeft size={14} /> Voltar ao Início
               </button>
            </div>
            {/* Resumo de Desempenho */}
             <div className="bg-white rounded-xl shadow-card border border-zinc-100 overflow-hidden">
                <div className="px-6 py-5 bg-zinc-50/50 border-b border-zinc-100 flex items-center gap-3">
                   <BookOpen className="text-accent-fg w-5 h-5" />
                   <h3 className="text-sm font-semibold text-fg uppercase tracking-tight">Boletim Escolar</h3>
                   {frequencia && (
                     <span className={`ml-auto text-xs font-semibold ${frequencia.geral.percentual !== null && frequencia.geral.percentual < frequencia.minimo ? 'text-danger-fg' : 'text-fg-subtle'}`}>
                       Frequência {formatarFrequencia(frequencia.geral.percentual)} · {frequencia.geral.faltas} {frequencia.geral.faltas === 1 ? 'falta' : 'faltas'} · mínimo {frequencia.minimo}%
                     </span>
                   )}
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-white border-b border-zinc-100 whitespace-nowrap">
                        <th className="px-6 py-4 text-[9px] font-semibold text-fg-subtle uppercase tracking-widest">Disciplina</th>
                        {nomesEtapas.map((nome: string, i: number) => (
                          <th key={i} title={nome} className="px-4 py-4 text-[9px] font-semibold text-fg-subtle uppercase tracking-widest text-center">U{i + 1}</th>
                        ))}
                        <th className="px-4 py-4 text-[9px] font-semibold text-fg-subtle uppercase tracking-widest text-center">Méd</th>
                        {frequencia && <th className="px-4 py-4 text-[9px] font-semibold text-fg-subtle uppercase tracking-widest text-center">Freq</th>}
                        <th className="px-6 py-4 text-[9px] font-semibold text-fg-subtle uppercase tracking-widest text-center">Risco</th>
                      </tr>
                    </thead>
              <tbody className="divide-y divide-zinc-50">
                {estudante.notas.map((nota: any) => {
                  const risk = analyzeRisk(nota.etapas.map((e: EtapaDaNota) => e.nota), numUnidades, notaMinimaAprovacao)
                  return (
                    <tr key={nota.id} className="hover:bg-zinc-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <p className="text-sm font-semibold text-fg">{nota.disciplina.nome}</p>
                      </td>
                      {nota.etapas.map((etapa: EtapaDaNota, i: number) => (
                        <td key={i} className="px-4 py-4 text-center">
                          <span className={`text-xs font-semibold ${etapa.nota === null ? 'text-zinc-300' : etapa.nota >= notaMinimaAprovacao ? 'text-accent-fg' : 'text-danger-fg'}`}>
                            {etapa.nota !== null ? etapa.nota.toFixed(1).replace('.', ',') : '-'}
                          </span>
                        </td>
                      ))}
                      <td className="px-4 py-4 text-center">
                        <div className={`inline-flex px-3 py-1 rounded-lg font-semibold text-[10px] ${nota.nota >= notaMinimaAprovacao ?'bg-success-subtle text-success-fg border border-success-line' : 'bg-danger-subtle text-danger-fg border border-danger-line'}`}>
                          {nota.nota.toFixed(1).replace('.', ',')}
                        </div>
                      </td>
                      {frequencia && (() => {
                        const f = frequencia.porDisciplina[nota.disciplinaId]
                        return (
                          <td className="px-4 py-4 text-center" title={f ? `${f.faltas} faltas em ${f.aulas} aulas` : undefined}>
                            <span className={`text-xs font-semibold ${f?.percentual != null && f.percentual < frequencia.minimo ? 'text-danger-fg' : 'text-fg-muted'}`}>
                              {formatarFrequencia(f?.percentual ?? null)}
                            </span>
                          </td>
                        )
                      })()}
                      <td className="px-6 py-4">
                         <div className={`
                            flex items-center gap-2 px-3 py-1.5 rounded-xl border
                            ${risk.level === 'CRITICAL' ? 'bg-danger-subtle border-danger-line' : 
                              risk.level === 'HIGH' ? 'bg-warning-subtle border-warning-line' :
                              risk.level === 'MEDIUM' ? 'bg-warning-subtle border-warning-line' :
                              risk.level === 'LOW' ? 'bg-success-subtle border-success-line' : 'bg-zinc-50 border-zinc-100'}
                          `}>
                            {risk.level === 'CRITICAL' && <AlertTriangle size={12} className="text-danger-fg animate-pulse" />}
                            {risk.level === 'HIGH' && <TrendingUp size={12} className="text-warning-fg" />}
                            {risk.level === 'MEDIUM' && <Info size={12} className="text-warning-fg" />}
                            {risk.level === 'LOW' && <CheckCircle2 size={12} className="text-success-fg" />}
                            
                            <span className={`text-[9px] font-semibold uppercase tracking-tight ${risk.color}`}>
                               {risk.level === 'NONE' ? 'Sem dados' : 
                                risk.level === 'CRITICAL' ? 'Risco Crítico' :
                                risk.level === 'HIGH' ? 'Risco Alto' :
                                risk.level === 'MEDIUM' ? 'Atenção' : 'Estável'}
                            </span>
                         </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    )}

        {/* Tab: Profile */}
        {activeTab === 'profile' && (
           <div className="max-w-md mx-auto space-y-8 animate-slide-up">
            <div className="hidden md:flex mb-2">
               <button 
                 onClick={() => setActiveTab('home')}
                 className="flex items-center gap-2 px-4 py-2 bg-white border border-zinc-200 rounded-xl text-xs font-semibold uppercase tracking-widest text-fg-subtle hover:text-accent-fg hover:border-accent/25 transition-all shadow-sm"
               >
                 <ArrowLeft size={14} /> Voltar ao Início
               </button>
            </div>
            <div className="text-center space-y-4">
              <div className="bg-white rounded-xl p-8 border border-zinc-100 shadow-card text-center">
                  <div className="w-24 h-24 bg-accent-subtle rounded-xl flex items-center justify-center mx-auto mb-4 border-4 border-white shadow-card">
                      <UserIcon className="w-10 h-10 text-accent-fg" />
                  </div>
                  <h2 className="text-2xl font-semibold text-fg">{estudante.nome}</h2>
                  <p className="text-xs font-semibold text-fg-subtle uppercase tracking-widest mt-1">Matrícula: {estudante.matricula}</p>
                  
                  <div className="grid grid-cols-2 gap-4 mt-8 text-left">
                      <div className="bg-zinc-50 p-4 rounded-lg">
                          <span className="text-[9px] font-semibold text-fg-subtle uppercase tracking-widest block mb-1">Turma</span>
                          <p className="text-xs font-semibold text-fg-muted">{estudante.turma.nome}</p>
                      </div>
                      <div className="bg-zinc-50 p-4 rounded-lg">
                          <span className="text-[9px] font-semibold text-fg-subtle uppercase tracking-widest block mb-1">Turno</span>
                          <p className="text-xs font-semibold text-fg-muted">{estudante.turma.turno || '---'}</p>
                      </div>
                  </div>

                  <button 
                    onClick={() => signOut({ callbackUrl: "/login" })}
                    className="w-full mt-10 flex items-center justify-center gap-3 px-6 py-4 bg-danger-subtle text-danger-fg rounded-xl font-semibold text-xs uppercase tracking-widest hover:bg-danger-subtle transition-all active:scale-95"
                  >
                    <LogOut className="w-5 h-5" />
                    Sair do Sistema
                  </button>
              </div>
           </div>
          </div>
        )}

        {/* Footer Info */}
        <div className="flex flex-col gap-6 items-center text-center p-8 pb-12">
          <div className="flex flex-col items-center gap-2">
            <span className="text-[10px] font-semibold text-fg-subtle uppercase tracking-[0.2em]">Áxis v2.0 • {estudante.turma.anoLetivo}</span>
            <span className="text-[9px] font-semibold text-zinc-300 uppercase tracking-widest">
              © {new Date().getFullYear()} {nomeEscola}
            </span>
          </div>

          <div className="w-12 h-px bg-zinc-200 opacity-50" />

          <div className="flex flex-col items-center gap-2">
            <div className="flex items-center gap-2 py-1.5 px-4 bg-white border border-zinc-100 rounded-full shadow-sm">
              <Code size={12} className="text-accent-fg" />
              <span className="text-[9px] font-semibold text-fg-subtle uppercase tracking-tight">Desenvolvido por</span>
              <span className="text-[9px] font-semibold text-fg uppercase tracking-tight">Andressa Mirella</span>
            </div>
            <span className="text-[8px] font-semibold text-zinc-300 uppercase tracking-widest">Todos os direitos reservados</span>
          </div>
        </div>

      </main>

      {/* FIXED MOBILE BAR */}
      <nav className="md:hidden fixed bottom-6 left-6 right-6 bg-zinc-900/95 backdrop-blur-xl border border-white/10 rounded-xl py-3 px-6 shadow-overlay z-[60] flex justify-between items-center animate-slide-up">
        <button 
            onClick={() => setActiveTab('home')}
            className={`flex flex-col items-center gap-1 transition-all ${activeTab === 'home' ? 'text-white scale-110' : 'text-fg-subtle'}`}
        >
            <Home className="w-6 h-6" />
            <span className="text-[8px] font-semibold uppercase tracking-tighter">Início</span>
        </button>
        <button 
            onClick={() => setActiveTab('messages')}
            className={`flex flex-col items-center gap-1 transition-all relative ${activeTab === 'messages' ? 'text-white scale-110' : 'text-fg-subtle'}`}
        >
            <MessageSquare className="w-6 h-6" />
            <span className="text-[8px] font-semibold uppercase tracking-tighter">Avisos</span>
            {hasUnreadMessages && <span className="absolute top-0 right-0 w-2 h-2 bg-danger rounded-full border border-zinc-900" />}
        </button>
        <div className="w-16 h-16 bg-white rounded-full -mt-10 border-4 border-zinc-900 shadow-card flex items-center justify-center p-1.5">
             <img src="/images/logo_axis.png" alt="Áxis" className="w-full h-full object-contain" />
        </div>
        <button 
            onClick={() => setActiveTab('grades')}
            className={`flex flex-col items-center gap-1 transition-all ${activeTab === 'grades' ? 'text-white scale-110' : 'text-fg-subtle'}`}
        >
            <BookOpen className="w-6 h-6" />
            <span className="text-[8px] font-semibold uppercase tracking-tighter">Notas</span>
        </button>
        <button 
            onClick={() => setActiveTab('profile')}
            className={`flex flex-col items-center gap-1 transition-all ${activeTab === 'profile' ? 'text-white scale-110' : 'text-fg-subtle'}`}
        >
            <UserIcon className="w-6 h-6" />
            <span className="text-[8px] font-semibold uppercase tracking-tighter">Eu</span>
        </button>
      </nav>

      {/* Message Modal */}
      {selectedMessage && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
          <div 
            className="absolute inset-0 bg-zinc-900/40 backdrop-blur-sm transition-opacity" 
            onClick={() => setSelectedMessage(null)}
          />
          <div className="bg-white rounded-xl shadow-card relative w-full max-w-2xl overflow-hidden animate-pop-in">
            <div className="bg-zinc-50 border-b border-zinc-100 p-6 md:p-8 flex justify-between items-start">
              <div className="pr-10">
                <span className="inline-block px-3 py-1 bg-accent-subtle text-accent-fg rounded-lg text-[10px] font-semibold uppercase tracking-widest mb-3">
                  Comunicado
                </span>
                <h3 className="text-xl md:text-2xl font-semibold text-fg leading-tight">
                  {selectedMessage.subject}
                </h3>
                <div className="flex items-center gap-3 mt-3 text-fg-subtle text-xs font-semibold uppercase tracking-wide">
                  <span>{new Date(selectedMessage.createdAt).toLocaleDateString()} às {new Date(selectedMessage.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  {selectedMessage.sender?.name && (
                    <>
                      <span className="w-1 h-1 rounded-full bg-zinc-300" />
                      <span>Por: {selectedMessage.sender.name}</span>
                    </>
                  )}
                </div>
              </div>
              <button 
                onClick={() => setSelectedMessage(null)}
                className="p-2 hover:bg-zinc-200 rounded-xl transition-colors text-fg-subtle hover:text-fg-muted"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-6 md:p-8 max-h-[60vh] overflow-y-auto custom-scrollbar">
              <div className="prose prose-slate max-w-none text-fg-muted font-medium leading-relaxed whitespace-pre-wrap">
                <MarkdownContent content={selectedMessage.content} />
              </div>
            </div>

            <div className="bg-zinc-50 border-t border-zinc-100 p-4 md:p-6 flex justify-end">
              <button 
                onClick={() => setSelectedMessage(null)}
                className="flex items-center gap-2 px-6 py-3 bg-zinc-900 text-white rounded-xl font-semibold text-[10px] uppercase tracking-widest hover:bg-zinc-800 transition-all shadow-card hover:shadow-card active:scale-95"
              >
                <ArrowLeft className="w-4 h-4" />
                Voltar
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Schedule Modal */}
      {isScheduleOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
          <div 
            className="absolute inset-0 bg-zinc-900/60 backdrop-blur-sm transition-opacity" 
            onClick={() => setIsScheduleOpen(false)}
          />
          <div className="bg-white rounded-xl shadow-card relative w-full max-w-5xl overflow-hidden animate-pop-in flex flex-col max-h-[90vh]">
            <div className="bg-zinc-50 border-b border-zinc-200 p-6 flex justify-between items-center shrink-0">
               <div>
                 <h3 className="text-xl font-semibold text-fg flex items-center gap-2">
                   <Calendar className="w-6 h-6 text-accent-fg" />
                   Horário de Aulas
                 </h3>
                 <p className="text-xs font-semibold text-fg-subtle uppercase tracking-widest mt-1">
                   {estudante.turma.nome}
                 </p>
               </div>
               <button 
                 onClick={() => setIsScheduleOpen(false)}
                 className="p-2 hover:bg-zinc-200 rounded-xl transition-colors text-fg-subtle hover:text-fg-muted"
               >
                 <X className="w-6 h-6" />
               </button>
            </div>
            
            <div className="p-6 md:p-8 overflow-auto custom-scrollbar bg-white">
              <div className="min-w-[800px]">
                 <table className="w-full border-collapse">
                   <thead>
                     <tr>
                       <th className="p-3 text-center w-16 bg-zinc-50 rounded-tl-xl border-b border-r border-zinc-200">
                         <span className="text-[10px] font-semibold text-fg-subtle uppercase tracking-widest">Hor</span>
                       </th>
                       {["Seg", "Ter", "Qua", "Qui", "Sex"].map((day, idx) => (
                         <th key={day} className={`p-3 w-[19%] border-b border-zinc-200 bg-zinc-50 ${idx === 4 ? 'rounded-tr-xl' : 'border-r'}`}>
                           <span className="text-xs font-semibold text-accent-fg uppercase tracking-tight block text-center">
                             {day}
                           </span>
                         </th>
                       ))}
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-zinc-100">
                     {[1, 2, 3, 4, 5, 6].map(period => (
                       <tr key={period} className="hover:bg-zinc-50/50 transition-colors">
                         <td className="p-4 text-center border-r border-zinc-100 bg-zinc-50/30 font-semibold text-fg-subtle text-sm">
                           {period}º
                         </td>
                         {[1, 2, 3, 4, 5].map(day => {
                            const aula = estudante.turma.horarios?.find(
                                (h: any) => h.diaSemana === day && h.horario === period
                            )

                            // Tentar encontrar o professor se não estiver salvo na aula
                            let profName = aula?.professor
                            if (aula && (!profName || profName.trim() === "")) {
                              const normalizedAulaDisc = aula.disciplina.trim().toLowerCase()
                              const match = estudante.turma.disciplinas?.find((d: any) => 
                                d.nome.trim().toLowerCase() === normalizedAulaDisc
                              )
                              if (match && match.usuariosPermitidos?.length > 0) {
                                profName = match.usuariosPermitidos[0].name || match.usuariosPermitidos[0].username
                              } else {
                                // If no direct match, try to find a similar discipline name
                                const similarMatch = estudante.turma.disciplinas?.find((d: any) => 
                                  normalizedAulaDisc.includes(d.nome.trim().toLowerCase()) || d.nome.trim().toLowerCase().includes(normalizedAulaDisc)
                                );
                                if (similarMatch && similarMatch.usuariosPermitidos?.length > 0) {
                                  profName = similarMatch.usuariosPermitidos[0].name || similarMatch.usuariosPermitidos[0].username;
                                }
                              }
                            }

                            return (
                             <td key={day} className="p-2 border-r border-zinc-100 last:border-0 align-top h-16">
                                {aula ? (
                                    <div className="flex flex-col items-center justify-center h-full text-center p-1 rounded-xl hover:bg-accent-subtle transition-colors">
                                        <p className="text-xs font-semibold text-fg leading-tight mb-1">{aula.disciplina}</p>
                                        {profName && profName.trim() !== "" && (
                                            <p className="text-[9px] font-semibold text-fg-subtle uppercase tracking-wider">{profName}</p>
                                        )}
                                    </div>
                                ) : (
                                    <div className="h-full flex items-center justify-center">
                                        <span className="text-[10px] font-semibold text-zinc-300 tracking-tighter">--------</span>
                                    </div>
                                )}
                             </td>
                            )
                         })}
                       </tr>
                     ))}
                   </tbody>
                 </table>
              </div>
            </div>
            
            <div className="p-4 bg-zinc-50 border-t border-zinc-200 flex justify-end shrink-0">
               <button 
                 onClick={() => setIsScheduleOpen(false)}
                 className="flex items-center gap-2 px-6 py-2.5 bg-zinc-900 text-white rounded-xl font-semibold text-[10px] uppercase tracking-widest hover:bg-zinc-800 transition-all shadow-card active:scale-95"
               >
                 <ArrowLeft className="w-4 h-4" />
                 Voltar
               </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
