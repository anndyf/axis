import { prisma } from '@/lib/prisma'
import type { RbacUser } from '@/lib/rbac'
import { visoesDoUsuario, type VisaoPainel } from './painel-visoes'

/**
 * Visões do painel que o usuário realmente tem: a de professor só entra no
 * seletor de quem tem disciplinas no ano letivo (sempre na escola da sessão).
 * Usado pelo painel inicial e pelo seletor de visão da barra superior.
 */
export async function visoesDisponiveis(user: RbacUser & { id: string }, escolaId: string, anoLetivo: number): Promise<VisaoPainel[]> {
  let visoes = visoesDoUsuario(user)
  if (visoes.length > 1 && visoes.includes('professor')) {
    const temDisciplinas = await prisma.disciplina.count({ where: { usuariosPermitidos: { some: { id: user.id } }, turma: { escolaId, anoLetivo } } })
    if (!temDisciplinas) visoes = visoes.filter((v) => v !== 'professor')
  }
  return visoes
}
