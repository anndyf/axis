/**
 * Perfis e permissões - fonte única.
 *
 * Cada usuário tem uma lista de papéis (User.papeis). As telas perguntam
 * can(user, 'permissao'), nunca os papéis ou os campos is* diretamente.
 *
 * Transição: os campos isSuperuser/isDirecao/isStaff/isAEE ainda existem e
 * correspondem 1:1 a ADMIN/DIRECAO/PROFESSOR/AEE (uma CHECK no banco garante).
 * Sessões antigas, sem papeis, são tratadas derivando os papéis dos campos.
 */

export const PAPEIS = ['ADMIN', 'DIRECAO', 'COORDENACAO', 'PROFESSOR', 'AEE'] as const
export type Papel = (typeof PAPEIS)[number]

/** Do mais alto para o mais baixo: decide o painel inicial. */
const ORDEM: readonly Papel[] = ['ADMIN', 'DIRECAO', 'COORDENACAO', 'AEE', 'PROFESSOR']

export const ROTULO_PAPEL: Record<Papel, string> = {
  ADMIN: 'Administrador',
  DIRECAO: 'Direção',
  COORDENACAO: 'Coordenação pedagógica',
  PROFESSOR: 'Professor',
  AEE: 'Especialista AEE',
}

export type RbacUser = {
  papeis?: readonly string[] | null
  isSuperuser?: boolean
  isDirecao?: boolean
  isStaff?: boolean
  isAEE?: boolean
  isPlatformAdmin?: boolean
}

export type FlagsDePapel = {
  isSuperuser: boolean
  isDirecao: boolean
  isStaff: boolean
  isAEE: boolean
}

/** Lista limpa (sem repetidos nem valores inválidos), na ordem de PAPEIS. */
export function normalizarPapeis(valores: unknown): Papel[] {
  if (!Array.isArray(valores)) return []
  return PAPEIS.filter((p) => valores.includes(p))
}

export function papeisDeFlags(u: Partial<FlagsDePapel>): Papel[] {
  const papeis: Papel[] = []
  if (u.isSuperuser) papeis.push('ADMIN')
  if (u.isDirecao) papeis.push('DIRECAO')
  if (u.isStaff) papeis.push('PROFESSOR')
  if (u.isAEE) papeis.push('AEE')
  return normalizarPapeis(papeis)
}

/** Campos legados a gravar junto com os papéis (exigido pela CHECK do banco). */
export function flagsDePapeis(papeis: readonly Papel[]): FlagsDePapel {
  return {
    isSuperuser: papeis.includes('ADMIN'),
    isDirecao: papeis.includes('DIRECAO'),
    isStaff: papeis.includes('PROFESSOR'),
    isAEE: papeis.includes('AEE'),
  }
}

/**
 * Aplica campos is* vindos de um cliente antigo sobre os papéis atuais:
 * só mexe nos papéis dos campos enviados e preserva os que não têm campo
 * (COORDENACAO).
 */
export function aplicarFlags(atuais: readonly string[], flags: Partial<Record<keyof FlagsDePapel, unknown>>): Papel[] {
  const papeis = new Set(normalizarPapeis(atuais))
  const PAPEL_DO_CAMPO: Record<keyof FlagsDePapel, Papel> = {
    isSuperuser: 'ADMIN', isDirecao: 'DIRECAO', isStaff: 'PROFESSOR', isAEE: 'AEE',
  }
  for (const [campo, papel] of Object.entries(PAPEL_DO_CAMPO) as [keyof FlagsDePapel, Papel][]) {
    const valor = flags[campo]
    if (valor === undefined) continue
    if (valor) papeis.add(papel)
    else papeis.delete(papel)
  }
  return normalizarPapeis([...papeis])
}

/** Dados para prisma.user.create/update: papeis + campos legados coerentes. */
export function dadosDePapeis(valores: unknown) {
  const papeis = normalizarPapeis(valores)
  return { papeis, ...flagsDePapeis(papeis) }
}

/** Papéis do usuário; sessões/linhas sem papeis caem nos campos legados. */
export function papeisDe(user: RbacUser): Papel[] {
  return Array.isArray(user.papeis) ? normalizarPapeis(user.papeis) : papeisDeFlags(user)
}

export function papelPrincipal(user: RbacUser): Papel | null {
  const papeis = papeisDe(user)
  return ORDEM.find((p) => papeis.includes(p)) ?? null
}

/*
 * Ações legadas: mesmas regras de antes, agora calculadas pelos papéis.
 * Migram para as permissões nomeadas abaixo na Fase 3.
 */
type AcaoLegada = 'gestao' | 'staff' | 'superuser' | 'aee' | 'staffPuro'

const LEGADAS: Record<AcaoLegada, (p: Papel[]) => boolean> = {
  gestao: (p) => p.includes('ADMIN') || p.includes('DIRECAO'),
  staff: (p) => p.includes('PROFESSOR') || p.includes('ADMIN') || p.includes('DIRECAO'),
  superuser: (p) => p.includes('ADMIN'),
  aee: (p) => p.includes('DIRECAO') || p.includes('ADMIN') || p.includes('AEE'),
  staffPuro: (p) => p.includes('PROFESSOR') && !p.includes('ADMIN') && !p.includes('DIRECAO'),
}

/*
 * Permissões nomeadas: quem pode o quê. As telas passam a usá-las na Fase 3;
 * até lá só a Coordenação depende delas.
 */
const PERMISSOES = {
  // Leitura pedagógica de todas as turmas: estudantes, turmas, notas, frequência
  verDadosPedagogicos: ['ADMIN', 'DIRECAO', 'COORDENACAO'],
  verRelatorios: ['ADMIN', 'DIRECAO', 'COORDENACAO'],
  gerirOcorrencias: ['ADMIN', 'DIRECAO', 'COORDENACAO'],
  gerirConselho: ['ADMIN', 'DIRECAO', 'COORDENACAO'],
  verAEE: ['ADMIN', 'DIRECAO', 'AEE', 'COORDENACAO'],
  gerirAEE: ['ADMIN', 'DIRECAO', 'AEE'],
  gerirUsuarios: ['ADMIN'],
  configurarEscola: ['ADMIN'],
} as const satisfies Record<string, readonly Papel[]>

export type Permissao = keyof typeof PERMISSOES
export type Acao = AcaoLegada | Permissao

export function can(user: RbacUser, acao: Acao): boolean {
  const papeis = papeisDe(user)
  if (acao in LEGADAS) return LEGADAS[acao as AcaoLegada](papeis)
  const permitidos: readonly Papel[] = PERMISSOES[acao as Permissao]
  return papeis.some((p) => permitidos.includes(p))
}
