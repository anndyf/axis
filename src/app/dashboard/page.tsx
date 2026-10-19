import Link from "next/link"
import { redirect } from "next/navigation"
import { unstable_cache } from "next/cache"
import {
  Accessibility, AlertTriangle, CalendarDays, ClipboardCheck, ClipboardList, FileText, FileWarning,
  GraduationCap, Megaphone, MessageSquare, NotebookPen, UserRound, Users, type LucideIcon,
} from "lucide-react"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getGlobalConfig } from "@/lib/data-fetching"
import { getModulosAtivos } from "@/lib/modules-server"
import { MODULOS, modulosVisiveis } from "@/lib/modules"
import { formatarFrequencia } from "@/lib/services/frequencia"
import {
  atividadesDoProfessor, comunicadosRecentes, estudantesAEE, estudantesEmRisco, numerosDaEscola, ocorrenciasRecentes,
  pendenciasPorDisciplina, professoresAtrasados, proximasDatas, resumoGestao, resumoProfessor,
} from "@/lib/services/painel-leitura"
import { ROTULO_VISAO, visaoEfetiva, visoesDoUsuario, type VisaoPainel } from "@/lib/services/painel-visoes"
import { cn } from "@/components/ui/cn"
import TeacherTipsModal from "@/components/TeacherTipsModal"
import { Atalhos, Aviso, Cartao, CartaoProgresso, Chip, dataCurta, GradeCartoes, Indicador, Item, Lista, Secao, TOM } from "@/components/painel/ui"

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
  let visoes = visoesDoUsuario(user)
  if (visoes.length > 1 && visoes.includes("professor")) {
    const temDisciplinas = await prisma.disciplina.count({ where: { usuariosPermitidos: { some: { id: user.id } }, turma: { escolaId, anoLetivo } } })
    if (!temDisciplinas) visoes = visoes.filter((v) => v !== "professor")
  }
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
    <Secao titulo="Atalhos">
      <Atalhos itens={[...atalho("mensagens"), ...atalho("laboratorios")]} />
    </Secao>
  )

  const hoje = new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long", timeZone: "America/Sao_Paulo" })
  const nome = user.name ?? "Usuário"

  return (
    <div className="space-y-8">
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
        <div className="min-w-0 border-l-4 border-escola pl-4">
          <p className="text-sm text-fg-subtle">Boas-vindas de volta,</p>
          <h1 className="break-words text-2xl font-semibold text-fg">{nome}</h1>
          <p className="mt-1 text-sm text-fg-subtle first-letter:uppercase">{hoje} · {escola?.nome ?? "Áxis"} · ano letivo {anoLetivo}</p>
        </div>
        {visoes.length > 1 && visao && (
          <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Visão do painel">
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
  return <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">{children}</div>
}

type Atalho = (id: string, rotulo?: string, href?: string) => { rotulo: string; href: string; icone: LucideIcon }[]

/* ------------------------------- Professor ------------------------------- */

async function PainelProfessor({ escolaId, userId, anoLetivo, atalho }: { escolaId: string; userId: string; anoLetivo: number; atalho: Atalho }) {
  const [prof, pendencias, atividades, comunicados] = await Promise.all([
    resumoProfessor(escolaId, userId, anoLetivo),
    pendenciasPorDisciplina(escolaId, anoLetivo, userId),
    atividadesDoProfessor(escolaId, userId, anoLetivo),
    comunicadosRecentes(escolaId, "professor"),
  ])
  const chamadas = pendencias.filter((p) => p.chamadasPendentes > 0)
  const totalChamadas = chamadas.reduce((s, p) => s + p.chamadasPendentes, 0)
  const semNota = prof.disciplinas.reduce((s, d) => s + d.semNota, 0)
  const pendPorDisc = new Map(pendencias.map((p) => [p.disciplinaId ?? `dia-${p.turmaId}`, p]))
  const linkChamada = (turmaId: string, disciplinaId: string | null) => `/dashboard/chamada/fazer?turma=${turmaId}${disciplinaId ? `&disciplina=${disciplinaId}` : ""}&data=${prof.hoje}`
  const primeira = prof.disciplinas[0]

  return (
    <>
      <GradeIndicadores>
        <Indicador icone={ClipboardCheck} tom="accent" valor={prof.aulasDeHoje.length} rotulo="Aulas hoje" detalhe={`${prof.aulasDeHoje.filter((a) => a.feita).length} com chamada feita`} href="#aulas" />
        <Indicador icone={AlertTriangle} tom="danger" valor={totalChamadas} rotulo="Chamadas pendentes" detalhe="Dias com aula sem chamada" href="#chamadas" />
        <Indicador icone={FileText} tom="violet" valor={semNota} rotulo="Notas a lançar" detalhe="Alunos sem nota lançada" href="#disciplinas" />
        <Indicador icone={NotebookPen} tom="success" valor={atividades.length} rotulo="Atividades" detalhe="Próximas avaliações" href="#atividades" />
      </GradeIndicadores>

      <Secao id="aulas" titulo="Aulas de hoje" acao={{ rotulo: "Todas as chamadas", href: "/dashboard/chamada" }}>
        <Lista vazio="Nenhuma aula sua hoje. Dias não letivos e disciplinas fora do horário não aparecem.">
          {prof.aulasDeHoje.map((a) => (
            <Item
              key={`${a.turmaId}-${a.disciplinaId}`}
              icone={a.feita ? ClipboardCheck : ClipboardList}
              tom={a.feita ? "success" : "accent"}
              titulo={a.nome}
              subtitulo={`${a.turmaNome} · ${a.tempos.length ? a.tempos.map((t) => `${t}º`).join(", ") + " tempo" : "dia inteiro"}`}
              href={linkChamada(a.turmaId, a.disciplinaId)}
              direita={<span className={cn("rounded-full px-2.5 py-1 font-medium", a.feita ? TOM.success : "bg-accent text-on-accent")}>{a.feita ? "Feita" : "Fazer chamada"}</span>}
            />
          ))}
        </Lista>
      </Secao>

      <Secao id="disciplinas" titulo="Minhas disciplinas" descricao={`Notas lançadas em ${anoLetivo}`} acao={{ rotulo: "Lançar notas", href: "/dashboard/notas" }}>
        {prof.disciplinas.length === 0 ? (
          <Aviso>Nenhuma disciplina vinculada a você. Peça à gestão para vincular suas disciplinas.</Aviso>
        ) : (
          <GradeCartoes>
            {prof.disciplinas.map((d) => (
              <CartaoProgresso
                key={d.id}
                codigo={d.turmaNome}
                detalheCodigo={String(anoLetivo)}
                titulo={d.nome}
                rotulo="Notas lançadas"
                percentual={d.alunos ? ((d.alunos - d.semNota) / d.alunos) * 100 : null}
                rodape={`${d.alunos} alunos · ${d.semNota} sem nota`}
                href={`/dashboard/notas/lancar/${d.turmaId}`}
                alerta={{ valor: pendPorDisc.get(d.id)?.chamadasPendentes ?? 0, rotulo: "chamadas pendentes" }}
              />
            ))}
          </GradeCartoes>
        )}
      </Secao>

      <div className="grid gap-8 lg:grid-cols-2">
        <Secao id="chamadas" titulo="Chamadas pendentes">
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

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
        <Secao id="comunicados" titulo="Comunicados" acao={{ rotulo: "Ver todos", href: "/dashboard/mensagens" }}>
          <ListaComunicados comunicados={comunicados} />
        </Secao>
        <Secao titulo="Atalhos">
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

      <div className="grid gap-8 lg:grid-cols-2">
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

      <Secao titulo="Atalhos">
        <Atalhos itens={[...atalho("conselho-classe"), ...atalho("ocorrencias"), ...atalho("aee")]} />
      </Secao>
    </>
  )
}

/* ----------------------------- Administração ----------------------------- */

async function PainelAdministracao({ escolaId, anoLetivo, atalho }: { escolaId: string; anoLetivo: number; atalho: Atalho }) {
  const [numeros, resumo, pendencias, comunicados, datas] = await Promise.all([
    numerosDaEscola(escolaId, anoLetivo),
    resumoGestaoCache(escolaId, anoLetivo),
    pendenciasDaEscolaCache(escolaId, anoLetivo),
    comunicadosRecentes(escolaId, "gestao"),
    proximasDatas(escolaId, anoLetivo),
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

      <Secao id="turmas" titulo="Turmas com pendências" descricao={`Chamadas, frequência e notas de ${anoLetivo}`} acao={{ rotulo: "Ver turmas", href: "/dashboard/turmas" }}>
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
                    <tr className="border-b border-line text-left text-xs text-fg-subtle">
                      <th scope="col" className="px-5 py-3 font-medium">Turma</th>
                      <th scope="col" className="px-3 py-3 text-right font-medium">Freq. média</th>
                      <th scope="col" className="px-3 py-3 text-right font-medium">Chamadas pendentes</th>
                      <th scope="col" className="px-3 py-3 text-right font-medium">Abaixo do mínimo</th>
                      <th scope="col" className="px-5 py-3 text-right font-medium">Alunos sem nota</th>
                    </tr>
                  </thead>
                  <tbody>
                    {turmas.map((t) => (
                      <tr key={t.turmaId} className="border-b border-line-subtle last:border-0">
                        <td className="px-5 py-3"><Link href={`/dashboard/frequencia?turma=${t.turmaId}`} className="font-mono font-medium text-fg hover:text-accent-fg hover:underline">{t.nome}</Link></td>
                        <td className="px-3 py-3 text-right text-fg-muted tabular-nums">{formatarFrequencia(t.frequenciaMedia)}</td>
                        <td className="px-3 py-3 text-right">{contagem(t.chamadasPendentes, "danger")}</td>
                        <td className="px-3 py-3 text-right">{contagem(t.abaixoDoMinimo, "danger")}</td>
                        <td className="px-5 py-3 text-right">{contagem(t.semNota, "warning")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Cartao>
          </>
        )}
      </Secao>

      <div className="grid gap-8 lg:grid-cols-2">
        <Secao id="professores" titulo="Professores com lançamentos atrasados" descricao="Chamadas não feitas e alunos sem nota">
          <Lista vazio="Nenhum professor com lançamento atrasado.">
            {atrasados.slice(0, 8).map((p) => (
              <Item key={p.id} icone={UserRound} tom="warning" titulo={p.nome} subtitulo={`${p.disciplinas} ${p.disciplinas === 1 ? "disciplina" : "disciplinas"}`} href={atalho("usuarios").length ? `/dashboard/usuarios/${p.id}/disciplinas` : undefined} direita={<>{p.chamadasPendentes} chamadas<br />{p.semNota} sem nota</>} />
            ))}
          </Lista>
        </Secao>
        <div className="min-w-0 space-y-8">
          <Secao id="comunicados" titulo="Comunicados" acao={{ rotulo: "Ver todos", href: "/dashboard/mensagens" }}>
            <ListaComunicados comunicados={comunicados} />
          </Secao>
          <Secao id="calendario" titulo="Calendário" descricao="Próximas datas" acao={atalho("configuracoes").length ? { rotulo: "Calendário letivo", href: "/dashboard/configuracoes/calendario" } : undefined}>
            <Lista vazio="Nenhuma data próxima no calendário.">
              {datas.map((d) => (
                <Item key={d.data + d.titulo} icone={d.tipo === "prazo" ? FileText : CalendarDays} tom={d.tipo === "prazo" ? "violet" : "accent"} titulo={d.titulo} subtitulo={d.tipo === "prazo" ? "Prazo de lançamento" : "Sem aula"} direita={dataCurta(d.data)} />
              ))}
            </Lista>
          </Secao>
        </div>
      </div>

      <Secao titulo="Atalhos">
        <Atalhos itens={[...atalho("usuarios"), ...atalho("resultados", "Relatórios e resultados"), ...atalho("configuracoes"), ...(atalho("usuarios").length ? [] : atalho("turmas"))]} />
      </Secao>
    </>
  )
}
