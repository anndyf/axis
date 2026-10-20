import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { can } from "@/lib/rbac"
import { rotaDoModulo } from '@/lib/modulos/guarda'

// O [id] da rota é a MATRÍCULA (é o que o front envia). AEEProfile.estudanteId
// guarda o id técnico do estudante desde a troca de PK (Fase 3 multi-tenant),
// então a matrícula precisa ser resolvida dentro da escola da sessão.
async function resolverEstudanteId(escolaId: string, matricula: string) {
  const estudante = await prisma.estudante.findUnique({
    where: { escolaId_matricula: { escolaId, matricula } },
    select: { id: true }
  })
  return estudante?.id ?? null
}

export const POST = rotaDoModulo('AEE', 'escrita', async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: matricula } = await params
  const session = await auth()

  if (!session?.user?.escolaId || !can(session.user, 'aee')) {
    return NextResponse.json({ message: "Não autorizado" }, { status: 403 })
  }

  try {
    const estudanteId = await resolverEstudanteId(session.user.escolaId, matricula)
    if (!estudanteId) {
      return NextResponse.json({ message: "Estudante não encontrado" }, { status: 404 })
    }

    const data = await request.json()
    const {
      cids, condicao, recomendacoes, notasDirecao,
      contatoNome, contatoTelefone,
      precisaProvaAdaptada, precisaProvaSalaEspecial
    } = data

    const profile = await prisma.aEEProfile.upsert({
      where: { estudanteId },
      update: {
        cids: cids || [],
        condicao,
        recomendacoes,
        notasDirecao,
        contatoNome,
        contatoTelefone,
        precisaProvaAdaptada: precisaProvaAdaptada ?? false,
        precisaProvaSalaEspecial: precisaProvaSalaEspecial ?? false,
        fotoUrl: data.fotoUrl
      },
      create: {
        estudanteId,
        cids: cids || [],
        condicao,
        recomendacoes,
        notasDirecao,
        contatoNome,
        contatoTelefone,
        precisaProvaAdaptada: precisaProvaAdaptada ?? false,
        precisaProvaSalaEspecial: precisaProvaSalaEspecial ?? false,
        fotoUrl: data.fotoUrl
      }
    })

    return NextResponse.json(profile)
  } catch (error: any) {
    console.error("Erro AEE Save:", error)
    return NextResponse.json({ message: "Erro ao salvar: " + error.message }, { status: 500 })
  }
})

export const DELETE = rotaDoModulo('AEE', 'escrita', async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: matricula } = await params
  const session = await auth()

  if (!session?.user?.escolaId || !can(session.user, 'aee')) {
    return NextResponse.json({ message: "Não autorizado" }, { status: 403 })
  }

  try {
    const estudanteId = await resolverEstudanteId(session.user.escolaId, matricula)
    const profile = estudanteId
      ? await prisma.aEEProfile.findUnique({ where: { estudanteId }, select: { id: true } })
      : null
    if (!profile) {
      return NextResponse.json({ message: "Ficha não encontrada" }, { status: 404 })
    }

    // Acknowledgements (ciências) saem em cascata junto com o perfil
    await prisma.aEEProfile.delete({ where: { id: profile.id } })

    return NextResponse.json({ message: "Ficha excluída com sucesso" })
  } catch (error: any) {
    console.error("Erro AEE Delete:", error)
    return NextResponse.json({ message: "Erro ao excluir: " + error.message }, { status: 500 })
  }
})
