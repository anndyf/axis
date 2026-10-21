import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { can } from "@/lib/rbac"
import { getGlobalConfig } from "@/lib/data-fetching"
import { chaveData } from "@/lib/services/calendario"
import { hojeNaEscola } from "@/lib/services/chamada"
import { resolverEsquemaAvaliacaoId } from "@/lib/services/notas"
import { encerramentoDaEtapa, podeDesfazerEncerramento, somarDias, REABERTURA_PADRAO_DIAS, REABERTURA_MAXIMA_DIAS } from "@/lib/cadeado-unidade"
import { paginaDoModulo } from '@/lib/modulos/guarda'
import EncerramentoClient, { type EsquemaTela, type ReaberturaTela, type TurmaTela } from "./EncerramentoClient"

export const metadata = { title: 'Áxis - Encerramento de unidades' }
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Encerramento de unidades (cadeado). Quem tem `unidade.encerrar` (Direção e
 * Coordenação) encerra, desfaz e reabre; quem já tem acesso ao calendário
 * letivo (`calendario.gerenciar`: Secretaria, Administrador) só vê.
 */
export default async function EncerramentoPage() {
  await paginaDoModulo('NUC')
  const session = await auth()
  const user = session?.user
  if (!user?.escolaId || can(user, 'portal.acessar') || !(can(user, 'unidade.encerrar') || can(user, 'calendario.gerenciar'))) redirect("/dashboard")
  const escolaId = user.escolaId
  const podeGerir = can(user, 'unidade.encerrar')
  const hoje = hojeNaEscola()

  const config = await getGlobalConfig(escolaId)
  const anoLetivo = config?.anoLetivoAtual ?? new Date().getFullYear()

  const [periodo, esquemas, reaberturas] = await Promise.all([
    prisma.periodoLetivo.findUnique({
      where: { escolaId_anoLetivo: { escolaId, anoLetivo } },
      select: { etapas: { select: { id: true, esquemaUnidadeId: true, inicio: true, fim: true, prazoLancamento: true, encerradaEm: true, encerradaPor: { select: { name: true, username: true } } } } },
    }),
    prisma.esquemaAvaliacao.findMany({
      where: { escolaId },
      orderBy: { nome: 'asc' },
      select: { id: true, nome: true, registroFrequencia: true, unidades: { orderBy: { ordem: 'asc' }, select: { id: true, nome: true } } },
    }),
    prisma.reaberturaUnidade.findMany({
      where: { escolaId, etapaCalendario: { periodoLetivo: { escolaId, anoLetivo } } },
      orderBy: { criadoEm: 'desc' },
      take: 200,
      select: {
        id: true, ate: true, motivo: true, criadoEm: true, revogadaEm: true,
        turma: { select: { nome: true } }, disciplina: { select: { nome: true } },
        etapaCalendario: { select: { esquemaUnidade: { select: { nome: true, esquema: { select: { nome: true } } } } } },
        criadoPor: { select: { name: true, username: true } }, revogadaPor: { select: { name: true, username: true } },
      },
    }),
  ])

  const etapaPorUnidade = new Map((periodo?.etapas ?? []).map((e) => [e.esquemaUnidadeId, e]))
  const nome = (u: { name: string | null; username: string } | null) => (u ? u.name || u.username : null)

  const esquemasTela: EsquemaTela[] = esquemas
    .map((esq) => ({
      id: esq.id,
      nome: esq.nome,
      unidades: esq.unidades.map((u) => {
        const etapa = etapaPorUnidade.get(u.id)
        if (!etapa) return { id: u.id, etapaId: null, nome: u.nome, inicio: null, fim: null, prazo: null, encerrada: null, podeDesfazer: false }
        const base = { prazoLancamento: etapa.prazoLancamento ? chaveData(etapa.prazoLancamento) : null, encerradaEm: etapa.encerradaEm }
        const enc = encerramentoDaEtapa(base, hoje)
        return {
          id: u.id,
          etapaId: etapa.id,
          nome: u.nome,
          inicio: chaveData(etapa.inicio),
          fim: chaveData(etapa.fim),
          prazo: base.prazoLancamento,
          encerrada: enc ? { data: enc.data, origem: enc.origem, por: enc.origem === 'MANUAL' ? nome(etapa.encerradaPor) : null } : null,
          podeDesfazer: podeDesfazerEncerramento(base, hoje),
        }
      }),
    }))

  // Formulário de reabertura: só para quem gere (turmas do ano, com o esquema
  // resolvido e as disciplinas - só id e nome)
  let turmas: TurmaTela[] = []
  if (podeGerir) {
    const lista = await prisma.turma.findMany({
      where: { escolaId, OR: [{ anoLetivo }, { anoLetivo: null }] },
      orderBy: { nome: 'asc' },
      select: { id: true, nome: true, cursoId: true, esquemaAvaliacaoId: true, disciplinas: { orderBy: { nome: 'asc' }, select: { id: true, nome: true } } },
    })
    const cursos = new Map((await prisma.curso.findMany({ where: { escolaId }, select: { id: true, esquemaAvaliacaoId: true } })).map((c) => [c.id, c]))
    const porDia = new Set(esquemas.filter((e) => e.registroFrequencia === 'POR_DIA').map((e) => e.id))
    turmas = lista.flatMap((t) => {
      const esquemaId = resolverEsquemaAvaliacaoId(t, t.cursoId ? cursos.get(t.cursoId) : null)
      return esquemaId ? [{ id: t.id, nome: t.nome, esquemaId, chamadaDiaria: porDia.has(esquemaId), disciplinas: t.disciplinas }] : []
    })
  }

  const reaberturasTela: ReaberturaTela[] = reaberturas.map((r) => {
    const ate = chaveData(r.ate)
    return {
      id: r.id,
      unidade: r.etapaCalendario.esquemaUnidade.nome,
      esquema: r.etapaCalendario.esquemaUnidade.esquema.nome,
      turma: r.turma.nome,
      disciplina: r.disciplina?.nome ?? null,
      ate,
      motivo: r.motivo,
      criadoPor: nome(r.criadoPor),
      criadoEm: hojeNaEscola(r.criadoEm),
      situacao: r.revogadaEm ? 'REVOGADA' : ate >= hoje ? 'ATIVA' : 'VENCIDA',
      revogadaPor: nome(r.revogadaPor),
    }
  })

  return (
    <EncerramentoClient
      anoLetivo={anoLetivo}
      temCalendario={!!periodo}
      podeGerir={podeGerir}
      esquemas={esquemasTela}
      reaberturas={reaberturasTela}
      turmas={turmas}
      ateSugerido={somarDias(hoje, REABERTURA_PADRAO_DIAS)}
      ateMinimo={hoje}
      ateMaximo={somarDias(hoje, REABERTURA_MAXIMA_DIAS)}
    />
  )
}
