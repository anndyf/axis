
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import Link from "next/link"
import { ArrowLeft, Plus, GraduationCap, Upload, Users, Accessibility, Pencil, FileText, Info, ShieldCheck } from "lucide-react"
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

  return (
    <div className="bg-zinc-50">
      {/* Header Premium Estilo Resultados - Ajustado para ser Flush com o Layout */}
      <header className="mb-6 border-b border-line pb-4">
        <div className="max-w-7xl mx-auto py-4">
          <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
            <div className="flex items-center space-x-5">
              <Link
                href="/dashboard"
                className="p-2 hover:bg-zinc-200 rounded-lg transition-colors text-fg-subtle hover:text-fg-muted"
              >
                <ArrowLeft size={20} />
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-fg tracking-tight">Estudantes</h1>
                <p className="text-base text-fg-muted font-medium">Gerenciar cadastro de alunos</p>
              </div>
            </div>
            
            <div className={`grid grid-cols-2 md:flex md:items-center gap-2 ${(!session.user.isSuperuser && !session.user.isDirecao) ? 'hidden' : ''}`}>
              <Link
                href="/dashboard/aee"
                className="flex items-center justify-center space-x-2 bg-accent-subtle text-accent-fg px-3 md:px-4 py-2.5 rounded-lg hover:bg-accent-subtle transition-all border border-accent/25 shadow-sm text-sm font-bold"
              >
                <Accessibility className="w-4 h-4" />
                <span className="whitespace-nowrap">Painel AEE</span>
              </Link>
              <div className="hidden md:block w-px h-6 bg-zinc-200 mx-1" />
              <div className="col-span-2 md:col-auto">
                <PortalActionsMenu />
              </div>
              <div className="hidden md:block w-px h-6 bg-zinc-300 mx-1" />
              <Link
                href="/dashboard/estudantes/importar"
                className="flex items-center justify-center space-x-2 bg-zinc-700 text-white px-3 md:px-4 py-2.5 rounded-lg hover:bg-zinc-800 transition-all shadow-sm text-sm font-medium"
              >
                <Upload className="w-4 h-4" />
                <span className="whitespace-nowrap">Importar</span>
              </Link>
              <Link
                href="/dashboard/estudantes/novo"
                className="flex items-center justify-center space-x-2 bg-success text-white px-3 md:px-4 py-2.5 rounded-lg hover:bg-success transition-all shadow-sm text-sm font-medium"
              >
                <Plus className="w-4 h-4" />
                <span className="whitespace-nowrap">Novo Aluno</span>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-32">
        {/* Legenda de Ícones - NOVO */}
        <div className="bg-white/50 backdrop-blur p-4 rounded-xl border border-white/50 shadow-sm flex flex-wrap items-center justify-center gap-8 mb-6">
           <div className="flex items-center gap-2">
              <div className="p-1.5 bg-zinc-100 text-fg-subtle rounded-lg border border-zinc-200">
                 <ShieldCheck size={14} />
              </div>
              <span className="text-xs font-semibold text-fg-subtle leading-none">Gestão de Acesso</span>
           </div>
           <div className="flex items-center gap-2">
              <div className="p-1.5 bg-zinc-100 text-fg-subtle rounded-lg border border-zinc-200">
                 <Pencil size={14} />
              </div>
              <span className="text-xs font-semibold text-fg-subtle leading-none">Editar Dados</span>
           </div>
           <div className="flex items-center gap-2">
              <div className="p-1.5 bg-accent-subtle text-accent-fg rounded-lg border border-accent/25">
                 <Accessibility size={14} />
              </div>
              <span className="text-xs font-semibold text-fg-subtle leading-none">Ficha AEE</span>
           </div>
           <div className="flex items-center gap-2">
              <div className="p-1.5 bg-zinc-100 text-fg-subtle rounded-lg border border-zinc-200">
                 <FileText size={14} />
              </div>
              <span className="text-xs font-semibold text-fg-subtle leading-none">Gerar Boletim</span>
           </div>
        </div>

        <div className="bg-white rounded-xl shadow-card border border-zinc-200 overflow-hidden mb-6">
           <EstudantesFilter cursos={cursos} turmas={turmas} totalResults={estudantes.length} />
        </div>

        <div className="bg-white rounded-xl shadow-card border border-zinc-200 overflow-hidden">
          {estudantes.length === 0 ? (
            <div className="p-12 text-center">
              <GraduationCap className="w-16 h-16 text-fg-subtle mx-auto mb-4" />
              <h3 className="text-lg font-medium text-fg mb-2">
                {hasFilters ? 'Nenhum estudante encontrado' : 'Pesquise por estudantes'}
              </h3>
              <p className="text-fg-muted mb-6">
                {hasFilters 
                  ? 'Tente ajustar os filtros de busca' 
                  : 'Utilize a busca ou os filtros acima para carregar a lista de estudantes sem sobrecarregar o sistema.'}
              </p>
              {!hasFilters && (
                <div className="flex justify-center gap-4">
                  <Link
                    href="/dashboard/estudantes/novo"
                    className="inline-flex items-center space-x-2 bg-success text-white px-6 py-3 rounded-lg hover:bg-success transition-colors"
                  >
                    <Plus className="w-5 h-5" />
                    <span>Adicionar Estudante</span>
                  </Link>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col">
              {Object.entries(
                estudantes.reduce((acc: any, estudante: any) => {
                  const turma = estudante.turma.nome || "Sem Turma"
                  if (!acc[turma]) acc[turma] = []
                  acc[turma].push(estudante)
                  return acc
                }, {})
              ).sort(([a], [b]) => a.localeCompare(b)).map(([turmaNome, estudantesDaTurma]: [string, any]) => (
                <div key={turmaNome} className="mb-0 border-b-8 border-zinc-100 last:border-0">
                  <div className="bg-zinc-50 px-6 py-4 border-b border-zinc-200 flex items-center justify-between">
                    <h2 className="text-base font-bold text-fg flex items-center gap-2">
                      <Users className="w-5 h-5 text-fg-subtle" />
                      {turmaNome}
                    </h2>
                    <span className="text-xs font-bold text-fg-subtle bg-zinc-200 px-3 py-1 rounded-full">{estudantesDaTurma.length} estudantes</span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-white border-b border-zinc-200">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-bold text-fg-subtle">
                            Nome
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-bold text-fg-subtle">
                            Notas Lançadas
                          </th>
                          <th className="px-6 py-3 text-right text-xs font-bold text-fg-subtle">
                            Ações / Gestão
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-zinc-100">
                        {estudantesDaTurma.map((estudante: any) => (
                          <tr key={estudante.matricula} className="hover:bg-zinc-50 transition-colors">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <div className="w-10 h-10 bg-zinc-800 rounded-lg flex items-center justify-center text-white font-bold shadow-card">
                                  {estudante.nome.charAt(0).toUpperCase()}
                                </div>
                                <div className="ml-4">
                                  <div className="text-sm font-bold text-fg flex items-center gap-2">
                                    {estudante.nome}
                                    {estudante.aeeProfile && (
                                      <Link 
                                        href={`/dashboard/aee/${estudante.matricula}`}
                                        className="p-1 bg-accent-subtle text-accent-fg rounded-lg border border-accent/25 hover:bg-accent-hover hover:text-white transition-all shadow-sm"
                                        title="Aluno com Atendimento Especializado (AEE)"
                                      >
                                        <Accessibility className="w-3.5 h-3.5" />
                                      </Link>
                                    )}
                                  </div>
                                  <div className="text-xs font-bold text-fg-subtle mt-0.5">
                                    Matrícula: {estudante.matricula}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-fg-muted">
                              {estudante._count.notas}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right">
                               <div className="flex items-center justify-end gap-2">
                                  {/* Icone Gestão de Acesso */}
                                  <PortalActivationAction 
                                      estudanteId={estudante.matricula} 
                                      initialMatricula={estudante.matricula}
                                      hasUser={portalUserIds.has(estudante.matricula)}
                                  />

                                  <Link
                                    href={`/dashboard/estudantes/${estudante.matricula}/editar`}
                                    className="p-2 bg-zinc-50 text-fg-subtle border border-zinc-200 rounded-xl hover:text-fg hover:bg-white transition-all shadow-sm"
                                    title="Editar Dados"
                                  >
                                    <Pencil size={18} />
                                  </Link>

                                  {/* Link Direto AEE - Apenas se já existir perfil */}
                                  {estudante.aeeProfile && (
                                    <Link
                                      href={`/dashboard/aee/${estudante.matricula}`}
                                      className="p-2 bg-accent-subtle text-accent-fg border border-accent/25 rounded-xl hover:text-accent-fg hover:bg-white transition-all shadow-sm"
                                      title="Ficha AEE"
                                    >
                                      <Accessibility size={18} />
                                    </Link>
                                  )}

                                  <Link
                                    href={`/dashboard/estudantes/${estudante.matricula}/boletim`}
                                    className="p-2 bg-zinc-50 text-fg-subtle border border-zinc-200 rounded-xl hover:text-fg hover:bg-white transition-all shadow-sm"
                                    title="Gerar Boletim"
                                  >
                                    <FileText size={18} />
                                  </Link>
                               </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
