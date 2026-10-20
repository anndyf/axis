
"use client"

import { useState, useEffect } from "react"
import {
  LogOut,
  Bell,
  BookOpen,
  AlertTriangle,
  User as UserIcon,
  Calendar,
  MessageSquare,
  ChevronRight,
} from "lucide-react"
import BarraInferior from "@/components/BarraInferior"
import MenuMais from "@/components/MenuMais"
import { navegacaoMobile } from "@/lib/services/navegacao-mobile"
import { signOut } from "next-auth/react"
import { analyzeRisk } from "@/lib/risk-analysis"
import { formatarFrequencia } from "@/lib/services/frequencia"
import type { EtapaDaNota } from "@/lib/services/notas"
import MarkdownContent from "@/components/MarkdownContent"
import { Avatar, Badge, Button, Card, CardHeader, EmptyState, cn, type BadgeTone } from "@/components/ui"
import { Dialog } from "@/components/ui/Dialog"

type Aba = 'home' | 'grades' | 'frequencia' | 'horario' | 'messages' | 'profile'

// Abas do desktop; no celular, a barra inferior (navegacaoMobile) + "Mais"
const ABAS: { id: Aba; rotulo: string }[] = [
  { id: 'home', rotulo: 'Início' },
  { id: 'grades', rotulo: 'Boletim' },
  { id: 'frequencia', rotulo: 'Frequência' },
  { id: 'horario', rotulo: 'Horário' },
  { id: 'messages', rotulo: 'Avisos' },
  { id: 'profile', rotulo: 'Perfil' },
]
// id da barra do celular (?aba=) <-> aba da tela
const ABA_DA_BARRA: Record<string, Aba> = { inicio: 'home', boletim: 'grades', frequencia: 'frequencia', horario: 'horario', avisos: 'messages', perfil: 'profile' }
const BARRA_DA_ABA = Object.fromEntries(Object.entries(ABA_DA_BARRA).map(([k, v]) => [v, k])) as Record<Aba, string>
const DIAS = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta']

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

export default function PortalClient({ initialData, user, escola, abaInicial }: { initialData: any, user: { id: string }, escola: { nome: string; logoUrl: string | null }, abaInicial?: string }) {
  const { estudante, mensagens = [], error, nomesEtapas = [], numUnidades = 3, notaMinimaAprovacao = 5, frequencia = null } = initialData
  const [selectedMessage, setSelectedMessage] = useState<any>(null)
  const [readMessageIds, setReadMessageIds] = useState<Set<string>>(new Set())
  const [activeTab, setAba] = useState<Aba>(ABA_DA_BARRA[abaInicial ?? ''] ?? 'home')
  const [maisAberto, setMaisAberto] = useState(false)
  // A aba fica na URL (?aba=), para voltar/recarregar na mesma seção
  const setActiveTab = (aba: Aba) => {
    setAba(aba)
    const url = aba === 'home' ? '/portal' : `/portal?aba=${BARRA_DA_ABA[aba]}`
    window.history.replaceState(null, '', url)
    window.scrollTo({ top: 0 })
  }

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

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 pt-6 pb-[calc(var(--barra-inferior)+2rem)] md:px-6 md:pb-10 animate-fade-in">

        {/* Início */}
        {activeTab === 'home' && (
          <div className="space-y-4">
            <div>
              <h1 className="text-xl font-semibold tracking-tight text-fg">Olá, {primeiroNome}</h1>
              <p className="text-13 text-fg-muted">{estudante.turma.nome} · {rotuloTurno(estudante.turma.turno)} · {estudante.turma.anoLetivo}</p>
            </div>

            <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
              <div className="rounded-2xl border border-line bg-surface p-4">
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
                onClick={() => setActiveTab('horario')}
                className="col-span-2 flex items-center gap-3 rounded-2xl border border-line bg-surface p-4 text-left transition-colors duration-150 hover:border-line-strong md:col-span-1"
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
              className="flex w-full items-center gap-3 rounded-2xl border border-line bg-surface p-4 text-left transition-colors duration-150 hover:border-line-strong"
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
                <>
                {/* Celular: um cartão por disciplina */}
                <ul className="divide-y divide-line-subtle md:hidden">
                  {estudante.notas.map((nota: any) => {
                    const risk = analyzeRisk(nota.etapas.map((e: EtapaDaNota) => e.nota), numUnidades, notaMinimaAprovacao)
                    const r = RISCO[risk.level] ?? RISCO.NONE
                    const f = frequencia?.porDisciplina[nota.disciplinaId]
                    return (
                      <li key={nota.id} className="px-4 py-4">
                        <div className="flex items-start gap-3">
                          <div className="min-w-0 flex-1">
                            <p className="break-words text-sm font-semibold text-fg">{nota.disciplina.nome}</p>
                            <div className="mt-1"><Badge tone={r.tom} dot>{r.rotulo}</Badge></div>
                          </div>
                          <div className="shrink-0 text-right">
                            <p className="text-xs text-fg-subtle">Média</p>
                            <p className={cn('text-xl font-semibold tabular-nums', nota.nota >= notaMinimaAprovacao ? 'text-fg' : 'text-danger-fg')}>{nota1(nota.nota)}</p>
                          </div>
                        </div>
                        <dl className="mt-3 grid grid-cols-[repeat(auto-fill,minmax(4.5rem,1fr))] gap-2">
                          {nota.etapas.map((etapa: EtapaDaNota, i: number) => (
                            <div key={i} className="rounded-xl bg-subtle px-2 py-1.5 text-center">
                              <dt className="truncate text-[11px] text-fg-subtle" title={nomesEtapas[i]}>{nomesEtapas[i] ?? `U${i + 1}`}</dt>
                              <dd className={cn('text-sm font-medium tabular-nums', etapa.nota === null ? 'text-fg-disabled' : etapa.nota >= notaMinimaAprovacao ? 'text-fg' : 'text-danger-fg')}>{nota1(etapa.nota)}</dd>
                            </div>
                          ))}
                          {frequencia && (
                            <div className="rounded-xl bg-subtle px-2 py-1.5 text-center">
                              <dt className="text-[11px] text-fg-subtle">Frequência</dt>
                              <dd className={cn('text-sm font-medium tabular-nums', f?.percentual != null && f.percentual < frequencia.minimo ? 'text-danger-fg' : 'text-fg')}>{formatarFrequencia(f?.percentual ?? null)}</dd>
                            </div>
                          )}
                        </dl>
                      </li>
                    )
                  })}
                </ul>
                <div className="relative hidden overflow-x-auto md:block">
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
                </>
              )}
            </Card>
          </div>
        )}

        {/* Frequência */}
        {activeTab === 'frequencia' && (
          <div className="space-y-4">
            <h1 className="text-xl font-semibold tracking-tight text-fg">Frequência</h1>
            {!frequencia ? (
              <Card><EmptyState icon={Calendar} title="Sem chamadas registradas" description="A frequência aparece aqui quando os professores fizerem a chamada." /></Card>
            ) : (
              <>
                <div className={cn('rounded-2xl border bg-surface p-5', abaixoDoMinimo ? 'border-danger-line' : 'border-line')}>
                  <p className="text-13 text-fg-subtle">Frequência geral</p>
                  <p className={cn('mt-1 text-3xl font-semibold tracking-tight tabular-nums', abaixoDoMinimo ? 'text-danger-fg' : 'text-fg')}>{formatarFrequencia(frequencia.geral.percentual)}</p>
                  <p className="mt-1 text-13 text-fg-muted tabular-nums">{frequencia.geral.faltas} {frequencia.geral.faltas === 1 ? 'falta' : 'faltas'} em {frequencia.geral.aulas} aulas · mínimo {frequencia.minimo}%</p>
                  {abaixoDoMinimo && <p className="mt-2 flex items-center gap-1.5 text-13 font-medium text-danger-fg"><AlertTriangle size={14} strokeWidth={1.75} aria-hidden /> Abaixo do mínimo</p>}
                </div>
                <ul className="grid gap-3 md:grid-cols-2">
                  {(estudante.turma.disciplinas ?? [])
                    .slice()
                    .sort((a: any, b: any) => a.nome.localeCompare(b.nome))
                    .map((d: any) => {
                      const f = frequencia.porDisciplina[d.id]
                      const baixa = f?.percentual != null && f.percentual < frequencia.minimo
                      return (
                        <li key={d.id} className="flex items-center gap-3 rounded-2xl border border-line bg-surface px-4 py-3">
                          <span className="min-w-0 flex-1">
                            <span className="block break-words text-sm font-medium text-fg">{d.nome}</span>
                            <span className="block text-13 text-fg-subtle tabular-nums">{f ? `${f.faltas} ${f.faltas === 1 ? 'falta' : 'faltas'} em ${f.aulas} aulas` : 'Sem chamadas'}</span>
                          </span>
                          <span className={cn('shrink-0 text-base font-semibold tabular-nums', baixa ? 'text-danger-fg' : 'text-fg')}>
                            {formatarFrequencia(f?.percentual ?? null)}
                            {baixa && <span className="sr-only"> (abaixo do mínimo)</span>}
                          </span>
                        </li>
                      )
                    })}
                </ul>
              </>
            )}
          </div>
        )}

        {/* Horário */}
        {activeTab === 'horario' && (
          <div className="space-y-4">
            <div>
              <h1 className="text-xl font-semibold tracking-tight text-fg">Horário de aulas</h1>
              <p className="text-13 text-fg-muted">{estudante.turma.nome}</p>
            </div>
            <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {DIAS.map((dia, i) => {
                const aulas = (estudante.turma.horarios ?? []).filter((h: any) => h.diaSemana === i + 1).sort((a: any, b: any) => a.horario - b.horario)
                return (
                  <li key={dia} className="rounded-2xl border border-line bg-surface">
                    <h2 className="border-b border-line-subtle px-4 py-3 text-sm font-semibold text-fg">{dia}</h2>
                    {aulas.length === 0 ? (
                      <p className="px-4 py-3 text-13 text-fg-subtle">Sem aulas</p>
                    ) : (
                      <ol className="divide-y divide-line-subtle">
                        {aulas.map((h: any) => {
                          const prof = professorDaAula(h, estudante.turma.disciplinas)
                          return (
                            <li key={h.id} className="flex gap-3 px-4 py-2.5">
                              <span className="w-7 shrink-0 pt-0.5 text-xs tabular-nums text-fg-subtle">{h.horario}º</span>
                              <span className="min-w-0 flex-1">
                                <span className="block break-words text-sm font-medium text-fg">{h.disciplina}</span>
                                {prof && <span className="block truncate text-xs text-fg-subtle">{prof}</span>}
                              </span>
                            </li>
                          )
                        })}
                      </ol>
                    )}
                  </li>
                )
              })}
            </ul>
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

      {/* Barra inferior (celular) + "Mais" */}
      <BarraInferior
        itens={navegacaoMobile({ isSuperuser: false, isDirecao: false, isStaff: false, isPortalUser: true }, []).barra}
        ativo={BARRA_DA_ABA[activeTab]}
        maisAberto={maisAberto}
        onMais={() => setMaisAberto(true)}
        onItem={(id) => setActiveTab(ABA_DA_BARRA[id] ?? 'home')}
      />
      <MenuMais
        open={maisAberto}
        onClose={() => setMaisAberto(false)}
        itens={[]}
        ativo={null}
        usuario={{ nome: estudante.nome, papel: `Estudante · ${estudante.turma.nome}` }}
        conta={[
          { rotulo: naoLidas > 0 ? `Avisos (${naoLidas} não lidos)` : 'Avisos', icone: MessageSquare, onClick: () => setActiveTab('messages') },
          { rotulo: 'Meu perfil', icone: UserIcon, onClick: () => setActiveTab('profile') },
        ]}
      />

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

    </div>
  )
}

/** Professor da aula: o do horário ou, sem ele, o da disciplina de mesmo nome (ou nome parecido). */
function professorDaAula(aula: any, disciplinas: any[] = []): string | null {
  if (aula.professor?.trim()) return aula.professor
  const nome = aula.disciplina.trim().toLowerCase()
  const disc = disciplinas.find((d) => d.nome.trim().toLowerCase() === nome)
    ?? disciplinas.find((d) => nome.includes(d.nome.trim().toLowerCase()) || d.nome.trim().toLowerCase().includes(nome))
  const p = disc?.usuariosPermitidos?.[0]
  return p ? (p.name || p.username) : null
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
