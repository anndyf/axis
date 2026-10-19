
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import Link from "next/link"
import { Plus, GraduationCap, Upload, Accessibility, Pencil, FileText, ShieldCheck } from "lucide-react"
import { Avatar, Badge, EmptyState, PageHeader, buttonClasses } from "@/components/ui"
import EstudantesFilter from "./EstudantesFilter"
import PortalActivationAction from "./PortalActivationAction"
import PortalActionsMenu from "./PortalActionsMenu"

export const metadata = {
  title: 'Áxis - Estudantes'
}

// Force recompile to pick up new Prisma schema types - v4.0.0
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

async function getEstudantes(filters: { 
  search?: string; 
  cursoId?: string; 
  turmaId?: string; 
  turno?: string; 
  serie?: string;
  userId?: string;
  isDirecao?: boolean;
  escolaId: string;
}) {
  const config = await prisma.globalConfig.findUnique({ where: { id: filters.escolaId } })
  const currentYear = config?.anoLetivoAtual || new Date().getFullYear()

  const where: any = { escolaId: filters.escolaId }
  
  // Só aplicamos a restrição de ano letivo se NÃO houver uma busca por texto.
  // Se houver busca, queremos encontrar o aluno em qualquer ano para evitar duplicidade.
  if (!filters.search) {
    where.turma = {
      anoLetivo: currentYear
    }
  }

  // Se não for direção/superuser, filtrar apenas turmas permitidas
  if (!filters.isDirecao && filters.userId) {
    if (!where.turma) where.turma = {}
    where.turma.OR = [
      { usuariosPermitidos: { some: { id: filters.userId } } },
      { disciplinas: { some: { usuariosPermitidos: { some: { id: filters.userId } } } } }
    ]
  }

  if (filters.search) {
    where.OR = [
      { nome: { contains: filters.search, mode: 'insensitive' } },
      { matricula: { contains: filters.search, mode: 'insensitive' } }
    ]
  }

  if (filters.turmaId) {
    where.turmaId = filters.turmaId
  } else {
    // Se não tiver turma específica, filtra por propriedades da turma (curso/turno/serie)
    const turmaWhere: any = {}
    
    if (filters.cursoId) {
      turmaWhere.OR = [
        { cursoId: filters.cursoId },
        { curso: filters.cursoId }
      ]
    }

    if (filters.turno) turmaWhere.turno = filters.turno
    if (filters.serie) turmaWhere.serie = { contains: filters.serie }
    
    if (Object.keys(turmaWhere).length > 0) {
      where.turma = {
        ...where.turma,
        ...turmaWhere
      }
    }
  }

  const estudantes = await prisma.estudante.findMany({
    where,
    select: {
      matricula: true,
      nome: true,
      turma: {
        select: {
          id: true,
          nome: true
        }
      },
      aeeProfile: { select: { id: true } },
      portalAccess: { select: { id: true } },
      _count: {
        select: {
          notas: true
        }
      }
    },
    orderBy: {
      nome: 'asc'
    },
    take: 200
  })

  const portalUserIds = new Set(
    estudantes
      .filter(e => e.portalAccess.length > 0)
      .map(e => e.matricula)
  )

  return { estudantes, portalUserIds }
}

export default async function EstudantesPage({
  searchParams
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const session = await auth()
  
  if (!session?.user?.escolaId) {
    redirect("/login")
  }
  const escolaId = session.user.escolaId

  const resolvedParams = await searchParams
  const search = typeof resolvedParams.search === 'string' ? resolvedParams.search : undefined
  const cursoId = typeof resolvedParams.cursoId === 'string' ? resolvedParams.cursoId : undefined
  const turmaId = typeof resolvedParams.turmaId === 'string' ? resolvedParams.turmaId : undefined
  const turno = typeof resolvedParams.turno === 'string' ? resolvedParams.turno : undefined
  const serie = typeof resolvedParams.serie === 'string' ? resolvedParams.serie : undefined

  const isDirecao = session.user.isSuperuser || session.user.isDirecao
  const hasFilters = !!(search || cursoId || turmaId || turno || serie)

  // Utilizando cast 'any' para evitar erros de lint stale com o cliente Prisma gerado
  const [dbCursos, turmas] = await Promise.all([
    (prisma as any).curso.findMany({
      where: { escolaId },
      select: { id: true, nome: true, modalidade: true },
      orderBy: { nome: 'asc' }
    }),
    (prisma as any).turma.findMany({
      where: {
        escolaId,
        anoLetivo: (await prisma.globalConfig.findUnique({ where: { id: escolaId } }))?.anoLetivoAtual || new Date().getFullYear(),
        ...(isDirecao ? {} : {
          OR: [
            { usuariosPermitidos: { some: { id: session.user.id } } },
            { disciplinas: { some: { usuariosPermitidos: { some: { id: session.user.id } } } } }
          ]
        })
      },
      select: { id: true, nome: true, cursoId: true, turno: true, curso: true, serie: true },
      orderBy: { nome: 'asc' }
    })
  ])

  // Busca de estudantes apenas se houver filtros para não sobrecarregar
  const { estudantes, portalUserIds } = hasFilters 
    ? await getEstudantes({ search, cursoId, turmaId, turno, serie, userId: session.user.id, isDirecao, escolaId })
    : { estudantes: [], portalUserIds: new Set() }

  // Combinar cursos do banco (novos) com cursos legados (strings nas turmas)
  const legacyCursos = Array.from(new Set(
    turmas
      .filter((t: any) => t.curso && !t.cursoId)
      .map((t: any) => t.curso)
  )).map(nome => ({ id: nome as string, nome: nome as string }))

  const cursos = [...dbCursos, ...legacyCursos]
    .map(c => ({
      id: c.id,
      nome: (c as any).modalidade ? `${c.nome} (${(c as any).modalidade})` : c.nome
    }))
    .sort((a, b) => a.nome.localeCompare(b.nome))

  const podeGerir = session.user.isSuperuser || session.user.isDirecao
  const acaoIcone = "p-1.5 rounded-md text-fg-subtle transition-colors duration-150 hover:bg-subtle hover:text-fg"

  return (
    <div className="mx-auto max-w-7xl space-y-4 pb-16">
      <PageHeader
        title="Estudantes"
        description="Cadastro de alunos, acesso ao portal e boletins."
        actions={podeGerir ? (
          <>
            <Link href="/dashboard/aee" className={buttonClasses({ variant: "ghost" })}>
              <Accessibility size={16} strokeWidth={1.75} /> Painel AEE
            </Link>
            <PortalActionsMenu />
            <Link href="/dashboard/estudantes/importar" className={buttonClasses({ variant: "secondary" })}>
              <Upload size={16} strokeWidth={1.75} /> Importar
            </Link>
            <Link href="/dashboard/estudantes/novo" className={buttonClasses()}>
              <Plus size={16} strokeWidth={1.75} /> Novo aluno
            </Link>
          </>
        ) : undefined}
      />

      <div className="bg-surface rounded-2xl border border-line overflow-hidden">
         <EstudantesFilter cursos={cursos} turmas={turmas} totalResults={estudantes.length} />
         {estudantes.length > 0 && (
           <p className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-2 text-xs text-fg-subtle sm:px-5">
             <span className="inline-flex items-center gap-1.5"><ShieldCheck size={14} strokeWidth={1.75} aria-hidden /> Acesso ao portal</span>
             <span className="inline-flex items-center gap-1.5"><Pencil size={14} strokeWidth={1.75} aria-hidden /> Editar dados</span>
             <span className="inline-flex items-center gap-1.5"><Accessibility size={14} strokeWidth={1.75} aria-hidden /> Ficha AEE</span>
             <span className="inline-flex items-center gap-1.5"><FileText size={14} strokeWidth={1.75} aria-hidden /> Boletim</span>
           </p>
         )}
      </div>

      {estudantes.length === 0 ? (
        <EmptyState
          icon={GraduationCap}
          title={hasFilters ? 'Nenhum estudante encontrado' : 'Pesquise por estudantes'}
          description={hasFilters
            ? 'Tente ajustar os filtros de busca.'
            : 'Use a busca ou os filtros acima para carregar a lista sem sobrecarregar o sistema.'}
          action={!hasFilters ? (
            <Link href="/dashboard/estudantes/novo" className={buttonClasses({ variant: "secondary" })}>
              <Plus size={16} strokeWidth={1.75} /> Adicionar estudante
            </Link>
          ) : undefined}
          className="rounded-lg border border-line bg-surface"
        />
      ) : (
        <div className="space-y-4">
          {Object.entries(
            estudantes.reduce((acc: any, estudante: any) => {
              const turma = estudante.turma.nome || "Sem Turma"
              if (!acc[turma]) acc[turma] = []
              acc[turma].push(estudante)
              return acc
            }, {})
          ).sort(([a], [b]) => a.localeCompare(b)).map(([turmaNome, estudantesDaTurma]: [string, any]) => (
            <section key={turmaNome} className="bg-surface rounded-2xl border border-line overflow-hidden" aria-label={turmaNome}>
              <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3 sm:px-5">
                <h2 className="text-sm font-semibold text-fg">{turmaNome}</h2>
                <span className="text-xs tabular-nums text-fg-subtle">{estudantesDaTurma.length} {estudantesDaTurma.length === 1 ? 'estudante' : 'estudantes'}</span>
              </div>
              <div className="relative overflow-x-auto">
                <table className="w-full min-w-[32rem] text-13">
                  <thead>
                    <tr className="border-b border-line-subtle text-xs text-fg-subtle">
                      <th scope="col" className="h-9 px-4 text-left font-medium sm:px-5">Nome</th>
                      <th scope="col" className="h-9 px-3 text-right font-medium">Notas lançadas</th>
                      <th scope="col" className="h-9 px-4 text-right font-medium sm:px-5"><span className="sr-only">Ações</span></th>
                    </tr>
                  </thead>
                  <tbody>
                    {estudantesDaTurma.map((estudante: any) => (
                      <tr key={estudante.matricula} className="border-b border-line-subtle last:border-0 transition-colors duration-150 hover:bg-subtle/60">
                        <td className="px-4 py-2 sm:px-5">
                          <div className="flex items-center gap-3">
                            <Avatar nome={estudante.nome} size="sm" />
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5 font-medium text-fg">
                                <span className="truncate">{estudante.nome}</span>
                                {estudante.aeeProfile && <Badge tone="accent">AEE</Badge>}
                              </div>
                              <div className="font-mono text-xs text-fg-subtle">{estudante.matricula}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums text-fg-muted">
                          {estudante._count.notas}
                        </td>
                        <td className="px-4 py-2 sm:px-5">
                           <div className="flex items-center justify-end gap-0.5">
                              <PortalActivationAction
                                  estudanteId={estudante.matricula}
                                  initialMatricula={estudante.matricula}
                                  hasUser={portalUserIds.has(estudante.matricula)}
                              />
                              <Link href={`/dashboard/estudantes/${estudante.matricula}/editar`} className={acaoIcone} title="Editar dados" aria-label={`Editar dados de ${estudante.nome}`}>
                                <Pencil size={16} strokeWidth={1.75} />
                              </Link>
                              {estudante.aeeProfile && (
                                <Link href={`/dashboard/aee/${estudante.matricula}`} className={acaoIcone} title="Ficha AEE" aria-label={`Ficha AEE de ${estudante.nome}`}>
                                  <Accessibility size={16} strokeWidth={1.75} />
                                </Link>
                              )}
                              <Link href={`/dashboard/estudantes/${estudante.matricula}/boletim`} className={acaoIcone} title="Boletim" aria-label={`Boletim de ${estudante.nome}`}>
                                <FileText size={16} strokeWidth={1.75} />
                              </Link>
                           </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}
