import { headers } from "next/headers"
import { SearchX } from "lucide-react"
import { buttonClasses } from "@/components/ui"
import { enderecoRaiz } from "@/lib/services/dominio"

export const metadata = {
  title: 'Áxis - Escola não encontrada'
}

export default async function EscolaInvalidaPage({
  searchParams
}: {
  searchParams: Promise<{ motivo?: string }>
}) {
  const { motivo } = await searchParams
  const h = await headers()
  const inicio = enderecoRaiz({ raiz: process.env.ROOT_DOMAIN || 'localhost', host: h.get('host'), protocolo: h.get('x-forwarded-proto') })

  const mensagens: Record<string, { titulo: string; texto: string }> = {
    nao_encontrada: { titulo: 'Escola não encontrada', texto: 'Não encontramos nenhuma escola para este endereço. Confira se ele foi digitado corretamente.' },
    suspensa: { titulo: 'Acesso suspenso', texto: 'O acesso desta escola está temporariamente suspenso. Entre em contato com a administração da escola.' },
    cancelada: { titulo: 'Acesso encerrado', texto: 'O acesso desta escola ao Áxis foi encerrado.' },
  }
  const m = mensagens[motivo || ''] ?? { titulo: 'Escola não identificada', texto: 'Não foi possível identificar a escola pelo endereço acessado.' }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-canvas px-5">
      <div className="w-full max-w-sm text-center">
        <div className="mx-auto mb-5 flex size-11 items-center justify-center rounded-lg border border-line bg-surface text-fg-subtle shadow-card">
          <SearchX size={18} strokeWidth={1.75} aria-hidden />
        </div>
        <h1 className="text-xl font-semibold tracking-tight text-fg">{m.titulo}</h1>
        <p className="mt-2 text-sm text-fg-muted">{m.texto}</p>
        <a href={inicio} className={buttonClasses({ className: 'mt-6' })}>Ir para a página inicial do Áxis</a>
        <p className="mt-6 text-xs text-fg-subtle">Se o problema continuar, fale com a secretaria da sua escola.</p>
      </div>
    </div>
  )
}
