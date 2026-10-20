import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { can } from "@/lib/rbac"
import { hojeNaEscola, dataValida } from "@/lib/services/chamada"
import ChamadaClient from "./ChamadaClient"
import { calendarioDaChamada } from "@/lib/calendario-disciplina-leitura"
import { paginaDoModulo } from '@/lib/modulos/guarda'

export const metadata = { title: 'Áxis - Fazer chamada' }
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// A aula é aberta/criada pela server action no navegador (abrirChamada), não
// na renderização - um prefetch de link não deve criar registro de aula.
export default async function FazerChamadaPage({ searchParams }: { searchParams: Promise<{ turma?: string; disciplina?: string; data?: string }> }) {
  await paginaDoModulo('DIA')
  const session = await auth()
  if (!session?.user?.escolaId || can(session.user, 'portal.acessar') || !can(session.user, 'frequencia.lancar')) redirect("/dashboard")
  const { turma, disciplina, data } = await searchParams
  if (!turma) redirect("/dashboard/chamada")
  const hoje = hojeNaEscola()
  const dia = dataValida(data) ? data : hoje
  // Calendário da disciplina (só leitura, mesmo acesso da chamada); null = sem acesso/calendário
  const cal = await calendarioDaChamada(session.user, turma, disciplina ?? null)
  const calendario = cal ? { dias: cal.dias, linkBase: `/dashboard/chamada/fazer?turma=${cal.turmaId}${cal.disciplinaId ? `&disciplina=${cal.disciplinaId}` : ''}&data=` } : null
  // key: trocar a data/disciplina remonta a tela (sem mostrar a chamada anterior enquanto carrega)
  return <ChamadaClient key={`${turma}|${disciplina ?? ''}|${dia}`} turmaId={turma} disciplinaId={disciplina ?? null} data={dia} hoje={hoje} calendario={calendario} />
}
