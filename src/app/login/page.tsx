import { headers } from "next/headers"
import { prisma } from "@/lib/prisma"
import LoginForm from "./LoginForm"

export default async function LoginPage() {
  const escolaId = (await headers()).get('x-escola-id')
  const escola = escolaId
    ? await prisma.escola.findUnique({ where: { id: escolaId }, select: { nome: true } })
    : null

  return <LoginForm nomeEscola={escola?.nome ?? 'Sistema de Gestão Acadêmica'} />
}
