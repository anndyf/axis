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
  ClipboardCheck,
  UserX,
  Building2,
  type LucideIcon,
} from 'lucide-react'
import { PlanoTipo } from '@prisma/client'
import { can, type RbacUser } from '@/lib/rbac'
import type { ModuloId } from '@/lib/modulos/tipos'

export type Modulo = {
  id: string
  nome: string
  grupo: string
  icone: LucideIcon
  rota: string
  /** Módulo vendável a que o item pertence (doc. 4.2); PLT = ferramenta da plataforma, não vendida. */
  moduloId: ModuloId | 'PLT'
  /** undefined = disponível em todos os planos */
  planoMinimo?: PlanoTipo
  permissao: (user: RbacUser) => boolean
}

export const MODULOS: Modulo[] = [
  { id: 'dashboard', nome: 'Dashboard', grupo: 'Início', icone: LayoutDashboard, rota: '/dashboard', moduloId: 'NUC', permissao: () => true },
  { id: 'mensagens', nome: 'Mensagens', grupo: 'Início', icone: MessageSquare, rota: '/dashboard/mensagens', moduloId: 'NUC', permissao: () => true },
  { id: 'laboratorios', nome: 'Reserva de Laboratórios', grupo: 'Início', icone: FlaskConical, rota: '/dashboard/laboratorios', moduloId: 'REC', permissao: (u) => !can(u, 'aee.atender') },

  { id: 'turmas', nome: 'Turmas', grupo: 'Gestão Acadêmica', icone: Users, rota: '/dashboard/turmas', moduloId: 'NUC', permissao: (u) => !can(u, 'aee.atender') && can(u, 'turma.ler') },
  { id: 'disciplinas', nome: 'Disciplinas', grupo: 'Gestão Acadêmica', icone: BookOpen, rota: '/dashboard/disciplinas', moduloId: 'NUC', permissao: (u) => !can(u, 'aee.atender') && can(u, 'disciplina.gerenciar') },
  { id: 'estudantes', nome: 'Estudantes', grupo: 'Gestão Acadêmica', icone: GraduationCap, rota: '/dashboard/estudantes', moduloId: 'NUC', permissao: (u) => !can(u, 'aee.atender') && can(u, 'estudante.ler') },
  { id: 'ocorrencias', nome: 'Ocorrências', grupo: 'Gestão Acadêmica', icone: FileWarning, rota: '/dashboard/ocorrencias', moduloId: 'SEC', permissao: (u) => !can(u, 'aee.atender') && can(u, 'ocorrencia.gerenciar') },
  { id: 'aee', nome: 'Atendimento AEE', grupo: 'Gestão Acadêmica', icone: Accessibility, rota: '/dashboard/aee', moduloId: 'AEE', permissao: (u) => can(u, 'aee.ler') },

  { id: 'simulados', nome: 'Simulados', grupo: 'Diário e Avaliações', icone: Target, rota: '/dashboard/simulados', moduloId: 'PRV', permissao: (u) => !can(u, 'aee.atender') && can(u, 'simulado.ler'), planoMinimo: 'PRO' },
  { id: 'chamada', nome: 'Chamada e Diário', grupo: 'Diário e Avaliações', icone: ClipboardCheck, rota: '/dashboard/chamada', moduloId: 'DIA', permissao: (u) => !can(u, 'aee.atender') && can(u, 'frequencia.lancar') },
  { id: 'notas', nome: 'Lançar Notas', grupo: 'Diário e Avaliações', icone: FileText, rota: '/dashboard/notas', moduloId: 'NOT', permissao: (u) => !can(u, 'aee.atender') && can(u, 'nota.tela') },
  { id: 'notas-recuperacao', nome: 'Recuperação Final', grupo: 'Diário e Avaliações', icone: TrendingUp, rota: '/dashboard/notas/recuperacao', moduloId: 'NOT', permissao: (u) => !can(u, 'aee.atender') && can(u, 'nota.tela') },
  { id: 'planos-ensino', nome: 'Planos de Ensino', grupo: 'Diário e Avaliações', icone: ClipboardList, rota: '/dashboard/planos', moduloId: 'PLA', permissao: (u) => !can(u, 'aee.atender') && can(u, 'plano.ler') },
  { id: 'resultados', nome: 'Resultados', grupo: 'Diário e Avaliações', icone: Award, rota: '/dashboard/resultados', moduloId: 'RES', permissao: (u) => !can(u, 'aee.atender') && can(u, 'resultado.ler') },
  { id: 'frequencia', nome: 'Frequência', grupo: 'Diário e Avaliações', icone: UserX, rota: '/dashboard/frequencia', moduloId: 'DIA', permissao: (u) => !can(u, 'aee.atender') && can(u, 'frequencia.acompanhar') },
  { id: 'conselho-classe', nome: 'Conselho de Classe', grupo: 'Diário e Avaliações', icone: Users, rota: '/dashboard/conselho-classe', moduloId: 'RES', permissao: (u) => !can(u, 'aee.atender') && can(u, 'conselho.decidir') },

  { id: 'banco-questoes', nome: 'Banco de Questões', grupo: 'Ferramentas', icone: Database, rota: '/dashboard/questoes', moduloId: 'QST', permissao: (u) => !can(u, 'aee.atender') && can(u, 'questao.usar'), planoMinimo: 'PRO' },
  { id: 'provas', nome: 'Gerador de Provas', grupo: 'Ferramentas', icone: Scissors, rota: '/dashboard/provas', moduloId: 'PRV', permissao: (u) => !can(u, 'aee.atender') && can(u, 'prova.gerenciar'), planoMinimo: 'PRO' },
  // grupo "Módulos Futuros" fica de fora da navegação (DashboardSidebar só
  // renderiza os grupos em GRUPOS_ORDENADOS) - acessível só por URL direta
  // até haver requisito de produto real para o financeiro (Fase 11).
  { id: 'financeiro', nome: 'Financeiro', grupo: 'Módulos Futuros', icone: DollarSign, rota: '/dashboard/financeiro', moduloId: 'FIN', permissao: (u) => can(u, 'financeiro.gerenciar'), planoMinimo: 'PRO' },

  { id: 'matriz', nome: 'Matriz Curricular', grupo: 'Configurações', icone: LayoutGrid, rota: '/dashboard/matriz', moduloId: 'NUC', permissao: (u) => !can(u, 'aee.atender') && can(u, 'matriz.gerenciar') },
  { id: 'usuarios', nome: 'Usuários', grupo: 'Configurações', icone: Shield, rota: '/dashboard/usuarios', moduloId: 'NUC', permissao: (u) => !can(u, 'aee.atender') && can(u, 'usuario.gerenciar') },
  { id: 'configuracoes', nome: 'Configurações', grupo: 'Configurações', icone: Settings, rota: '/dashboard/configuracoes', moduloId: 'NUC', permissao: (u) => !can(u, 'aee.atender') && can(u, 'configuracao.editar') },

  // Ferramenta da dona da plataforma (gestão cross-tenant de escolas), não é
  // um módulo pago da escola - não passa por planoMinimo/EscolaModulo.
  { id: 'plataforma', nome: 'Plataforma', grupo: 'Plataforma', icone: Building2, rota: '/dashboard/plataforma', moduloId: 'PLT', permissao: (u) => !!u.isPlatformAdmin },
]

export const ORDEM_PLANO: Record<PlanoTipo, number> = { BASICO: 0, PRO: 1, ENTERPRISE: 2 }

/**
 * Limite de usuários STAFF (professor/direção/admin) por plano - seção 5 do
 * plano comercial. Não conta usuários de portal (aluno/responsável), esses
 * não têm limite aqui.
 */
export const LIMITE_USUARIOS: Record<PlanoTipo, number> = {
  BASICO: 15,
  PRO: 50,
  ENTERPRISE: Infinity,
}

/** Módulos que o usuário vê (menu lateral e paleta Ctrl+K): permissão do papel E, se exigir plano, módulo ativo na escola. */
export function modulosVisiveis(user: RbacUser, modulosAtivos: string[]): Modulo[] {
  return MODULOS
    .filter((m) => m.permissao(user))
    .filter((m) => !m.planoMinimo || modulosAtivos.includes(m.id))
}
