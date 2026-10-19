import type { ReactNode } from "react"

export interface EscolaDoAcesso {
  nome: string
  logoUrl?: string | null
}

/** Marca da escola (logo ou inicial) para as páginas de acesso. */
export function MarcaAcesso({ escola, sobreDestaque }: { escola: EscolaDoAcesso; sobreDestaque?: boolean }) {
  return (
    <span className="flex min-w-0 items-center gap-3">
      {escola.logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={escola.logoUrl} alt="" className={`size-9 shrink-0 rounded-lg object-contain ${sobreDestaque ? "bg-white/90 p-1" : ""}`} />
      ) : (
        <span aria-hidden className={`flex size-9 shrink-0 items-center justify-center rounded-lg text-sm font-semibold ${sobreDestaque ? "bg-white/15 text-on-accent ring-1 ring-white/25" : "bg-accent text-on-accent"}`}>
          {escola.nome.charAt(0).toUpperCase()}
        </span>
      )}
      <span className="min-w-0">
        <span className={`block truncate text-sm font-semibold ${sobreDestaque ? "text-on-accent" : "text-fg"}`}>{escola.nome}</span>
        <span className={`block text-xs ${sobreDestaque ? "text-on-accent/75" : "text-fg-subtle"}`}>Sistema de Gestão Escolar</span>
      </span>
    </span>
  )
}

/**
 * Páginas de acesso (login, redefinir/trocar senha, cadastro): formulário de
 * um lado e, no desktop, um painel com a identidade da escola na cor de
 * destaque. No celular, coluna única com a marca no topo.
 */
export default function AcessoLayout({ escola, titulo, descricao, children, rodape }: {
  escola: EscolaDoAcesso
  titulo: ReactNode
  descricao?: ReactNode
  children: ReactNode
  rodape?: ReactNode
}) {
  return (
    <div className="grid min-h-dvh bg-surface lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
      <main className="flex flex-col px-5 py-8 sm:px-10">
        <div className="lg:hidden"><MarcaAcesso escola={escola} /></div>
        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-10">
          <h1 className="text-2xl font-semibold tracking-tight text-fg">{titulo}</h1>
          {descricao && <p className="mt-1.5 text-sm text-fg-muted">{descricao}</p>}
          <div className="mt-8">{children}</div>
        </div>
        <footer className="mx-auto w-full max-w-sm text-xs text-fg-subtle">
          {rodape ?? <>Áxis · Desenvolvido por <span className="text-fg-muted">Andressa Mirella</span></>}
        </footer>
      </main>

      <aside aria-hidden className="relative hidden overflow-hidden bg-accent p-10 lg:flex lg:flex-col lg:justify-between">
        {/* textura discreta: grade de linhas finas, sem imagens */}
        <div className="pointer-events-none absolute inset-0 opacity-[0.12] [background-image:linear-gradient(to_right,white_1px,transparent_1px),linear-gradient(to_bottom,white_1px,transparent_1px)] [background-size:44px_44px] [mask-image:radial-gradient(ellipse_at_70%_30%,black,transparent_70%)]" />
        <div className="relative"><MarcaAcesso escola={escola} sobreDestaque /></div>
        <div className="relative max-w-md space-y-3">
          <p className="text-3xl font-semibold leading-tight tracking-tight text-on-accent">Notas, chamada e frequência da escola em um só lugar.</p>
          <p className="text-sm text-on-accent/75">Acesso para equipe, professores e estudantes de {escola.nome}.</p>
        </div>
      </aside>
    </div>
  )
}
