"use server"
// @modulo NUC - Núcleo sempre ativo; sem checagem de módulo (ver src/lib/modulos/mapa-rotas.ts)

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { can } from "@/lib/rbac"

export interface ResultadoPaleta {
  turmas: { id: string; nome: string; curso: string | null }[]
  estudantes: { matricula: string; nome: string; turma: string }[]
}

const VAZIO: ResultadoPaleta = { turmas: [], estudantes: [] }

/**
 * Busca da paleta de comandos (Ctrl+K). Sempre na escola da sessão; turmas e
 * estudantes só para a gestão (mesma permissão dos módulos). Devolve só o
 * necessário para listar e montar o link.
 */
export async function buscarNaPaleta(termo: string): Promise<ResultadoPaleta> {
  const session = await auth()
  const user = session?.user
  if (!user?.escolaId || can(user, 'portal.acessar') || can(user, 'aee.atender') || !can(user, 'estudante.ler')) return VAZIO

  const q = String(termo ?? '').trim().slice(0, 60)
  if (q.length < 2) return VAZIO

  const escolaId = user.escolaId
  const [turmas, estudantes] = await Promise.all([
    prisma.turma.findMany({
      where: { escolaId, OR: [{ nome: { contains: q, mode: 'insensitive' } }, { curso: { contains: q, mode: 'insensitive' } }] },
      select: { id: true, nome: true, curso: true },
      orderBy: { nome: 'asc' },
      take: 6,
    }),
    prisma.estudante.findMany({
      where: { escolaId, OR: [{ nome: { contains: q, mode: 'insensitive' } }, { matricula: { contains: q, mode: 'insensitive' } }] },
      select: { matricula: true, nome: true, turma: { select: { nome: true } } },
      orderBy: { nome: 'asc' },
      take: 6,
    }),
  ])

  return {
    turmas,
    estudantes: estudantes.map((e) => ({ matricula: e.matricula, nome: e.nome, turma: e.turma.nome })),
  }
}
