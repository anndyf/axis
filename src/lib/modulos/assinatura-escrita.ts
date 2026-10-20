import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { MODULOS } from '@/lib/modules'
import { excecoesDosOverrides, type SituacaoAssinatura } from '@/lib/services/modulos'
import { ehPlanoLegado, itensLegadosDoModulo, planosIniciais, situacaoDoStatus, statusDaSituacao } from '@/lib/services/planos'
import type { EstadoModulo, ModuloId } from './tipos'

/**
 * Escrita de planos e assinaturas (fase 2). Durante a transição, cada mudança
 * também é espelhada em Escola.plano / Escola.status (o proxy ainda lê o
 * status) e em EscolaModulo para os módulos pagos de hoje, para que o modelo
 * antigo continue coerente até ser removido.
 */

type Tx = Prisma.TransactionClient
const ORDEM = { BASICO: 0, PRO: 1, ENTERPRISE: 2 } as const
const hojeData = () => new Date(new Date().toISOString().slice(0, 10))

/** Cria os planos BASICO/PRO/ENTERPRISE se não existirem (não altera os existentes). */
export async function garantirPlanosIniciais(db: Tx | typeof prisma = prisma): Promise<string[]> {
  const criados: string[] = []
  for (const p of planosIniciais()) {
    if (await db.plano.findUnique({ where: { codigo: p.codigo }, select: { id: true } })) continue
    await db.plano.create({
      data: { codigo: p.codigo, nome: p.nome, ordem: p.ordem, limiteUsuarios: p.limiteUsuarios, modulos: { create: p.modulos.map((moduloId) => ({ moduloId })) } },
    })
    criados.push(p.codigo)
  }
  return criados
}

/**
 * Cria a assinatura de uma escola a partir do modelo antigo (Escola.plano,
 * Escola.status, EscolaModulo). Não faz nada se a escola já tem assinatura.
 * Devolve os avisos de overrides que não puderam ser representados.
 */
export async function criarAssinaturaDoModeloAntigo(tx: Tx, escolaId: string, autorId: string | null, descricao: string): Promise<{ criada: boolean; avisos: string[] }> {
  if (await tx.assinatura.count({ where: { escolaId } })) return { criada: false, avisos: [] }
  const escola = await tx.escola.findUniqueOrThrow({ where: { id: escolaId }, select: { plano: true, status: true, createdAt: true, escolaModulos: { select: { moduloId: true, ativo: true } } } })
  await garantirPlanosIniciais(tx)
  const plano = await tx.plano.findUniqueOrThrow({ where: { codigo: escola.plano }, select: { id: true } })
  const r = excecoesDosOverrides(MODULOS, escola.escolaModulos, (itemId) => {
    const item = MODULOS.find((m) => m.id === itemId)
    return !item?.planoMinimo || ORDEM[escola.plano] >= ORDEM[item.planoMinimo]
  })
  await tx.assinatura.create({
    data: {
      escolaId,
      planoId: plano.id,
      situacao: situacaoDoStatus(escola.status),
      inicio: new Date(escola.createdAt.toISOString().slice(0, 10)),
      modulos: { create: r.excecoes.map((e) => ({ moduloId: e.moduloId, estado: e.estado, origem: 'EXCECAO' as const, inicio: hojeData() })) },
      historico: { create: { descricao, autorId, dados: { plano: escola.plano, status: escola.status, overrides: escola.escolaModulos, excecoes: r.excecoes, avisos: r.avisos } } },
    },
  })
  return { criada: true, avisos: r.avisos }
}

async function vigenteOuCriada(tx: Tx, escolaId: string, autorId: string | null) {
  await criarAssinaturaDoModeloAntigo(tx, escolaId, autorId, 'Assinatura criada a partir do modelo antigo')
  return tx.assinatura.findFirstOrThrow({ where: { escolaId }, orderBy: { createdAt: 'desc' }, include: { plano: true } })
}

export type MudancaAssinatura = {
  planoCodigo?: string
  situacao?: SituacaoAssinatura
  fimTeste?: string | null
  observacoes?: string | null
  limiteUsuarios?: number | null
  limiteEstudantes?: number | null
}

/** Altera a assinatura vigente (criando-a se faltar), registra o histórico e espelha no modelo antigo. */
export async function alterarAssinatura(escolaId: string, mudanca: MudancaAssinatura, autorId: string) {
  return prisma.$transaction((tx) => alterarAssinaturaEm(tx, escolaId, mudanca, autorId))
}

/** Igual a alterarAssinatura, dentro de uma transação já aberta (para mudar escola e assinatura juntas). */
export async function alterarAssinaturaEm(tx: Tx, escolaId: string, mudanca: MudancaAssinatura, autorId: string) {
  const atual = await vigenteOuCriada(tx, escolaId, autorId)
  const data: Prisma.AssinaturaUncheckedUpdateInput = {}
  const antes: Record<string, unknown> = {}
  const depois: Record<string, unknown> = {}
  if (mudanca.planoCodigo !== undefined && mudanca.planoCodigo !== atual.plano.codigo) {
    const plano = await tx.plano.findUnique({ where: { codigo: mudanca.planoCodigo }, select: { id: true } })
    if (!plano) throw new Error('PLANO_INVALIDO')
    data.planoId = plano.id
    antes.plano = atual.plano.codigo
    depois.plano = mudanca.planoCodigo
  }
  if (mudanca.situacao !== undefined && mudanca.situacao !== atual.situacao) {
    data.situacao = mudanca.situacao
    antes.situacao = atual.situacao
    depois.situacao = mudanca.situacao
  }
  for (const campo of ['observacoes', 'limiteUsuarios', 'limiteEstudantes'] as const) {
    if (mudanca[campo] !== undefined && mudanca[campo] !== atual[campo]) {
      ;(data as Record<string, unknown>)[campo] = mudanca[campo]
      antes[campo] = atual[campo]
      depois[campo] = mudanca[campo]
    }
  }
  if (mudanca.fimTeste !== undefined) {
    const atualTxt = atual.fimTeste ? atual.fimTeste.toISOString().slice(0, 10) : null
    if (mudanca.fimTeste !== atualTxt) {
      data.fimTeste = mudanca.fimTeste ? new Date(mudanca.fimTeste) : null
      antes.fimTeste = atualTxt
      depois.fimTeste = mudanca.fimTeste
    }
  }
  if (!Object.keys(depois).length) return atual.id
  await tx.assinatura.update({ where: { id: atual.id }, data })
  await tx.historicoAssinatura.create({ data: { assinaturaId: atual.id, autorId, descricao: 'Assinatura alterada', dados: { antes, depois } as Prisma.InputJsonValue } })
  // Espelho no modelo antigo
  const espelho: Prisma.EscolaUpdateInput = {}
  if (typeof depois.plano === 'string' && ehPlanoLegado(depois.plano)) espelho.plano = depois.plano
  if (depois.situacao) espelho.status = statusDaSituacao(depois.situacao as SituacaoAssinatura)
  if (Object.keys(espelho).length) await tx.escola.update({ where: { id: escolaId }, data: espelho })
  return atual.id
}

/**
 * Define o estado de um módulo na assinatura (exceção, add-on, cortesia,
 * teste). estado null remove a exceção: o módulo volta ao que o plano dá.
 */
export async function definirModuloDaAssinatura(
  escolaId: string,
  moduloId: Exclude<ModuloId, 'NUC'>,
  alvo: { estado: EstadoModulo; origem: 'ADICIONAL' | 'CORTESIA' | 'TESTE' | 'EXCECAO'; fim?: string | null; leituraAte?: string | null } | null,
  autorId: string,
) {
  return prisma.$transaction(async (tx) => {
    const atual = await vigenteOuCriada(tx, escolaId, autorId)
    const existente = await tx.assinaturaModulo.findUnique({ where: { assinaturaId_moduloId: { assinaturaId: atual.id, moduloId } } })
    if (alvo === null) {
      if (existente) await tx.assinaturaModulo.delete({ where: { id: existente.id } })
    } else {
      const dados = {
        estado: alvo.estado,
        origem: alvo.origem,
        fim: alvo.fim ? new Date(alvo.fim) : null,
        leituraAte: alvo.leituraAte ? new Date(alvo.leituraAte) : null,
      }
      await tx.assinaturaModulo.upsert({
        where: { assinaturaId_moduloId: { assinaturaId: atual.id, moduloId } },
        update: dados,
        create: { ...dados, assinaturaId: atual.id, moduloId, inicio: hojeData() },
      })
    }
    await tx.historicoAssinatura.create({
      data: {
        assinaturaId: atual.id, autorId,
        descricao: alvo ? `Módulo ${moduloId}: ${alvo.estado} (${alvo.origem})` : `Módulo ${moduloId}: volta ao plano`,
        dados: { moduloId, antes: existente ? { estado: existente.estado, origem: existente.origem } : null, depois: alvo } as Prisma.InputJsonValue,
      },
    })
    // Espelho em EscolaModulo para os módulos pagos de hoje
    for (const item of itensLegadosDoModulo(moduloId)) {
      if (alvo === null) await tx.escolaModulo.deleteMany({ where: { escolaId, moduloId: item } })
      else {
        const ativo = alvo.estado !== 'INATIVO'
        await tx.escolaModulo.upsert({ where: { escolaId_moduloId: { escolaId, moduloId: item } }, update: { ativo }, create: { escolaId, moduloId: item, ativo } })
      }
    }
  })
}
