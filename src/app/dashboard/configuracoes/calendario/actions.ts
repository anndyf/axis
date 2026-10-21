"use server"
// @modulo NUC - Núcleo sempre ativo; sem checagem de módulo (ver src/lib/modulos/mapa-rotas.ts)

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { can } from "@/lib/rbac"
import { revalidatePath } from "next/cache"
import { normalizarTurno } from "@/lib/services/calendario"

// Server actions podem ser chamadas direto pelo client: toda ação confere
// papel (gestão) e escola da sessão, e todo id recebido é escopado.

const CAMINHO = "/dashboard/configuracoes/calendario"
const TURNOS = ["MATUTINO", "VESPERTINO", "NOTURNO", "INTEGRAL"]
const TIPOS = ["FERIADO", "RECESSO", "PLANEJAMENTO", "OUTRO"] as const

type Resultado = { ok: true } | { erro: string }

async function escolaDaGestao(): Promise<string | null> {
  const session = await auth()
  if (!session?.user?.escolaId || !can(session.user, "calendario.gerenciar")) return null
  return session.user.escolaId
}

function data(valor: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(valor)) return null
  const d = new Date(`${valor}T00:00:00Z`)
  return isNaN(d.getTime()) ? null : d
}

export async function salvarPeriodoLetivo(anoLetivo: number, inicio: string, fim: string): Promise<Resultado> {
  const escolaId = await escolaDaGestao()
  if (!escolaId) return { erro: "Não autorizado" }
  const di = data(inicio), df = data(fim)
  if (!di || !df || df < di) return { erro: "Informe início e fim válidos (fim depois do início)." }

  await prisma.periodoLetivo.upsert({
    where: { escolaId_anoLetivo: { escolaId, anoLetivo } },
    update: { inicio: di, fim: df },
    create: { escolaId, anoLetivo, inicio: di, fim: df },
  })
  revalidatePath(CAMINHO)
  return { ok: true }
}

export async function salvarEtapas(
  anoLetivo: number,
  etapas: { esquemaUnidadeId: string; inicio: string; fim: string; prazoLancamento?: string }[]
): Promise<Resultado> {
  const escolaId = await escolaDaGestao()
  if (!escolaId) return { erro: "Não autorizado" }

  const periodo = await prisma.periodoLetivo.findUnique({ where: { escolaId_anoLetivo: { escolaId, anoLetivo } } })
  if (!periodo) return { erro: "Salve primeiro o início e o fim do ano letivo." }

  // Só etapas de esquemas desta escola
  const ids = etapas.map((e) => e.esquemaUnidadeId)
  const validas = await prisma.esquemaUnidade.count({ where: { id: { in: ids }, esquema: { escolaId } } })
  if (validas !== new Set(ids).size) return { erro: "Etapa não encontrada" }

  for (const e of etapas) {
    if (!e.inicio && !e.fim) {
      await prisma.etapaCalendario.deleteMany({ where: { periodoLetivoId: periodo.id, esquemaUnidadeId: e.esquemaUnidadeId } })
      continue
    }
    const di = data(e.inicio), df = data(e.fim)
    if (!di || !df || df < di) return { erro: "Toda etapa precisa de início e fim válidos." }
    const prazo = e.prazoLancamento ? data(e.prazoLancamento) : null
    await prisma.etapaCalendario.upsert({
      where: { periodoLetivoId_esquemaUnidadeId: { periodoLetivoId: periodo.id, esquemaUnidadeId: e.esquemaUnidadeId } },
      update: { inicio: di, fim: df, prazoLancamento: prazo },
      create: { periodoLetivoId: periodo.id, esquemaUnidadeId: e.esquemaUnidadeId, inicio: di, fim: df, prazoLancamento: prazo },
    })
  }
  revalidatePath(CAMINHO)
  return { ok: true }
}

export async function adicionarDiaNaoLetivo(dataStr: string, tipo: string, descricao: string): Promise<Resultado> {
  const escolaId = await escolaDaGestao()
  if (!escolaId) return { erro: "Não autorizado" }
  const d = data(dataStr)
  if (!d || !descricao.trim() || !TIPOS.includes(tipo as any)) return { erro: "Informe data, tipo e descrição." }

  await prisma.diaNaoLetivo.create({ data: { escolaId, data: d, tipo: tipo as (typeof TIPOS)[number], descricao: descricao.trim() } })
  revalidatePath(CAMINHO)
  return { ok: true }
}

export async function removerDiaNaoLetivo(id: string): Promise<Resultado> {
  const escolaId = await escolaDaGestao()
  if (!escolaId) return { erro: "Não autorizado" }
  await prisma.diaNaoLetivo.deleteMany({ where: { id, escolaId } })
  revalidatePath(CAMINHO)
  return { ok: true }
}

export async function adicionarDiaLetivoExtra(dataStr: string, seguirHorarioDe: number, descricao: string): Promise<Resultado> {
  const escolaId = await escolaDaGestao()
  if (!escolaId) return { erro: "Não autorizado" }
  const d = data(dataStr)
  if (!d || !descricao.trim() || !(seguirHorarioDe >= 1 && seguirHorarioDe <= 5)) return { erro: "Informe data, dia da semana a seguir e descrição." }

  await prisma.diaLetivoExtra.upsert({
    where: { escolaId_data: { escolaId, data: d } },
    update: { seguirHorarioDe, descricao: descricao.trim() },
    create: { escolaId, data: d, seguirHorarioDe, descricao: descricao.trim() },
  })
  revalidatePath(CAMINHO)
  return { ok: true }
}

export async function removerDiaLetivoExtra(id: string): Promise<Resultado> {
  const escolaId = await escolaDaGestao()
  if (!escolaId) return { erro: "Não autorizado" }
  await prisma.diaLetivoExtra.deleteMany({ where: { id, escolaId } })
  revalidatePath(CAMINHO)
  return { ok: true }
}

/** Substitui todos os tempos de um turno (ordem = posição na lista). */
export async function salvarTemposAula(turno: string, tempos: { inicio: string; fim: string }[]): Promise<Resultado> {
  const escolaId = await escolaDaGestao()
  if (!escolaId) return { erro: "Não autorizado" }
  const t = normalizarTurno(turno)
  if (!TURNOS.includes(t)) return { erro: "Turno inválido" }

  const hora = /^([01]\d|2[0-3]):[0-5]\d$/
  for (const [i, tempo] of tempos.entries()) {
    if (!hora.test(tempo.inicio) || !hora.test(tempo.fim) || tempo.fim <= tempo.inicio) {
      return { erro: `${i + 1}º tempo: use HH:MM, com o fim depois do início.` }
    }
  }

  await prisma.$transaction([
    prisma.tempoAula.deleteMany({ where: { escolaId, turno: t } }),
    prisma.tempoAula.createMany({ data: tempos.map((tempo, i) => ({ escolaId, turno: t, ordem: i + 1, inicio: tempo.inicio, fim: tempo.fim })) }),
  ])
  revalidatePath(CAMINHO)
  return { ok: true }
}
