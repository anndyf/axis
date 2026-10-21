import { can, type RbacUser } from '@/lib/rbac'
import { estadoModulo } from '@/lib/modulos/guarda'
import { estadoPermite } from '@/lib/services/modulos'
import type { ModuloId } from '@/lib/modulos/tipos'
import { podeVerHistorico } from '@/lib/services/historico-regra'
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
    historico: false, // a turma não grava auditoria hoje (nenhum logAudit de TURMA)
  }
}

export async function permissoesFichaEstudante(user: RbacUser, escolaId: string, temFichaAee: boolean): Promise<PermissoesFichaEstudante> {
  const [not, aee] = await Promise.all([moduloLivre(escolaId, 'NOT', user), moduloLivre(escolaId, 'AEE', user)])
  return {
    editar: can(user, 'estudante.editar'),
    boletim: not,
    aee: aee && temFichaAee && can(user, 'aee.ler'),
    historico: podeVerHistorico(user),
  }
}
