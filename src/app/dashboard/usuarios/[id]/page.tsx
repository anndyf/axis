import Link from "next/link"
import { redirect } from "next/navigation"
import { Pencil } from "lucide-react"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { can } from "@/lib/rbac"
import { papeisDoUsuarioNoBanco } from "@/lib/papeis"
import { PAPEIS_SISTEMA, papeisDosBooleanos } from "@/lib/permissoes"
import { contaProtegidaDaPlataforma } from "@/lib/plataforma"
import { Badge, ListaDescritiva, Painel, RodapeRastreio, buttonClasses } from "@/components/ui"
import { podeVerHistorico, ultimaAlteracao } from "@/lib/services/historico-leitura"
import { paginaDoModulo } from '@/lib/modulos/guarda'

export const metadata = { title: 'Áxis - Usuário' }
export const runtime = 'nodejs'

const dataHora = (d: Date | null) => d ? d.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }) : null

/** Ficha do usuário, aba "Dados e papéis" (leitura). "Editar" abre o formulário de sempre. */
export default async function UsuarioDadosPage({ params }: { params: Promise<{ id: string }> }) {
  await paginaDoModulo('NUC')
  const session = await auth()
  if (!session?.user?.escolaId || !can(session.user, 'usuario.gerenciar')) redirect("/dashboard")
  const { id } = await params

  // Só o necessário (nunca o registro inteiro de User)
  const usuario = await prisma.user.findFirst({
    where: { id, escolaId: session.user.escolaId },
    select: {
      id: true, name: true, username: true, email: true, isActive: true, isApproved: true, createdAt: true, updatedAt: true, lastLogin: true,
      isSuperuser: true, isDirecao: true, isStaff: true, isAEE: true, isPortalUser: true, isPlatformAdmin: true,
      _count: { select: { disciplinasPermitidas: true } },
    },
  })
  if (!usuario) redirect("/dashboard/usuarios")
  const noBanco = await papeisDoUsuarioNoBanco(prisma, usuario.id, session.user.escolaId)
  const papeis = noBanco.length ? noBanco : papeisDosBooleanos(usuario)
  const protegida = contaProtegidaDaPlataforma(usuario, session.user)
  const ultima = podeVerHistorico(session.user) ? await ultimaAlteracao(session.user.escolaId, "USUARIO", usuario.id) : null

  return (
    <div className="grid gap-4 lg:grid-cols-3 lg:items-start">
      <Painel
        titulo="Dados de acesso"
        className="lg:col-span-2"
        rodape={<RodapeRastreio criadoEm={usuario.createdAt} {...(ultima ? { alteradoEm: ultima.quando, alteradoPor: ultima.autor } : { alteradoEm: usuario.updatedAt })} />}
        acoes={!protegida ? (
          <Link href={`/dashboard/usuarios/${usuario.id}/editar`} className={buttonClasses({ variant: "secondary", size: "sm" })}>
            <Pencil size={14} strokeWidth={1.75} aria-hidden /> Editar
          </Link>
        ) : undefined}
      >
        <ListaDescritiva colunas={2} itens={[
          { rotulo: "Nome completo", valor: usuario.name, largo: true },
          { rotulo: "E-mail", valor: usuario.email },
          { rotulo: "Usuário", valor: <span className="font-mono">{usuario.username}</span> },
          { rotulo: "Situação", valor: !usuario.isActive ? "Inativo" : usuario.isApproved ? "Ativo" : "Aguardando aprovação" },
          { rotulo: "Cadastrado em", valor: dataHora(usuario.createdAt) },
          { rotulo: "Último acesso", valor: dataHora(usuario.lastLogin) ?? "Nunca acessou" },
        ]} />
      </Painel>
      <Painel titulo="Papéis">
        {papeis.length > 0 ? (
          <ul className="space-y-2.5">
            {papeis.map((c) => (
              <li key={c}>
                <Badge tone="accent">{PAPEIS_SISTEMA[c as keyof typeof PAPEIS_SISTEMA]?.nome ?? c}</Badge>
                {PAPEIS_SISTEMA[c as keyof typeof PAPEIS_SISTEMA]?.descricao && (
                  <p className="mt-1 text-13 text-fg-muted">{PAPEIS_SISTEMA[c as keyof typeof PAPEIS_SISTEMA].descricao}</p>
                )}
              </li>
            ))}
          </ul>
        ) : <p className="text-sm text-fg-disabled">Nenhum papel atribuído.</p>}
        {papeis.includes("PROFESSOR") && (
          <p className="mt-3 border-t border-line-subtle pt-3 text-13 text-fg-muted">
            <span className="tabular-nums text-fg">{usuario._count.disciplinasPermitidas}</span> disciplinas vinculadas ·{" "}
            <Link href={`/dashboard/usuarios/${usuario.id}/disciplinas`} className="text-accent-fg hover:underline">ver disciplinas e turmas</Link>
          </p>
        )}
      </Painel>
    </div>
  )
}
