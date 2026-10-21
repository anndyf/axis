import { prisma } from '@/lib/prisma'

/**
 * Lista de estudantes da tela Estudantes (e da aba Estudantes da ficha da
 * turma): sempre da escola da sessão; quem não é da direção só vê as turmas
 * em que leciona. Sem busca por texto, só o ano letivo atual.
 */
export async function getEstudantes(filters: { 
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
