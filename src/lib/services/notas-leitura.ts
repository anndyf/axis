import { prisma } from '@/lib/prisma'
import { resolverEsquemaAvaliacaoId, paraEsquemaConfig, type EsquemaConfig } from '@/lib/services/notas'
import { regraDoEsquema, type RegraFrequencia, type RegistroFrequencia } from '@/lib/services/frequencia'

/**
 * Leitura de notas no modelo novo (NotaUnidade) para telas e PDFs -
 * substitui a leitura das colunas fixas nota1/nota2/nota3. Server-only
 * (usa Prisma); as funções puras ficam em notas.ts.
 */

/** `include`/`select` padrão das etapas salvas de uma NotaFinal. */
export const SELECT_ETAPAS_DA_NOTA = {
  select: { esquemaUnidadeId: true, notaCalculada: true, notaRecuperacao: true, isDesistente: true },
} as const

export interface EsquemaDaTurma {
  config: EsquemaConfig
  notaMaxima: number
  etapas: { id: string; nome: string; ordem: number; peso: number }[]
  /** regra de frequência do mesmo esquema (mínimo, GERAL/POR_COMPONENTE) */
  frequencia: RegraFrequencia
  registroFrequencia: RegistroFrequencia
}

/** Esquema efetivo da turma (override da turma ?? padrão do curso), com as etapas em ordem. */
export async function carregarEsquemaDaTurma(turma: { cursoId: string | null; esquemaAvaliacaoId: string | null }): Promise<EsquemaDaTurma | null> {
  const curso = turma.cursoId
    ? await prisma.curso.findUnique({ where: { id: turma.cursoId }, select: { esquemaAvaliacaoId: true } })
    : null
  const esquemaId = resolverEsquemaAvaliacaoId(turma, curso)
  if (!esquemaId) return null

  const esquema = await prisma.esquemaAvaliacao.findUnique({
    where: { id: esquemaId },
    include: { unidades: { orderBy: { ordem: 'asc' }, select: { id: true, nome: true, ordem: true, peso: true } } },
  })
  if (!esquema) return null

  return {
    config: paraEsquemaConfig(esquema),
    notaMaxima: esquema.notaMaxima,
    etapas: esquema.unidades,
    frequencia: regraDoEsquema(esquema),
    registroFrequencia: esquema.registroFrequencia,
  }
}
