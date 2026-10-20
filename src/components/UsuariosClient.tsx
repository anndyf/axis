"use client"

import { useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  Shield, GraduationCap, PauseCircle, Clock, CheckCircle2,
  CheckCheck, Loader2, X, Users, Search, Filter, Accessibility, ShieldCheck, ClipboardList, BookOpen
} from "lucide-react"
import { Avatar } from "@/components/ui"
import UserActions from "./UserActions"
import { PAPEIS_SISTEMA, type CodigoPapel } from "@/lib/permissoes"

/** Selo de cada papel na lista (Direção, Secretaria e Coordenação ganharam selo na fase 3b). */
const SELO_PAPEL: Partial<Record<CodigoPapel, { rotulo: string; classe: string; icone: typeof Shield }>> = {
  ADMINISTRADOR: { rotulo: "Admin", classe: "bg-accent-subtle text-accent-fg border-accent/25", icone: Shield },
  DIRECAO: { rotulo: "Direção", classe: "bg-accent-subtle text-accent-fg border-accent/25", icone: ShieldCheck },
  SECRETARIA: { rotulo: "Secretaria", classe: "bg-info-subtle text-info-fg border-info-line", icone: ClipboardList },
  COORDENACAO: { rotulo: "Coordenação", classe: "bg-info-subtle text-info-fg border-info-line", icone: BookOpen },
  PROFESSOR: { rotulo: "Professor", classe: "bg-subtle-hover text-fg border-line-strong", icone: GraduationCap },
  AEE: { rotulo: "AEE", classe: "bg-success-subtle text-success-fg border-success-line", icone: Accessibility },
}

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
      setResultMsg({ text: 'Erro de conexão com o servidor', ok: false })
    } finally {
      setAprovando(false)
    }
  }

  return (
    <>
      {/* Cards de contadores */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        {/* Total */}
        <button
          onClick={() => setFiltroStatus('todos')}
          className={`p-4 rounded-lg border text-left transition-all ${
            filtroStatus === 'todos'
              ? 'bg-accent-subtle border-accent'
              : 'bg-surface border-line hover:border-line-strong hover:shadow-sm'
          }`}
        >
          <Users className={`w-4 h-4 mb-2 ${filtroStatus === 'todos' ? 'text-fg-muted' : 'text-fg-subtle'}`} />
          <p className={`text-2xl font-semibold leading-none ${filtroStatus === 'todos' ? 'text-fg' : 'text-fg'}`}>{stats.total}</p>
          <p className={`text-xs font-bold mt-1 ${filtroStatus === 'todos' ? 'text-fg-muted' : 'text-fg-subtle'}`}>Total</p>
        </button>

        {/* Ativos */}
        <button
          onClick={() => setFiltroStatus('ativos')}
          className={`p-4 rounded-lg border text-left transition-all ${
            filtroStatus === 'ativos'
              ? 'bg-success-subtle border-success'
              : 'bg-surface border-line hover:border-success-line hover:shadow-sm'
          }`}
        >
          <CheckCircle2 className={`w-4 h-4 mb-2 ${filtroStatus === 'ativos' ? 'text-fg-muted' : 'text-success-fg'}`} />
          <p className={`text-2xl font-semibold leading-none ${filtroStatus === 'ativos' ? 'text-fg' : 'text-fg'}`}>{stats.ativos}</p>
          <p className={`text-xs font-bold mt-1 ${filtroStatus === 'ativos' ? 'text-fg-muted' : 'text-fg-subtle'}`}>Ativos</p>
        </button>

        {/* Pendentes */}
        <button
          onClick={() => setFiltroStatus('pendentes')}
          className={`p-4 rounded-lg border text-left transition-all relative ${
            filtroStatus === 'pendentes'
              ? 'bg-warning-subtle border-warning'
              : 'bg-surface border-line hover:border-warning-line hover:shadow-sm'
          }`}
        >
          {stats.pendentes > 0 && filtroStatus !== 'pendentes' && (
            <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-warning animate-ping" />
          )}
          <Clock className={`w-4 h-4 mb-2 ${filtroStatus === 'pendentes' ? 'text-fg-muted' : 'text-warning-fg'}`} />
          <p className={`text-2xl font-semibold leading-none ${filtroStatus === 'pendentes' ? 'text-fg' : 'text-fg'}`}>{stats.pendentes}</p>
          <p className={`text-xs font-bold mt-1 ${filtroStatus === 'pendentes' ? 'text-fg-muted' : 'text-fg-subtle'}`}>Pendentes</p>
        </button>

        {/* Pausados */}
        <div className="p-4 rounded-lg border border-line bg-surface text-left">
          <PauseCircle className="w-4 h-4 mb-2 text-danger" />
          <p className="text-2xl font-semibold leading-none text-fg">{stats.pausados}</p>
          <p className="text-xs font-bold mt-1 text-fg-subtle">Pausados</p>
        </div>

        {/* Professores */}
        <div className="p-4 rounded-lg border border-line bg-surface text-left">
          <GraduationCap className="w-4 h-4 mb-2 text-accent-fg" />
          <p className="text-2xl font-semibold leading-none text-fg">{stats.professores}</p>
          <p className="text-xs font-bold mt-1 text-fg-subtle">Professores</p>
        </div>

        {/* Admins */}
        <div className="p-4 rounded-lg border border-line bg-surface text-left">
          <Shield className="w-4 h-4 mb-2 text-accent-fg" />
          <p className="text-2xl font-semibold leading-none text-fg">{stats.admins}</p>
          <p className="text-xs font-bold mt-1 text-fg-subtle">Admins</p>
        </div>
      </div>
      {/* Barra de ferramentas */}
      <div className="flex flex-col sm:flex-row items-center gap-3 mb-4">
        {/* Busca */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-fg-subtle" />
          <input
            type="text"
            placeholder="Buscar por nome, e-mail ou @username..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-surface border border-line rounded-xl text-sm focus:ring-2 focus:ring-ring outline-none transition-all"
          />
        </div>

        {/* Filtro de status */}
        <div className="relative shrink-0">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-fg-subtle" />
          <select
            value={filtroStatus}
            onChange={e => setFiltroStatus(e.target.value as any)}
            className="pl-8 pr-4 py-2.5 bg-surface border border-line rounded-xl text-sm font-semibold text-fg-muted focus:ring-2 focus:ring-ring outline-none appearance-none cursor-pointer transition-all"
          >
            <option value="todos">Todos</option>
            <option value="pendentes">Pendentes ({totalPendentes})</option>
            <option value="ativos">Ativos</option>
          </select>
        </div>

        {/* Botão atalho: selecionar todos pendentes */}
        {totalPendentes > 0 && (
          <button
            onClick={selecionarTodosPendentes}
            className="shrink-0 flex items-center gap-2 px-4 py-2.5 bg-warning-subtle hover:bg-warning-subtle border border-warning-line text-warning-fg text-xs font-bold rounded-xl transition-all"
          >
            <Clock className="w-3.5 h-3.5" />
            Selecionar {totalPendentes} pendente{totalPendentes !== 1 ? 's' : ''}
          </button>
        )}
      </div>

      {/* Tabela */}
      <div className="bg-surface rounded-xl shadow-card border border-line-strong overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-canvas border-b border-line-strong">
              <tr>
                {/* Checkbox selecionar todos */}
                <th className="pl-6 pr-2 py-4 w-10">
                  <input
                    type="checkbox"
                    checked={usuariosFiltrados.length > 0 && selectedIds.size === usuariosFiltrados.length}
                    ref={el => {
                      if (el) el.indeterminate =
                        selectedIds.size > 0 && selectedIds.size < usuariosFiltrados.length
                    }}
                    onChange={toggleSelectAll}
                    className="w-4 h-4 rounded cursor-pointer accent-[var(--accent)]"
                  />
                </th>
                <th className="px-4 py-4 text-left text-xs font-medium text-fg-muted">Usuário</th>
                <th className="px-6 py-4 text-center text-xs font-medium text-fg-muted">Função & Status</th>
                <th className="px-6 py-4 text-center text-xs font-medium text-fg-muted">Permissões</th>
                <th className="px-6 py-4 text-right text-xs font-medium text-fg-muted">Gerenciamento</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {usuariosFiltrados.map((usuario) => (
                <tr
                  key={usuario.id}
                  onClick={() => toggleSelect(usuario.id)}
                  className={`transition-colors cursor-pointer
                    ${selectedIds.has(usuario.id) ? 'bg-accent-subtle' : ''}
                    ${!selectedIds.has(usuario.id) && !usuario.isActive ? 'opacity-60 bg-subtle' : ''}
                    ${!selectedIds.has(usuario.id) ? 'hover:bg-canvas' : ''}
                  `}
                >
                  {/* Checkbox */}
                  <td className="pl-6 pr-2 py-4 w-10" onClick={e => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selectedIds.has(usuario.id)}
                      onChange={() => toggleSelect(usuario.id)}
                      className="w-4 h-4 rounded cursor-pointer accent-[var(--accent)]"
                    />
                  </td>

                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <Avatar nome={usuario.name} className={!usuario.isActive ? 'opacity-50' : undefined} />
                      <div className="ml-3">
                        <div className="flex items-center gap-2">
                          <div className={`text-sm font-medium tracking-tight ${!usuario.isActive ? 'text-fg-muted' : 'text-fg'}`}>
                            {usuario.name || 'Sem nome'}
                          </div>
                          {!usuario.isApproved && (
                            <span className="flex h-2 w-2 rounded-full bg-warning animate-ping" />
                          )}
                        </div>
                        <div className="text-xs text-fg-muted font-medium tracking-tight">{usuario.email}</div>
                        <div className="text-xs text-fg-subtle font-medium mt-0.5">
                          @{usuario.username}
                        </div>
                      </div>
                    </div>
                  </td>

                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <div className="flex flex-col items-center gap-1.5">
                      <div className="flex flex-wrap items-center justify-center gap-1.5">
                        {!usuario.isApproved ? (
                          <span className="px-2.5 py-0.5 inline-flex items-center text-xs font-medium rounded-full bg-warning-subtle text-warning-fg border border-warning-line">
                            <Clock className="w-3 h-3 mr-1" />
                            Solicitação
                          </span>
                        ) : (
                          <>
                            {usuario.papeis.map((c) => {
                              const selo = SELO_PAPEL[c]
                              if (!selo) return null
                              const Icone = selo.icone
                              return (
                                <span key={c} title={PAPEIS_SISTEMA[c].nome} className={`px-2.5 py-0.5 inline-flex items-center text-xs font-medium rounded-full border ${selo.classe}`}>
                                  <Icone className="w-3 h-3 mr-1" />{selo.rotulo}
                                </span>
                              )
                            })}
                           </>
                        )}
                      </div>
                      {usuario.isApproved && !usuario.isActive && (
                        <span className="px-2.5 py-0.5 inline-flex items-center text-xs font-medium rounded-full bg-danger-subtle text-danger-fg border border-danger-line animate-pulse">
                          <PauseCircle className="w-3 h-3 mr-1" />Acesso Pausado
                        </span>
                      )}
                      {usuario.isApproved && usuario.isActive && (
                        <span className="px-2.5 py-0.5 inline-flex items-center text-xs font-medium rounded-full bg-success-subtle text-success-fg border border-success-line">
                          <CheckCircle2 className="w-3 h-3 mr-1" />Ativo
                        </span>
                      )}
                    </div>
                  </td>

                  <td className="px-6 py-4 whitespace-nowrap text-center text-sm">
                    {usuario.papeis.includes('ADMINISTRADOR') ? (
                      <span className="text-fg-muted font-medium text-xs bg-canvas px-3 py-1 rounded-lg border border-line">Controle Total</span>
                    ) : !usuario.isApproved ? (
                      <span className="text-fg-subtle italic text-xs font-medium">A aguardar</span>
                    ) : (
                      <span className="font-medium text-fg-muted text-xs">
                        {usuario._count.disciplinasPermitidas} <span className="text-xs font-medium text-fg-subtle">Disciplinas</span>
                      </span>
                    )}
                  </td>

                  <td className="px-6 py-4 whitespace-nowrap" onClick={e => e.stopPropagation()}>
                    <UserActions
                      userId={usuario.id}
                      userName={usuario.name || ''}
                      isActive={usuario.isActive}
                      isApproved={usuario.isApproved}
                      isSuperuser={usuario.papeis.includes('ADMINISTRADOR')}
                      isStaff={usuario.papeis.includes('PROFESSOR')}
                    />
                  </td>
                </tr>
              ))}

              {usuariosFiltrados.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-20 text-center">
                    <Users className="w-10 h-10 text-fg-disabled mx-auto mb-3" />
                    <p className="text-sm font-semibold text-fg-subtle">Nenhum usuário encontrado</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

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
