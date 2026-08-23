import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { getGlobalConfig } from "@/lib/data-fetching"

export const metadata = {
  title: 'Áxis - Painel'
}

export const dynamic = 'force-dynamic'
export const revalidate = 0
import { 
  Users, 
  BookOpen, 
  GraduationCap, 
  FileText, 
  TrendingUp,
  Award,
  Scissors,
  MessageSquare,
  Shield,
  ChevronRight,
  Bell,
  Megaphone,
  Info,
  ArrowRight,
  Database,
  AlertTriangle,
  Fingerprint,
  History,
  Monitor,
  ClipboardList,
  FileWarning,
  UserPlus
} from "lucide-react"
import Link from "next/link"
import TeacherTipsModal from "@/components/TeacherTipsModal"

import { Session } from "next-auth"

import { unstable_cache } from "next/cache"

const getCachedStaticStatsManagement = unstable_cache(
  async (currentYear: number) => {
    const [turmasCount, disciplinasCount, estudantesCount, novasQuestoesCount] = await Promise.all([
      prisma.turma.count({ where: { anoLetivo: currentYear } }),
      prisma.disciplina.count({ where: { turma: { anoLetivo: currentYear } } }),
      prisma.estudante.count({ where: { turma: { anoLetivo: currentYear } } }),
      prisma.questao.count({
        where: { createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } }
      })
    ])
    return { turmasCount, disciplinasCount, estudantesCount, novasQuestoesCount }
  },
  ['dashboard-static-stats-management-v2'],
  { revalidate: 300 }
)

const getCachedAnnouncementsManagement = unstable_cache(
  async () => {
    return await prisma.message.findMany({
      where: { 
        category: 'COMUNICADO',
        OR: [
          { isGlobal: true },
          { receiverId: null },
          { receiverId: 'GROUP_STAFF' },
          { receiverId: 'GROUP_TEACHERS' },
          { receiverId: 'GROUP_DIRECAO' }
        ]
      },
      orderBy: { createdAt: 'desc' },
      take: 2,
      include: { sender: { select: { name: true } } }
    })
  },
  ['dashboard-announcements-management-v2'],
  { revalidate: 300 }
)

const getCachedAnnouncementsTeacher = unstable_cache(
  async () => {
    return await prisma.message.findMany({
      where: { 
        category: 'COMUNICADO',
        OR: [
          { isGlobal: true },
          { receiverId: null },
          { receiverId: 'GROUP_TEACHERS' }
        ]
      },
      orderBy: { createdAt: 'desc' },
      take: 2,
      include: { sender: { select: { name: true } } }
    })
  },
  ['dashboard-announcements-teacher-v2'],
  { revalidate: 300 }
)

async function getDashboardStats(session: Session) {
  const isManagement = session.user.isSuperuser || session.user.isDirecao

  if (isManagement) {
    const config = await getGlobalConfig(session.user.escolaId)
    const currentYear = config?.anoLetivoAtual || new Date().getFullYear()

    // Buscas cacheadas (5 min) para otimizar Vercel Fluid CPU
    const staticStats = await getCachedStaticStatsManagement(currentYear)
    const announcements = await getCachedAnnouncementsManagement()

    // Buscas em tempo real (Notas, Adesão e Recuperação)
    const [notasCount, disciplinasComNotasCount, recuperacaoCount] = await Promise.all([
      prisma.notaFinal.count({ where: { disciplina: { turma: { anoLetivo: currentYear } } } }),
      prisma.disciplina.count({
        where: {
          turma: { anoLetivo: currentYear },
          notas: { some: {} }
        }
      }),
      prisma.estudante.count({
        where: {
          turma: { anoLetivo: currentYear },
          notas: {
            some: { status: 'RECUPERACAO' }
          }
        }
      })
    ])

    const adesaoValue = staticStats.disciplinasCount > 0 ? (disciplinasComNotasCount / staticStats.disciplinasCount) * 100 : 0

    return {
      turmas: staticStats.turmasCount,
      disciplinas: staticStats.disciplinasCount,
      estudantes: staticStats.estudantesCount,
      notas: notasCount,
      adesao: adesaoValue.toFixed(1),
      novasQuestoes: staticStats.novasQuestoesCount,
      recuperacao: recuperacaoCount,
      announcements
    }
  }

  // Estatísticas personalizadas para Professor
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      disciplinasPermitidas: {
        select: {
          id: true,
          turmaId: true
        }
      }
    }
  })

  const disciplinasIds = user?.disciplinasPermitidas.map((d: any) => d.id) || []
  const turmasIds = Array.from(new Set(user?.disciplinasPermitidas.map((d: any) => d.turmaId) || []))

  const [estudantesCount, notasCount, announcements] = await Promise.all([
    prisma.estudante.count({
      where: { turmaId: { in: turmasIds } }
    }),
    prisma.notaFinal.count({
      where: { disciplinaId: { in: disciplinasIds } }
    }),
    getCachedAnnouncementsTeacher()
  ])

  return {
    turmas: turmasIds.length,
    disciplinas: disciplinasIds.length,
    estudantes: estudantesCount,
    notas: notasCount,
    announcements
  }
}

export default async function DashboardPage() {
  const session = await auth()
  
  if (!session) {
    redirect("/login")
  }

  const stats = await getDashboardStats(session)

  const supportTips = [
    {
      title: "Suporte e Ajuda",
      description: "Olá! Caso encontre qualquer dificuldade ou problema técnico ao navegar pelo sistema, utilize a seção de 'Mensagens' para entrar em contato diretamente com a equipe de suporte.",
      icon: <MessageSquare className="w-10 h-10 text-slate-700" />,
      color: "bg-slate-700"
    }
  ]

  const allCards = [
    {
      title: session.user.isSuperuser || session.user.isDirecao ? "Total de Turmas" : "Minhas Turmas",
      value: stats.turmas,
      icon: Users,
      color: "from-slate-500 to-slate-700",
      href: "/dashboard/turmas",
      visible: true
    },
    {
      title: session.user.isSuperuser || session.user.isDirecao ? "Disciplinas" : "Minhas Disciplinas",
      value: stats.disciplinas,
      icon: BookOpen,
      color: "from-purple-500 to-purple-600",
      href: session.user.isSuperuser || session.user.isDirecao ? "/dashboard/disciplinas" : "/dashboard/notas",
      visible: true
    },
    {
      title: "Estudantes",
      value: stats.estudantes,
      icon: GraduationCap,
      color: "from-emerald-500 to-emerald-600",
      href: "/dashboard/estudantes",
      visible: session.user.isSuperuser || session.user.isDirecao
    },
    {
      title: "Notas Lançadas",
      value: stats.notas,
      icon: FileText,
      color: "from-amber-500 to-amber-600",
      href: "/dashboard/notas",
      visible: true
    }
  ]

  const cards = allCards.filter(c => c.visible)

  const allQuickActions = [
    {
      title: "Lançar Notas",
      description: "Lançar notas finais por turma",
      icon: Award,
      href: "/dashboard/notas",
      color: "bg-slate-700 hover:bg-slate-800",
      visible: session.user.isStaff || session.user.isSuperuser
    },
    {
      title: "Recuperação Final",
      description: "Registrar notas de recuperação",
      icon: TrendingUp,
      href: "/dashboard/notas/recuperacao",
      color: "bg-purple-600 hover:bg-purple-700",
      visible: session.user.isStaff || session.user.isSuperuser
    },
    {
      title: "Resultados",
      description: "Visualizar desempenho por unidade",
      icon: Users,
      href: "/dashboard/resultados",
      color: "bg-slate-600 hover:bg-slate-700",
      visible: session.user.isDirecao || session.user.isSuperuser
    },
    {
      title: "Ocorrências",
      description: "Livro de registro escolar",
      icon: FileWarning,
      href: "/dashboard/ocorrencias",
      color: "bg-rose-600 hover:bg-rose-700",
      visible: session.user.isDirecao || session.user.isSuperuser
    },
    {
      title: "Conselho de Classe",
      description: "Definir situação de alunos em recuperação",
      icon: Award,
      href: "/dashboard/conselho-classe",
      color: "bg-pink-600 hover:bg-pink-700",
      visible: session.user.isDirecao || session.user.isSuperuser
    },
    {
      title: session.user.isSuperuser || session.user.isDirecao ? "Gerenciar Turmas" : "Minhas Turmas",
      description: session.user.isSuperuser || session.user.isDirecao ? "Visualizar e organizar turmas" : "Visualizar turmas e disciplinas",
      icon: Users,
      href: "/dashboard/turmas",
      color: "bg-emerald-600 hover:bg-emerald-700",
      visible: session.user.isDirecao || session.user.isSuperuser || session.user.isStaff
    },
    {
      title: "Gerenciar Estudantes",
      description: "Cadastro e dados dos alunos",
      icon: GraduationCap,
      href: "/dashboard/estudantes",
      color: "bg-orange-600 hover:bg-orange-700",
      visible: session.user.isDirecao || session.user.isSuperuser
    },
    {
      title: "Gerador de Provas",
      description: "Criar avaliações e histórico",
      icon: Scissors,
      href: "/dashboard/provas",
      color: "bg-slate-800 hover:bg-blue-800",
      visible: session.user.isDirecao || session.user.isSuperuser
    },
    {
      title: "Planos de Ensino",
      description: "Cronogramas e conteúdos quinzenais",
      icon: ClipboardList,
      href: "/dashboard/planos",
      color: "bg-emerald-700 hover:bg-emerald-800",
      visible: session.user.isStaff || session.user.isDirecao || session.user.isSuperuser
    },
    {
      title: "Reserva de Labs",
      description: "Agendar laboratórios",
      icon: Monitor,
      href: "/dashboard/laboratorios",
      color: "bg-blue-600 hover:bg-blue-700",
      visible: true
    },
    {
      title: "Mensagens",
      description: "Comunicados e avisos",
      icon: MessageSquare,
      href: "/dashboard/mensagens",
      color: "bg-slate-500 hover:bg-slate-600",
      visible: true
    },
    {
      title: "Auditoria",
      description: "Logs de alterações",
      icon: History,
      href: "/dashboard/auditoria",
      color: "bg-slate-900 hover:bg-slate-800",
      visible: session.user.isSuperuser
    },
    {
      title: "Aluno Ausente?",
      description: "Reportar estudante fora da lista",
      icon: UserPlus,
      href: "/dashboard/reportar-estudante",
      color: "bg-indigo-600 hover:bg-indigo-700",
      visible: true
    }
  ]

  const quickActions = allQuickActions.filter(a => a.visible)

  return (
    <div className="max-w-7xl mx-auto space-y-10 pb-12 animate-in fade-in duration-500">
      <TeacherTipsModal 
        storageKey="seen_support_popup_v1"
        title="Dica de Suporte"
        tips={supportTips}
      />

      {/* Dynamic Greeting Section - Highlighted & Elegant */}
      <section className="relative overflow-hidden bg-gradient-to-br from-blue-900 to-blue-800 border-none rounded-3xl p-8 shadow-lg">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/20 rounded-full blur-3xl -mr-32 -mt-32"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-blue-400/10 rounded-full blur-2xl -ml-24 -mb-24"></div>
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-blue-200 text-[10px] font-medium uppercase tracking-[0.2em] mb-1">
              <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse"></div>
              <span>Painel de Controle Áxis - CETEP/LNAB</span>
            </div>
            <h1 className="text-3xl md:text-5xl font-bold text-white tracking-tight">
              Olá, <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-200 to-white">{session.user.name?.split(' ')[0]}</span>.
            </h1>
            <p className="text-blue-100 text-base md:text-lg font-medium leading-relaxed max-w-xl">
              Seu ambiente de gestão acadêmica está pronto. <span className="text-white font-medium">Confira os novos comunicados</span> e as métricas atualizadas.
            </p>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
             <div className="px-5 py-3 bg-white/10 border border-white/10 rounded-2xl flex items-center gap-3 shadow-sm backdrop-blur-md">
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                  <Bell className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-[10px] font-medium text-blue-200 uppercase leading-none mb-1">Ano Letivo</p>
                  <p className="text-sm font-medium text-white">Áxis 2026</p>
                </div>
             </div>
             
             <div className="px-5 py-3 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center gap-3 shadow-sm backdrop-blur-md">
                <div className="w-2.5 h-2.5 bg-emerald-400 rounded-full animate-pulse"></div>
                <div>
                  <p className="text-[10px] font-medium text-emerald-300 uppercase leading-none mb-1">Sistemas</p>
                  <p className="text-sm font-medium text-emerald-50">Online</p>
                </div>
             </div>
          </div>
        </div>
      </section>

      {/* System Highlights Bar - Visible only for Management */}
      {(session.user.isSuperuser || session.user.isDirecao) && (
        <section className="bg-slate-50 border border-slate-300 rounded-[2rem] p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 divide-y md:divide-y-0 md:divide-x divide-slate-300">
            <div className="flex items-center gap-4 px-4 py-2">
              <div className="w-12 h-12 rounded-2xl bg-white border border-slate-300 flex items-center justify-center text-slate-700 shadow-sm shrink-0">
                 <FileText className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-[10px] font-medium text-slate-700 uppercase tracking-widest">Adesão de Notas</p>
                  <span className="text-[10px] font-medium text-slate-800">{stats.adesao}%</span>
                </div>
                <div className="h-1.5 w-full bg-slate-300 rounded-full overflow-hidden">
                  <div className="h-full bg-slate-500 rounded-full transition-all duration-1000" style={{ width: `${stats.adesao}%` }}></div>
                </div>
                <p className="text-[9px] text-slate-500 font-medium mt-1 truncate">
                  Disciplinas com lançamentos
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4 px-4 py-2">
              <div className="w-12 h-12 rounded-2xl bg-white border border-slate-300 flex items-center justify-center text-emerald-600 shadow-sm shrink-0">
                 <Database className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-medium text-emerald-600 uppercase tracking-widest mb-0.5">Banco de Questões</p>
                <p className="text-xs font-medium text-slate-800 truncate">+{stats.novasQuestoes} novas questões</p>
                <p className="text-[9px] text-slate-600 font-medium whitespace-nowrap">Criadas nos últimos 7 dias</p>
              </div>
            </div>

            <div className="flex items-center gap-4 px-4 py-2">
              <div className="w-12 h-12 rounded-2xl bg-white border border-slate-300 flex items-center justify-center text-rose-600 shadow-sm shrink-0">
                 <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-medium text-rose-600 uppercase tracking-widest mb-0.5">Recuperação</p>
                <p className="text-xs font-medium text-slate-800 truncate">{stats.recuperacao} Alunos Pendentes</p>
                <p className="text-[9px] text-rose-600 font-medium whitespace-nowrap flex items-center gap-1">
                  <span className="w-1 h-1 bg-rose-500 rounded-full"></span>
                  Atenção necessária
                </p>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Comunicados Gerais - Above Metrics */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Megaphone className="w-4 h-4 text-slate-700" />
            <h3 className="text-xs font-medium text-slate-400 uppercase tracking-[0.2em]">Comunicados Gerais</h3>
          </div>
          <div className="h-px bg-slate-300 flex-1 mx-6"></div>
          <Link href="/dashboard/mensagens" className="text-[10px] font-medium text-slate-700 uppercase tracking-widest hover:underline">Ver Todos</Link>
        </div>

        <div className="space-y-6">
           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {stats.announcements && stats.announcements.length > 0 ? (
              stats.announcements.map((msg: any) => (
                <div key={msg.id} className="bg-white border-2 border-slate-200 p-6 rounded-[2rem] group hover:border-slate-500/20 hover:shadow-xl hover:shadow-slate-500/5 transition-all duration-500 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-slate-500/5 rounded-full blur-3xl -mr-16 -mt-16 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  
                  <div className="flex items-start gap-5 relative z-10">
                    <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center shrink-0 shadow-sm group-hover:bg-slate-700 group-hover:text-white transition-all duration-500">
                      <Info className="w-6 h-6 text-slate-700 group-hover:text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-base font-medium text-slate-800 truncate group-hover:text-slate-700 transition-colors uppercase tracking-tight">{msg.subject}</h4>
                        <span className="text-[10px] font-medium text-slate-400 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-full whitespace-nowrap">
                          {new Date(msg.createdAt).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-sm text-slate-600 line-clamp-2 leading-relaxed mb-4 font-medium italic opacity-80">
                        "{msg.content.replace(/<[^>]*>?/gm, '')}"
                      </p>
                      <div className="flex items-center justify-between mt-auto pt-4 border-t border-slate-50">
                         <div className="flex items-center gap-2">
                           <div className="w-6 h-6 rounded-lg bg-slate-900 flex items-center justify-center text-[10px] font-medium text-white">
                             {msg.sender.name?.charAt(0)}
                           </div>
                           <span className="text-[11px] text-slate-400 font-medium tracking-tight">Postado por <span className="text-slate-800">{msg.sender.name}</span></span>
                         </div>
                         <Link href={`/dashboard/mensagens`} className="text-[10px] font-medium text-slate-700 uppercase tracking-widest hover:translate-x-1 transition-transform flex items-center gap-1">
                           Ler Tudo <ChevronRight size={12} />
                         </Link>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="md:col-span-2 p-12 text-center bg-slate-50 border-2 border-dashed border-slate-300 rounded-3xl">
                <Megaphone className="w-10 h-10 text-slate-300 mx-auto mb-4 opacity-50" />
                <p className="text-sm font-medium text-slate-400 uppercase tracking-widest">Nenhum comunicado recente no sistema</p>
              </div>
            )}
           </div>
        </div>
      </div>

      {/* Metrics Separator */}
      <div className="flex items-center justify-between pt-4">
        <h3 className="text-xs font-medium text-slate-400 uppercase tracking-[0.2em]">Métricas do Sistema</h3>
        <div className="h-px bg-slate-300 flex-1 mx-6"></div>
      </div>

      {/* Stats Grid - Symmetric Columns */}
      <div className={`grid grid-cols-1 md:grid-cols-2 ${session.user.isSuperuser || session.user.isDirecao ? 'lg:grid-cols-4' : 'lg:grid-cols-3'} gap-6`}>
        {cards.map((card) => {
          const Icon = card.icon
          return (
            <Link
              key={card.title}
              href={card.href}
              className="group bg-white border border-slate-300 p-5 rounded-2xl shadow-sm hover:shadow-md hover:border-slate-300 transition-all duration-300"
            >
              <div className="flex items-start justify-between">
                <div className="space-y-3">
                  <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">{card.title}</span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-medium text-slate-800 tracking-tight">{card.value}</span>
                  </div>
                </div>
                <div className={`p-2.5 rounded-xl bg-slate-50 text-slate-400 group-hover:bg-slate-100 group-hover:text-slate-700 transition-colors shadow-sm`}>
                  <Icon size={18} strokeWidth={2.5} />
                </div>
              </div>
            </Link>
          )
        })}
      </div>

      {/* Main Content Sections */}
      <div className="space-y-12">
        {/* Operations Hub - Symmetric Tiles */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-medium text-slate-400 uppercase tracking-[0.2em]">Centro de Operações</h3>
            <div className="h-px bg-slate-300 flex-1 mx-6"></div>
          </div>
          
          <div className={`grid grid-cols-1 sm:grid-cols-2 ${session.user.isSuperuser || session.user.isDirecao ? 'lg:grid-cols-4' : 'lg:grid-cols-3'} gap-4`}>
            {quickActions.map((action) => {
              const Icon = action.icon
              return (
                <Link
                  key={action.title}
                  href={action.href}
                  className="group flex items-center gap-4 p-5 bg-white border border-slate-300 rounded-3xl hover:border-blue-300 hover:shadow-lg transition-all active:scale-[0.98]"
                >
                  <div className={`w-12 h-12 ${action.color} rounded-2xl flex items-center justify-center shadow-md group-hover:scale-110 transition-transform duration-300 shrink-0`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="text-[13px] font-medium text-slate-900 leading-tight mb-0.5 group-hover:text-slate-700 transition-colors uppercase tracking-tight">{action.title}</h4>
                    <p className="text-[11px] text-slate-400 font-medium truncate">
                      {action.description}
                    </p>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
