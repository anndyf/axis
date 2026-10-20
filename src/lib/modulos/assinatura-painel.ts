import { prisma } from '@/lib/prisma'
import { estadosDaEscola } from '@/lib/modulos/estados'
import { MODULO_IDS, NOMES_MODULOS, type EstadoModulo, type ModuloId } from './tipos'

const dia = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : null)

/**
 * Resumo para o painel da plataforma: assinatura vigente, planos à venda,
 * estado de cada módulo (do plano, exceção e efetivo) e histórico recente.
 * Só campos de assinatura - nada de dados de pessoas da escola.
 */
export async function resumoAssinaturaDaEscola(escolaId: string) {
  const escola = await prisma.escola.findUnique({ where: { id: escolaId }, select: { id: true, nome: true, plano: true, status: true } })
  if (!escola) return null
  const [assinatura, planos, estados] = await Promise.all([
    prisma.assinatura.findFirst({
      where: { escolaId },
      orderBy: { createdAt: 'desc' },
      include: {
        plano: { include: { modulos: true } },
        modulos: true,
        historico: { orderBy: { createdAt: 'desc' }, take: 20 },
      },
    }),
    prisma.plano.findMany({ orderBy: { ordem: 'asc' }, include: { modulos: true } }),
    estadosDaEscola(escolaId),
  ])
  const autores = assinatura
    ? new Map((await prisma.user.findMany({ where: { id: { in: assinatura.historico.map((h) => h.autorId).filter((x): x is string => !!x) } }, select: { id: true, name: true } })).map((u) => [u.id, u.name]))
    : new Map<string, string>()

  const doPlano = new Set(assinatura?.plano.modulos.map((m) => m.moduloId) ?? [])
  const modulos = MODULO_IDS.map((moduloId: ModuloId) => {
    const exc = assinatura?.modulos.find((m) => m.moduloId === moduloId)
    return {
      moduloId,
      nome: NOMES_MODULOS[moduloId],
      doPlano: moduloId === 'NUC' || doPlano.has(moduloId),
      excecao: exc ? { estado: exc.estado as EstadoModulo, origem: exc.origem, fim: dia(exc.fim), leituraAte: dia(exc.leituraAte) } : null,
      estadoEfetivo: estados[moduloId],
    }
  })

  return {
    escola,
    assinatura: assinatura && {
      id: assinatura.id,
      planoCodigo: assinatura.plano.codigo,
      planoNome: assinatura.plano.nome,
      situacao: assinatura.situacao,
      inicio: dia(assinatura.inicio),
      fimTeste: dia(assinatura.fimTeste),
      limiteUsuarios: assinatura.limiteUsuarios,
      limiteEstudantes: assinatura.limiteEstudantes,
      observacoes: assinatura.observacoes,
    },
    planos: planos.filter((p) => p.ativoParaVenda || p.id === assinatura?.planoId).map((p) => ({ codigo: p.codigo, nome: p.nome, limiteUsuarios: p.limiteUsuarios, modulos: p.modulos.map((m) => m.moduloId) })),
    modulos,
    historico: assinatura?.historico.map((h) => ({ id: h.id, descricao: h.descricao, data: h.createdAt.toISOString(), autor: h.autorId ? autores.get(h.autorId) ?? null : null })) ?? [],
  }
}

export type ResumoAssinatura = NonNullable<Awaited<ReturnType<typeof resumoAssinaturaDaEscola>>>
