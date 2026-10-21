import { can, type RbacUser } from '@/lib/rbac'
import { estadoModulo } from '@/lib/modulos/guarda'
import { estadoPermite } from '@/lib/services/modulos'
import type { ModuloId } from '@/lib/modulos/tipos'
import type { PermissoesFichaEstudante, PermissoesFichaTurma } from './abas'

async function moduloLivre(escolaId: string, modulo: ModuloId, user: RbacUser) {
  return estadoPermite(await estadoModulo(escolaId, modulo, user), 'leitura')
}

/** Mesmas regras das telas de destino (guarda de módulo + can()). */
export async function permissoesFichaTurma(user: RbacUser, escolaId: string): Promise<PermissoesFichaTurma> {
  const [dia, res, sec] = await Promise.all([moduloLivre(escolaId, 'DIA', user), moduloLivre(escolaId, 'RES', user), moduloLivre(escolaId, 'SEC', user)])
  return {
    horario: dia && can(user, 'turma.gerenciar'),
    notas: res,
    resultados: res && can(user, 'resultado.ler'),
    frequencia: dia && can(user, 'frequencia.acompanhar'),
    ocorrencias: sec && can(user, 'ocorrencia.gerenciar'),
    historico: false, // etapa 5: aba Histórico (auditoria.ler)
  }
}

export async function permissoesFichaEstudante(user: RbacUser, escolaId: string, temFichaAee: boolean): Promise<PermissoesFichaEstudante> {
  const [not, dia, sec, aee] = await Promise.all([
    moduloLivre(escolaId, 'NOT', user), moduloLivre(escolaId, 'DIA', user), moduloLivre(escolaId, 'SEC', user), moduloLivre(escolaId, 'AEE', user),
  ])
  return {
    editar: can(user, 'estudante.editar'),
    boletim: not,
    frequencia: dia && can(user, 'frequencia.acompanhar'),
    ocorrencias: sec && can(user, 'ocorrencia.gerenciar'),
    aee: aee && temFichaAee && can(user, 'aee.ler'),
    historico: false, // etapa 5: aba Histórico (auditoria.ler)
  }
}
