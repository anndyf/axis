import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import QuestoesClient from "./QuestoesClient"
import { getTurmasPermitidas } from "@/lib/data-fetching"

export const metadata = {
  title: 'Áxis - Questoes'
}

export const runtime = 'nodejs'

export default async function QuestoesPage() {
  const session = await auth()
  if (!session) redirect("/login")

  const isManagement = session.user.isSuperuser || session.user.isDirecao
  const userId = session.user.id

  // Buscar configurações
  const config = await prisma.globalConfig.upsert({
    where: { id: session.user.escolaId },
    update: {},
    create: { id: session.user.escolaId, escolaId: session.user.escolaId, isBancoQuestoesAtivo: true }
  })

  // Se professor e banco estiver desativado, bloqueia acesso
  if (!session.user.isSuperuser && !session.user.isDirecao && !config.isBancoQuestoesAtivo) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <div className="w-20 h-20 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mb-6">
          <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 15c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h1 className="text-2xl font-medium text-slate-900">Módulo em Manutenção</h1>
        <p className="text-slate-600 mt-2 max-w-md">
          O Banco de Questões foi temporariamente desativado pela direção para manutenção ou atualização pedagógica.
        </p>
      </div>
    )
  }

  // Buscar turmas e disciplinas para os filtros/seleção
  const turmasPermitidas = await getTurmasPermitidas(session)
  const turmas = turmasPermitidas.map((t: any) => ({
    id: t.id,
    nome: t.nome,
    serie: t.serie
  }))

  const disciplinasRaw = await prisma.disciplina.findMany({
    where: isManagement ? {} : {
      usuariosPermitidos: {
        some: { id: userId }
      }
    },
    include: {
      turma: { select: { nome: true, serie: true } }
    },
    orderBy: { nome: 'asc' }
  })

  // Formatar dados das disciplinas de forma consistente (sempre inclui a turma)
  const disciplinasForm = disciplinasRaw.map(d => ({
    id: d.id,
    nome: d.nome,
    turmaId: d.turmaId,
    turmaNome: d.turma.nome,
    serie: d.turma.serie,
    label: `${d.nome} (${d.turma.nome})`
  }))

  const areas = await prisma.areaConhecimento.findMany({ orderBy: { nome: 'asc' } })

  // Buscar métricas do banco
  const stats = await prisma.$transaction([
    prisma.questao.count({ where: { status: 'APROVADA' } }),
    prisma.questao.count({ where: { status: 'PENDENTE' } }),
    prisma.questao.count({ where: isManagement ? {} : { professorId: userId } })
  ])

  const metrics = {
    totalAprovadas: stats[0],
    totalPendentes: stats[1],
    minhasQuestoes: stats[2]
  }

  // Busca contagem de questões por turma com UMA única query — agrupamento feito em JS
  // Evita múltiplas transações simultâneas que esgotariam o pool de conexões
  const whereQuestoes = isManagement ? {} : { professorId: userId }

  const todasQuestoes = await prisma.questao.findMany({
    where: whereQuestoes,
    select: {
      status: true,
      turmas: { select: { id: true, nome: true, serie: true } }
    }
  })

  // Agrupa por turma em JavaScript
  const turmaMapa = new Map<string, { id: string; nome: string; serie: string | null; total: number; aprovadas: number; pendentes: number; rejeitadas: number }>()

  for (const q of todasQuestoes) {
    for (const turma of q.turmas) {
      if (!turmaMapa.has(turma.id)) {
        turmaMapa.set(turma.id, { id: turma.id, nome: turma.nome, serie: turma.serie, total: 0, aprovadas: 0, pendentes: 0, rejeitadas: 0 })
      }
      const entry = turmaMapa.get(turma.id)!
      entry.total++
      if (q.status === 'APROVADA') entry.aprovadas++
      else if (q.status === 'PENDENTE') entry.pendentes++
      else entry.rejeitadas++
    }
  }

  const questoesPorTurma = Array.from(turmaMapa.values()).sort((a, b) => b.total - a.total)
  
  // Buscar lista de professores que já enviaram questões (apenas para Admin)
  let professores: { id: string, name: string }[] = []
  if (isManagement) {
    const profsRaw = await prisma.user.findMany({
      where: {
        questoes: { some: {} }
      },
      select: { 
        id: true, 
        name: true,
        _count: { select: { questoes: true } }
      },
      orderBy: { name: 'asc' }
    })
    professores = profsRaw.map(p => ({ 
      id: p.id, 
      name: p.name || 'Sem Nome', 
      questoesCount: p._count.questoes 
    }))
  }

  return (
    <QuestoesClient 
      user={session.user} 
      turmas={turmas} 
      disciplinas={disciplinasForm} 
      metrics={metrics}
      questoesPorTurma={questoesPorTurma}
      professores={professores}
      areas={areas}
    />
  )
}
