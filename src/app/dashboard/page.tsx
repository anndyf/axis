import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { getGlobalConfig } from "@/lib/data-fetching"
import { can } from "@/lib/rbac"
import { getModulosAtivos } from "@/lib/modules-server"

export const metadata = {
  title: 'Áxis - Painel'
}

export const dynamic = 'force-dynamic'
export const revalidate = 0
import {
  Users, BookOpen, GraduationCap, FileText, TrendingUp, Award, Scissors, MessageSquare, ClipboardCheck,
  UserX, History, Monitor, ClipboardList, FileWarning, UserPlus, ChevronRight, Megaphone,
} from "lucide-react"
import Link from "next/link"
import TeacherTipsModal from "@/components/TeacherTipsModal"
import { Badge, Card, CardHeader, PageHeader, Stat, EmptyState, buttonClasses } from "@/components/ui"
import { resumoGestao, resumoProfessor } from "@/lib/services/painel-leitura"
import { formatarFrequencia } from "@/lib/services/frequencia"

import { Session } from "next-auth"

import { unstable_cache } from "next/cache"

// Painel por turma (frequência e chamadas pendentes): mesmo cuidado com a
// chave do cache - escolaId como argumento.
const getCachedResumoGestao = unstable_cache(
  async (escolaId: string, anoLetivo: number) => resumoGestao(escolaId, anoLetivo),
  ['dashboard-resumo-gestao-v1'],
  { revalidate: 300 }
)

// escolaId como argumento (nao so no keyParts) e proposital: o unstable_cache do
// Next.js deriva a chave de cache dos argumentos serializaveis da funcao, entao
// isso garante que cada escola tenha sua propria entrada de cache - sem isso, a
// primeira escola a popular o cache "vazaria" seus numeros pras outras por 5min.
const getCachedStaticStatsManagement = unstable_cache(
  async (escolaId: string, currentYear: number) => {
    const [turmasCount, disciplinasCount, estudantesCount, novasQuestoesCount] = await Promise.all([
      prisma.turma.count({ where: { escolaId, anoLetivo: currentYear } }),
      prisma.disciplina.count({ where: { turma: { escolaId, anoLetivo: currentYear } } }),
      prisma.estudante.count({ where: { escolaId, turma: { anoLetivo: currentYear } } }),
      prisma.questao.count({
        where: {
          professor: { escolaId },
          createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
        }
      })
    ])
    return { turmasCount, disciplinasCount, estudantesCount, novasQuestoesCount }
  },
  ['dashboard-static-stats-management-v2'],
  { revalidate: 300 }
)

const getCachedAnnouncementsManagement = unstable_cache(
  async (escolaId: string) => {
    return await prisma.message.findMany({
      where: {
        escolaId,
        category: 'COMUNICADO',
        OR: [
          { isGlobal: true },
          { receiverId: null },
          { receiverId: 'GROUP_STAFF' },
          { receiverId: 'GROUP_TEACHERS' },
          { receiverId: 'GROUP_DIRECAO' }
        ]
      },
      orderBy: { createdAt: 'desc' },
      take: 2,
      include: { sender: { select: { name: true } } }
    })
  },
  ['dashboard-announcements-management-v2'],
  { revalidate: 300 }
)

const getCachedAnnouncementsTeacher = unstable_cache(
  async (escolaId: string) => {
    return await prisma.message.findMany({
      where: {
        escolaId,
        category: 'COMUNICADO',
        OR: [
          { isGlobal: true },
          { receiverId: null },
          { receiverId: 'GROUP_TEACHERS' }
        ]
      },
      orderBy: { createdAt: 'desc' },
      take: 2,
      include: { sender: { select: { name: true } } }
    })
  },
  ['dashboard-announcements-teacher-v2'],
  { revalidate: 300 }
)

async function getDashboardStats(session: Session) {
  const isManagement = session.user.isSuperuser || session.user.isDirecao
  const escolaId = session.user.escolaId

  if (isManagement) {
    const config = await getGlobalConfig(escolaId)
    const currentYear = config?.anoLetivoAtual || new Date().getFullYear()

    // Buscas cacheadas (5 min) para otimizar Vercel Fluid CPU
    const staticStats = await getCachedStaticStatsManagement(escolaId, currentYear)
    const announcements = await getCachedAnnouncementsManagement(escolaId)

    // Buscas em tempo real (Notas, Adesão e Recuperação)
    const [notasCount, disciplinasComNotasCount, recuperacaoCount] = await Promise.all([
      prisma.notaFinal.count({ where: { disciplina: { turma: { escolaId, anoLetivo: currentYear } } } }),
      prisma.disciplina.count({
        where: {
          turma: { escolaId, anoLetivo: currentYear },
          notas: { some: {} }
        }
      }),
      prisma.estudante.count({
        where: {
          escolaId,
          turma: { anoLetivo: currentYear },
          notas: {
            some: { status: 'RECUPERACAO' }
          }
        }
      })
    ])

    const adesaoValue = staticStats.disciplinasCount > 0 ? (disciplinasComNotasCount / staticStats.disciplinasCount) * 100 : 0

    return {
      turmas: staticStats.turmasCount,
      disciplinas: staticStats.disciplinasCount,
      estudantes: staticStats.estudantesCount,
      notas: notasCount,
      adesao: adesaoValue.toFixed(1),
      novasQuestoes: staticStats.novasQuestoesCount,
      recuperacao: recuperacaoCount,
      announcements
    }
  }

  // Estatísticas personalizadas para Professor
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      disciplinasPermitidas: {
        select: {
          id: true,
          turmaId: true
        }
      }
    }
  })

  const disciplinasIds = user?.disciplinasPermitidas.map((d: any) => d.id) || []
  const turmasIds = Array.from(new Set(user?.disciplinasPermitidas.map((d: any) => d.turmaId) || []))

  const [estudantesCount, notasCount, announcements] = await Promise.all([
    prisma.estudante.count({
      where: { turmaId: { in: turmasIds } }
    }),
    prisma.notaFinal.count({
      where: { disciplinaId: { in: disciplinasIds } }
    }),
    getCachedAnnouncementsTeacher(escolaId)
  ])

  return {
    turmas: turmasIds.length,
    disciplinas: disciplinasIds.length,
    estudantes: estudantesCount,
    notas: notasCount,
    announcements
  }
}

export default async function DashboardPage() {
  const session = await auth()

  if (!session) {
    redirect("/login")
  }

  const stats = await getDashboardStats(session)
  const escola = await prisma.escola.findUnique({
    where: { id: session.user.escolaId },
    select: { nome: true, plano: true }
  })
  const isGestao = can(session.user, 'gestao')
  const modulosAtivos = await getModulosAtivos(session.user.escolaId, escola?.plano || 'BASICO')
  const config = await getGlobalConfig(session.user.escolaId)
  const anoLetivo = config?.anoLetivoAtual || new Date().getFullYear()

  const supportTips = [
    {
      title: "Suporte e Ajuda",
      description: "Olá! Caso encontre qualquer dificuldade ou problema técnico ao navegar pelo sistema, utilize a seção de 'Mensagens' para entrar em contato diretamente com a equipe de suporte.",
      icon: <MessageSquare size={32} strokeWidth={1.5} className="text-fg-muted" />,
      color: "bg-subtle"
    }
  ]

  const atalhos = [
    { title: "Chamada e diário", icon: ClipboardCheck, href: "/dashboard/chamada", visible: can(session.user, 'staff') },
    { title: "Lançar notas", icon: FileText, href: "/dashboard/notas", visible: session.user.isStaff || session.user.isSuperuser },
    { title: "Recuperação final", icon: TrendingUp, href: "/dashboard/notas/recuperacao", visible: session.user.isStaff || session.user.isSuperuser },
    { title: "Frequência", icon: UserX, href: "/dashboard/frequencia", visible: isGestao },
    { title: "Conselho de classe", icon: Award, href: "/dashboard/conselho-classe", visible: isGestao },
    { title: "Resultados", icon: Users, href: "/dashboard/resultados", visible: isGestao },
    { title: isGestao ? "Turmas" : "Minhas turmas", icon: Users, href: "/dashboard/turmas", visible: can(session.user, 'staff') },
    { title: "Estudantes", icon: GraduationCap, href: "/dashboard/estudantes", visible: isGestao },
    { title: "Ocorrências", icon: FileWarning, href: "/dashboard/ocorrencias", visible: isGestao },
    { title: "Planos de ensino", icon: ClipboardList, href: "/dashboard/planos", visible: can(session.user, 'staff') },
    { title: "Gerador de provas", icon: Scissors, href: "/dashboard/provas", visible: isGestao && modulosAtivos.includes('provas') },
    { title: "Reserva de laboratórios", icon: Monitor, href: "/dashboard/laboratorios", visible: true },
    { title: "Mensagens", icon: MessageSquare, href: "/dashboard/mensagens", visible: true },
    { title: "Auditoria", icon: History, href: "/dashboard/auditoria", visible: can(session.user, 'superuser') },
    { title: "Aluno fora da lista?", icon: UserPlus, href: "/dashboard/reportar-estudante", visible: true },
  ].filter((a) => a.visible)

  const primeiroNome = session.user.name?.split(' ')[0] ?? ''
  const cabecalho = (
    <PageHeader
      title={`Olá, ${primeiroNome}`}
      description={`${escola?.nome ?? 'Áxis'} · Ano letivo ${anoLetivo}`}
    />
  )

  const comunicados = (
    <Card>
      <CardHeader title="Comunicados" actions={<Link href="/dashboard/mensagens" className="text-13 text-accent-fg hover:underline">Ver todos</Link>} />
      {stats.announcements && stats.announcements.length > 0 ? (
        <ul className="divide-y divide-line-subtle">
          {stats.announcements.map((msg: any) => (
            <li key={msg.id} className="px-4 py-3 sm:px-5">
              <div className="flex items-baseline justify-between gap-3">
                <p className="truncate text-13 font-medium text-fg">{msg.subject}</p>
                <time className="shrink-0 text-xs text-fg-subtle tabular-nums">{new Date(msg.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}</time>
              </div>
              <p className="mt-0.5 line-clamp-2 text-13 text-fg-muted">{msg.content.replace(/<[^>]*>?/gm, '')}</p>
              {msg.sender?.name && <p className="mt-1 text-xs text-fg-subtle">{msg.sender.name}</p>}
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState icon={Megaphone} title="Nenhum comunicado recente" className="py-8" />
      )}
    </Card>
  )

  const listaAtalhos = (
    <Card>
      <CardHeader title="Atalhos" />
      <ul className="grid grid-cols-1 p-1.5 sm:grid-cols-2 lg:grid-cols-1">
        {atalhos.map((a) => (
          <li key={a.href}>
            <Link href={a.href} className="group flex h-9 items-center gap-2.5 rounded-md px-2.5 text-13 text-fg-muted transition-colors duration-150 hover:bg-subtle hover:text-fg">
              <a.icon size={16} strokeWidth={1.75} className="shrink-0 text-fg-subtle group-hover:text-fg-muted" />
              <span className="flex-1 truncate">{a.title}</span>
              <ChevronRight size={14} strokeWidth={1.75} className="text-fg-disabled opacity-0 transition-opacity duration-150 group-hover:opacity-100" aria-hidden />
            </Link>
          </li>
        ))}
      </ul>
    </Card>
  )

  const dicas = <TeacherTipsModal storageKey="seen_support_popup_v1" title="Dica de Suporte" tips={supportTips} />

  if (isGestao) {
    const resumo = await getCachedResumoGestao(session.user.escolaId, anoLetivo)
    const emRecuperacao = await prisma.estudante.findMany({
      where: { escolaId: session.user.escolaId, turma: { anoLetivo }, notas: { some: { status: 'RECUPERACAO' } } },
      select: { id: true },
    })
    const emRisco = new Set([...emRecuperacao.map((e) => e.id), ...resumo.idsAbaixoDoMinimo]).size

    return (
      <div className="space-y-6">
        {dicas}
        {cabecalho}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Stat label="Alunos" value={stats.estudantes.toLocaleString('pt-BR')} hint={`${stats.turmas} turmas · ${stats.disciplinas} disciplinas`} href="/dashboard/estudantes" />
          <Stat label="Frequência média" value={formatarFrequencia(resumo.frequenciaMedia)} hint={resumo.frequenciaMedia === null ? "Nenhuma chamada salva ainda" : "Todas as turmas"} href="/dashboard/frequencia" />
          <Stat label="Alunos em risco" value={emRisco} hint={`${emRecuperacao.length} em recuperação · ${resumo.abaixoDoMinimo} abaixo da frequência`} href="/dashboard/conselho-classe" />
          <Stat label="Chamadas pendentes" value={resumo.chamadasPendentes.toLocaleString('pt-BR')} hint="Dias com aula sem chamada salva" href="/dashboard/chamada" />
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <Card className="min-w-0 overflow-hidden">
            <CardHeader title="Turmas" description={`Frequência e chamadas de ${anoLetivo}`} actions={<Link href="/dashboard/turmas" className={buttonClasses({ variant: 'secondary', size: 'sm' })}>Ver turmas</Link>} />
            {resumo.turmas.length === 0 ? (
              <EmptyState icon={Users} title="Nenhuma turma neste ano letivo" description="Cadastre as turmas para começar a lançar notas e fazer chamadas." action={<Link href="/dashboard/turmas" className={buttonClasses({ size: 'sm' })}>Ir para turmas</Link>} />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[32rem] text-13">
                  <thead>
                    <tr className="border-b border-line text-xs text-fg-subtle">
                      <th scope="col" className="h-9 px-4 text-left font-medium sm:px-5">Turma</th>
                      <th scope="col" className="h-9 px-3 text-right font-medium">Freq. média</th>
                      <th scope="col" className="h-9 px-3 text-right font-medium">Abaixo do mínimo</th>
                      <th scope="col" className="h-9 px-4 text-right font-medium sm:px-5">Chamadas pendentes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {resumo.turmas.map((t) => (
                      <tr key={t.turmaId} className="border-b border-line-subtle last:border-0 transition-colors duration-150 hover:bg-subtle/60">
                        <td className="h-10 px-4 sm:px-5"><Link href={`/dashboard/frequencia?turma=${t.turmaId}`} className="font-medium text-fg hover:underline">{t.nome}</Link></td>
                        <td className="h-10 px-3 text-right tabular-nums text-fg-muted">{formatarFrequencia(t.frequenciaMedia)}</td>
                        <td className="h-10 px-3 text-right tabular-nums">{t.abaixoDoMinimo > 0 ? <Badge tone="danger">{t.abaixoDoMinimo}</Badge> : <span className="text-fg-subtle">0</span>}</td>
                        <td className="h-10 px-4 text-right tabular-nums text-fg-muted sm:px-5">{t.chamadasPendentes}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
          <div className="space-y-6">
            {listaAtalhos}
            {comunicados}
          </div>
        </div>
      </div>
    )
  }

  // Professor
  const prof = await resumoProfessor(session.user.escolaId, session.user.id, anoLetivo)
  const pendentesNotas = prof.disciplinas.filter((d) => d.semNota > 0)
  const turmasDoProf = [...new Map(prof.disciplinas.map((d) => [d.turmaId, { id: d.turmaId, nome: d.turmaNome, alunos: d.alunos, disciplinas: prof.disciplinas.filter((x) => x.turmaId === d.turmaId).map((x) => x.nome) }])).values()]
  const linkChamada = (a: { turmaId: string; disciplinaId: string | null }) => `/dashboard/chamada/fazer?turma=${a.turmaId}${a.disciplinaId ? `&disciplina=${a.disciplinaId}` : ''}&data=${prof.hoje}`

  return (
    <div className="space-y-6">
      {dicas}
      {cabecalho}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Aulas hoje" value={prof.aulasDeHoje.length} hint={`${prof.aulasDeHoje.filter((a) => a.feita).length} com chamada feita`} href="/dashboard/chamada" />
        <Stat label="Minhas turmas" value={stats.turmas} hint={`${stats.disciplinas} disciplinas`} href="/dashboard/turmas" />
        <Stat label="Alunos" value={stats.estudantes} />
        <Stat label="Notas pendentes" value={pendentesNotas.reduce((s, d) => s + d.semNota, 0)} hint="Alunos sem nota lançada" href="/dashboard/notas" />
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-6">
          <Card>
            <CardHeader title="Aulas de hoje" description={new Date(`${prof.hoje}T12:00:00Z`).toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })} actions={<Link href="/dashboard/chamada" className="text-13 text-accent-fg hover:underline">Todas as chamadas</Link>} />
            {prof.aulasDeHoje.length === 0 ? (
              <EmptyState icon={ClipboardCheck} title="Nenhuma aula sua hoje" description="Dias não letivos e disciplinas fora do horário de hoje não aparecem aqui." className="py-8" />
            ) : (
              <ul className="divide-y divide-line-subtle">
                {prof.aulasDeHoje.map((a) => (
                  <li key={`${a.turmaId}-${a.disciplinaId}`} className="flex flex-wrap items-center gap-3 px-4 py-2.5 sm:px-5">
                    <span className="w-14 shrink-0 text-xs tabular-nums text-fg-subtle">{a.tempos.length ? a.tempos.map((t) => `${t}º`).join(', ') : 'Dia'}</span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-13 font-medium text-fg">{a.nome}</p>
                      <p className="text-xs text-fg-subtle">{a.turmaNome}</p>
                    </div>
                    {a.feita ? <Badge tone="success" dot>Chamada feita</Badge> : null}
                    <Link href={linkChamada(a)} className={buttonClasses({ size: 'sm', variant: a.feita ? 'secondary' : 'primary' })}>{a.feita ? 'Ver chamada' : 'Fazer chamada'}</Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card>
            <CardHeader title="Notas pendentes" description="Disciplinas com alunos ainda sem nota lançada" />
            {pendentesNotas.length === 0 ? (
              <EmptyState icon={FileText} title="Nenhuma nota pendente" className="py-8" />
            ) : (
              <ul className="divide-y divide-line-subtle">
                {pendentesNotas.map((d) => (
                  <li key={d.id}>
                    <Link href={`/dashboard/notas/lancar/${d.turmaId}`} className="flex items-center gap-3 px-4 py-2.5 transition-colors duration-150 hover:bg-subtle/60 sm:px-5">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-13 font-medium text-fg">{d.nome}</p>
                        <p className="text-xs text-fg-subtle">{d.turmaNome}</p>
                      </div>
                      <span className="text-xs tabular-nums text-fg-muted">{d.semNota} de {d.alunos} alunos</span>
                      <ChevronRight size={14} strokeWidth={1.75} className="text-fg-disabled" aria-hidden />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Minhas turmas" />
            {turmasDoProf.length === 0 ? (
              <EmptyState icon={BookOpen} title="Nenhuma disciplina vinculada" description="Peça à gestão para vincular você às suas disciplinas." className="py-8" />
            ) : (
              <ul className="divide-y divide-line-subtle">
                {turmasDoProf.map((t) => (
                  <li key={t.id} className="px-4 py-2.5 sm:px-5">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="text-13 font-medium text-fg">{t.nome}</p>
                      <span className="text-xs tabular-nums text-fg-subtle">{t.alunos} alunos</span>
                    </div>
                    <p className="truncate text-xs text-fg-subtle">{t.disciplinas.join(' · ')}</p>
                  </li>
                ))}
              </ul>
            )}
          </Card>
          {listaAtalhos}
          {comunicados}
        </div>
      </div>
    </div>
  )
}
