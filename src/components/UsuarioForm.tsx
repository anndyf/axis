"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Accessibility, BookOpen, Check, ClipboardList, Fingerprint, GraduationCap, Mail, ShieldCheck, type LucideIcon } from "lucide-react"
import { Alert, BarraSalvar, Button, Card, CardBody, CardFooter, CardHeader, Field, Input, CabecalhoPagina, IndicadorGravacao, PasswordInput, cn } from "@/components/ui"
import { Dialog } from "@/components/ui/Dialog"
import { PAPEIS_ATRIBUIVEIS, PAPEIS_SISTEMA, type CodigoPapel } from "@/lib/permissoes"

/** Só o que a tela precisa da conta (nunca o registro inteiro de User). */
export interface UsuarioDoFormulario {
  id: string
  name: string | null
  email: string
  username: string
  lastLogin?: string | Date | null
  papeis: CodigoPapel[]
  /** conta da plataforma: só outro admin da plataforma altera */
  protegida?: boolean
}

const ICONE_PAPEL: Partial<Record<CodigoPapel, LucideIcon>> = {
  ADMINISTRADOR: Fingerprint,
  DIRECAO: ShieldCheck,
  SECRETARIA: ClipboardList,
  COORDENACAO: BookOpen,
  PROFESSOR: GraduationCap,
  AEE: Accessibility,
}

const formatarAcesso = (data: string | Date | null | undefined) =>
  data ? new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(data)) : "Nunca"

export default function UsuarioForm({ usuario, isEdit = false }: { usuario?: UsuarioDoFormulario; isEdit?: boolean }) {
  const router = useRouter()
  const [nome, setNome] = useState(usuario?.name ?? "")
  const [email, setEmail] = useState(usuario?.email ?? "")
  const [senha, setSenha] = useState("")
  // conta nova começa como Professor, como antes
  const [papeis, setPapeis] = useState<CodigoPapel[]>(usuario?.papeis ?? ["PROFESSOR"])
  const [erro, setErro] = useState("")
  const [salvando, setSalvando] = useState(false)
  const [confirmar, setConfirmar] = useState(false)
  // "Alterações não salvas" enquanto algo difere do que veio do servidor
  const alterado = nome !== (usuario?.name ?? "") || email !== (usuario?.email ?? "") || senha !== "" ||
    [...papeis].sort().join() !== [...(usuario?.papeis ?? ["PROFESSOR"])].sort().join()
  const protegida = !!usuario?.protegida

  const alternar = (c: CodigoPapel) => setPapeis((atual) => (atual.includes(c) ? atual.filter((p) => p !== c) : [...atual, c]))

  async function salvar() {
    setSalvando(true)
    setErro("")
    try {
      const corpo: Record<string, unknown> = { name: nome, email, papeis: papeis.filter((p) => PAPEIS_ATRIBUIVEIS.includes(p)) }
      if (isEdit && senha.trim()) corpo.password = senha
      const res = await fetch(isEdit ? `/api/usuarios/${usuario?.id}` : "/api/usuarios", {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(corpo),
      })
      if (res.ok) {
        router.push("/dashboard/usuarios")
        router.refresh()
        return
      }
      const data = await res.json().catch(() => ({}))
      setErro(`${data.message || "Erro ao salvar"}${data.detail ? `: ${data.detail}` : ""}`)
    } catch {
      setErro("Erro ao conectar com o servidor")
    } finally {
      setSalvando(false)
      setConfirmar(false)
    }
  }

  const papeisExtras = (usuario?.papeis ?? []).filter((p) => !PAPEIS_ATRIBUIVEIS.includes(p))

  return (
    <div className="max-w-leitura space-y-4 pb-24">
      {/* Na edição, nome e abas vêm da ficha do usuário (layout) */}
      {!isEdit && <CabecalhoPagina titulo="Novo usuário" descricao="A senha provisória é enviada por e-mail." />}

      {protegida && (
        <Alert tone="warning" title="Conta da plataforma">
          Esta conta administra a plataforma e só pode ser alterada por um administrador da plataforma.
        </Alert>
      )}
      {erro && <Alert tone="danger">{erro}</Alert>}

      <form
        onSubmit={(e) => { e.preventDefault(); setConfirmar(true) }}
        className="space-y-4"
      >
        <Card>
          <CardHeader title="1. Dados de acesso" />
          <CardBody className="grid gap-4 sm:grid-cols-2">
            <Field label="Nome completo" className="sm:col-span-2">
              {(p) => <Input {...p} required value={nome} disabled={protegida} onChange={(e) => setNome(e.target.value)} autoComplete="name" />}
            </Field>
            <Field label="E-mail" hint="Também é o usuário de acesso">
              {(p) => <Input {...p} type="email" required value={email} disabled={protegida} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />}
            </Field>
            {isEdit ? (
              <Field label="Nova senha" opcional hint="Deixe em branco para manter a atual">
                {(p) => <PasswordInput {...p} value={senha} disabled={protegida} onChange={(e) => setSenha(e.target.value)} autoComplete="new-password" />}
              </Field>
            ) : (
              <div className="flex items-start gap-2 self-end rounded-lg bg-accent-subtle px-3 py-2.5 text-13 text-accent-fg">
                <Mail size={16} strokeWidth={1.75} className="mt-0.5 shrink-0" aria-hidden />
                <span>Uma senha provisória será gerada e enviada para este e-mail.</span>
              </div>
            )}
          </CardBody>
          {isEdit && (
            <CardFooter className="justify-between text-13 text-fg-muted">
              <span>Último acesso</span>
              <span className="text-fg">{formatarAcesso(usuario?.lastLogin)}</span>
            </CardFooter>
          )}
        </Card>

        <Card>
          <CardHeader title="2. Papéis" description="Escolha um ou mais. A conta soma o que cada papel libera." />
          <CardBody>
            <fieldset disabled={protegida}>
              <legend className="sr-only">Papéis da conta</legend>
              <ul className="grid gap-2 sm:grid-cols-2">
                {PAPEIS_ATRIBUIVEIS.map((c) => {
                  const def = PAPEIS_SISTEMA[c]
                  const Icone = ICONE_PAPEL[c] ?? ShieldCheck
                  const ativo = papeis.includes(c)
                  return (
                    <li key={c}>
                      <label
                        className={cn(
                          "flex h-full cursor-pointer items-start gap-3 rounded-xl border p-3 transition-colors duration-150",
                          "has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-ring/40",
                          ativo ? "border-accent bg-accent-subtle" : "border-line bg-surface hover:border-line-strong",
                          protegida && "cursor-not-allowed opacity-60"
                        )}
                      >
                        <input type="checkbox" className="sr-only" checked={ativo} onChange={() => alternar(c)} />
                        <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-lg", ativo ? "bg-accent text-on-accent" : "bg-subtle text-fg-muted")}>
                          <Icone size={18} strokeWidth={1.75} aria-hidden />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-medium text-fg">{def.nome}</span>
                          <span className="mt-0.5 block text-13 text-fg-muted">{def.descricao}</span>
                        </span>
                        <span aria-hidden className={cn("mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border", ativo ? "border-accent bg-accent text-on-accent" : "border-line-strong")}>
                          {ativo && <Check size={12} strokeWidth={2.5} />}
                        </span>
                      </label>
                    </li>
                  )
                })}
              </ul>
            </fieldset>
            {papeisExtras.length > 0 && (
              <p className="mt-3 text-13 text-fg-muted">
                Também tem: {papeisExtras.map((p) => PAPEIS_SISTEMA[p].nome).join(", ")} (não muda por aqui).
              </p>
            )}
            {papeis.length === 0 && (
              <p className="mt-3 text-13 text-warning-fg">Sem papel nenhum, a conta entra mas não vê nenhuma tela além do início e das mensagens.</p>
            )}
          </CardBody>
        </Card>

        <BarraSalvar estado={<IndicadorGravacao pendente={alterado} salvando={salvando} />}>
          <Button variant="secondary" onClick={() => router.push(isEdit && usuario ? `/dashboard/usuarios/${usuario.id}` : "/dashboard/usuarios")}>Cancelar</Button>
          <Button type="submit" disabled={protegida} loading={salvando}>{isEdit ? "Salvar alterações" : "Criar usuário"}</Button>
        </BarraSalvar>
      </form>

      <Dialog
        open={confirmar}
        onClose={() => setConfirmar(false)}
        title={isEdit ? "Salvar alterações?" : "Criar usuário?"}
        description={papeis.length ? `Papéis: ${papeis.map((p) => PAPEIS_SISTEMA[p].nome).join(", ")}` : "A conta ficará sem papel."}
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmar(false)}>Voltar</Button>
            <Button onClick={salvar} loading={salvando}>Confirmar</Button>
          </>
        }
      />
    </div>
  )
}
