
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import Link from "next/link"
import { Plus, GraduationCap, Upload, Accessibility } from "lucide-react"
import { CabecalhoPagina, EmptyState, buttonClasses } from "@/components/ui"
import TabelaEstudantes from "@/components/estudantes/TabelaEstudantes"
import EstudantesFilter from "./EstudantesFilter"
import PortalActionsMenu from "./PortalActionsMenu"
import { paginaDoModulo } from '@/lib/modulos/guarda'
import { can } from '@/lib/rbac'
import { getEstudantes } from '@/lib/services/estudantes-lista'

export const metadata = {
  title: 'Áxis - Estudantes'
}

// Force recompile to pick up new Prisma schema types - v4.0.0
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function EstudantesPage({
  searchParams
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  await paginaDoModulo('NUC')
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

  const isDirecao = can(session.user, 'escopo.escola')
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

  const podeGerir = can(session.user, 'estudante.editar')

  return (
    <div className="pb-16 md:pb-0">
      <CabecalhoPagina
        titulo="Estudantes"
        descricao="Cadastro de estudantes, acesso ao portal e boletins."
        acoes={podeGerir ? (
          <>
            <Link href="/dashboard/aee" className={buttonClasses({ variant: "ghost" })}>
              <Accessibility size={16} strokeWidth={1.75} aria-hidden /> Painel AEE
            </Link>
            <PortalActionsMenu />
            <Link href="/dashboard/estudantes/importar" className={buttonClasses({ variant: "secondary" })}>
              <Upload size={16} strokeWidth={1.75} aria-hidden /> Importar
            </Link>
            <Link href="/dashboard/estudantes/novo" className={buttonClasses()}>
              <Plus size={16} strokeWidth={1.75} aria-hidden /> Novo estudante
            </Link>
          </>
        ) : undefined}
      />

      <TabelaEstudantes
        estudantes={estudantes as any}
        portalUserIds={[...portalUserIds] as string[]}
        mostrarTurma
        semBusca
        nomeExportacao="Estudantes"
        topo={<EstudantesFilter cursos={cursos} turmas={turmas} totalResults={estudantes.length} />}
        vazio={
          <EmptyState
            icon={GraduationCap}
            title={hasFilters ? 'Nenhum estudante encontrado' : 'Pesquise os estudantes'}
            description={hasFilters
              ? 'Ajuste a busca ou os filtros.'
              : 'Use a busca ou os filtros acima para carregar a lista.'}
            action={!hasFilters && podeGerir ? (
              <Link href="/dashboard/estudantes/novo" className={buttonClasses({ variant: "secondary" })}>
                <Plus size={16} strokeWidth={1.75} aria-hidden /> Cadastrar estudante
              </Link>
            ) : undefined}
          />
        }
      />
    </div>
  )
}
