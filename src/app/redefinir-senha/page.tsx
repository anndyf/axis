import { escolaDaRequisicao } from "@/lib/escola-atual"
import NovaSenhaForm from "@/components/NovaSenhaForm"

export const dynamic = 'force-dynamic'
export const metadata = { title: "Criar nova senha · Áxis" }

// Destino do link de "esqueci minha senha" (ver app/login/actions.ts)
export default async function RedefinirSenhaPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams
  const escola = await escolaDaRequisicao()
  return <NovaSenhaForm modo="redefinir" token={token} escola={{ nome: escola?.nome ?? "Áxis", logoUrl: escola?.logoUrl ?? null }} />
}
