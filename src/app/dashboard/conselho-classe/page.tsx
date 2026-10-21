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
import TabelaConselho from "./TabelaConselho"
import { CabecalhoPagina } from "@/components/ui"
import { paginaDoModulo } from '@/lib/modulos/guarda'

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
  await paginaDoModulo('RES')
  const session = await auth()
  
  if (!session) {
    redirect("/login")
  }

  const grupos = await getTurmasComConselho(session)
  const turnos = Object.keys(grupos)
  const lista = Object.values(grupos).flatMap((porCurso) => Object.values(porCurso).flat())

  const conselhoTips = [
    {
      title: "Conselho Ativo",
      description: "Delibere sobre o futuro acadêmico de alunos retidos na recuperação final.",
      icon: <ShieldCheck className="w-5 h-5 text-fg-muted" />,
      color: "indigo"
    },
    {
      title: "Votos e Decisões",
      description: "As deliberações registradas aqui geram as atas automáticas de fechamento.",
      icon: <ListFilter className="w-5 h-5 text-fg-muted" />,
      color: "blue"
    },
    {
      title: "Caminho Crítico",
      description: "Alunos com pendências na recuperação final requerem atenção imediata.",
      icon: <TrendingUp className="w-5 h-5 text-danger-fg" />,
      color: "rose"
    }
  ]

  return (
    <div className="">
      <CabecalhoPagina
        titulo="Conselho de classe"
        descricao="Deliberações sobre estudantes que não atingiram a média após a recuperação final."
        dados={[
          { rotulo: "Turmas", valor: lista.length },
          { rotulo: "Com pendência", valor: lista.filter((t) => !t.isResolvido).length },
        ]}
      />

      {lista.length > 0 && <TabelaConselho turmas={lista} />}

      <main className={lista.length > 0 ? "space-y-8 pb-32 md:hidden" : "space-y-8 pb-32 md:pb-0"}>
        
        {/* Dicas Fixas - Estilo Resultados */}
        <div className="grid grid-cols-1 gap-4 md:hidden">
          {conselhoTips.map((tip, index) => (
             <div key={index} className="bg-surface border border-line p-4 rounded-2xl flex items-start gap-3">
                <div className={`p-3 rounded-lg bg-subtle text-fg-muted transition-all shadow-card`}>
                   {tip.icon}
                </div>
                <div>
                  <h3 className="text-sm font-medium text-fg mb-1">{tip.title}</h3>
                  <p className="text-xs font-medium text-fg-subtle leading-relaxed">{tip.description}</p>
                </div>
             </div>
          ))}
        </div>

        {turnos.length === 0 ? (
          <div className="bg-surface rounded-lg shadow-sm border border-line-strong p-20 text-center">
              <div className="bg-success-subtle w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 border border-success-line">
                <CheckCircle2 className="w-8 h-8 text-success-fg" />
              </div>
              <h2 className="text-lg font-medium text-fg mb-1">Tudo em dia!</h2>
              <p className="text-fg-muted max-w-xs mx-auto text-sm">
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
