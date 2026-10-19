"use server"

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { acessoChamada } from "@/lib/chamada-acesso"
import { carregarEsquemaDaTurma } from "@/lib/services/notas-leitura"
import { carregarCalendario, anoLetivoDaTurma } from "@/lib/services/frequencia-leitura"
import { planejarChamada, validarFaltas, hojeNaEscola, dataValida } from "@/lib/services/chamada"
import { chaveData } from "@/lib/services/calendario"

// Server actions podem ser chamadas direto pelo navegador: toda ação confere
// sessão, papel e escola, e todo id recebido é conferido contra a escola.

export interface ChamadaAberta {
  aula: { id: string; data: string; tempos: number[]; quantidade: number; conteudo: string; situacao: "PREVISTA" | "REALIZADA" | "CANCELADA" }
  turma: { id: string; nome: string }
  disciplina: { id: string; nome: string } | null
  alunos: { id: string; nome: string; matricula: string; status: string | null }[]
  /** aluno -> tempos perdidos (na chamada diária, [] com quantidade) */
  faltas: Record<string, { quantidade: number; tempos: number[] }>
  /** aluno -> observação do professor nesta aula (não vai ao portal) */
  observacoes: Record<string, string>
  /** aluno -> efeito da justificativa que cobre a data (atestado etc.) */
  justificados: Record<string, "ABONA" | "SO_JUSTIFICA">
}

type Erro = { erro: string }

async function usuario() {
  const session = await auth()
  if (!session?.user?.escolaId || session.user.isPortalUser) return null
  return session.user
}

/**
 * Abre (e cria, se ainda não existir) a aula do dia para a turma/disciplina,
 * a partir do horário e do calendário letivo. Chamada POR_DIA ignora a
 * disciplina.
 */
export async function abrirChamada(turmaId: string, disciplinaId: string | null, data: string): Promise<ChamadaAberta | Erro> {
  const user = await usuario()
  if (!user) return { erro: "Não autorizado" }
  if (!dataValida(data)) return { erro: "Data inválida." }

  // Descobre o modo de registro antes de checar acesso (POR_DIA não tem disciplina)
  const turmaBase = await prisma.turma.findFirst({ where: { id: String(turmaId), escolaId: user.escolaId }, select: { id: true, cursoId: true, esquemaAvaliacaoId: true, anoLetivo: true } })
  if (!turmaBase) return { erro: "Turma não encontrada" }
  const esquema = await carregarEsquemaDaTurma(turmaBase)
  const registro = esquema?.registroFrequencia ?? "POR_AULA"

  const acesso = await acessoChamada(user, turmaBase.id, registro === "POR_DIA" ? null : disciplinaId)
  if (!acesso) return { erro: "Você não tem acesso a esta chamada" }

  const [calendario, horario] = await Promise.all([
    anoLetivoDaTurma(user.escolaId, turmaBase).then((ano) => carregarCalendario(user.escolaId, ano)),
    prisma.horarioAula.findMany({ where: { turmaId: turmaBase.id }, select: { diaSemana: true, horario: true, disciplinaId: true } }),
  ])

  const existente = await prisma.aula.findFirst({
    where: { escolaId: user.escolaId, turmaId: turmaBase.id, data: new Date(`${data}T00:00:00Z`), disciplinaId: acesso.disciplina?.id ?? null },
  })
  let aula = existente
  if (!aula) {
    const plano = planejarChamada({ registro, data, hoje: hojeNaEscola(), turmaId: turmaBase.id, disciplinaId: acesso.disciplina?.id ?? null, calendario, horario })
    if (!plano.ok) return { erro: plano.erro }
    aula = await prisma.aula.upsert({
      where: { chave: plano.chave },
      update: {},
      create: {
        escolaId: user.escolaId,
        turmaId: turmaBase.id,
        disciplinaId: plano.disciplinaId,
        professorId: user.id,
        data: new Date(`${data}T00:00:00Z`),
        tempos: plano.tempos,
        quantidade: plano.quantidade,
        chave: plano.chave,
      },
    })
  }

  const dataAula = new Date(`${data}T00:00:00Z`)
  const [alunos, faltas, observacoes, justificativas] = await Promise.all([
    prisma.estudante.findMany({ where: { turmaId: turmaBase.id, escolaId: user.escolaId }, orderBy: { nome: "asc" }, select: { id: true, nome: true, matricula: true, status: true } }),
    prisma.falta.findMany({ where: { aulaId: aula.id }, select: { estudanteId: true, quantidade: true, tempos: true } }),
    prisma.observacaoChamada.findMany({ where: { aulaId: aula.id }, select: { estudanteId: true, texto: true } }),
    prisma.justificativa.findMany({
      where: { escolaId: user.escolaId, estudante: { turmaId: turmaBase.id }, inicio: { lte: dataAula }, fim: { gte: dataAula } },
      select: { estudanteId: true, efeito: true },
    }),
  ])

  const justificados: Record<string, "ABONA" | "SO_JUSTIFICA"> = {}
  for (const j of justificativas) {
    if (justificados[j.estudanteId] !== "ABONA") justificados[j.estudanteId] = j.efeito
  }

  return {
    aula: { id: aula.id, data: chaveData(aula.data), tempos: aula.tempos, quantidade: aula.quantidade, conteudo: aula.conteudo ?? "", situacao: aula.situacao },
    turma: { id: acesso.turma.id, nome: acesso.turma.nome },
    disciplina: acesso.disciplina,
    alunos,
    faltas: Object.fromEntries(faltas.map((f) => [f.estudanteId, { quantidade: f.quantidade, tempos: f.tempos }])),
    observacoes: Object.fromEntries(observacoes.map((o) => [o.estudanteId, o.texto])),
    justificados,
  }
}

async function aulaComAcesso(aulaId: string) {
  const user = await usuario()
  if (!user || typeof aulaId !== "string") return null
  const aula = await prisma.aula.findFirst({ where: { id: aulaId, escolaId: user.escolaId } })
  if (!aula) return null
  const acesso = await acessoChamada(user, aula.turmaId, aula.disciplinaId)
  return acesso ? { user, aula } : null
}

/**
 * Salva a chamada: grava só as faltas (quem não está na lista estava
 * presente), o conteúdo ministrado e marca a aula como REALIZADA. Serve
 * também para corrigir a chamada de dias anteriores. Cada falta traz os
 * tempos perdidos (falta por tempo) ou, no formato antigo, a quantidade.
 * Sem senha: o login identifica o professor e a aula guarda quem salvou.
 */
export async function salvarChamada(aulaId: string, faltas: { estudanteId: string; tempos?: number[]; quantidade?: number }[], conteudo: string): Promise<{ ok: true } | Erro> {
  const ctx = await aulaComAcesso(aulaId)
  if (!ctx) return { erro: "Aula não encontrada" }
  const { user, aula } = ctx
  if (chaveData(aula.data) > hojeNaEscola()) return { erro: "Não é possível fazer chamada de um dia que ainda não chegou." }

  const alunos = await prisma.estudante.findMany({ where: { turmaId: aula.turmaId, escolaId: user.escolaId }, select: { id: true } })
  const validas = validarFaltas(faltas, new Set(alunos.map((a) => a.id)), aula)
  if (!validas.ok) return { erro: validas.erro }
  const texto = typeof conteudo === "string" ? conteudo.trim().slice(0, 5000) : ""

  await prisma.$transaction([
    prisma.falta.deleteMany({ where: { aulaId: aula.id } }),
    prisma.falta.createMany({ data: validas.faltas.map((f) => ({ aulaId: aula.id, estudanteId: f.estudanteId, quantidade: f.quantidade, tempos: f.tempos })) }),
    prisma.aula.update({ where: { id: aula.id }, data: { situacao: "REALIZADA", conteudo: texto || null, professorId: user.id } }),
  ])
  revalidatePath("/dashboard/chamada")
  return { ok: true }
}

/** Marca a aula como não dada: deixa de contar na frequência (as faltas ficam guardadas, sem efeito). */
export async function cancelarAula(aulaId: string, motivo: string): Promise<{ ok: true } | Erro> {
  const ctx = await aulaComAcesso(aulaId)
  if (!ctx) return { erro: "Aula não encontrada" }
  const texto = typeof motivo === "string" ? motivo.trim().slice(0, 5000) : ""
  await prisma.aula.update({ where: { id: ctx.aula.id }, data: { situacao: "CANCELADA", conteudo: texto || ctx.aula.conteudo, professorId: ctx.user.id } })
  revalidatePath("/dashboard/chamada")
  return { ok: true }
}

/**
 * Observação de um aluno numa aula (presente ou faltoso). Texto vazio apaga.
 * Mesmo acesso da chamada: professor da disciplina ou gestão, na escola da
 * sessão; o aluno precisa ser da turma da aula.
 */
export async function salvarObservacao(aulaId: string, estudanteId: string, texto: string): Promise<{ ok: true } | Erro> {
  const ctx = await aulaComAcesso(aulaId)
  if (!ctx) return { erro: "Aula não encontrada" }
  const { user, aula } = ctx
  if (typeof estudanteId !== "string") return { erro: "Aluno não pertence a esta turma." }
  const aluno = await prisma.estudante.findFirst({ where: { id: estudanteId, turmaId: aula.turmaId, escolaId: user.escolaId }, select: { id: true } })
  if (!aluno) return { erro: "Aluno não pertence a esta turma." }
  const limpo = typeof texto === "string" ? texto.trim().slice(0, 2000) : ""

  if (!limpo) {
    await prisma.observacaoChamada.deleteMany({ where: { aulaId: aula.id, estudanteId: aluno.id } })
  } else {
    await prisma.observacaoChamada.upsert({
      where: { aulaId_estudanteId: { aulaId: aula.id, estudanteId: aluno.id } },
      update: { texto: limpo, autorId: user.id },
      create: { aulaId: aula.id, estudanteId: aluno.id, texto: limpo, autorId: user.id },
    })
  }
  revalidatePath("/dashboard/chamada")
  return { ok: true }
}
