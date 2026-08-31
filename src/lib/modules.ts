import {
  LayoutDashboard,
  MessageSquare,
  FlaskConical,
  Users,
  BookOpen,
  GraduationCap,
  FileWarning,
  Accessibility,
  Target,
  FileText,
  TrendingUp,
  ClipboardList,
  Award,
  Database,
  Scissors,
  LayoutGrid,
  Shield,
  Settings,
  DollarSign,
  type LucideIcon,
} from 'lucide-react'
import { PlanoTipo } from '@prisma/client'
import { can, type RbacUser } from '@/lib/rbac'

export type Modulo = {
  id: string
  nome: string
  grupo: string
  icone: LucideIcon
  rota: string
  /** undefined = disponível em todos os planos */
  planoMinimo?: PlanoTipo
  permissao: (user: RbacUser) => boolean
}

export const MODULOS: Modulo[] = [
  { id: 'dashboard', nome: 'Dashboard', grupo: 'Início', icone: LayoutDashboard, rota: '/dashboard', permissao: () => true },
  { id: 'mensagens', nome: 'Mensagens', grupo: 'Início', icone: MessageSquare, rota: '/dashboard/mensagens', permissao: () => true },
  { id: 'laboratorios', nome: 'Reserva de Laboratórios', grupo: 'Início', icone: FlaskConical, rota: '/dashboard/laboratorios', permissao: (u) => !u.isAEE },

  { id: 'turmas', nome: 'Turmas', grupo: 'Gestão Acadêmica', icone: Users, rota: '/dashboard/turmas', permissao: (u) => !u.isAEE && can(u, 'staff') },
  { id: 'disciplinas', nome: 'Disciplinas', grupo: 'Gestão Acadêmica', icone: BookOpen, rota: '/dashboard/disciplinas', permissao: (u) => !u.isAEE && can(u, 'superuser') },
  { id: 'estudantes', nome: 'Estudantes', grupo: 'Gestão Acadêmica', icone: GraduationCap, rota: '/dashboard/estudantes', permissao: (u) => !u.isAEE && can(u, 'gestao') },
  { id: 'ocorrencias', nome: 'Ocorrências', grupo: 'Gestão Acadêmica', icone: FileWarning, rota: '/dashboard/ocorrencias', permissao: (u) => !u.isAEE && can(u, 'gestao') },
  { id: 'aee', nome: 'Atendimento AEE', grupo: 'Gestão Acadêmica', icone: Accessibility, rota: '/dashboard/aee', permissao: (u) => can(u, 'aee') },

  { id: 'simulados', nome: 'Simulados', grupo: 'Diário e Avaliações', icone: Target, rota: '/dashboard/simulados', permissao: (u) => !u.isAEE && can(u, 'staff'), planoMinimo: 'PRO' },
  { id: 'notas', nome: 'Lançar Notas', grupo: 'Diário e Avaliações', icone: FileText, rota: '/dashboard/notas', permissao: (u) => !u.isAEE && (u.isStaff || u.isSuperuser) },
  { id: 'notas-recuperacao', nome: 'Recuperação Final', grupo: 'Diário e Avaliações', icone: TrendingUp, rota: '/dashboard/notas/recuperacao', permissao: (u) => !u.isAEE && (u.isStaff || u.isSuperuser) },
  { id: 'planos-ensino', nome: 'Planos de Ensino', grupo: 'Diário e Avaliações', icone: ClipboardList, rota: '/dashboard/planos', permissao: (u) => !u.isAEE && can(u, 'staff') },
  { id: 'resultados', nome: 'Resultados', grupo: 'Diário e Avaliações', icone: Award, rota: '/dashboard/resultados', permissao: (u) => !u.isAEE && can(u, 'gestao') },
  { id: 'conselho-classe', nome: 'Conselho de Classe', grupo: 'Diário e Avaliações', icone: Users, rota: '/dashboard/conselho-classe', permissao: (u) => !u.isAEE && can(u, 'gestao') },

  { id: 'banco-questoes', nome: 'Banco de Questões', grupo: 'Ferramentas', icone: Database, rota: '/dashboard/questoes', permissao: (u) => !u.isAEE && can(u, 'staff'), planoMinimo: 'PRO' },
  { id: 'provas', nome: 'Gerador de Provas', grupo: 'Ferramentas', icone: Scissors, rota: '/dashboard/provas', permissao: (u) => !u.isAEE && can(u, 'gestao'), planoMinimo: 'PRO' },
  // grupo "Módulos Futuros" fica de fora da navegação (DashboardSidebar só
  // renderiza os grupos em GRUPOS_ORDENADOS) - acessível só por URL direta
  // até haver requisito de produto real para o financeiro (Fase 11).
  { id: 'financeiro', nome: 'Financeiro', grupo: 'Módulos Futuros', icone: DollarSign, rota: '/dashboard/financeiro', permissao: (u) => can(u, 'gestao'), planoMinimo: 'PRO' },

  { id: 'matriz', nome: 'Matriz Curricular', grupo: 'Configurações', icone: LayoutGrid, rota: '/dashboard/matriz', permissao: (u) => !u.isAEE && can(u, 'gestao') },
  { id: 'usuarios', nome: 'Usuários', grupo: 'Configurações', icone: Shield, rota: '/dashboard/usuarios', permissao: (u) => !u.isAEE && can(u, 'superuser') },
  { id: 'configuracoes', nome: 'Configurações', grupo: 'Configurações', icone: Settings, rota: '/dashboard/configuracoes', permissao: (u) => !u.isAEE && can(u, 'superuser') },
]

export const ORDEM_PLANO: Record<PlanoTipo, number> = { BASICO: 0, PRO: 1, ENTERPRISE: 2 }
