"use client"

import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { 
  LayoutDashboard, 
  Users, 
  BookOpen, 
  GraduationCap, 
  FileText, 
  TrendingUp, 
  Shield, 
  Menu,
  X,
  LogOut,
  Award,
  Database,
  Scissors,
  Settings,
  MessageSquare,
  ChevronRight,
  FlaskConical,
  PanelLeftClose,
  PanelLeftOpen,
  LayoutGrid,
  ClipboardList,
  FileWarning,
  Accessibility,
  Target
} from "lucide-react"
import { useState, useEffect } from "react"
import { signOut } from "next-auth/react"
import { useSessionTimer } from "@/contexts/SessionTimerContext"
import { Clock } from "lucide-react"
import { getUnreadCount } from "@/app/dashboard/mensagens/actions"
import { getPendingUsersCount } from "@/app/dashboard/usuarios/actions"
import { MODULOS } from "@/lib/modules"

interface User {
  name?: string | null
  email?: string | null
  isSuperuser: boolean
  isDirecao: boolean
  isStaff: boolean
  isAEE?: boolean
}

const GRUPOS_ORDENADOS = ["Início", "Gestão Acadêmica", "Diário e Avaliações", "Ferramentas", "Configurações"]

export default function DashboardSidebar({
  user,
  modulosAtivos = [],
  anoLetivo,
  isCollapsed,
  toggleCollapse
}: {
  user: User,
  modulosAtivos?: string[],
  anoLetivo?: number,
  isCollapsed: boolean,
  toggleCollapse: () => void
}) {
  const pathname = usePathname()
  const [isMobileOpen, setIsMobileOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const [pendingUsersCount, setPendingUsersCount] = useState(0)
  const { timeLeft } = useSessionTimer()

  useEffect(() => {
    // Busca inicial
    getUnreadCount().then(setUnreadCount)
    getPendingUsersCount().then(setPendingUsersCount)

    // Polling simples a cada 30s
    const interval = setInterval(() => {
      getUnreadCount().then(setUnreadCount)
      getPendingUsersCount().then(setPendingUsersCount)
    }, 30000)
    
    return () => clearInterval(interval)
  }, [])

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60)
    const s = Math.floor(seconds % 60)
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  // Estrutura de Categorias e Links, derivada do catálogo central de módulos
  // (src/lib/modules.ts) — cada item aparece se o papel do usuário tem
  // permissão E (sem exigência de plano OU o módulo está ativo pra escola).
  const badgesPorModulo: Record<string, number> = {
    mensagens: unreadCount,
    usuarios: pendingUsersCount,
  }

  const menuGroups = GRUPOS_ORDENADOS.map((title) => ({
    title,
    links: MODULOS
      .filter((m) => m.grupo === title)
      .filter((m) => m.permissao(user as any))
      .filter((m) => !m.planoMinimo || modulosAtivos.includes(m.id))
      .map((m) => ({
        name: m.nome,
        href: m.rota,
        icon: m.icone,
        badge: badgesPorModulo[m.id],
      }))
  })).filter((group) => group.links.length > 0)

  const isActive = (href: string) => {
    if (href === "/dashboard") {
      return pathname === href
    }
    
    // Para "Lançar Notas", queremos que seja ativo em /dashboard/notas/[id] e na raiz /dashboard/notas
    // Mas NÃO queremos que seja ativo em /dashboard/notas/recuperacao
    if (href === "/dashboard/notas") {
      return pathname === "/dashboard/notas" || (pathname.startsWith("/dashboard/notas/") && !pathname.startsWith("/dashboard/notas/recuperacao"))
    }

    return pathname.startsWith(href)
  }

  return (
    <>
      {/* Mobile Top Bar */}
      <div className="md:hidden fixed top-0 inset-x-0 h-16 bg-white border-b border-gray-200 z-50 flex items-center justify-between px-4 print:hidden shadow-sm">
        <div className="flex items-center gap-3">
          <button 
            className="p-2 -ml-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            onClick={() => setIsMobileOpen(!isMobileOpen)}
          >
            {isMobileOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
          
          <div className="flex items-center gap-2">
            <Image src="/images/logo_axis_azul.png" alt="Áxis" width={80} height={32} className="h-8 w-auto object-contain" />
            {anoLetivo && (
              <span className="text-[8px] font-black text-blue-600 bg-blue-50 border border-blue-100 px-1 py-0.5 rounded leading-none">
                {anoLetivo}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Overlay for mobile */}
      {isMobileOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-black/50 z-40 backdrop-blur-sm"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar Container */}
      <aside className={`
        fixed top-0 left-0 z-40 h-screen
        ${isCollapsed ? "w-20" : "w-64"}
        bg-slate-900 text-white
        transition-all duration-300 ease-in-out
        ${isMobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
        flex flex-col
        shadow-2xl border-r border-slate-800
        print:hidden
      `}>
        {/* Logo Area */}
        <div className={`flex flex-col items-center justify-center h-24 border-b border-slate-800 bg-slate-950 relative`}>
          <div className="flex items-center justify-center w-full px-4">
            {isCollapsed ? (
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-900/40">
                <GraduationCap className="w-5 h-5 text-white" />
              </div>
            ) : (
              <div className="flex flex-col items-center gap-1">
                <Image src="/images/logo_axis_branco.png" alt="Áxis" width={120} height={40} className="h-10 w-auto object-contain" />
                {anoLetivo && (
                  <span className="text-[9px] font-black text-blue-400 bg-blue-500/10 border border-blue-500/20 px-1.5 py-0.5 rounded-md">
                    {anoLetivo}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Toggle Button Desktop */}
          <button 
            onClick={toggleCollapse}
            className="hidden md:flex absolute -right-3 top-9 w-6 h-6 bg-slate-800 border border-slate-700 rounded-full items-center justify-center text-slate-400 hover:text-white hover:border-blue-500 transition-all z-50 shadow-lg"
          >
            {isCollapsed ? <PanelLeftOpen size={12} /> : <PanelLeftClose size={12} />}
          </button>
        </div>

        {/* User Info / Link to Profile */}
        <Link 
          href="/dashboard/perfil"
          className={`p-4 border-b border-slate-800 bg-slate-900/50 hover:bg-slate-800/80 transition-colors group block ${isCollapsed ? 'px-2 text-center' : ''}`}
        >
          <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'space-x-3'} mb-1`}>
            <div className={`w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-blue-400 font-bold border border-slate-700 group-hover:border-blue-500 transition-colors shrink-0`}>
              {user.name?.charAt(0).toUpperCase() || "U"}
            </div>
            {!isCollapsed && (
              <>
                <div className="flex-1 overflow-hidden">
                  <p className="text-sm font-medium text-slate-100 truncate group-hover:text-blue-400 transition-colors">{user.name}</p>
                  <p className="text-xs text-slate-500 truncate capitalize">
                    {user.isSuperuser ? "Administrador" : user.isAEE ? "Especialista AEE" : (user.isStaff ? "Professor" : "Gestão Escolar")}
                  </p>
                </div>
                <ChevronRight size={14} className="text-slate-600 group-hover:text-blue-400 transition-colors" />
              </>
            )}
          </div>
        </Link>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-6 space-y-8 overflow-y-auto custom-scrollbar">
          {menuGroups.map((group) => (
            <div key={group.title} className="space-y-1">
              {!isCollapsed && (
                <h3 className="px-4 text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">
                  {group.title}
                </h3>
              )}
              <div className="space-y-1">
                {group.links.map((link: any) => {
                  const Icon = link.icon
                  const active = isActive(link.href)
                  
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      title={isCollapsed ? link.name : undefined}
                      onClick={() => setIsMobileOpen(false)}
                      className={`
                        flex items-center px-4 py-2.5 rounded-xl transition-all duration-200 group relative
                        ${isCollapsed ? 'justify-center px-2' : ''}
                        ${active 
                          ? "bg-blue-600/90 text-white shadow-lg shadow-blue-900/20" 
                          : "text-slate-400 hover:bg-slate-800/50 hover:text-white"
                        }
                      `}
                    >
                      <Icon className={`w-4.5 h-4.5 ${isCollapsed ? '' : 'mr-3'} transition-colors ${active ? "text-white" : "text-slate-500 group-hover:text-white"}`} />
                      {!isCollapsed && <span className="font-medium text-sm">{link.name}</span>}
                      
                      {link.badge !== undefined && link.badge > 0 && (
                        <span className={`
                          bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center
                          ${isCollapsed ? 'absolute -top-1 -right-1' : 'ml-auto'}
                        `}>
                          {link.badge}
                        </span>
                      )}
                      {active && link.badge === undefined && !isCollapsed && (
                        <div className="ml-auto w-1.5 h-1.5 rounded-full bg-white shadow-sm" />
                      )}
                    </Link>
                  )
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-800 bg-slate-950">


          <button 
            type="button"
            onClick={() => signOut({ redirectTo: '/login' })}
            className={`flex items-center w-full px-4 py-3 rounded-xl text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition-all duration-200 group ${isCollapsed ? 'justify-center px-2' : ''}`}
            title={isCollapsed ? "Sair do Sistema" : undefined}
          >
            <LogOut className={`w-5 h-5 ${isCollapsed ? '' : 'mr-3'} group-hover:text-red-400`} />
            {!isCollapsed && <span className="font-medium text-sm">Sair do Sistema</span>}
          </button>
          {user.isStaff && !user.isSuperuser && !user.isDirecao && !isCollapsed && (
            <div className="mt-4 mb-2 px-4 py-2 bg-slate-900 border border-slate-800 rounded-lg flex items-center justify-between">
              <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider flex items-center gap-1.5">
                <Clock className="w-3 h-3 text-slate-600" />
                Sessão
              </span>
              <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded border ${
                timeLeft < 300 
                  ? 'text-amber-400 bg-amber-500/10 border-amber-500/20 animate-pulse' 
                  : 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
              }`}>
                {formatTime(timeLeft)}
              </span>
            </div>
          )}


        </div>
      </aside>
    </>
  )
}
