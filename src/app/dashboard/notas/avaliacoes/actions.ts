"use server"

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { contextoDaDisciplina } from "@/lib/avaliacoes-acesso"
import { validarAvaliacoesDaEtapa, validarDadosAvaliacao } from "@/lib/services/avaliacoes-professor"
import { bloqueioDoModulo } from "@/lib/modulos/guarda"
import { podeGravarNotaUnidade } from "@/lib/cadeado-unidade"

// Avaliações criadas pelo professor (esquema com definicaoAtividades =
// PROFESSOR). Toda ação confere papel, escola e se o professor leciona a
// disciplina; a etapa precisa ser do esquema da turma da disciplina.

type Resultado = { ok: true } | { erro: string }
const CAMINHO = "/dashboard/notas/avaliacoes"

async function contextoParaEditar(disciplinaId: string) {
  const ctx = await contextoDaDisciplina(disciplinaId)
  if (!ctx) return { erro: "Não autorizado" } as const
  if (!ctx.esquema) return { erro: "A turma não tem esquema de avaliação." } as const
  if (ctx.esquema.definicaoAtividades !== "PROFESSOR") return { erro: "Neste esquema as atividades são definidas pela escola." } as const
  return { ...ctx, esquema: ctx.esquema }
}

/** Cadeado: a etapa encerrada não recebe nem perde avaliações (depois da regra de quem leciona). */
async function erroDoCadeado(ctx: { user: { escolaId: string }; disciplina: { id: string; turma: { id: string } } }, esquemaUnidadeId: string): Promise<string | null> {
  const r = await podeGravarNotaUnidade(ctx.user.escolaId, ctx.disciplina.turma.id, ctx.disciplina.id, esquemaUnidadeId)
  return r.ok ? null : r.mensagem
}

/** Confere o teto da etapa com a lista de avaliações já como ficaria. */
async function conferirTeto(
  esquema: NonNullable<Awaited<ReturnType<typeof contextoDaDisciplina>>>["esquema"] & object,
  disciplinaId: string,
  esquemaUnidadeId: string,
  trocar: { id?: string; notaMaxima: number; peso: number } | null,
  removerId?: string
): Promise<string | null> {
  const unidade = esquema.unidades.find((u) => u.id === esquemaUnidadeId)
  if (!unidade) return "Etapa não encontrada"
  const atuais = await prisma.avaliacaoDisciplina.findMany({ where: { disciplinaId, esquemaUnidadeId }, select: { id: true, notaMaxima: true, peso: true } })
  const lista = atuais.filter((a) => a.id !== removerId && a.id !== trocar?.id).map((a) => ({ notaMaxima: a.notaMaxima, peso: a.peso }))
  if (trocar) lista.push({ notaMaxima: trocar.notaMaxima, peso: trocar.peso })
  return validarAvaliacoesDaEtapa(lista, unidade.atividades, unidade.formaCalculo, unidade.divisor)
}

export async function criarAvaliacao(disciplinaId: string, esquemaUnidadeId: string, entrada: unknown): Promise<Resultado> {
  const bloqueado = await bloqueioDoModulo('NOT', 'escrita')
  if (bloqueado) return { erro: bloqueado }
  const ctx = await contextoParaEditar(disciplinaId)
  if ("erro" in ctx) return { erro: ctx.erro! }
  const dados = validarDadosAvaliacao(entrada)
  if ("erro" in dados) return dados
  if (!ctx.esquema.unidades.some((u) => u.id === esquemaUnidadeId)) return { erro: "Etapa não encontrada" }
  const trancada = await erroDoCadeado(ctx, esquemaUnidadeId)
  if (trancada) return { erro: trancada }
  const erroTeto = await conferirTeto(ctx.esquema, ctx.disciplina.id, String(esquemaUnidadeId), { notaMaxima: dados.notaMaxima, peso: dados.peso })
  if (erroTeto) return { erro: erroTeto }

  const ordem = (await prisma.avaliacaoDisciplina.count({ where: { disciplinaId: ctx.disciplina.id, esquemaUnidadeId } })) + 1
  await prisma.avaliacaoDisciplina.create({
    data: {
      disciplinaId: ctx.disciplina.id,
      esquemaUnidadeId,
      nome: dados.nome,
      data: dados.data ? new Date(`${dados.data}T00:00:00Z`) : null,
      notaMaxima: dados.notaMaxima,
      peso: dados.peso,
      ordem,
      criadoPorId: ctx.user.id,
    },
  })
  revalidatePath(CAMINHO)
  return { ok: true }
}

async function avaliacaoComContexto(id: string) {
  if (typeof id !== "string") return null
  const session = await auth()
  if (!session?.user?.escolaId) return null
  const avaliacao = await prisma.avaliacaoDisciplina.findFirst({
    where: { id, disciplina: { turma: { escolaId: session.user.escolaId } } },
    include: { notas: { where: { valor: { not: null } }, select: { valor: true } } },
  })
  if (!avaliacao) return null
  const ctx = await contextoParaEditar(avaliacao.disciplinaId)
  return "erro" in ctx ? null : { avaliacao, ctx }
}

/**
 * Edita uma avaliação. Com notas já lançadas, nome e data podem mudar, mas
 * nota máxima e peso não (mudariam notas de etapa já calculadas).
 */
export async function editarAvaliacao(id: string, entrada: unknown): Promise<Resultado> {
  const bloqueado = await bloqueioDoModulo('NOT', 'escrita')
  if (bloqueado) return { erro: bloqueado }
  const alvo = await avaliacaoComContexto(id)
  if (!alvo) return { erro: "Avaliação não encontrada" }
  const { avaliacao, ctx } = alvo
  const dados = validarDadosAvaliacao(entrada)
  if ("erro" in dados) return dados
  const trancada = await erroDoCadeado(ctx, avaliacao.esquemaUnidadeId)
  if (trancada) return { erro: trancada }

  const mudaConta = dados.notaMaxima !== avaliacao.notaMaxima || dados.peso !== avaliacao.peso
  if (mudaConta && avaliacao.notas.length > 0) {
    return { erro: "Já há notas lançadas nesta avaliação: só o nome e a data podem ser alterados." }
  }
  const erroTeto = await conferirTeto(ctx.esquema, avaliacao.disciplinaId, avaliacao.esquemaUnidadeId, { id: avaliacao.id, notaMaxima: dados.notaMaxima, peso: dados.peso })
  if (erroTeto) return { erro: erroTeto }

  await prisma.avaliacaoDisciplina.update({
    where: { id: avaliacao.id },
    data: { nome: dados.nome, data: dados.data ? new Date(`${dados.data}T00:00:00Z`) : null, notaMaxima: dados.notaMaxima, peso: dados.peso },
  })
  revalidatePath(CAMINHO)
  return { ok: true }
}

/** Remove uma avaliação ainda sem notas lançadas. */
export async function removerAvaliacao(id: string): Promise<Resultado> {
  const bloqueado = await bloqueioDoModulo('NOT', 'escrita')
  if (bloqueado) return { erro: bloqueado }
  const alvo = await avaliacaoComContexto(id)
  if (!alvo) return { erro: "Avaliação não encontrada" }
  const trancada = await erroDoCadeado(alvo.ctx, alvo.avaliacao.esquemaUnidadeId)
  if (trancada) return { erro: trancada }
  if (alvo.avaliacao.notas.length > 0) return { erro: "Já há notas lançadas nesta avaliação. Apague as notas antes de removê-la." }
  await prisma.avaliacaoDisciplina.delete({ where: { id: alvo.avaliacao.id } })
  revalidatePath(CAMINHO)
  return { ok: true }
}
