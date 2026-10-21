"use client"

import { useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Clock, CheckCheck, Loader2, X } from "lucide-react"
import { Badge, Button, Painel, RodapeTabela, Table, TableContainer, TableEmpty, TBody, TD, TH, THead, TR, type BadgeTone } from "@/components/ui"
import { BarraFerramentas } from "@/components/ui/BarraFerramentas"
import { Fichas } from "@/components/ui/Fichas"
import { baixarCSV } from "@/lib/navegador/csv"
import UserActions from "./UserActions"
import { PAPEIS_SISTEMA, type CodigoPapel } from "@/lib/permissoes"

/** Selo de cada papel na lista (Direção, Secretaria e Coordenação ganharam selo na fase 3b). */
const SELO_PAPEL: Partial<Record<CodigoPapel, { rotulo: string; tom: BadgeTone }>> = {
  ADMINISTRADOR: { rotulo: "Administrador", tom: "accent" },
  DIRECAO: { rotulo: "Direção", tom: "accent" },
  SECRETARIA: { rotulo: "Secretaria", tom: "info" },
  COORDENACAO: { rotulo: "Coordenação", tom: "info" },
  PROFESSOR: { rotulo: "Professor", tom: "neutral" },
  AEE: { rotulo: "AEE", tom: "success" },
}

const situacao = (u: { isApproved: boolean; isActive: boolean }) => (!u.isApproved ? "Aguardando aprovação" : u.isActive ? "Ativo" : "Acesso pausado")

interface Usuario {
  id: string
  name: string | null
  email: string
  username: string | null
  isActive: boolean
  isApproved: boolean
  papeis: CodigoPapel[]
  _count: { disciplinasPermitidas: number }
}

interface UsuariosClientProps {
  usuarios: Usuario[]
}

export default function UsuariosClient({ usuarios }: UsuariosClientProps) {
  const router = useRouter()
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [aprovando, setAprovando] = useState(false)
  const [resultMsg, setResultMsg] = useState<{ text: string; ok: boolean } | null>(null)
  const [search, setSearch] = useState("")
  const [filtroStatus, setFiltroStatus] = useState<"todos" | "pendentes" | "ativos">("todos")

  // Filtragem
  const usuariosFiltrados = useMemo(() => {
    return usuarios.filter(u => {
      const matchSearch =
        !search ||
        (u.name?.toLowerCase().includes(search.toLowerCase())) ||
        (u.email.toLowerCase().includes(search.toLowerCase())) ||
        (u.username?.toLowerCase().includes(search.toLowerCase()))

      const matchStatus =
        filtroStatus === "todos" ||
        (filtroStatus === "pendentes" && !u.isApproved) ||
        (filtroStatus === "ativos" && u.isApproved && u.isActive)

      return matchSearch && matchStatus
    })
  }, [usuarios, search, filtroStatus])

  // Só pendentes podem ser aprovados em massa
  const pendentesSelecionados = Array.from(selectedIds).filter(id =>
    usuarios.find(u => u.id === id && !u.isApproved)
  )
  const totalPendentes = usuarios.filter(u => !u.isApproved).length

  // Contadores gerais (sempre sobre a lista completa)
  const stats = useMemo(() => ({
    total:      usuarios.length,
    ativos:     usuarios.filter(u => u.isApproved && u.isActive).length,
    pendentes:  usuarios.filter(u => !u.isApproved).length,
    pausados:   usuarios.filter(u => u.isApproved && !u.isActive).length,
    professores:usuarios.filter(u => u.papeis.includes('PROFESSOR') && !u.papeis.includes('ADMINISTRADOR') && u.isApproved).length,
    admins:     usuarios.filter(u => u.papeis.includes('ADMINISTRADOR')).length,
  }), [usuarios])

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const s = new Set(prev)
      s.has(id) ? s.delete(id) : s.add(id)
      return s
    })
  }

  const toggleSelectAll = () => {
    if (selectedIds.size === usuariosFiltrados.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(usuariosFiltrados.map(u => u.id)))
    }
  }

  const selecionarTodosPendentes = () => {
    setSelectedIds(new Set(usuarios.filter(u => !u.isApproved).map(u => u.id)))
  }

  const handleAprovarEmMassa = async () => {
    if (pendentesSelecionados.length === 0) return
    if (!confirm(`Aprovar ${pendentesSelecionados.length} usuário(s)? Uma senha será gerada e enviada por e-mail para cada um.`)) return

    setAprovando(true)
    setResultMsg(null)
    try {
      const res = await fetch('/api/usuarios/aprovar-em-massa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: pendentesSelecionados })
      })
      const data = await res.json()

      setResultMsg({ text: data.message, ok: res.ok })
      setTimeout(() => setResultMsg(null), 6000)
      setSelectedIds(new Set())
      router.refresh()
    } catch {
      setResultMsg({ text: 'Não foi possível conectar ao servidor. Tente novamente.', ok: false })
    } finally {
      setAprovando(false)
    }
  }

  return (
    <>
      <Painel semRecuo>
        <BarraFerramentas
          noPainel
          busca={{ valor: search, onChange: setSearch, placeholder: "Buscar por nome, e-mail ou usuário" }}
          filtros={
            <>
              <Fichas
                compactas
                rotulo="Situação"
                valor={filtroStatus}
                onChange={setFiltroStatus}
                opcoes={[
                  { valor: "todos", rotulo: "Todos", contagem: stats.total },
                  { valor: "ativos", rotulo: "Ativos", contagem: stats.ativos },
                  { valor: "pendentes", rotulo: "Pendentes", contagem: stats.pendentes },
                ]}
              />
              {totalPendentes > 0 && (
                <Button variant="ghost" size="sm" onClick={selecionarTodosPendentes}>
                  <Clock size={14} strokeWidth={1.75} aria-hidden /> Selecionar {totalPendentes} pendente{totalPendentes !== 1 ? 's' : ''}
                </Button>
              )}
            </>
          }
          onExportar={() => baixarCSV("Usuarios", [
            { titulo: "Nome", valor: (u: Usuario) => u.name },
            { titulo: "E-mail", valor: (u: Usuario) => u.email },
            { titulo: "Usuário", valor: (u: Usuario) => u.username },
            { titulo: "Papéis", valor: (u: Usuario) => u.papeis.map((c) => PAPEIS_SISTEMA[c]?.nome ?? c).join(", ") },
            { titulo: "Situação", valor: (u: Usuario) => situacao(u) },
            { titulo: "Disciplinas", valor: (u: Usuario) => u._count.disciplinasPermitidas },
          ], usuariosFiltrados)}
        />
        <TableContainer semBorda>
          <Table className="min-w-[44rem]">
            <THead>
              <TR>
                <TH className="w-10 pl-painel pr-0">
                  <input
                    type="checkbox"
                    aria-label="Selecionar todos da lista"
                    checked={usuariosFiltrados.length > 0 && selectedIds.size === usuariosFiltrados.length}
                    ref={el => {
                      if (el) el.indeterminate =
                        selectedIds.size > 0 && selectedIds.size < usuariosFiltrados.length
                    }}
                    onChange={toggleSelectAll}
                    className="size-4 cursor-pointer rounded accent-[var(--accent)]"
                  />
                </TH>
                <TH>Nome</TH>
                <TH>Usuário</TH>
                <TH>Papéis</TH>
                <TH>Situação</TH>
                <TH numeric>Disciplinas</TH>
                <TH className="text-right"><span className="sr-only">Ações</span></TH>
              </TR>
            </THead>
            <TBody>
              {usuariosFiltrados.map((usuario) => (
                <TR
                  key={usuario.id}
                  onClick={() => toggleSelect(usuario.id)}
                  selecionada={selectedIds.has(usuario.id)}
                  className={!usuario.isActive && !selectedIds.has(usuario.id) ? "text-fg-muted" : undefined}
                >
                  <TD className="w-10 pl-painel pr-0" onClick={e => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      aria-label={`Selecionar ${usuario.name || usuario.email}`}
                      checked={selectedIds.has(usuario.id)}
                      onChange={() => toggleSelect(usuario.id)}
                      className="size-4 cursor-pointer rounded accent-[var(--accent)]"
                    />
                  </TD>
                  <TD>
                    <Link href={`/dashboard/usuarios/${usuario.id}`} onClick={e => e.stopPropagation()} className={`font-medium hover:underline ${usuario.isActive ? "text-fg" : "text-fg-muted"}`}>
                      {usuario.name || "Sem nome"}
                    </Link>
                    <span className="block text-xs text-fg-muted">{usuario.email}</span>
                  </TD>
                  <TD className="font-mono text-fg-muted">{usuario.username}</TD>
                  <TD>
                    <div className="flex flex-wrap gap-1">
                      {usuario.isApproved ? usuario.papeis.map((c) => SELO_PAPEL[c] ? <Badge key={c} tone={SELO_PAPEL[c]!.tom} title={PAPEIS_SISTEMA[c].nome}>{SELO_PAPEL[c]!.rotulo}</Badge> : null) : <span className="text-fg-subtle">—</span>}
                    </div>
                  </TD>
                  <TD>
                    {!usuario.isApproved
                      ? <Badge tone="warning" dot>Aguardando aprovação</Badge>
                      : usuario.isActive ? <Badge tone="success" dot>Ativo</Badge> : <Badge tone="danger" dot>Acesso pausado</Badge>}
                  </TD>
                  <TD numeric className="text-fg-muted">
                    {usuario.papeis.includes('ADMINISTRADOR') ? <span className="text-xs">Acesso total</span> : usuario.isApproved ? usuario._count.disciplinasPermitidas : "—"}
                  </TD>
                  <TD className="w-0 whitespace-nowrap" onClick={e => e.stopPropagation()}>
                    <UserActions
                      userId={usuario.id}
                      userName={usuario.name || ''}
                      isActive={usuario.isActive}
                      isApproved={usuario.isApproved}
                      isSuperuser={usuario.papeis.includes('ADMINISTRADOR')}
                      isStaff={usuario.papeis.includes('PROFESSOR')}
                    />
                  </TD>
                </TR>
              ))}
              {usuariosFiltrados.length === 0 && <TableEmpty colSpan={7}>Nenhum usuário encontrado com estes filtros.</TableEmpty>}
            </TBody>
          </Table>
        </TableContainer>
        <RodapeTabela total={usuariosFiltrados.length} singular="usuário" plural="usuários">
          {selectedIds.size > 0 && <span className="tabular-nums">{selectedIds.size} selecionado{selectedIds.size !== 1 ? "s" : ""}</span>}
        </RodapeTabela>
      </Painel>

      {/* Barra flutuante de aprovação em massa */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-[calc(var(--barra-inferior)+1.5rem)] left-1/2 -translate-x-1/2 z-50 animate-slide-up">
          <div className="flex items-center gap-4 bg-elevated text-fg px-4 py-2.5 rounded-xl shadow-overlay border border-line">
            {/* Contagem */}
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-accent text-on-accent flex items-center justify-center text-xs font-semibold tabular-nums shrink-0">
                {selectedIds.size}
              </div>
              <span className="text-13 font-medium whitespace-nowrap">
                {selectedIds.size === 1 ? 'usuário selecionado' : 'usuários selecionados'}
              </span>
            </div>

            <div className="w-px h-5 bg-line" />

            {/* Cancelar */}
            <button
              onClick={() => setSelectedIds(new Set())}
              className="text-13 font-medium text-fg-muted hover:text-fg transition-colors duration-150"
            >
              Cancelar
            </button>

            {/* Aprovar em massa (só aparece se há pendentes na seleção) */}
            {pendentesSelecionados.length > 0 && (
              <button
                onClick={handleAprovarEmMassa}
                disabled={aprovando}
                className="flex h-8 items-center gap-2 bg-accent hover:bg-accent-hover text-on-accent text-13 font-medium px-3 rounded-md transition-colors duration-150 disabled:opacity-50"
              >
                {aprovando
                  ? <Loader2 size={14} className="animate-spin" />
                  : <CheckCheck size={14} />}
                Aprovar {pendentesSelecionados.length > 1
                  ? `${pendentesSelecionados.length} pendentes`
                  : 'pendente'}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Toast de resultado */}
      {resultMsg && (
        <div className="fixed bottom-[calc(var(--barra-inferior)+1.5rem)] right-6 z-50 animate-slide-up">
          <div className={`flex items-center gap-3 bg-elevated text-fg px-4 py-3 rounded-lg shadow-overlay max-w-sm border border-line`} role="status">
            <div className={`w-7 h-7 rounded-md flex items-center justify-center shrink-0 ${resultMsg.ok ? 'bg-success-subtle text-success-fg' : 'bg-danger-subtle text-danger-fg'}`}>
              {resultMsg.ok ? <CheckCheck size={16} /> : <X size={16} />}
            </div>
            <p className="text-13 font-medium leading-tight flex-1">{resultMsg.text}</p>
            <button
              onClick={() => setResultMsg(null)}
              aria-label="Fechar aviso"
              className="shrink-0 rounded-md p-1 text-fg-subtle hover:bg-subtle hover:text-fg transition-colors duration-150"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      )}
    </>
  )
}
