import { headers } from "next/headers"
import { ClipboardCheck, FileText, Palette } from "lucide-react"
import EnderecoEscolaForm from "./EnderecoEscolaForm"

export const metadata = { title: "Áxis · Sistema de Gestão Escolar" }
export const dynamic = "force-dynamic"

// Página do domínio raiz (sem escola). Não lista escolas: a pessoa digita o
// endereço da própria escola e vai para o subdomínio dela.
export default async function EntradaPage() {
  const h = await headers()
  const origem = { raiz: process.env.ROOT_DOMAIN || "localhost", host: h.get("host"), protocolo: h.get("x-forwarded-proto") }
  const recursos = [
    { icone: FileText, titulo: "Notas do jeito da escola", texto: "Etapas, pesos, recuperação e conselho de classe configuráveis." },
    { icone: ClipboardCheck, titulo: "Chamada e diário", texto: "Chamada em poucos toques, conteúdo ministrado e frequência calculada." },
    { icone: Palette, titulo: "A cara da sua escola", texto: "Logo e cor da escola no sistema, no login e nos documentos." },
  ]

  return (
    <div className="flex min-h-dvh flex-col bg-canvas">
      <header className="mx-auto flex w-full max-w-5xl items-center px-5 py-5 sm:px-8">
        <span className="flex items-center gap-2 text-sm font-semibold text-fg">
          <span aria-hidden className="flex size-7 items-center justify-center rounded-md bg-fg text-xs font-semibold text-canvas">Á</span>
          Áxis
        </span>
      </header>

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col justify-center px-5 py-12 sm:px-8">
        <div className="grid items-center gap-12 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
          <div className="space-y-5">
            <p className="text-13 font-medium text-fg-subtle">Sistema de Gestão Escolar</p>
            <h1 className="max-w-xl text-3xl font-semibold leading-tight tracking-tight text-fg sm:text-[2.5rem]">
              Notas, chamada e frequência da sua escola, com clareza.
            </h1>
            <p className="max-w-lg text-base text-fg-muted">
              O Áxis reúne o diário do professor, o lançamento de notas, o conselho de classe e o portal do estudante em um só lugar.
            </p>
          </div>

          <div className="rounded-xl border border-line bg-surface p-6 shadow-card">
            <h2 className="text-base font-semibold text-fg">Acessar minha escola</h2>
            <p className="mt-1 text-13 text-fg-muted">Digite o endereço que sua escola usa no Áxis.</p>
            <div className="mt-5"><EnderecoEscolaForm origem={origem} /></div>
          </div>
        </div>

        <ul className="mt-16 grid gap-6 border-t border-line-subtle pt-8 sm:grid-cols-3">
          {recursos.map((r) => (
            <li key={r.titulo} className="space-y-1.5">
              <r.icone size={16} strokeWidth={1.75} className="text-fg-subtle" aria-hidden />
              <p className="text-sm font-medium text-fg">{r.titulo}</p>
              <p className="text-13 text-fg-muted">{r.texto}</p>
            </li>
          ))}
        </ul>
      </main>

      <footer className="mx-auto w-full max-w-5xl px-5 py-6 text-xs text-fg-subtle sm:px-8">
        Áxis · Desenvolvido por <span className="text-fg-muted">Andressa Mirella</span>
      </footer>
    </div>
  )
}
