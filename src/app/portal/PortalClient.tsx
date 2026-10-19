
"use client"

import { useState, useEffect } from "react"
import {
  LogOut,
  Bell,
  BookOpen,
  AlertTriangle,
  User as UserIcon,
  Calendar,
  Home,
  MessageSquare,
  ChevronRight,
  type LucideIcon
} from "lucide-react"
import { signOut } from "next-auth/react"
import { analyzeRisk } from "@/lib/risk-analysis"
import { formatarFrequencia } from "@/lib/services/frequencia"
import type { EtapaDaNota } from "@/lib/services/notas"
import MarkdownContent from "@/components/MarkdownContent"
import { Avatar, Badge, Button, Card, CardHeader, EmptyState, cn, type BadgeTone } from "@/components/ui"
import { Dialog } from "@/components/ui/Dialog"

type Aba = 'home' | 'messages' | 'grades' | 'profile'

const ABAS: { id: Aba; rotulo: string; icone: LucideIcon }[] = [
  { id: 'home', rotulo: 'Início', icone: Home },
  { id: 'messages', rotulo: 'Avisos', icone: MessageSquare },
  { id: 'grades', rotulo: 'Boletim', icone: BookOpen },
  { id: 'profile', rotulo: 'Perfil', icone: UserIcon },
]

// Nível de risco (src/lib/risk-analysis) → tom e rótulo
const RISCO: Record<string, { tom: BadgeTone; rotulo: string }> = {
  CRITICAL: { tom: 'danger', rotulo: 'Risco crítico' },
  HIGH: { tom: 'warning', rotulo: 'Risco alto' },
  MEDIUM: { tom: 'warning', rotulo: 'Atenção' },
  LOW: { tom: 'success', rotulo: 'Estável' },
  NONE: { tom: 'neutral', rotulo: 'Sem dados' },
}

const nota1 = (n: number | null | undefined) => (n === null || n === undefined ? '—' : n.toFixed(1).replace('.', ','))
const rotuloTurno = (t?: string | null) => (t ? t.charAt(0).toUpperCase() + t.slice(1).toLowerCase() : '—')
const dataBR = (d: string) => new Date(d).toLocaleDateString('pt-BR')

export default function PortalClient({ initialData, user, escola }: { initialData: any, user: { id: string }, escola: { nome: string; logoUrl: string | null } }) {
  const { estudante, mensagens = [], error, nomesEtapas = [], numUnidades = 3, notaMinimaAprovacao = 5, frequencia = null } = initialData
  const [selectedMessage, setSelectedMessage] = useState<any>(null)
  const [readMessageIds, setReadMessageIds] = useState<Set<string>>(new Set())
  const [isScheduleOpen, setIsScheduleOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<Aba>('home')

  useEffect(() => {
    if (user?.id) {
      const saved = localStorage.getItem(`portal_read_msgs_${user.id}`)
      if (saved) {
        try {
          setReadMessageIds(new Set(JSON.parse(saved)))
        } catch (e) {
          console.error("Failed to parse read messages", e)
        }
      }
    }
  }, [user?.id])

  const markAsRead = (id: string) => {
    if (!user?.id) return
    const newSet = new Set(readMessageIds)
    newSet.add(id)
    setReadMessageIds(newSet)
    localStorage.setItem(`portal_read_msgs_${user.id}`, JSON.stringify(Array.from(newSet)))
  }

  const isMessageNew = (msg: any) => !readMessageIds.has(msg.id)
  const hasUnreadMessages = mensagens.some((m: any) => isMessageNew(m))

  if (error) {
    return (
      <div className="min-h-dvh bg-canvas flex items-center justify-center p-4">
        <Card className="max-w-sm w-full">
          <EmptyState
            icon={AlertTriangle}
            title="Não foi possível carregar o portal"
            description={error}
            action={<Button variant="secondary" onClick={() => window.location.reload()}>Tentar novamente</Button>}
          />
        </Card>
      </div>
    )
  }

  const primeiroNome = estudante.nome.split(' ')[0]
  const naoLidas = mensagens.filter((m: any) => isMessageNew(m)).length
  const abaixoDoMinimo = frequencia && frequencia.geral.percentual !== null && frequencia.geral.percentual < frequencia.minimo
  const abrirMensagem = (msg: any) => { setSelectedMessage(msg); markAsRead(msg.id) }

  return (
    <div className="min-h-dvh bg-canvas flex flex-col text-fg">
      {/* Topo: marca da escola */}
      <header className="sticky top-0 z-40 border-b border-line bg-surface/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-5xl items-center gap-3 px-4 md:px-6">
          {escola.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={escola.logoUrl} alt="" className="size-8 shrink-0 rounded-md object-contain" />
          ) : (
            <span aria-hidden className="flex size-8 shrink-0 items-center justify-center rounded-md bg-accent text-sm font-semibold text-on-accent">
              {escola.nome.charAt(0).toUpperCase()}
            </span>
          )}
          <div className="min-w-0 flex-1 leading-tight">
            <p className="truncate text-sm font-semibold text-fg">{escola.nome}</p>
            <p className="truncate text-xs text-fg-subtle">Portal do estudante</p>
          </div>
          <button
            type="button"
            onClick={() => setActiveTab('messages')}
            aria-label={hasUnreadMessages ? `Avisos (${naoLidas} não lidos)` : 'Avisos'}
            className="relative rounded-md p-2 text-fg-subtle transition-colors duration-150 hover:bg-subtle hover:text-fg"
          >
            <Bell size={16} strokeWidth={1.75} />
            {hasUnreadMessages && <span aria-hidden className="absolute right-1.5 top-1.5 size-2 rounded-full bg-accent ring-2 ring-surface" />}
          </button>
          <button type="button" onClick={() => setActiveTab('profile')} aria-label="Meu perfil" className="rounded-full">
            <Avatar nome={estudante.nome} size="sm" />
          </button>
        </div>
        {/* Abas no desktop (no celular, barra inferior) */}
        <nav aria-label="Seções do portal" className="mx-auto hidden max-w-5xl gap-1 px-4 md:flex md:px-6">
          {ABAS.map(({ id, rotulo }) => (
            <button
              key={id}
              type="button"
              onClick={() => setActiveTab(id)}
              aria-current={activeTab === id ? 'page' : undefined}
              className={cn(
                '-mb-px border-b-2 px-3 py-2.5 text-13 font-medium transition-colors duration-150',
                activeTab === id ? 'border-accent text-fg' : 'border-transparent text-fg-muted hover:text-fg'
              )}
            >
              {rotulo}
              {id === 'messages' && naoLidas > 0 && <span className="ml-1.5 rounded-full bg-accent px-1.5 text-xs font-semibold text-on-accent tabular-nums">{naoLidas}</span>}
            </button>
          ))}
        </nav>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 pt-6 pb-28 md:px-6 md:pb-10 animate-fade-in">

        {/* Início */}
        {activeTab === 'home' && (
          <div className="space-y-4">
            <div>
              <h1 className="text-xl font-semibold tracking-tight text-fg">Olá, {primeiroNome}</h1>
              <p className="text-13 text-fg-muted">{estudante.turma.nome} · {rotuloTurno(estudante.turma.turno)} · {estudante.turma.anoLetivo}</p>
            </div>

            <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
              <div className="rounded-lg border border-line bg-surface p-4">
                <p className="text-xs text-fg-subtle">Minha turma</p>
                <p className="mt-1 text-xl font-semibold tracking-tight text-fg">{estudante.turma.nome}</p>
              </div>
              <div className={cn('rounded-lg border bg-surface p-4', abaixoDoMinimo ? 'border-danger-line' : 'border-line')}>
                <p className="text-xs text-fg-subtle">Frequência</p>
                <p className={cn('mt-1 text-xl font-semibold tracking-tight tabular-nums', abaixoDoMinimo ? 'text-danger-fg' : 'text-fg')}>
                  {frequencia ? formatarFrequencia(frequencia.geral.percentual) : '—'}
                </p>
                {frequencia && <p className="text-xs text-fg-subtle tabular-nums">{frequencia.geral.faltas} {frequencia.geral.faltas === 1 ? 'falta' : 'faltas'} · mínimo {frequencia.minimo}%</p>}
              </div>
              <button
                type="button"
                onClick={() => setIsScheduleOpen(true)}
                className="col-span-2 flex items-center gap-3 rounded-lg border border-line bg-surface p-4 text-left transition-colors duration-150 hover:border-line-strong md:col-span-1"
              >
                <Calendar size={16} strokeWidth={1.75} className="shrink-0 text-fg-subtle" aria-hidden />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium text-fg">Horário de aulas</span>
                  <span className="block text-xs text-fg-subtle">Quadro semanal da turma</span>
                </span>
                <ChevronRight size={16} strokeWidth={1.75} className="text-fg-disabled" aria-hidden />
              </button>
            </div>

            <Card>
              <CardHeader
                title="Avisos recentes"
                actions={mensagens.length > 0 ? <button type="button" onClick={() => setActiveTab('messages')} className="text-13 font-medium text-accent-fg hover:underline">Ver todos</button> : undefined}
              />
              {mensagens.length === 0 ? (
                <EmptyState icon={Bell} title="Nenhum aviso" description="Os comunicados da escola aparecem aqui." className="py-8" />
              ) : (
                <ul className="divide-y divide-line-subtle">
                  {mensagens.slice(0, 3).map((msg: any) => (
                    <li key={msg.id}>
                      <MensagemLinha msg={msg} nova={isMessageNew(msg)} onAbrir={() => abrirMensagem(msg)} />
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <button
              type="button"
              onClick={() => setActiveTab('grades')}
              className="flex w-full items-center gap-3 rounded-lg border border-line bg-surface p-4 text-left transition-colors duration-150 hover:border-line-strong"
            >
              <BookOpen size={16} strokeWidth={1.75} className="shrink-0 text-fg-subtle" aria-hidden />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium text-fg">Boletim</span>
                <span className="block text-xs text-fg-subtle">Notas por unidade, médias e alertas de risco.</span>
              </span>
              <ChevronRight size={16} strokeWidth={1.75} className="text-fg-disabled" aria-hidden />
            </button>
          </div>
        )}

        {/* Avisos */}
        {activeTab === 'messages' && (
          <div className="space-y-4">
            <h1 className="text-xl font-semibold tracking-tight text-fg">Avisos</h1>
            <Card>
              {mensagens.length > 0 ? (
                <ul className="divide-y divide-line-subtle">
                  {mensagens.map((msg: any) => (
                    <li key={msg.id}>
                      <MensagemLinha msg={msg} nova={isMessageNew(msg)} onAbrir={() => abrirMensagem(msg)} completa />
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyState icon={Bell} title="Nada por aqui" description="Os comunicados da escola aparecem aqui." />
              )}
            </Card>
          </div>
        )}

        {/* Boletim */}
        {activeTab === 'grades' && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-end justify-between gap-2">
              <h1 className="text-xl font-semibold tracking-tight text-fg">Boletim</h1>
              {frequencia && (
                <p className={cn('text-13 tabular-nums', abaixoDoMinimo ? 'font-medium text-danger-fg' : 'text-fg-muted')}>
                  Frequência {formatarFrequencia(frequencia.geral.percentual)} · {frequencia.geral.faltas} {frequencia.geral.faltas === 1 ? 'falta' : 'faltas'} · mínimo {frequencia.minimo}%
                </p>
              )}
            </div>
            <Card className="overflow-hidden">
              {estudante.notas.length === 0 ? (
                <EmptyState icon={BookOpen} title="Nenhuma nota lançada ainda" description="As notas aparecem aqui assim que os professores lançarem." />
              ) : (
                <div className="relative overflow-x-auto">
                  <table className="w-full min-w-[34rem] text-13">
                    <thead>
                      <tr className="border-b border-line text-xs text-fg-subtle">
                        <th scope="col" className="sticky left-0 h-9 bg-surface px-4 text-left font-medium">Disciplina</th>
                        {nomesEtapas.map((nome: string, i: number) => (
                          <th key={i} scope="col" title={nome} className="h-9 px-3 text-right font-medium">U{i + 1}</th>
                        ))}
                        <th scope="col" className="h-9 px-3 text-right font-medium text-fg-muted">Média</th>
                        {frequencia && <th scope="col" title="Frequência na disciplina" className="h-9 px-3 text-right font-medium">Freq.</th>}
                        <th scope="col" className="h-9 px-4 text-left font-medium">Situação</th>
                      </tr>
                    </thead>
                    <tbody>
                      {estudante.notas.map((nota: any) => {
                        const risk = analyzeRisk(nota.etapas.map((e: EtapaDaNota) => e.nota), numUnidades, notaMinimaAprovacao)
                        const r = RISCO[risk.level] ?? RISCO.NONE
                        const f = frequencia?.porDisciplina[nota.disciplinaId]
                        return (
                          <tr key={nota.id} className="border-b border-line-subtle last:border-0">
                            <td className="sticky left-0 h-10 bg-surface px-4 font-medium text-fg">{nota.disciplina.nome}</td>
                            {nota.etapas.map((etapa: EtapaDaNota, i: number) => (
                              <td key={i} className={cn('h-10 px-3 text-right tabular-nums', etapa.nota === null ? 'text-fg-disabled' : etapa.nota >= notaMinimaAprovacao ? 'text-fg-muted' : 'text-danger-fg')}>
                                {nota1(etapa.nota)}
                              </td>
                            ))}
                            <td className={cn('h-10 px-3 text-right font-semibold tabular-nums', nota.nota >= notaMinimaAprovacao ? 'text-fg' : 'text-danger-fg')}>
                              {nota1(nota.nota)}
                            </td>
                            {frequencia && (
                              <td className={cn('h-10 px-3 text-right tabular-nums', f?.percentual != null && f.percentual < frequencia.minimo ? 'font-medium text-danger-fg' : 'text-fg-muted')} title={f ? `${f.faltas} faltas em ${f.aulas} aulas` : undefined}>
                                {formatarFrequencia(f?.percentual ?? null)}
                              </td>
                            )}
                            <td className="h-10 px-4"><Badge tone={r.tom} dot>{r.rotulo}</Badge></td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </div>
        )}

        {/* Perfil */}
        {activeTab === 'profile' && (
          <div className="mx-auto max-w-md space-y-4">
            <Card className="p-5">
              <div className="flex items-center gap-3">
                <Avatar nome={estudante.nome} size="lg" />
                <div className="min-w-0">
                  <h1 className="truncate text-base font-semibold text-fg">{estudante.nome}</h1>
                  <p className="font-mono text-xs text-fg-subtle">{estudante.matricula}</p>
                </div>
              </div>
              <dl className="mt-5 grid grid-cols-2 gap-3 border-t border-line-subtle pt-4 text-13">
                <div>
                  <dt className="text-xs text-fg-subtle">Turma</dt>
                  <dd className="font-medium text-fg">{estudante.turma.nome}</dd>
                </div>
                <div>
                  <dt className="text-xs text-fg-subtle">Turno</dt>
                  <dd className="font-medium text-fg">{rotuloTurno(estudante.turma.turno)}</dd>
                </div>
              </dl>
            </Card>
            <Button variant="secondary" className="w-full text-danger-fg" onClick={() => signOut({ callbackUrl: "/login" })}>
              <LogOut size={16} strokeWidth={1.75} /> Sair
            </Button>
          </div>
        )}

        <footer className="mt-10 text-center text-xs text-fg-subtle">
          <p>{escola.nome} · Áxis {estudante.turma.anoLetivo}</p>
          <p className="mt-1">Desenvolvido por <span className="text-fg-muted">Andressa Mirella</span></p>
        </footer>
      </main>

      {/* Barra inferior (celular) */}
      <nav aria-label="Seções do portal" className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
        <ul className="mx-auto grid max-w-md grid-cols-4">
          {ABAS.map(({ id, rotulo, icone: Icone }) => {
            const ativa = activeTab === id
            return (
              <li key={id}>
                <button
                  type="button"
                  onClick={() => setActiveTab(id)}
                  aria-current={ativa ? 'page' : undefined}
                  className={cn('relative flex h-14 w-full flex-col items-center justify-center gap-0.5 text-xs font-medium transition-colors duration-150', ativa ? 'text-accent-fg' : 'text-fg-subtle')}
                >
                  <Icone size={18} strokeWidth={1.75} aria-hidden />
                  {rotulo}
                  {id === 'messages' && hasUnreadMessages && <span aria-hidden className="absolute right-[calc(50%-14px)] top-2.5 size-2 rounded-full bg-accent ring-2 ring-surface" />}
                </button>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* Comunicado */}
      <Dialog
        open={!!selectedMessage}
        onClose={() => setSelectedMessage(null)}
        size="lg"
        title={selectedMessage?.subject ?? ''}
        description={selectedMessage ? (
          <>
            {new Date(selectedMessage.createdAt).toLocaleDateString('pt-BR')} às {new Date(selectedMessage.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
            {selectedMessage.sender?.name && <> · {selectedMessage.sender.name}</>}
          </>
        ) : undefined}
        footer={<Button variant="secondary" onClick={() => setSelectedMessage(null)}>Fechar</Button>}
      >
        {selectedMessage && (
          <div className="prose prose-zinc max-w-none text-fg-muted leading-relaxed whitespace-pre-wrap">
            <MarkdownContent content={selectedMessage.content} />
          </div>
        )}
      </Dialog>

      {/* Horário de aulas */}
      <Dialog
        open={isScheduleOpen}
        onClose={() => setIsScheduleOpen(false)}
        size="xl"
        title="Horário de aulas"
        description={estudante.turma.nome}
        footer={<Button variant="secondary" onClick={() => setIsScheduleOpen(false)}>Fechar</Button>}
      >
        <div className="relative -mx-5 overflow-x-auto px-5">
          <table className="w-full min-w-[40rem] border-collapse text-13">
            <thead>
              <tr className="border-b border-line text-xs text-fg-subtle">
                <th scope="col" className="h-9 w-12 px-2 text-left font-medium">Aula</th>
                {["Seg", "Ter", "Qua", "Qui", "Sex"].map((day) => (
                  <th key={day} scope="col" className="h-9 px-2 text-left font-medium">{day}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[1, 2, 3, 4, 5, 6].map(period => (
                <tr key={period} className="border-b border-line-subtle last:border-0">
                  <td className="px-2 py-2 align-top text-xs tabular-nums text-fg-subtle">{period}º</td>
                  {[1, 2, 3, 4, 5].map(day => {
                    const aula = estudante.turma.horarios?.find(
                        (h: any) => h.diaSemana === day && h.horario === period
                    )

                    // Tentar encontrar o professor se não estiver salvo na aula
                    let profName = aula?.professor
                    if (aula && (!profName || profName.trim() === "")) {
                      const normalizedAulaDisc = aula.disciplina.trim().toLowerCase()
                      const match = estudante.turma.disciplinas?.find((d: any) =>
                        d.nome.trim().toLowerCase() === normalizedAulaDisc
                      )
                      if (match && match.usuariosPermitidos?.length > 0) {
                        profName = match.usuariosPermitidos[0].name || match.usuariosPermitidos[0].username
                      } else {
                        // If no direct match, try to find a similar discipline name
                        const similarMatch = estudante.turma.disciplinas?.find((d: any) =>
                          normalizedAulaDisc.includes(d.nome.trim().toLowerCase()) || d.nome.trim().toLowerCase().includes(normalizedAulaDisc)
                        );
                        if (similarMatch && similarMatch.usuariosPermitidos?.length > 0) {
                          profName = similarMatch.usuariosPermitidos[0].name || similarMatch.usuariosPermitidos[0].username;
                        }
                      }
                    }

                    return (
                      <td key={day} className="px-2 py-2 align-top">
                        {aula ? (
                          <>
                            <p className="font-medium leading-tight text-fg">{aula.disciplina}</p>
                            {profName && profName.trim() !== "" && <p className="text-xs text-fg-subtle">{profName}</p>}
                          </>
                        ) : (
                          <span className="text-fg-disabled">—</span>
                        )}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Dialog>
    </div>
  )
}

function MensagemLinha({ msg, nova, onAbrir, completa }: { msg: any; nova: boolean; onAbrir: () => void; completa?: boolean }) {
  return (
    <button type="button" onClick={onAbrir} className="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors duration-150 hover:bg-subtle/60 sm:px-5">
      <span aria-hidden className={cn('mt-1.5 size-2 shrink-0 rounded-full', nova ? 'bg-accent' : 'bg-transparent')} />
      <span className="min-w-0 flex-1">
        <span className="flex items-baseline justify-between gap-3">
          <span className={cn('truncate text-sm text-fg', nova ? 'font-semibold' : 'font-medium')}>{msg.subject}</span>
          <span className="shrink-0 text-xs tabular-nums text-fg-subtle">{dataBR(msg.createdAt)}</span>
        </span>
        <span className={cn('block text-13 text-fg-muted', completa ? 'line-clamp-2' : 'line-clamp-1')}>{msg.content}</span>
        {nova && <span className="sr-only">Não lido</span>}
      </span>
    </button>
  )
}
