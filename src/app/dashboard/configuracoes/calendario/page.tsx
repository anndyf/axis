import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { can } from "@/lib/rbac"
import { getGlobalConfig } from "@/lib/data-fetching"
import { diasLetivos, chaveData } from "@/lib/services/calendario"
import CalendarioClient from "./CalendarioClient"
import { paginaDoModulo } from '@/lib/modulos/guarda'

export const metadata = { title: 'Áxis - Calendário letivo' }
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export default async function CalendarioPage() {
  await paginaDoModulo('NUC')
  const session = await auth()
  if (!session?.user?.escolaId || !can(session.user, 'calendario.gerenciar')) redirect("/dashboard")
  const escolaId = session.user.escolaId

  const config = await getGlobalConfig(escolaId)
  const anoLetivo = config?.anoLetivoAtual ?? new Date().getFullYear()

  const [periodo, esquemas, naoLetivos, extras, tempos] = await Promise.all([
    prisma.periodoLetivo.findUnique({ where: { escolaId_anoLetivo: { escolaId, anoLetivo } }, include: { etapas: true } }),
    prisma.esquemaAvaliacao.findMany({
      where: { escolaId },
      orderBy: { nome: 'asc' },
      include: { unidades: { orderBy: { ordem: 'asc' }, select: { id: true, nome: true } } }
    }),
    prisma.diaNaoLetivo.findMany({ where: { escolaId, turmaId: null }, orderBy: { data: 'asc' } }),
    prisma.diaLetivoExtra.findMany({ where: { escolaId }, orderBy: { data: 'asc' } }),
    prisma.tempoAula.findMany({ where: { escolaId }, orderBy: [{ turno: 'asc' }, { ordem: 'asc' }] }),
  ])

  const etapaPorUnidade = new Map((periodo?.etapas ?? []).map((e) => [e.esquemaUnidadeId, e]))
  const totalDiasLetivos = periodo
    ? diasLetivos({ inicio: periodo.inicio, fim: periodo.fim, naoLetivos, extras }).length
    : null

  return (
    <CalendarioClient
      anoLetivo={anoLetivo}
      periodo={periodo ? { inicio: chaveData(periodo.inicio), fim: chaveData(periodo.fim) } : null}
      totalDiasLetivos={totalDiasLetivos}
      esquemas={esquemas.map((esq) => ({
        id: esq.id,
        nome: esq.nome,
        unidades: esq.unidades.map((u) => {
          const etapa = etapaPorUnidade.get(u.id)
          return {
            id: u.id,
            nome: u.nome,
            inicio: etapa ? chaveData(etapa.inicio) : '',
            fim: etapa ? chaveData(etapa.fim) : '',
            prazoLancamento: etapa?.prazoLancamento ? chaveData(etapa.prazoLancamento) : '',
          }
        }),
      }))}
      naoLetivos={naoLetivos.map((d) => ({ id: d.id, data: chaveData(d.data), tipo: d.tipo, descricao: d.descricao }))}
      extras={extras.map((d) => ({ id: d.id, data: chaveData(d.data), seguirHorarioDe: d.seguirHorarioDe, descricao: d.descricao }))}
      tempos={tempos.map((t) => ({ turno: t.turno, ordem: t.ordem, inicio: t.inicio, fim: t.fim }))}
    />
  )
}
