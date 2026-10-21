import {
  PAPEIS_ATRIBUIVEIS,
  booleanosDosPapeis,
  normalizarPapeis,
  papeisDosBooleanos,
  type CodigoPapel,
} from '@/lib/permissoes'

const BOOLEANOS_DO_FORMULARIO = ['isSuperuser', 'isDirecao', 'isStaff', 'isAEE'] as const

/**
 * Papéis pedidos ao criar/editar um usuário pela tela de Usuários.
 *
 * - `papeis: string[]` (editor de papéis): só os papéis atribuíveis; os que
 *   não são (Estudante, Responsável) e a conta já tem continuam.
 * - sem `papeis`, com os booleanos de antes (cliente antigo): cada booleano
 *   enviado liga/desliga o seu papel; o resto fica como está.
 * - nada disso: `papeis: null` (não mexer).
 */
export function papeisDoPedido(corpo: unknown, atuais: readonly string[]): { papeis: CodigoPapel[] | null } | { erro: string } {
  const c = (corpo ?? {}) as Record<string, unknown>
  const preservados = atuais.filter((p) => !(PAPEIS_ATRIBUIVEIS as string[]).includes(p))

  if (c.papeis !== undefined) {
    if (!Array.isArray(c.papeis) || c.papeis.some((p) => typeof p !== 'string' || !(PAPEIS_ATRIBUIVEIS as string[]).includes(p))) {
      return { erro: 'Papel inválido' }
    }
    return { papeis: normalizarPapeis([...(c.papeis as string[]), ...preservados]) }
  }

  if (BOOLEANOS_DO_FORMULARIO.some((k) => c[k] !== undefined)) {
    const b = booleanosDosPapeis(atuais)
    for (const k of BOOLEANOS_DO_FORMULARIO) if (c[k] !== undefined) b[k] = !!c[k]
    const semBooleano = atuais.filter((p) => !['ADMINISTRADOR', 'DIRECAO', 'PROFESSOR', 'AEE', 'ESTUDANTE'].includes(p))
    return { papeis: normalizarPapeis([...papeisDosBooleanos(b), ...semBooleano]) }
  }

  return { papeis: null }
}
