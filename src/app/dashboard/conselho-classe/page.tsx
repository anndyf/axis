import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import Link from "next/link"
import { ArrowLeft, Gavel, CheckCircle2, TrendingUp, Info, ListFilter, ShieldCheck } from "lucide-react"
import { getTurmasPermitidas } from "@/lib/data-fetching"

export const metadata = {
  title: 'Áxis - Conselho classe'
}

export const runtime = 'nodejs'

import ConselhoClasseList from "./ConselhoClasseList"

async function getTurmasComConselho(session: any) {
  const turmasPermitidas = await getTurmasPermitidas(session)
  const turmasIds = turmasPermitidas.map(t => t.id)

  // Busca notas ainda não aprovadas (superset amplo, refinado abaixo em JS) -
  // não usa mais "nota1/nota2/nota3 not null" pra decidir "completo", já que
  // isso hardcodeava 3 unidades e dava falso-negativo em turmas semestrais
  // (2 unidades). `unidades` (NotaUnidade, populado desde a Fase 3 do
  // backfill) já reflete o número certo de unidades daquele esquema.
  const turmas = await prisma.turma.findMany({
    where: {
      id: { in: turmasIds }
    },
    include: {
      estudantes: {
        include: {
          notas: {
            where: { status: { not: 'APROVADO' } },
            select: {
              id: true,
              status: true,
              unidades: { select: { notaCalculada: true } }
            }
          }
        }
      }
    },
    orderBy: {
      nome: 'asc'
    }
  })

  const STATUS_RESOLVIDOS = ['APROVADO', 'APROVADO_CONSELHO', 'DEPENDENCIA', 'CONSERVADO', 'APROVADO_RECUPERACAO']
  const notaEstaCompleta = (n: { unidades: { notaCalculada: number | null }[] }) =>
    n.unidades.length > 0 && n.unidades.every((u) => u.notaCalculada !== null)

  const turmasProcessadas = turmas.filter(turma =>
    turma.estudantes.some(est => est.notas.length > 0)
  ).map(turma => {
    const estudantesComNota = turma.estudantes.filter(e => e.notas.length > 0)
    const pendentes = estudantesComNota.filter(e => e.notas.some(n =>
        n.status === 'RECUPERACAO' ||
        (notaEstaCompleta(n) && !STATUS_RESOLVIDOS.includes(n.status))
    )).length

    
    return {
      id: turma.id,
      nome: turma.nome,
      curso: turma.curso || 'Ensino Médio',
      turno: turma.turno || 'Não Definido',
      totalAlunosPendentes: pendentes,
      totalAlunosResolvidos: estudantesComNota.length - pendentes,
      isResolvido: pendentes === 0
    }
  })

  const grupos: Record<string, Record<string, any[]>> = {}
  
  turmasProcessadas.forEach(t => {
    const turno = t.turno
    const curso = t.curso
    
    if (!grupos[turno]) grupos[turno] = {}
    if (!grupos[turno][curso]) grupos[turno][curso] = []
    grupos[turno][curso].push(t)
  })

  return grupos
}

export default async function ConselhoClassePage() {
  const session = await auth()
  
  if (!session) {
    redirect("/login")
  }

  const grupos = await getTurmasComConselho(session)
  const turnos = Object.keys(grupos)

  const conselhoTips = [
    {
      title: "Conselho Ativo",
      description: "Delibere sobre o futuro acadêmico de alunos retidos na recuperação final.",
      icon: <ShieldCheck className="w-5 h-5 text-slate-700" />,
      color: "indigo"
    },
    {
      title: "Votos e Decisões",
      description: "As deliberações registradas aqui geram as atas automáticas de fechamento.",
      icon: <ListFilter className="w-5 h-5 text-slate-700" />,
      color: "blue"
    },
    {
      title: "Caminho Crítico",
      description: "Alunos com pendências na recuperação final requerem atenção imediata.",
      icon: <TrendingUp className="w-5 h-5 text-rose-600" />,
      color: "rose"
    }
  ]

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header Premium Estilo Resultados - Ajustado para ser Flush com o Layout */}
      <header className="bg-white/80 backdrop-blur-xl border-b border-slate-300 sticky top-0 z-50 -mx-4 -mt-4 md:-mx-8 md:-mt-8 mb-4 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto py-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="flex items-center space-x-5">
              <Link
                href="/dashboard"
                className="p-2 hover:bg-slate-200 rounded-lg transition-colors text-slate-400 hover:text-slate-700"
              >
                <ArrowLeft size={20} />
              </Link>
              <div>
                <h1 className="text-2xl font-medium text-slate-800 tracking-tight">Conselho de Classe</h1>
                <p className="text-base text-slate-700 font-medium">Gestão de deliberações e fechamento das turmas</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-32 space-y-8">
        
        {/* Dicas Fixas - Estilo Resultados */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {conselhoTips.map((tip, index) => (
             <div key={index} className="bg-white/60 border border-slate-300/60 p-5 rounded-3xl flex items-start space-x-4 hover:bg-white hover:border-slate-300 hover:shadow-xl hover:shadow-slate-300/30 transition-all group">
                <div className={`p-3 rounded-2xl bg-${tip.color}-50 text-${tip.color}-600 group-hover:bg-${tip.color}-600 group-hover:text-white transition-all shadow-inner`}>
                   {tip.icon}
                </div>
                <div>
                  <h3 className="text-sm font-medium text-slate-800 uppercase tracking-widest mb-1">{tip.title}</h3>
                  <p className="text-[11px] font-medium text-slate-400 uppercase leading-relaxed">{tip.description}</p>
                </div>
             </div>
          ))}
        </div>

        {turnos.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-300 p-20 text-center">
              <div className="bg-emerald-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 border border-emerald-100">
                <CheckCircle2 className="w-8 h-8 text-emerald-500" />
              </div>
              <h2 className="text-lg font-medium text-slate-800 mb-1">Tudo em dia!</h2>
              <p className="text-slate-600 max-w-xs mx-auto text-sm">
                Não existem turmas aguardando deliberação de conselho.
              </p>
          </div>
        ) : (
          <ConselhoClasseList gruposIniciais={grupos} />
        )}
      </main>
    </div>
  )
}
