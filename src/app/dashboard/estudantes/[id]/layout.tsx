import { auth } from "@/lib/auth"
import CabecalhoFichaEstudante from "@/components/fichas/CabecalhoFichaEstudante"

/** Ficha do estudante: cabeçalho e abas sobre as telas do estudante. */
export default async function FichaEstudanteLayout({ children, params }: { children: React.ReactNode; params: Promise<{ id: string }> }) {
  const session = await auth()
  const { id } = await params
  return (
    <div>
      {session && <CabecalhoFichaEstudante session={session} matricula={id} />}
      {children}
    </div>
  )
}
