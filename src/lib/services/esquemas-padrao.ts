import type { Prisma, PrismaClient } from '@prisma/client'

/**
 * Esquemas de avaliação padrão de toda escola - "3 Unidades (Legado)" e
 * "2 Unidades Semestral (Legado)" (1 atividade por unidade valendo 10 =
 * "digitar 1 nota direto").
 *
 * Antes só existiam via a migration avaliacao_fase2_seed_esquemas_legados,
 * que roda uma vez e só enxerga as escolas que já existiam naquele momento -
 * escola criada depois (onboarding, seed em banco novo) ficava sem nenhum
 * esquema, e o lançamento de notas falhava com "Esquema de avaliação não
 * configurado". Esta função é o ponto único pra garantir isso, idempotente
 * por nome (mesmo critério da migration).
 */

type Db = PrismaClient | Prisma.TransactionClient

export const NOME_ESQUEMA_ANUAL = '3 Unidades (Legado)'
export const NOME_ESQUEMA_SEMESTRAL = '2 Unidades Semestral (Legado)'

// Mesma regra da migration da Fase 2: PROEJA/SUBSEQUENTE são semestrais.
const MODALIDADES_SEMESTRAIS = ['PROEJA', 'SUBSEQUENTE']

export interface EsquemasPadrao {
  anualId: string
  semestralId: string
}

async function garantirEsquema(db: Db, escolaId: string, nome: string, numUnidades: number): Promise<string> {
  const existente = await db.esquemaAvaliacao.findFirst({ where: { escolaId, nome }, select: { id: true } })
  if (existente) return existente.id

  const criado = await db.esquemaAvaliacao.create({
    data: {
      escolaId,
      nome,
      numUnidades,
      notaMinimaAprovacao: 5,
      recuperacaoUnidadeAtiva: false,
      recuperacaoFinalAtiva: true,
      modoRecuperacaoFinal: 'NOTA_MINIMA_ISOLADA',
      unidades: {
        create: Array.from({ length: numUnidades }, (_, i) => ({
          ordem: i + 1,
          nome: `${i + 1}ª Unidade`,
          atividades: { create: [{ nome: 'Nota da Unidade', notaMaxima: 10, ordem: 1 }] },
        })),
      },
    },
    select: { id: true },
  })
  return criado.id
}

export async function garantirEsquemasPadrao(db: Db, escolaId: string): Promise<EsquemasPadrao> {
  const anualId = await garantirEsquema(db, escolaId, NOME_ESQUEMA_ANUAL, 3)
  const semestralId = await garantirEsquema(db, escolaId, NOME_ESQUEMA_SEMESTRAL, 2)
  return { anualId, semestralId }
}

export function esquemaPadraoParaModalidade(esquemas: EsquemasPadrao, modalidade?: string | null): string {
  return modalidade && MODALIDADES_SEMESTRAIS.includes(modalidade) ? esquemas.semestralId : esquemas.anualId
}

/**
 * Quantas notas por unidade (modelo novo) já existem nas turmas dadas.
 * NotaUnidade aponta pra uma EsquemaUnidade específica - trocar o esquema de
 * uma turma/curso que já tem notas deixaria essas notas presas às unidades
 * do esquema antigo (some das telas, que leem pelo esquema resolvido). Por
 * isso a troca só é permitida enquanto isto for zero.
 */
export async function contarNotasLancadas(db: Db, turmaWhere: Prisma.TurmaWhereInput): Promise<number> {
  return db.notaUnidade.count({ where: { notaFinal: { estudante: { turma: turmaWhere } } } })
}

/**
 * Garante os esquemas padrão e vincula a eles todo curso da escola que
 * ainda não tem esquema (pela modalidade). Não mexe em curso que já tem
 * esquema escolhido.
 */
export async function vincularCursosSemEsquema(db: Db, escolaId: string): Promise<number> {
  const esquemas = await garantirEsquemasPadrao(db, escolaId)
  const semestral = await db.curso.updateMany({
    where: { escolaId, esquemaAvaliacaoId: null, modalidade: { in: MODALIDADES_SEMESTRAIS } },
    data: { esquemaAvaliacaoId: esquemas.semestralId },
  })
  const anual = await db.curso.updateMany({
    where: { escolaId, esquemaAvaliacaoId: null },
    data: { esquemaAvaliacaoId: esquemas.anualId },
  })
  return semestral.count + anual.count
}
