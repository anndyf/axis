import { BookOpen, BookOpenCheck, CalendarDays, ClipboardCheck, FileText, GraduationCap, Home, UserX, type LucideIcon } from 'lucide-react'
import { modulosVisiveis } from '@/lib/modules'
import { can, type RbacUser } from '@/lib/rbac'
import { visoesDoUsuario } from '@/lib/services/painel-visoes'

/**
 * Barra de navegação inferior do celular (abaixo de md) - funções puras.
 *
 * O perfil sai das visões do painel (painel-visoes.ts): quem tem a visão de
 * administração usa a barra da gestão; só pedagogia, a do AEE; só professor,
 * a do professor. Cada item só entra se o usuário puder abrir o módulo de
 * origem (modulosVisiveis, mesma regra do menu lateral), então a barra nunca
 * mostra mais do que o menu. O resto dos módulos vai para o painel "Mais".
 */
export type PerfilNavegacao = 'professor' | 'gestao' | 'aee' | 'portal' | 'outro'

export interface ItemNavegacao {
  id: string
  rotulo: string
  href: string
  icone: LucideIcon
}

export interface NavegacaoMobile {
  perfil: PerfilNavegacao
  /** itens fixos da barra (o "Mais" é desenhado à parte, sempre por último) */
  barra: ItemNavegacao[]
  /** módulos que o usuário pode abrir e não estão na barra */
  mais: ItemNavegacao[]
}

type Alvo = { modulo: string; id?: string; rotulo: string; href?: string; icone?: LucideIcon }

const BARRAS: Record<'professor' | 'gestao' | 'aee' | 'outro', Alvo[]> = {
  professor: [
    { modulo: 'dashboard', rotulo: 'Início', icone: Home },
    { modulo: 'chamada', rotulo: 'Chamada', icone: ClipboardCheck },
    { modulo: 'notas', rotulo: 'Notas', icone: FileText },
    // O diário é parte do módulo de chamada (mesma permissão)
    { modulo: 'chamada', id: 'diario', rotulo: 'Diário', href: '/dashboard/chamada/diario', icone: BookOpenCheck },
  ],
  gestao: [
    { modulo: 'dashboard', rotulo: 'Início', icone: Home },
    { modulo: 'turmas', rotulo: 'Turmas' },
    { modulo: 'frequencia', rotulo: 'Frequência', icone: UserX },
    { modulo: 'resultados', rotulo: 'Resultados' },
  ],
  aee: [
    { modulo: 'dashboard', rotulo: 'Início', icone: Home },
    // O AEE não abre o cadastro geral de estudantes: "Estudantes" é a lista do atendimento
    { modulo: 'aee', rotulo: 'Estudantes', icone: GraduationCap },
    { modulo: 'mensagens', rotulo: 'Mensagens' },
  ],
  outro: [
    { modulo: 'dashboard', rotulo: 'Início', icone: Home },
    { modulo: 'mensagens', rotulo: 'Mensagens' },
  ],
}

/** Abas do portal do aluno (a tela é uma só, /portal, com ?aba=). */
export const ABAS_PORTAL = ['inicio', 'boletim', 'frequencia', 'horario'] as const
export type AbaPortal = (typeof ABAS_PORTAL)[number] | 'avisos' | 'perfil'

const BARRA_PORTAL: ItemNavegacao[] = [
  { id: 'inicio', rotulo: 'Início', href: '/portal', icone: Home },
  { id: 'boletim', rotulo: 'Boletim', href: '/portal?aba=boletim', icone: BookOpen },
  { id: 'frequencia', rotulo: 'Frequência', href: '/portal?aba=frequencia', icone: UserX },
  { id: 'horario', rotulo: 'Horário', href: '/portal?aba=horario', icone: CalendarDays },
]

export function perfilNavegacao(user: RbacUser): PerfilNavegacao {
  if (can(user, 'portal.acessar')) return 'portal'
  const visoes = visoesDoUsuario(user)
  if (visoes.includes('administracao')) return 'gestao'
  if (visoes.includes('professor')) return 'professor'
  if (visoes.includes('pedagogia')) return 'aee'
  return 'outro'
}

export function navegacaoMobile(user: RbacUser, modulosAtivos: string[]): NavegacaoMobile {
  const perfil = perfilNavegacao(user)
  if (perfil === 'portal') return { perfil, barra: BARRA_PORTAL, mais: [] }

  const visiveis = modulosVisiveis(user, modulosAtivos)
  const porId = new Map(visiveis.map((m) => [m.id, m]))
  const barra: ItemNavegacao[] = []
  for (const alvo of BARRAS[perfil]) {
    const m = porId.get(alvo.modulo)
    if (!m) continue
    barra.push({ id: alvo.id ?? m.id, rotulo: alvo.rotulo, href: alvo.href ?? m.rota, icone: alvo.icone ?? m.icone })
  }
  const naBarra = new Set(barra.map((i) => i.href))
  const mais = visiveis
    .filter((m) => !naBarra.has(m.rota))
    .map((m) => ({ id: m.id, rotulo: m.nome, href: m.rota, icone: m.icone }))
  return { perfil, barra, mais }
}

/**
 * Item ativo para a rota: o de href mais longo que é prefixo da rota
 * (o Início só na rota exata). Assim /dashboard/chamada/diario marca
 * "Diário" e não "Chamada", e /dashboard/notas/recuperacao marca o item da
 * recuperação quando ele existir.
 */
export function itemAtivo(pathname: string, itens: { id: string; href: string }[]): string | null {
  let melhor: { id: string; tamanho: number } | null = null
  for (const item of itens) {
    const rota = item.href.split('?')[0]
    const casa = rota === '/dashboard' || rota === '/portal' ? pathname === rota : pathname === rota || pathname.startsWith(`${rota}/`)
    if (casa && (!melhor || rota.length > melhor.tamanho)) melhor = { id: item.id, tamanho: rota.length }
  }
  return melhor?.id ?? null
}

