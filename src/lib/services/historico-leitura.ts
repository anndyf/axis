import { prisma } from '@/lib/prisma'

/**
 * Histórico de uma ficha (aba "Histórico"): entradas do AuditLog e do
 * NotaFinalAudit daquela entidade. Só para quem já pode ver a auditoria
 * (`auditoria.ler`, a mesma regra de /dashboard/auditoria) — a página
 * confere. Sempre na escola da sessão: a entidade é buscada pela escola e o
 * AuditLog só entra se o autor for da mesma escola (o AuditLog não grava a
 * escola; é o mesmo filtro da tela de auditoria). Do autor, só o nome.
 *
 * Fuso: o logAudit grava o horário de Brasília "como se fosse UTC" (ver
 * src/lib/audit.ts), então essas entradas são formatadas em UTC; o
 * NotaFinalAudit grava UTC de verdade e é formatado em America/Sao_Paulo.
 */
export interface EntradaHistorico {
  id: string
  quando: Date
  fuso: 'UTC' | 'America/Sao_Paulo'
  autor: string | null
  acao: string
  assunto: string
  detalhe: string | null
}

const ACAO: Record<string, string> = { CREATE: 'Criação', INSERT: 'Criação', UPDATE: 'Alteração', DELETE: 'Exclusão' }
const ASSUNTO: Record<string, string> = { ESTUDANTE: 'Cadastro do estudante', NOTA: 'Nota', USUARIO: 'Conta do usuário' }

function detalheDoLog(entityType: string, details: string | null): string | null {
  if (!details) return null
  try {
    const d = JSON.parse(details)
    if (entityType === 'NOTA') {
      const partes = [d.disciplina, d.status ?? d.atual?.st].filter(Boolean)
      return partes.length ? partes.join(' · ') : null
    }
    if (entityType === 'USUARIO') {
      if (Array.isArray(d.papeis)) return `Papéis: ${d.papeis.join(', ')}`
      if (Array.isArray(d.fields) && d.fields.length) return `Campos: ${d.fields.join(', ')}`
      return null
    }
    if (entityType === 'ESTUDANTE') return d.nome ? `Nome: ${d.nome}` : null
  } catch { /* detalhe livre */ }
  return null
}

function deLog(l: { id: string; createdAt: Date; action: string; entityType: string; details: string | null; user: { name: string | null; username: string } | null }): EntradaHistorico {
  return {
    id: `a-${l.id}`,
    quando: l.createdAt,
    fuso: 'UTC',
    autor: l.user ? (l.user.name || l.user.username) : null,
    acao: ACAO[l.action] ?? l.action,
    assunto: ASSUNTO[l.entityType] ?? l.entityType,
    detalhe: detalheDoLog(l.entityType, l.details),
  }
}

const fmtNota = (n: number | null) => (n === null || n === undefined ? '—' : n.toFixed(1).replace('.', ','))

/** Histórico do estudante (cadastro e notas). null se não existir na escola. */
export async function historicoDoEstudante(escolaId: string, matricula: string, limite = 200): Promise<EntradaHistorico[] | null> {
  const estudante = await prisma.estudante.findUnique({ where: { escolaId_matricula: { escolaId, matricula } }, select: { id: true } })
  if (!estudante) return null
  const notas = await prisma.notaFinal.findMany({ where: { estudanteId: estudante.id, estudante: { escolaId } }, select: { id: true } })
  const notaIds = notas.map((n) => n.id)

  const [logs, auditNotas] = await Promise.all([
    prisma.auditLog.findMany({
      where: {
        user: { escolaId },
        OR: [{ entityType: 'ESTUDANTE', entityId: matricula }, ...(notaIds.length ? [{ entityType: 'NOTA', entityId: { in: notaIds } }] : [])],
      },
      orderBy: { createdAt: 'desc' },
      take: limite,
      select: { id: true, createdAt: true, action: true, entityType: true, details: true, user: { select: { name: true, username: true } } },
    }),
    prisma.notaFinalAudit.findMany({
      where: { notaFinal: { estudanteId: estudante.id, estudante: { escolaId } } },
      orderBy: { createdAt: 'desc' },
      take: limite,
      select: {
        id: true, createdAt: true, notaAnterior: true, notaAtual: true, status: true,
        modifiedBy: { select: { name: true, username: true, escolaId: true } },
        notaFinal: { select: { disciplina: { select: { nome: true } } } },
      },
    }),
  ])

  const entradas: EntradaHistorico[] = [
    ...logs.map(deLog),
    ...auditNotas.map((a) => ({
      id: `n-${a.id}`,
      quando: a.createdAt,
      fuso: 'America/Sao_Paulo' as const,
      autor: a.modifiedBy && a.modifiedBy.escolaId === escolaId ? (a.modifiedBy.name || a.modifiedBy.username) : null,
      acao: 'Alteração de nota final',
      assunto: a.notaFinal.disciplina.nome,
      detalhe: `${fmtNota(a.notaAnterior)} → ${fmtNota(a.notaAtual)} · ${a.status}`,
    })),
  ]
  return ordenar(entradas).slice(0, limite)
}

/** Histórico da conta do usuário. null se não existir na escola. */
export async function historicoDoUsuario(escolaId: string, usuarioId: string, limite = 200): Promise<EntradaHistorico[] | null> {
  const usuario = await prisma.user.findFirst({ where: { id: usuarioId, escolaId }, select: { id: true } })
  if (!usuario) return null
  const logs = await prisma.auditLog.findMany({
    where: { user: { escolaId }, entityType: 'USUARIO', entityId: usuario.id },
    orderBy: { createdAt: 'desc' },
    take: limite,
    select: { id: true, createdAt: true, action: true, entityType: true, details: true, user: { select: { name: true, username: true } } },
  })
  return ordenar(logs.map(deLog))
}

/** Última alteração registrada no AuditLog (para o rodapé de rastreio). */
export async function ultimaAlteracao(escolaId: string, entityType: 'ESTUDANTE' | 'USUARIO', entityId: string): Promise<{ autor: string; quando: Date } | null> {
  const l = await prisma.auditLog.findFirst({
    where: { user: { escolaId }, entityType, entityId, action: { in: ['UPDATE', 'CREATE', 'INSERT'] } },
    orderBy: { createdAt: 'desc' },
    select: { createdAt: true, user: { select: { name: true, username: true } } },
  })
  return l ? { autor: l.user.name || l.user.username, quando: l.createdAt } : null
}

function ordenar(e: EntradaHistorico[]) {
  // AuditLog guarda o horário de Brasília como UTC: soma 3h só para ordenar junto com o NotaFinalAudit
  const real = (x: EntradaHistorico) => x.quando.getTime() + (x.fuso === 'UTC' ? 3 * 3600_000 : 0)
  return [...e].sort((a, b) => real(b) - real(a))
}

export function formatarQuando(e: { quando: Date; fuso: 'UTC' | 'America/Sao_Paulo' }): string {
  return e.quando.toLocaleString('pt-BR', { timeZone: e.fuso, day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

/** Quem vê a aba Histórico: a mesma regra da tela de auditoria. */
export { podeVerHistorico } from './historico-regra'
