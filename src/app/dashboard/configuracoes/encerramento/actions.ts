"use server"
// @modulo NUC - Núcleo sempre ativo; sem checagem de módulo (ver src/lib/modulos/mapa-rotas.ts)

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { can } from "@/lib/rbac"
import { revalidatePath } from "next/cache"
import { logAudit } from "@/lib/audit"
import { encerramentoDaEtapa, podeDesfazerEncerramento, dataBR, somarDias, REABERTURA_MAXIMA_DIAS } from "@/lib/cadeado-unidade"
import { hojeNaEscola, dataValida } from "@/lib/services/chamada"
import { chaveData } from "@/lib/services/calendario"
import { resolverEsquemaAvaliacaoId } from "@/lib/services/notas"
import { carregarEsquemaDaTurma } from "@/lib/services/notas-leitura"
import { anoLetivoDaTurma } from "@/lib/services/frequencia-leitura"

// Encerramento e reabertura de unidades (cadeado). Só quem tem
// `unidade.encerrar` (Direção e Coordenação), sempre na escola da sessão;
// todo id recebido é conferido contra a escola. Tudo vai para o AuditLog
// (entityType 'UNIDADE').

const CAMINHO = "/dashboard/configuracoes/encerramento"

type Resultado = { ok: true } | { erro: string }

async function gestor() {
  const session = await auth()
  const user = session?.user
  if (!user?.escolaId || can(user, "portal.acessar") || !can(user, "unidade.encerrar")) return null
  return user
}

function motivoValido(motivo: unknown): string | null {
  const m = typeof motivo === "string" ? motivo.trim() : ""
  return m.length >= 5 ? m.slice(0, 1000) : null
}

async function etapaDaEscola(escolaId: string, etapaId: unknown) {
  if (typeof etapaId !== "string") return null
  return prisma.etapaCalendario.findFirst({
    where: { id: etapaId, periodoLetivo: { escolaId } },
    select: {
      id: true, prazoLancamento: true, encerradaEm: true, esquemaUnidadeId: true,
      periodoLetivo: { select: { anoLetivo: true } },
      esquemaUnidade: { select: { nome: true, esquemaId: true, esquema: { select: { nome: true } } } },
    },
  })
}

const paraCadeado = (e: { prazoLancamento: Date | null; encerradaEm: Date | null }) => ({
  prazoLancamento: e.prazoLancamento ? chaveData(e.prazoLancamento) : null,
  encerradaEm: e.encerradaEm,
})

/** "Encerrar agora": tranca a unidade para a escola inteira antes do prazo. */
export async function encerrarUnidade(etapaId: string): Promise<Resultado> {
  const user = await gestor()
  if (!user) return { erro: "Não autorizado" }
  const etapa = await etapaDaEscola(user.escolaId, etapaId)
  if (!etapa) return { erro: "Unidade não encontrada" }
  if (encerramentoDaEtapa(paraCadeado(etapa), hojeNaEscola())) return { erro: "Esta unidade já está encerrada." }

  // Só encerra se ainda estiver aberta (corrida entre duas pessoas)
  const { count } = await prisma.etapaCalendario.updateMany({ where: { id: etapa.id, encerradaEm: null }, data: { encerradaEm: new Date(), encerradaPorId: user.id } })
  if (!count) return { erro: "Esta unidade já está encerrada." }
  await logAudit(user.id, "UNIDADE", etapa.id, "UPDATE", {
    operacao: "Encerrou a unidade", alvo: etapa.esquemaUnidade.nome, esquema: etapa.esquemaUnidade.esquema.nome, ano: etapa.periodoLetivo.anoLetivo,
  })
  revalidatePath(CAMINHO)
  return { ok: true }
}

/** Desfaz um encerramento ANTECIPADO feito por engano, enquanto o prazo não passou. */
export async function desfazerEncerramento(etapaId: string, motivo: string): Promise<Resultado> {
  const user = await gestor()
  if (!user) return { erro: "Não autorizado" }
  const texto = motivoValido(motivo)
  if (!texto) return { erro: "Informe o motivo (pelo menos 5 caracteres)." }
  const etapa = await etapaDaEscola(user.escolaId, etapaId)
  if (!etapa) return { erro: "Unidade não encontrada" }
  if (!etapa.encerradaEm) return { erro: "Esta unidade não foi encerrada manualmente." }
  if (!podeDesfazerEncerramento(paraCadeado(etapa), hojeNaEscola())) {
    return { erro: "O prazo de lançamento desta unidade já passou. Use a reabertura por turma e disciplina." }
  }

  await prisma.etapaCalendario.update({ where: { id: etapa.id }, data: { encerradaEm: null, encerradaPorId: null } })
  await logAudit(user.id, "UNIDADE", etapa.id, "UPDATE", {
    operacao: "Desfez o encerramento", alvo: etapa.esquemaUnidade.nome, esquema: etapa.esquemaUnidade.esquema.nome, ano: etapa.periodoLetivo.anoLetivo, motivo: texto,
  })
  revalidatePath(CAMINHO)
  return { ok: true }
}

/**
 * Reabre uma unidade encerrada só para uma turma + disciplina até `ate`
 * (inclusive; padrão 7 dias, máximo 30). Na turma com chamada diária
 * (POR_DIA), disciplina nula = a chamada diária da turma.
 */
export async function reabrirUnidade(dados: { etapaId: string; turmaId: string; disciplinaId: string | null; ate: string; motivo: string }): Promise<Resultado> {
  const user = await gestor()
  if (!user) return { erro: "Não autorizado" }
  const texto = motivoValido(dados?.motivo)
  if (!texto) return { erro: "Informe o motivo (pelo menos 5 caracteres)." }
  const etapa = await etapaDaEscola(user.escolaId, dados?.etapaId)
  if (!etapa) return { erro: "Unidade não encontrada" }
  const hoje = hojeNaEscola()
  if (!encerramentoDaEtapa(paraCadeado(etapa), hoje)) return { erro: "Esta unidade ainda está aberta; não é preciso reabrir." }

  const ate = dados.ate
  if (!dataValida(ate) || ate < hoje) return { erro: "Informe uma data final a partir de hoje." }
  if (ate > somarDias(hoje, REABERTURA_MAXIMA_DIAS)) return { erro: `A reabertura vale no máximo ${REABERTURA_MAXIMA_DIAS} dias (até ${dataBR(somarDias(hoje, REABERTURA_MAXIMA_DIAS))}).` }

  if (typeof dados.turmaId !== "string") return { erro: "Turma não encontrada" }
  const turma = await prisma.turma.findFirst({ where: { id: dados.turmaId, escolaId: user.escolaId }, select: { id: true, nome: true, cursoId: true, esquemaAvaliacaoId: true, anoLetivo: true } })
  if (!turma) return { erro: "Turma não encontrada" }
  // A turma precisa seguir o esquema da unidade, no mesmo ano letivo
  const curso = turma.cursoId ? await prisma.curso.findFirst({ where: { id: turma.cursoId, escolaId: user.escolaId }, select: { esquemaAvaliacaoId: true } }) : null
  if (resolverEsquemaAvaliacaoId(turma, curso) !== etapa.esquemaUnidade.esquemaId || (await anoLetivoDaTurma(user.escolaId, turma)) !== etapa.periodoLetivo.anoLetivo) {
    return { erro: "Esta turma não segue o esquema desta unidade neste ano letivo." }
  }

  let disciplina: { id: string; nome: string } | null = null
  if (dados.disciplinaId === null || dados.disciplinaId === "") {
    const esquema = await carregarEsquemaDaTurma(turma)
    if (esquema?.registroFrequencia !== "POR_DIA") return { erro: "Escolha a disciplina." }
  } else {
    if (typeof dados.disciplinaId !== "string") return { erro: "Disciplina não encontrada" }
    disciplina = await prisma.disciplina.findFirst({ where: { id: dados.disciplinaId, turmaId: turma.id }, select: { id: true, nome: true } })
    if (!disciplina) return { erro: "Disciplina não encontrada" }
  }

  const ativa = await prisma.reaberturaUnidade.findFirst({
    where: { escolaId: user.escolaId, etapaCalendarioId: etapa.id, turmaId: turma.id, disciplinaId: disciplina?.id ?? null, revogadaEm: null, ate: { gte: new Date(`${hoje}T00:00:00Z`) } },
    select: { ate: true },
  })
  if (ativa) return { erro: `Já existe uma reabertura ativa para esta turma e disciplina até ${dataBR(chaveData(ativa.ate))}. Revogue-a antes de criar outra.` }

  const criada = await prisma.reaberturaUnidade.create({
    data: {
      escolaId: user.escolaId, etapaCalendarioId: etapa.id, turmaId: turma.id, disciplinaId: disciplina?.id ?? null,
      ate: new Date(`${ate}T00:00:00Z`), motivo: texto, criadoPorId: user.id,
    },
  })
  await logAudit(user.id, "UNIDADE", etapa.id, "CREATE", {
    operacao: "Reabriu a unidade", alvo: etapa.esquemaUnidade.nome, turma: turma.nome, disciplina: disciplina?.nome ?? "Chamada diária",
    ate: dataBR(ate), motivo: texto, reabertura: criada.id,
  })
  revalidatePath(CAMINHO)
  return { ok: true }
}

/** Revoga uma reabertura antes da data: a turma + disciplina tranca de novo. */
export async function revogarReabertura(reaberturaId: string): Promise<Resultado> {
  const user = await gestor()
  if (!user) return { erro: "Não autorizado" }
  if (typeof reaberturaId !== "string") return { erro: "Reabertura não encontrada" }
  const r = await prisma.reaberturaUnidade.findFirst({
    where: { id: reaberturaId, escolaId: user.escolaId },
    select: {
      id: true, revogadaEm: true, etapaCalendarioId: true, ate: true,
      turma: { select: { nome: true } }, disciplina: { select: { nome: true } }, etapaCalendario: { select: { esquemaUnidade: { select: { nome: true } } } },
    },
  })
  if (!r) return { erro: "Reabertura não encontrada" }
  if (r.revogadaEm) return { erro: "Esta reabertura já foi revogada." }

  const { count } = await prisma.reaberturaUnidade.updateMany({ where: { id: r.id, revogadaEm: null }, data: { revogadaEm: new Date(), revogadaPorId: user.id } })
  if (!count) return { erro: "Esta reabertura já foi revogada." }
  await logAudit(user.id, "UNIDADE", r.etapaCalendarioId, "UPDATE", {
    operacao: "Revogou a reabertura", alvo: r.etapaCalendario.esquemaUnidade.nome, turma: r.turma.nome, disciplina: r.disciplina?.nome ?? "Chamada diária",
    ate: dataBR(chaveData(r.ate)), reabertura: r.id,
  })
  revalidatePath(CAMINHO)
  return { ok: true }
}
