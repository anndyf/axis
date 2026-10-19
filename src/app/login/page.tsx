import { escolaDaRequisicao } from "@/lib/escola-atual"
import LoginForm from "./LoginForm"

export const metadata = { title: "Entrar · Áxis" }

export default async function LoginPage() {
  // Escola do subdomínio (x-escola-id do proxy); nada vem do cliente
  const escola = await escolaDaRequisicao()
  return <LoginForm escola={{ nome: escola?.nome ?? "Áxis", logoUrl: escola?.logoUrl ?? null }} />
}
