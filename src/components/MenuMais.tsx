"use client"

import Link from "next/link"
import { useState } from "react"
import { signOut } from "next-auth/react"
import { LogOut, Monitor, Moon, Sun, type LucideIcon } from "lucide-react"
import type { ItemNavegacao } from "@/lib/services/navegacao-mobile"
import { definirTema, temaValido, type Tema } from "@/lib/tema"
import { Avatar } from "@/components/ui/Avatar"
import { BottomSheet } from "@/components/ui/BottomSheet"
import { cn } from "@/components/ui/cn"

export interface AcaoConta {
  rotulo: string
  icone: LucideIcon
  href?: string
  onClick?: () => void
}

const TEMAS: { id: Tema; rotulo: string; icone: LucideIcon }[] = [
  { id: "light", rotulo: "Claro", icone: Sun },
  { id: "dark", rotulo: "Escuro", icone: Moon },
  { id: "system", rotulo: "Sistema", icone: Monitor },
]

const LINHA = "flex min-h-12 w-full items-center gap-3 rounded-xl px-3 text-left text-sm text-fg transition-colors duration-150 hover:bg-subtle"

/**
 * Painel "Mais" da barra inferior: os demais módulos do usuário, conta
 * (perfil, senha), tema e sair. Os itens chegam prontos (navegacaoMobile),
 * então nada aqui libera tela que o menu lateral não libere.
 */
export default function MenuMais({ open, onClose, itens, ativo, conta, usuario }: {
  open: boolean
  onClose: () => void
  itens: ItemNavegacao[]
  ativo: string | null
  conta: AcaoConta[]
  usuario: { nome?: string | null; papel: string }
}) {
  // O painel só desenha conteúdo aberto (no navegador), então ler o tema aqui é seguro
  const [tema, setTema] = useState<Tema>(() => (typeof document === "undefined" ? "light" : temaValido(document.documentElement.dataset.theme)))

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={
        <span className="flex items-center gap-3">
          <Avatar nome={usuario.nome} size="lg" tom="destaque" />
          <span className="min-w-0">
            <span className="block truncate">{usuario.nome ?? "Usuário"}</span>
            <span className="block truncate text-13 font-normal text-fg-subtle">{usuario.papel}</span>
          </span>
        </span>
      }
    >
      <div className="space-y-5">
        {itens.length > 0 && (
          <section aria-label="Outros módulos">
            <ul className="grid grid-cols-3 gap-2">
              {itens.map(({ id, rotulo, href, icone: Icone }) => (
                <li key={id}>
                  <Link
                    href={href}
                    onClick={onClose}
                    aria-current={id === ativo ? "page" : undefined}
                    className={cn(
                      "flex h-full min-h-[5.25rem] flex-col items-center justify-center gap-2 rounded-2xl border px-2 py-3 text-center text-xs font-medium transition-colors duration-150",
                      id === ativo ? "border-accent bg-accent-subtle text-accent-fg" : "border-line bg-surface text-fg hover:border-line-strong"
                    )}
                  >
                    <Icone size={20} strokeWidth={1.75} aria-hidden className={id === ativo ? "" : "text-fg-muted"} />
                    <span className="line-clamp-2 break-words">{rotulo}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section aria-label="Conta" className="-mx-3">
          {conta.map(({ rotulo, icone: Icone, href, onClick }) => (
            href ? (
              <Link key={rotulo} href={href} onClick={onClose} className={LINHA}>
                <Icone size={18} strokeWidth={1.75} className="text-fg-muted" aria-hidden /> {rotulo}
              </Link>
            ) : (
              <button key={rotulo} type="button" onClick={() => { onClose(); onClick?.() }} className={LINHA}>
                <Icone size={18} strokeWidth={1.75} className="text-fg-muted" aria-hidden /> {rotulo}
              </button>
            )
          ))}
        </section>

        <section>
          <h3 id="mais-tema" className="mb-2 text-13 font-medium text-fg-muted">Tema</h3>
          <div role="radiogroup" aria-labelledby="mais-tema" className="grid grid-cols-3 gap-1 rounded-xl bg-subtle p-1">
            {TEMAS.map(({ id, rotulo, icone: Icone }) => (
              <button
                key={id}
                type="button"
                role="radio"
                aria-checked={tema === id}
                onClick={() => { definirTema(id); setTema(id) }}
                className={cn("flex min-h-11 items-center justify-center gap-1.5 rounded-lg text-13 font-medium transition-colors duration-150", tema === id ? "bg-surface text-fg shadow-card" : "text-fg-muted hover:text-fg")}
              >
                <Icone size={16} strokeWidth={1.75} aria-hidden /> {rotulo}
              </button>
            ))}
          </div>
        </section>

        <button type="button" onClick={() => signOut({ redirectTo: "/login" })} className={cn(LINHA, "-mx-3 w-[calc(100%+1.5rem)] text-danger-fg hover:bg-danger-subtle")}>
          <LogOut size={18} strokeWidth={1.75} aria-hidden /> Sair
        </button>
      </div>
    </BottomSheet>
  )
}
