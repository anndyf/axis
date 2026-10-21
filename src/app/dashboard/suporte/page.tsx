import Link from "next/link"
import { LifeBuoy, MessageSquare } from "lucide-react"
import { CabecalhoPagina, Painel, buttonClasses } from "@/components/ui"
import { paginaDoModulo } from '@/lib/modulos/guarda'

export const metadata = { title: "Áxis - Suporte" }

/** Suporte: como pedir ajuda (o canal é o chamado em Mensagens). */
export default async function SuportePage() {
  await paginaDoModulo('NUC')
  return (
    <div className="max-w-leitura">
      <CabecalhoPagina titulo="Suporte" descricao="Como pedir ajuda com o sistema." />
      <Painel titulo="Abrir um chamado" acoes={<Link href="/dashboard/mensagens" className={buttonClasses({ size: "sm" })}><MessageSquare size={14} strokeWidth={1.75} aria-hidden /> Ir para mensagens</Link>}>
        <div className="space-y-3 text-sm text-fg">
          <p className="flex items-start gap-2"><LifeBuoy size={16} strokeWidth={1.75} aria-hidden className="mt-0.5 shrink-0 text-fg-subtle" /> Em Mensagens, use "Novo chamado" e escolha a categoria <strong className="font-medium">Suporte técnico</strong>. Descreva a tela, o que tentou fazer e o que apareceu.</p>
          <p>Problemas de cadastro (turma, disciplina ou estudante que não aparece) são resolvidos pela secretaria ou pela direção da escola.</p>
          <p className="text-fg-muted">Para informações sobre o uso dos dados, veja a <Link href="/privacidade" className="text-accent-fg hover:underline">política de privacidade</Link> e os <Link href="/termos" className="text-accent-fg hover:underline">termos de uso</Link>.</p>
        </div>
      </Painel>
    </div>
  )
}
