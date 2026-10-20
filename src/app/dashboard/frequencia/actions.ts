"use server"

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { can } from "@/lib/rbac"
import { revalidatePath } from "next/cache"
import { dataValida } from "@/lib/services/chamada"
import { bloqueioDoModulo } from "@/lib/modulos/guarda"

// Cadastro de justificativas/atestados - só gestão. Toda ação confere papel
// e escola da sessão; o aluno recebido é conferido contra a escola.

const CAMINHO = "/dashboard/frequencia"
const TIPOS = ["ATESTADO", "ABONO_LEGAL", "OUTRO"] as const
const EFEITOS = ["ABONA", "SO_JUSTIFICA"] as const

type Resultado = { ok: true } | { erro: string }

async function gestao() {
  const session = await auth()
  if (!session?.user?.escolaId || session.user.isPortalUser || !can(session.user, "gestao")) return null
  return session.user
}

export async function criarJustificativa(dados: {
  estudanteId: string
  inicio: string
  fim: string
  tipo: string
  efeito: string
  descricao?: string
}): Promise<Resultado> {
  const bloqueado = await bloqueioDoModulo('DIA', 'escrita')
  if (bloqueado) return { erro: bloqueado }
  const user = await gestao()
  if (!user) return { erro: "Não autorizado" }
  const { estudanteId, inicio, fim, tipo, efeito } = dados ?? ({} as typeof dados)
  if (!dataValida(inicio) || !dataValida(fim) || fim < inicio) return { erro: "Informe início e fim válidos (fim no mesmo dia ou depois do início)." }
  if (!TIPOS.includes(tipo as (typeof TIPOS)[number])) return { erro: "Tipo inválido" }
  if (!EFEITOS.includes(efeito as (typeof EFEITOS)[number])) return { erro: "Efeito inválido" }

  const estudante = await prisma.estudante.findFirst({ where: { id: String(estudanteId), escolaId: user.escolaId }, select: { id: true } })
  if (!estudante) return { erro: "Estudante não encontrado" }

  await prisma.justificativa.create({
    data: {
      escolaId: user.escolaId,
      estudanteId: estudante.id,
      inicio: new Date(`${inicio}T00:00:00Z`),
      fim: new Date(`${fim}T00:00:00Z`),
      tipo: tipo as (typeof TIPOS)[number],
      efeito: efeito as (typeof EFEITOS)[number],
      descricao: typeof dados.descricao === "string" ? dados.descricao.trim().slice(0, 1000) || null : null,
      registradoPorId: user.id,
    },
  })
  revalidatePath(CAMINHO)
  return { ok: true }
}

export async function removerJustificativa(id: string): Promise<Resultado> {
  const bloqueado = await bloqueioDoModulo('DIA', 'escrita')
  if (bloqueado) return { erro: bloqueado }
  const user = await gestao()
  if (!user) return { erro: "Não autorizado" }
  const { count } = await prisma.justificativa.deleteMany({ where: { id: String(id), escolaId: user.escolaId } })
  if (count === 0) return { erro: "Justificativa não encontrada" }
  revalidatePath(CAMINHO)
  return { ok: true }
}
