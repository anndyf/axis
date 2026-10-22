import Link from "next/link"
import { redirect } from "next/navigation"
import { unstable_cache } from "next/cache"
import {
  Accessibility, AlertTriangle, CalendarDays, ClipboardCheck, Clock, ClipboardList, FileText, FileWarning,
  GraduationCap, Lock, LockOpen, Megaphone, MessageSquare, NotebookPen, UserRound, Users, type LucideIcon,
} from "lucide-react"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getGlobalConfig } from "@/lib/data-fetching"
import { getModulosAtivos } from "@/lib/modules-server"
import { MODULOS, modulosVisiveis } from "@/lib/modules"
import { formatarFrequencia } from "@/lib/services/frequencia"
import {
  atividadesDoProfessor, comunicadosRecentes, estudantesAEE, estudantesEmRisco, numerosDaEscola, ocorrenciasRecentes,
  pendenciasPorDisciplina, professoresAtrasados, proximasDatas, avisosDoCadeado, resumoGestao, resumoProfessor, type AulaDeHoje,
} from "@/lib/services/painel-leitura"
import { cartoesDoProfessor, destaqueDoDia, horaNaEscola, rotuloTempos, turmasDosCartoes } from "@/lib/services/inicio-professor"
import CartoesTurmas from "@/components/painel/CartoesTurmas"
import { Avatar } from "@/components/ui/Avatar"
import { ROTULO_VISAO, visaoEfetiva, type VisaoPainel } from "@/lib/services/painel-visoes"
import { visoesDisponiveis } from "@/lib/services/painel-visoes-servidor"
import { cn } from "@/components/ui/cn"
import TeacherTipsModal from "@/components/TeacherTipsModal"
import { Atalhos, Aviso, Cartao, CartaoProgresso, Chip, dataCurta, GradeCartoes, Indicador, Item, Lista, Secao, TOM } from "@/components/painel/ui"
import { paginaDoModulo } from '@/lib/modulos/guarda'

export const metadata = { title: "Áxis - Painel" }
export const dynamic = "force-dynamic"

// Contas pesadas por turma em cache de 5 min. escolaId vai como ARGUMENTO
// (não só no keyParts): o unstable_cache deriva a chave dos argumentos, então
// cada escola tem a própria entrada e os números não vazam entre escolas.
const resumoGestaoCache = unstable_cache(
  async (escolaId: string, anoLetivo: number) => resumoGestao(escolaId, anoLetivo),
  ["painel-resumo-gestao-v2"],
  { revalidate: 300 }
)
const pendenciasDaEscolaCache = unstable_cache(
  async (escolaId: string, anoLetivo: number) => pendenciasPorDisciplina(escolaId, anoLetivo),
  ["painel-pendencias-escola-v1"],
  { revalidate: 300 }
)

/**
 * Painel inicial por perfil (modelo A "Institucional"). A visão vem de
 * visoesDoUsuario() (src/lib/services/painel-visoes.ts); quem tem mais de uma
 * vê a mais alta e um seletor no topo (?visao=). Dados reais, sempre da
 * escola da sessão; cada bloco só aparece se o usuário puder abrir a tela
 * de origem.
 */
export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ visao?: string }> }) {
  await paginaDoModulo('NUC')
  const session = await auth()
  if (!session?.user?.escolaId) redirect("/login")
  const user = session.user
  const escolaId = user.escolaId
  const { visao: pedida } = await searchParams

  const [escola, config] = await Promise.all([
    prisma.escola.findUnique({ where: { id: escolaId }, select: { nome: true, plano: true } }),
    getGlobalConfig(escolaId),
  ])
  const anoLetivo = config?.anoLetivoAtual || new Date().getFullYear()
  const modulosAtivos = await getModulosAtivos(escolaId, escola?.plano || "BASICO")
  const visiveis = new Set(modulosVisiveis(user, modulosAtivos).map((m) => m.id))

  // A visão de professor só entra no seletor de quem tem disciplinas
  const visoes = await visoesDisponiveis(user, escolaId, anoLetivo)
  const efetiva = visaoEfetiva(user, pedida)
  const visao: VisaoPainel | null = efetiva && visoes.includes(efetiva) ? efetiva : (visoes[0] ?? null)

  /** Atalho para um módulo, só se o usuário puder abri-lo. */
  const atalho = (id: string, rotulo?: string, href?: string) => {
    const m = MODULOS.find((x) => x.id === id)
    return m && visiveis.has(id) ? [{ rotulo: rotulo ?? m.nome, href: href ?? m.rota, icone: m.icone as LucideIcon }] : []
  }

  let conteudo: React.ReactNode
  if (visao === "professor") conteudo = await PainelProfessor({ escolaId, userId: user.id, anoLetivo, atalho })
  else if (visao === "pedagogia") conteudo = await PainelPedagogia({ escolaId, anoLetivo, atalho, visiveis })
  else if (visao === "administracao") conteudo = await PainelAdministracao({ escolaId, anoLetivo, atalho })
  else conteudo = (
    <Secao titulo="Atalhos" className="hidden md:block">
      <Atalhos itens={[...atalho("mensagens"), ...atalho("laboratorios")]} />
    </Secao>
  )

  const hoje = new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long", timeZone: "America/Sao_Paulo" })
  const nome = user.name ?? "Usuário"

  return (
    <div className="space-y-6">
      <TeacherTipsModal
        storageKey="seen_support_popup_v1"
        title="Dica de Suporte"
        tips={[{
          title: "Suporte e Ajuda",
          description: "Olá! Caso encontre qualquer dificuldade ou problema técnico ao navegar pelo sistema, utilize a seção de 'Mensagens' para entrar em contato diretamente com a equipe de suporte.",
          icon: <MessageSquare size={32} strokeWidth={1.5} className="text-fg-muted" />,
          color: "bg-subtle",
        }]}
      />

      {/* Boas-vindas: a cor da escola aparece só nesta faixa (--escola) */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3 md:gap-4">
          <Avatar nome={nome} size="lg" tom="destaque" className="md:size-12 md:text-base" />
          <div className="min-w-0">
            <h1 className="break-words text-xl font-semibold text-fg md:text-2xl">Olá, {nome.split(" ")[0]}</h1>
            <p className="text-13 text-fg-subtle first-letter:uppercase md:text-sm">{hoje} · {escola?.nome ?? "Áxis"}<span className="hidden sm:inline"> · ano letivo {anoLetivo}</span></p>
          </div>
        </div>
        {visoes.length > 1 && visao && (
          <div className="flex flex-wrap items-center gap-2 md:hidden" role="group" aria-label="Visão do painel">
            <span className="text-13 text-fg-subtle">Visão</span>
            {visoes.map((v) => (
              <Chip key={v} ativo={v === visao} href={`/dashboard?visao=${v}`}>{ROTULO_VISAO[v]}</Chip>
            ))}
          </div>
        )}
      </div>

      {conteudo}
    </div>
  )
}

function GradeIndicadores({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">{children}</div>
}

type Atalho = (id: string, rotulo?: string, href?: string) => { rotulo: string; href: string; icone: LucideIcon }[]

/* ------------------------------- Professor ------------------------------- */

async function PainelProfessor({ escolaId, userId, anoLetivo, atalho }: { escolaId: string; userId: string; anoLetivo: number; atalho: Atalho }) {
  const [prof, pendencias, atividades, comunicados, temposAula] = await Promise.all([
    resumoProfessor(escolaId, userId, anoLetivo),
    pendenciasPorDisciplina(escolaId, anoLetivo, userId),
    atividadesDoProfessor(escolaId, userId, anoLetivo),
    comunicadosRecentes(escolaId, "professor"),
    prisma.tempoAula.findMany({ where: { escolaId }, select: { turno: true, ordem: true, inicio: true, fim: true } }),
  ])
  const chamadas = pendencias.filter((p) => p.chamadasPendentes > 0)
  const totalChamadas = chamadas.reduce((s, p) => s + p.chamadasPendentes, 0)
  const semNota = prof.disciplinas.reduce((s, d) => s + d.semNota, 0)
  const linkChamada = (turmaId: string, disciplinaId: string | null) => `/dashboard/chamada/fazer?turma=${turmaId}${disciplinaId ? `&disciplina=${disciplinaId}` : ""}&data=${prof.hoje}`
  const primeira = prof.disciplinas[0]

  // Cartões turma × disciplina (Minhas turmas) e destaque Agora/Próxima aula
  const cartoes = cartoesDoProfessor({
    disciplinas: prof.disciplinas,
    pendencias,
    turmasChamadaDiaria: new Set(pendencias.filter((p) => p.disciplinaId === null).map((p) => p.turmaId)),
    aulasHoje: new Set(prof.aulasDeHoje.map((a) => `${a.turmaId}|${a.disciplinaId ?? ""}`)),
    feitasHoje: new Set(prof.aulasDeHoje.filter((a) => a.feita).map((a) => `${a.turmaId}|${a.disciplinaId ?? ""}`)),
    hoje: prof.hoje,
  })
  const destaque = destaqueDoDia(prof.aulasDeHoje, (a) => temposAula.filter((t) => t.turno === a.turno), horaNaEscola())

  return (
    <>
      {destaque && <CartaoDestaque destaque={destaque} href={linkChamada(destaque.aula.turmaId, destaque.aula.disciplinaId)} />}

      {/* No celular os números ficam nos cartões das turmas */}
      <div className="hidden md:block">
        <GradeIndicadores>
          <Indicador icone={ClipboardCheck} tom="accent" valor={prof.aulasDeHoje.length} rotulo="Aulas hoje" detalhe={`${prof.aulasDeHoje.filter((a) => a.feita).length} com chamada feita`} href="#aulas" />
          <Indicador icone={AlertTriangle} tom="danger" valor={totalChamadas} rotulo="Chamadas pendentes" detalhe="Dias com aula sem chamada" href="#chamadas" />
          <Indicador icone={FileText} tom="violet" valor={semNota} rotulo="Notas a lançar" detalhe="Alunos sem nota lançada" href="#turmas" />
          <Indicador icone={NotebookPen} tom="success" valor={atividades.length} rotulo="Atividades" detalhe="Próximas avaliações" href="#atividades" />
        </GradeIndicadores>
      </div>

      <Secao id="aulas" titulo="Aulas de hoje" acao={{ rotulo: "Todas as chamadas", href: "/dashboard/chamada" }}>
        <Lista vazio="Nenhuma aula sua hoje. Dias não letivos e disciplinas fora do horário não aparecem.">
          {prof.aulasDeHoje.map((a) => (
            <li key={`${a.turmaId}-${a.disciplinaId}`} className="border-b border-line-subtle last:border-0">
              <Link href={linkChamada(a.turmaId, a.disciplinaId)} className="flex min-h-14 min-w-0 items-center gap-3 px-4 py-3 transition-colors duration-150 hover:bg-subtle sm:px-5">
                <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-full", a.feita ? TOM.success : TOM.accent)}>
                  {a.feita ? <ClipboardCheck size={16} strokeWidth={1.75} aria-hidden /> : <ClipboardList size={16} strokeWidth={1.75} aria-hidden />}
                </span>
                {/* Nome inteiro (quebra linha); a situação desce para baixo do nome no celular */}
                <span className="min-w-0 flex-1">
                  <span className="block break-words text-sm font-medium text-fg">{a.nome}</span>
                  <span className="block text-13 text-fg-subtle">{a.turmaNome} · {rotuloTempos(a.tempos)}</span>
                </span>
                <span className={cn("shrink-0 rounded-full px-2.5 py-1 text-xs font-medium", a.feita ? TOM.success : "bg-accent text-on-accent")}>{a.feita ? "Feita" : "Fazer"}</span>
              </Link>
            </li>
          ))}
        </Lista>
      </Secao>

      <Secao id="turmas" titulo="Minhas turmas" descricao={`Disciplinas de ${anoLetivo}`}>
        {cartoes.length === 0 ? (
          <Aviso>Nenhuma disciplina vinculada a você. Peça à gestão para vincular suas disciplinas.</Aviso>
        ) : (
          <CartoesTurmas cartoes={cartoes} turmas={turmasDosCartoes(cartoes)} />
        )}
      </Secao>

      <div className="grid gap-5 lg:grid-cols-2">
        <Secao id="chamadas" titulo="Chamadas pendentes" className="hidden md:block">
          <Lista vazio="Nenhuma chamada pendente.">
            {chamadas.map((p) => (
              <Item key={`${p.turmaId}-${p.disciplinaId}`} icone={AlertTriangle} tom="danger" titulo={p.disciplinaNome} subtitulo={p.turmaNome} href={`/dashboard/chamada/diario?turma=${p.turmaId}${p.disciplinaId ? `&disciplina=${p.disciplinaId}` : ""}`} direita={`${p.chamadasPendentes} ${p.chamadasPendentes === 1 ? "dia" : "dias"}`} />
            ))}
          </Lista>
        </Secao>
        <Secao id="atividades" titulo="Atividades" descricao="Próximas avaliações das suas disciplinas">
          <Lista vazio="Nenhuma avaliação marcada.">
            {atividades.map((a) => (
              <Item key={a.id} icone={NotebookPen} tom="violet" titulo={a.nome} subtitulo={`${a.disciplina.nome} · ${a.disciplina.turma.nome}`} href={`/dashboard/notas/lancar/${a.disciplina.turmaId}`} direita={a.data ? dataCurta(a.data.toISOString().slice(0, 10)) : "Sem data"} />
            ))}
          </Lista>
        </Secao>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
        <Secao id="comunicados" titulo="Comunicados" acao={{ rotulo: "Ver todos", href: "/dashboard/mensagens" }}>
          <ListaComunicados comunicados={comunicados} />
        </Secao>
        {/* Atalhos duplicam a barra inferior no celular */}
        <Secao titulo="Atalhos" className="hidden md:block">
          <Atalhos itens={[
            ...atalho("chamada", "Fazer chamada"),
            ...atalho("notas", "Lançar notas"),
            ...atalho("chamada", "Diário de classe", primeira ? `/dashboard/chamada/diario?turma=${primeira.turmaId}&disciplina=${primeira.id}` : "/dashboard/chamada"),
          ]} />
        </Secao>
      </div>
    </>
  )
}

/** "Agora" / "Próxima aula" / chamada de hoje pendente, com o botão grande da chamada. */
function CartaoDestaque({ destaque, href }: { destaque: NonNullable<ReturnType<typeof destaqueDoDia<AulaDeHoje>>>; href: string }) {
  const { aula } = destaque
  const rotulo = destaque.tipo === "agora" ? `Agora · ${destaque.inicio}–${destaque.fim}` : destaque.tipo === "proxima" ? `Próxima aula · ${destaque.inicio}` : "Chamada de hoje pendente"
  return (
    <section aria-label="Aula em destaque" className="rounded-2xl bg-accent p-5 text-on-accent shadow-card md:p-6">
      <p className="flex items-center gap-2 text-13 font-medium opacity-90">
        <Clock size={14} strokeWidth={1.75} aria-hidden /> {rotulo}
      </p>
      <p className="mt-2 break-words text-xl font-semibold leading-snug md:text-2xl">{aula.nome}</p>
      <p className="mt-0.5 text-sm opacity-90">{aula.turmaNome} · {rotuloTempos(aula.tempos)}{aula.feita && " · chamada feita"}</p>
      <Link href={href} className="mt-4 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-on-accent px-4 text-base font-semibold text-accent transition-opacity duration-150 hover:opacity-90 md:w-auto md:inline-flex">
        <ClipboardCheck size={18} strokeWidth={1.75} aria-hidden /> {aula.feita ? "Ver chamada" : "Fazer chamada"}
      </Link>
    </section>
  )
}

function ListaComunicados({ comunicados }: { comunicados: Awaited<ReturnType<typeof comunicadosRecentes>> }) {
  return (
    <Lista vazio="Nenhum comunicado recente.">
      {comunicados.map((c) => (
        <Item key={c.id} icone={Megaphone} tom="accent" titulo={c.subject} subtitulo={c.sender?.name ?? undefined} href="/dashboard/mensagens" direita={dataCurta(c.createdAt)} />
      ))}
    </Lista>
  )
}

/* ------------------------------- Pedagogia ------------------------------- */

async function PainelPedagogia({ escolaId, anoLetivo, atalho, visiveis }: { escolaId: string; anoLetivo: number; atalho: Atalho; visiveis: Set<string> }) {
  // Cada bloco só aparece se o usuário puder abrir a tela de origem (o AEE não abre frequência, conselho nem ocorrências)
  const verRisco = visiveis.has("frequencia") || visiveis.has("conselho-classe")
  const verOcorrencias = visiveis.has("ocorrencias")
  const verAEE = visiveis.has("aee")

  const resumo = verRisco ? await resumoGestaoCache(escolaId, anoLetivo) : null
  const [risco, aee, ocorrencias] = await Promise.all([
    resumo ? estudantesEmRisco(escolaId, anoLetivo, resumo.idsAbaixoDoMinimo) : null,
    verAEE ? estudantesAEE(escolaId) : null,
    verOcorrencias ? ocorrenciasRecentes(escolaId) : null,
  ])
  const atrasadas = resumo ? resumo.turmas.filter((t) => t.chamadasPendentes > 0).sort((a, b) => b.chamadasPendentes - a.chamadasPendentes) : []

  return (
    <>
      <GradeIndicadores>
        {risco && <Indicador icone={AlertTriangle} tom="danger" valor={risco.total} rotulo="Estudantes em risco" detalhe="Frequência ou notas" href="#risco" />}
        {aee && <Indicador icone={Accessibility} tom="violet" valor={aee.total} rotulo="Estudantes AEE" detalhe="Com perfil de atendimento" href="#aee" />}
        {ocorrencias && <Indicador icone={FileWarning} tom="warning" valor={ocorrencias.ultimos30Dias} rotulo="Ocorrências" detalhe="Nos últimos 30 dias" href="#ocorrencias" />}
        {resumo && <Indicador icone={ClipboardCheck} tom="accent" valor={atrasadas.length} rotulo="Turmas com chamada atrasada" detalhe={`${resumo.chamadasPendentes} chamadas no total`} href="#atrasadas" />}
      </GradeIndicadores>

      {!verRisco && (
        <Aviso>Frequência, notas e ocorrências ficam com a direção: o perfil AEE não abre essas telas, então aqui aparecem só os estudantes do atendimento.</Aviso>
      )}

      {risco && (
        <Secao id="risco" titulo="Estudantes em risco" descricao="Abaixo da frequência mínima ou em recuperação" acao={atalho("conselho-classe").length ? { rotulo: "Conselho de classe", href: "/dashboard/conselho-classe" } : undefined}>
          <Lista vazio="Nenhum estudante em risco agora.">
            {risco.lista.map((e) => (
              <Item
                key={e.id}
                icone={UserRound}
                tom={e.frequencia && e.notas ? "danger" : "warning"}
                titulo={e.nome}
                subtitulo={`${e.turmaNome} · ${e.matricula}`}
                href={`/dashboard/estudantes/${e.matricula}/boletim`}
                direita={
                  <span className="flex flex-wrap justify-end gap-1">
                    {e.frequencia && <span className={cn("rounded-full px-2 py-0.5 font-medium", TOM.danger)}>Frequência</span>}
                    {e.notas && <span className={cn("rounded-full px-2 py-0.5 font-medium", TOM.warning)}>Notas</span>}
                  </span>
                }
              />
            ))}
          </Lista>
          {risco.total > risco.lista.length && <p className="text-13 text-fg-subtle">Mostrando {risco.lista.length} de {risco.total}.</p>}
        </Secao>
      )}

      {resumo && (
        <Secao id="frequencia" titulo="Frequência por turma" acao={{ rotulo: "Frequência", href: "/dashboard/frequencia" }}>
          {resumo.turmas.length === 0 ? <Aviso>Nenhuma turma neste ano letivo.</Aviso> : (
            <GradeCartoes>
              {resumo.turmas.map((t) => (
                <CartaoProgresso key={t.turmaId} codigo={t.nome} detalheCodigo={String(anoLetivo)} titulo={`Turma ${t.nome}`} rotulo="Frequência média" percentual={t.frequenciaMedia} rodape={`${t.abaixoDoMinimo} abaixo do mínimo`} href={`/dashboard/frequencia?turma=${t.turmaId}`} alerta={{ valor: t.abaixoDoMinimo, rotulo: "abaixo do mínimo" }} />
              ))}
            </GradeCartoes>
          )}
        </Secao>
      )}

      <div className="grid gap-5 lg:grid-cols-2">
        {resumo && (
          <Secao id="atrasadas" titulo="Turmas com chamada atrasada">
            <Lista vazio="Todas as chamadas em dia.">
              {atrasadas.map((t) => (
                <Item key={t.turmaId} icone={ClipboardCheck} tom="accent" titulo={`Turma ${t.nome}`} subtitulo={`Frequência média ${formatarFrequencia(t.frequenciaMedia)}`} href={`/dashboard/frequencia?turma=${t.turmaId}`} direita={`${t.chamadasPendentes} ${t.chamadasPendentes === 1 ? "chamada" : "chamadas"}`} />
              ))}
            </Lista>
          </Secao>
        )}
        {aee && (
          <Secao id="aee" titulo="Estudantes AEE" acao={{ rotulo: "Atendimento AEE", href: "/dashboard/aee" }}>
            <Lista vazio="Nenhum estudante com perfil AEE.">
              {aee.lista.map((p) => (
                <Item key={p.id} icone={Accessibility} tom="violet" titulo={p.estudante.nome} subtitulo={`${p.estudante.turma.nome} · ${p.condicao || "Sem condição informada"}`} href="/dashboard/aee" direita={p.precisaProvaAdaptada ? "Prova adaptada" : p.precisaProvaSalaEspecial ? "Sala especial" : undefined} />
              ))}
            </Lista>
          </Secao>
        )}
        {ocorrencias && (
          <Secao id="ocorrencias" titulo="Ocorrências recentes" acao={{ rotulo: "Ver todas", href: "/dashboard/ocorrencias" }}>
            <Lista vazio="Nenhuma ocorrência registrada.">
              {ocorrencias.lista.map((o) => (
                <Item key={o.id} icone={FileWarning} tom="warning" titulo={o.titulo} subtitulo={[o.tipo, o.estudantes.map((e) => e.estudante.nome).join(", ")].filter(Boolean).join(" · ")} href="/dashboard/ocorrencias" direita={dataCurta(o.data)} />
              ))}
            </Lista>
          </Secao>
        )}
      </div>

      <Secao titulo="Atalhos" className="hidden md:block">
        <Atalhos itens={[...atalho("conselho-classe"), ...atalho("ocorrencias"), ...atalho("aee")]} />
      </Secao>
    </>
  )
}

/* ----------------------------- Administração ----------------------------- */

async function PainelAdministracao({ escolaId, anoLetivo, atalho }: { escolaId: string; anoLetivo: number; atalho: Atalho }) {
  const [numeros, resumo, pendencias, comunicados, datas, cadeado] = await Promise.all([
    numerosDaEscola(escolaId, anoLetivo),
    resumoGestaoCache(escolaId, anoLetivo),
    pendenciasDaEscolaCache(escolaId, anoLetivo),
    comunicadosRecentes(escolaId, "gestao"),
    proximasDatas(escolaId, anoLetivo),
    avisosDoCadeado(escolaId, anoLetivo),
  ])
  const risco = await estudantesEmRisco(escolaId, anoLetivo, resumo.idsAbaixoDoMinimo, 0)
  const atrasados = professoresAtrasados(pendencias)
  const semNotaPorTurma = new Map<string, number>()
  for (const p of pendencias) semNotaPorTurma.set(p.turmaId, (semNotaPorTurma.get(p.turmaId) ?? 0) + p.semNota)
  const turmas = resumo.turmas
    .map((t) => ({ ...t, semNota: semNotaPorTurma.get(t.turmaId) ?? 0 }))
    .filter((t) => t.chamadasPendentes > 0 || t.abaixoDoMinimo > 0 || t.semNota > 0)
    .sort((a, b) => b.chamadasPendentes + b.abaixoDoMinimo - (a.chamadasPendentes + a.abaixoDoMinimo))

  const contagem = (n: number, tom: "danger" | "warning") => n > 0
    ? <span className={cn("inline-block rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums", TOM[tom])}>{n}</span>
    : <span className="text-fg-subtle tabular-nums">0</span>

  return (
    <>
      <GradeIndicadores>
        <Indicador icone={GraduationCap} tom="accent" valor={numeros.estudantes.toLocaleString("pt-BR")} rotulo="Estudantes" detalhe={`${numeros.turmas} turmas · ${numeros.disciplinas} disciplinas`} href="/dashboard/estudantes" />
        <Indicador icone={Users} tom="violet" valor={numeros.professores} rotulo="Professores" detalhe={`${atrasados.length} com lançamentos atrasados`} href="#professores" />
        <Indicador icone={ClipboardCheck} tom="success" valor={formatarFrequencia(resumo.frequenciaMedia)} rotulo="Frequência média" detalhe={`${resumo.chamadasPendentes} chamadas pendentes`} href="/dashboard/frequencia" />
        <Indicador icone={AlertTriangle} tom="danger" valor={risco.total} rotulo="Estudantes em risco" detalhe="Frequência ou notas" href="/dashboard/conselho-classe" />
      </GradeIndicadores>

      <div className="grid gap-5 xl:grid-cols-3 xl:items-start">
      <Secao id="turmas" className="xl:col-span-2" titulo="Turmas com pendências" descricao={`Chamadas, frequência e notas de ${anoLetivo}`} acao={{ rotulo: "Ver turmas", href: "/dashboard/turmas" }}>
        {turmas.length === 0 ? <Aviso>Nenhuma turma com pendência.</Aviso> : (
          <>
            {/* Celular: cartões. Telas maiores: tabela com rolagem própria */}
            <ul className="space-y-3 md:hidden">
              {turmas.map((t) => (
                <li key={t.turmaId}>
                  <Cartao>
                    <Link href={`/dashboard/frequencia?turma=${t.turmaId}`} className="block p-4">
                      <p className="font-mono text-xs text-fg-subtle">{t.nome}</p>
                      <p className="font-semibold text-fg">Frequência {formatarFrequencia(t.frequenciaMedia)}</p>
                      <dl className="mt-3 grid grid-cols-3 gap-2 text-xs text-fg-subtle">
                        <div><dt>Chamadas</dt><dd className="mt-0.5">{contagem(t.chamadasPendentes, "danger")}</dd></div>
                        <div><dt>Abaixo do mín.</dt><dd className="mt-0.5">{contagem(t.abaixoDoMinimo, "danger")}</dd></div>
                        <div><dt>Sem nota</dt><dd className="mt-0.5">{contagem(t.semNota, "warning")}</dd></div>
                      </dl>
                    </Link>
                  </Cartao>
                </li>
              ))}
            </ul>
            <Cartao className="hidden overflow-hidden md:block">
              <div className="relative overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-line bg-canvas text-left text-rotulo text-fg-muted">
                      <th scope="col" className="h-9 px-4 font-medium">Turma</th>
                      <th scope="col" className="h-9 px-3 text-right font-medium">Freq. média</th>
                      <th scope="col" className="h-9 px-3 text-right font-medium">Chamadas pendentes</th>
                      <th scope="col" className="h-9 px-3 text-right font-medium">Abaixo do mínimo</th>
                      <th scope="col" className="h-9 px-4 text-right font-medium">Alunos sem nota</th>
                    </tr>
                  </thead>
                  <tbody>
                    {turmas.map((t) => (
                      <tr key={t.turmaId} className="border-b border-line-subtle last:border-0">
                        <td className="h-linha px-4"><Link href={`/dashboard/frequencia?turma=${t.turmaId}`} className="font-mono font-medium text-fg hover:text-accent-fg hover:underline">{t.nome}</Link></td>
                        <td className="h-linha px-3 text-right text-fg-muted tabular-nums">{formatarFrequencia(t.frequenciaMedia)}</td>
                        <td className="h-linha px-3 text-right">{contagem(t.chamadasPendentes, "danger")}</td>
                        <td className="h-linha px-3 text-right">{contagem(t.abaixoDoMinimo, "danger")}</td>
                        <td className="h-linha px-4 text-right">{contagem(t.semNota, "warning")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Cartao>
          </>
        )}
      </Secao>

        <div className="min-w-0 space-y-5">
          <Secao id="comunicados" titulo="Comunicados" acao={{ rotulo: "Ver todos", href: "/dashboard/mensagens" }}>
            <ListaComunicados comunicados={comunicados} />
          </Secao>
          {cadeado.length > 0 && (
            <Secao id="encerramento" titulo="Encerramento de unidades" descricao="Encerram nos próximos 7 dias e reaberturas ativas" acao={atalho("encerramento").length ? { rotulo: "Gerenciar", href: "/dashboard/configuracoes/encerramento" } : undefined}>
              <Lista vazio="">
                {cadeado.map((c) => (
                  <Item key={c.chave} icone={c.tipo === "encerra" ? Lock : LockOpen} tom={c.tipo === "encerra" ? "violet" : "warning"} titulo={c.titulo} subtitulo={c.subtitulo} direita={c.tipo === "encerra" ? <>encerra<br />{dataCurta(c.data)}</> : <>até<br />{dataCurta(c.data)}</>} />
                ))}
              </Lista>
            </Secao>
          )}
          <Secao id="calendario" titulo="Calendário" descricao="Próximas datas" acao={atalho("configuracoes").length ? { rotulo: "Calendário letivo", href: "/dashboard/configuracoes/calendario" } : undefined}>
            <Lista vazio="Nenhuma data próxima no calendário.">
              {datas.map((d) => (
                <Item key={d.data + d.titulo} icone={d.tipo === "prazo" ? FileText : CalendarDays} tom={d.tipo === "prazo" ? "violet" : "accent"} titulo={d.titulo} subtitulo={d.tipo === "prazo" ? "Prazo de lançamento" : "Sem aula"} direita={dataCurta(d.data)} />
              ))}
            </Lista>
          </Secao>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-3 xl:items-start">
        <Secao id="professores" className="xl:col-span-2" titulo="Professores com lançamentos atrasados" descricao="Chamadas não feitas e alunos sem nota">
          <Lista vazio="Nenhum professor com lançamento atrasado.">
            {atrasados.slice(0, 8).map((p) => (
              <Item key={p.id} icone={UserRound} tom="warning" titulo={p.nome} subtitulo={`${p.disciplinas} ${p.disciplinas === 1 ? "disciplina" : "disciplinas"}`} href={atalho("usuarios").length ? `/dashboard/usuarios/${p.id}/disciplinas` : undefined} direita={<>{p.chamadasPendentes} chamadas<br />{p.semNota} sem nota</>} />
            ))}
          </Lista>
        </Secao>
      <Secao titulo="Atalhos" className="hidden md:block">
        <Atalhos itens={[...atalho("usuarios"), ...atalho("resultados", "Relatórios e resultados"), ...atalho("configuracoes"), ...(atalho("usuarios").length ? [] : atalho("turmas"))]} />
      </Secao>
      </div>
    </>
  )
}
