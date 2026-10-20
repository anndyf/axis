import Link from "next/link"
import { Lock } from "lucide-react"
import { buttonClasses } from "@/components/ui"
import { paginaDoModulo } from "@/lib/modulos/guarda"
import { ehModuloId, NOMES_MODULOS } from "@/lib/modulos/tipos"

export const metadata = {
  title: 'Áxis - Módulo indisponível'
}

// Destino de paginaDoModulo() quando a escola não tem o módulo da página.
export default async function ModuloIndisponivelPage({
  searchParams
}: {
  searchParams: Promise<{ m?: string }>
}) {
  await paginaDoModulo('NUC')
  const { m } = await searchParams
  const modulo = ehModuloId(m) ? m : null

  // Banco de Questões: mesmo texto que o professor já via quando a direção desligava o banco
  const { titulo, texto } = modulo === 'QST'
    ? { titulo: 'Módulo em Manutenção', texto: 'O Banco de Questões foi temporariamente desativado pela direção para manutenção ou atualização pedagógica.' }
    : {
        titulo: 'Módulo indisponível',
        texto: modulo
          ? `O módulo ${NOMES_MODULOS[modulo]} não está disponível para a sua escola.`
          : 'Este recurso não está disponível para a sua escola.',
      }

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="w-full max-w-sm text-center">
        <div className="mx-auto mb-5 flex size-11 items-center justify-center rounded-lg border border-line bg-surface text-fg-subtle shadow-card">
          <Lock size={18} strokeWidth={1.75} aria-hidden />
        </div>
        <h1 className="text-xl font-semibold tracking-tight text-fg">{titulo}</h1>
        <p className="mt-2 text-sm text-fg-muted">{texto}</p>
        <Link href="/dashboard" className={buttonClasses({ className: 'mt-6' })}>Voltar ao início</Link>
        <p className="mt-6 text-xs text-fg-subtle">Para contratar ou reativar, fale com a direção da sua escola.</p>
      </div>
    </div>
  )
}
