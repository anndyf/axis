import { prisma } from "./prisma"

type EntityType = 'NOTA' | 'QUESTAO' | 'USUARIO' | 'TURMA' | 'DISCIPLINA' | 'CONSELHO' | 'PROVA' | 'ESTUDANTE' | 'OCORRENCIA' | 'UNIDADE'

/**
 * Registra uma ação no AuditLog. `created_at` é UTC de verdade (o padrão do
 * Prisma); quem exibe formata em America/Sao_Paulo. Até 21/10/2026 esta
 * função gravava o horário de Brasília "como se fosse UTC"; a migration
 * 20261023120000_audit_logs_utc corrigiu os registros antigos.
 * Falha aqui nunca derruba a operação de quem chama.
 */
export async function logAudit(
  userId: string,
  entityType: EntityType,
  entityId: string,
  action: 'INSERT' | 'UPDATE' | 'DELETE' | 'CREATE',
  details?: any,
  ipAddress?: string
) {
  try {
    await prisma.auditLog.create({
      data: {
        userId,
        entityType,
        entityId,
        action,
        details: details ? JSON.stringify(details) : null,
        ipAddress,
      },
    })
  } catch (error) {
    console.error('CRITICAL: logAudit failed:', error)
  }
}
