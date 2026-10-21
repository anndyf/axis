import Link from "next/link"
import pacote from "../../package.json"

/**
 * Rodapé do sistema (desktop): versão lida do package.json e links de
 * suporte, termos, privacidade e novidades.
 */
export default function RodapeSistema({ escola }: { escola: string }) {
  const link = "rounded-sm transition-colors duration-150 hover:text-fg"
  return (
    <footer className="border-t border-line-subtle px-pagina py-3 print:hidden">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 text-xs text-fg-subtle">
        <span>Áxis · Sistema de gestão escolar · © {new Date().getFullYear()} {escola} · Desenvolvido por Andressa Mirella</span>
        <nav aria-label="Rodapé" className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <Link href="/dashboard/novidades" className={link}>Versão {pacote.version}</Link>
          <span aria-hidden>·</span>
          <Link href="/dashboard/novidades" className={link}>Novidades</Link>
          <Link href="/dashboard/suporte" className={link}>Suporte</Link>
          <Link href="/termos" className={link}>Termos de uso</Link>
          <Link href="/privacidade" className={link}>Privacidade</Link>
        </nav>
      </div>
    </footer>
  )
}
