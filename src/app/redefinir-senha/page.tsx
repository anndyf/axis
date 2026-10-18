import { headers } from "next/headers"
import { prisma } from "@/lib/prisma"
import NovaSenhaForm from "@/components/NovaSenhaForm"

export const dynamic = 'force-dynamic'

// Destino do link de "esqueci minha senha" (ver app/login/actions.ts)
export default async function RedefinirSenhaPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams
  const escolaId = (await headers()).get('x-escola-id')
  const escola = escolaId
    ? await prisma.escola.findUnique({ where: { id: escolaId }, select: { nome: true } })
    : null

  return <NovaSenhaForm modo="redefinir" token={token} nomeEscola={escola?.nome ?? 'Sistema de Gestão Acadêmica'} />
}
