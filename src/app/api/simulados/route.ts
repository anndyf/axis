import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"
import { logAudit } from "@/lib/audit"
import { provaDaEscola } from "@/lib/data-fetching"

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    const user = session?.user as any
    if (!user) {
      return NextResponse.json({ message: "Não autorizado" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const turmaId = searchParams.get("turmaId")
    const areaId = searchParams.get("areaId")
    const provaId = searchParams.get("provaId")
    const unidade = searchParams.get("unidade")

    if (!turmaId || (!areaId && !provaId) || !unidade) {
      return NextResponse.json({ message: "Turma, Prova/Área e Unidade são obrigatórios" }, { status: 400 })
    }
    if (!user.escolaId || !(await prisma.turma.findUnique({ where: { id: turmaId, escolaId: user.escolaId }, select: { id: true } }))) {
      return NextResponse.json({ message: "Turma não encontrada" }, { status: 404 })
    }

    // Busca estudantes da turma com suas notas de simulado
    const estudantes = await prisma.estudante.findMany({
      where: { turmaId, escolaId: user.escolaId },
      orderBy: { nome: 'asc' },
      include: {
        notasSimulado: {
          where: provaId ? {
            provaId,
            unidade: parseInt(unidade),
            anoLetivo: 2026
          } : {
            areaId,
            unidade: parseInt(unidade),
            anoLetivo: 2026
          },
          include: {
            lancadoBy: {
              select: { name: true, email: true }
            }
          }
        }
      }
    })

    // Buscar a Prova e seu gabarito se provaId for fornecido
    let gabarito: any = null
    let canView = false

    // BUSCAR RESPONSÁVEL
    let responsavelName: string | null = null;
    let whereResponsavelQuery: any = { turmaId, anoLetivo: 2026 }
    if (provaId) {
      whereResponsavelQuery.provaId = provaId
    } else {
      whereResponsavelQuery.areaId = areaId
    }
    const responsaveisGerais = await (prisma as any).responsavelSimulado.findMany({
      where: whereResponsavelQuery,
      include: { user: { select: { name: true } } }
    })
    const responsavelEncontrado = responsaveisGerais.find((r: any) => r.unidade === null || r.unidade === parseInt(unidade))
    if (responsavelEncontrado && responsavelEncontrado.user) {
      responsavelName = responsavelEncontrado.user.name
    }


    // Área efetiva desta consulta (usada abaixo para checar se o usuário leciona disciplina dessa área na turma)
    let effectiveAreaId: string | null = areaId

    if (provaId) {
      const prova = await prisma.prova.findFirst({
        where: { id: provaId, ...provaDaEscola(user.escolaId) },
        include: {
          questoes: {
            include: {
              disciplinas: {
                include: {
                  usuariosPermitidos: { select: { id: true } }
                }
              }
            }
          }
        }
      })

      if (prova) {
        effectiveAreaId = prova.areaId
        // Extrair gabarito
        if (prova.questoesSnapshot) {
          try {
            const questoesSnapshot = typeof prova.questoesSnapshot === 'string' 
              ? JSON.parse(prova.questoesSnapshot) 
              : prova.questoesSnapshot;
              
            const qs = Array.isArray(questoesSnapshot) ? questoesSnapshot : (questoesSnapshot.questions || questoesSnapshot.questoes || []);
            gabarito = qs.map((q: any, index: number) => ({
              numero: index + 1,
              correta: q.correta || 'N/A',
              disciplina: q.disciplina || 'Desconhecida'
            }))
            if (!Array.isArray(questoesSnapshot) && questoesSnapshot.valorQuestao) {
               (gabarito as any).valorQuestao = questoesSnapshot.valorQuestao;
            }
          } catch (e) {
            console.error("Erro ao fazer parse do questoesSnapshot", e)
          }
        } else if (prova.questoes) {
          gabarito = prova.questoes.map((q: any, index: number) => ({
            numero: index + 1,
            correta: q.correta,
            disciplina: q.disciplinas?.[0]?.nome || 'Desconhecida'
          }))
        }

        // Verificar permissão de visualização (se ensina alguma disciplina da prova)
        const professoresDaProva = new Set<string>()
        prova.questoes.forEach(q => {
          if (q.professorId) professoresDaProva.add(q.professorId)
          q.disciplinas.forEach(d => {
            d.usuariosPermitidos.forEach(u => professoresDaProva.add(u.id))
          })
        })
        
        canView = professoresDaProva.has(user.id) || user.isSuperuser || user.isDirecao
      }
    } else {
      canView = user.isSuperuser || user.isDirecao
    }

    // Professor que leciona disciplina da área correspondente nessa turma também pode visualizar
    // (independe de ser o responsável ou de constar nas questões específicas da prova)
    if (!canView && effectiveAreaId) {
      const disciplinaDaAreaNaTurma = await prisma.disciplina.findFirst({
        where: {
          turmaId,
          areaId: effectiveAreaId,
          usuariosPermitidos: { some: { id: user.id } }
        },
        select: { id: true }
      })
      if (disciplinaDaAreaNaTurma) canView = true
    }

    // Verificar se o usuário TEM PERMISSÃO DE EDIÇÃO para esta consulta
    let canEdit = user.isSuperuser || user.isDirecao
    if (!canEdit) {
      // Verifica se o usuário atual é o responsável encontrado acima
      canEdit = responsavelEncontrado && responsavelEncontrado.userId === user.id;
      if (canEdit) canView = true // Se pode editar, pode ver
    }

    if (!canView && !canEdit) {
        // Se não pode nem ver nem editar, não retornar dados sensíveis
        return NextResponse.json({ message: "Sem permissão de acesso a estes resultados" }, { status: 403 })
    }

    return NextResponse.json({ 
        estudantes,
        canEdit,
        canView,
        gabarito: (canEdit || canView) ? gabarito : null, // Editores e visualizadores veem o gabarito
        responsavelName
    })
  } catch (error) {
    console.error("Erro ao buscar estudantes para simulado:", error)
    return NextResponse.json({ message: "Erro interno do servidor" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    const user = session?.user as any
    if (!user) {
      return NextResponse.json({ message: "Não autorizado" }, { status: 401 })
    }

    const { areaId, provaId, unidade, notas, turmaId } = await request.json()

    if ((!areaId && !provaId) || !unidade || !Array.isArray(notas) || !turmaId) {
      return NextResponse.json({ message: "Dados incompletos" }, { status: 400 })
    }

    // O client manda a MATRÍCULA em notas[].estudanteId; NotaSimulado.estudanteId
    // guarda o id técnico desde a troca de PK (Fase 3 multi-tenant). Resolve só
    // dentro da turma/escola da sessão - matrícula de fora vira 400.
    const matriculas: string[] = notas.map((n: any) => n.estudanteId)
    const estudantesDaTurma = user.escolaId ? await prisma.estudante.findMany({
      where: { turmaId, escolaId: user.escolaId, matricula: { in: matriculas } },
      select: { id: true, matricula: true }
    }) : []
    const idPorMatricula = new Map(estudantesDaTurma.map(e => [e.matricula, e.id]))
    if (idPorMatricula.size !== new Set(matriculas).size) {
      return NextResponse.json({ message: "Estudante não encontrado nesta turma" }, { status: 400 })
    }

    // Verificação de permissão rigorosa
    if (!user.isSuperuser && !user.isDirecao) {
      let whereResponsavel: any = { userId: user.id, turmaId, anoLetivo: 2026 }
      if (provaId) whereResponsavel.provaId = provaId
      else whereResponsavel.areaId = areaId
      
      const responsaveis = await (prisma as any).responsavelSimulado.findMany({
        where: whereResponsavel
      })

      const isResponsavelNominal = responsaveis.some((r: any) => r.unidade === null || r.unidade === parseInt(unidade))

      if (!isResponsavelNominal) {
        return NextResponse.json({ message: "Apenas o Professor Designado ou a Direção podem lançar notas nesta prova/turma" }, { status: 403 })
      }
    }

    // Buscar notas de simulado existentes no banco
    const whereExisting: any = {
      unidade: parseInt(unidade),
      anoLetivo: 2026,
      estudanteId: { in: [...idPorMatricula.values()] }
    }
    if (provaId) whereExisting.provaId = provaId
    else whereExisting.areaId = areaId

    const existingNotasSimulado = await prisma.notaSimulado.findMany({
      where: whereExisting
    })

    const operations: any[] = []
    
    // O ID deve ser único para upset, mas nós removemos o unique para areaId_estudanteId.
    // Como a constraint unique real sumiu do schema, vamos usar update/create se baseando se já existe.
    for (const n of notas) {
      const estudanteId = idPorMatricula.get(n.estudanteId)!
      const existing = existingNotasSimulado.find(e => e.estudanteId === estudanteId)
      
      const parsedNota = n.nota !== null && n.nota !== undefined && String(n.nota).trim() !== '' ? parseFloat(n.nota) : null
      const isAusente = n.ausente === true
      const parsedNotaSegundaChamada = n.notaSegundaChamada !== null && n.notaSegundaChamada !== undefined && String(n.notaSegundaChamada).trim() !== '' ? parseFloat(n.notaSegundaChamada) : null

      const dataToSave = {
        nota: parsedNota,
        ausente: isAusente,
        notaSegundaChamada: parsedNotaSegundaChamada,
        lancadoById: user.id
      }

      if (existing) {
        // Se a nota atual vier vazia, não vamos sobrescrever e sim manter, MAS vamos permitir atualizar ausente e segunda chamada
        if (parsedNota === null && !isAusente) {
           dataToSave.nota = existing.nota
           dataToSave.lancadoById = existing.lancadoById // preserva quem lançou antes
        }

        operations.push(
          prisma.notaSimulado.update({
            where: { id: existing.id },
            data: dataToSave
          })
        )
      } else {
        // Create se não existir e se tivermos algum valor para salvar
        if (parsedNota !== null || isAusente) {
          operations.push(
            prisma.notaSimulado.create({
              data: {
                estudanteId,
                areaId: areaId || null,
                provaId: provaId || null,
                unidade: parseInt(unidade),
                nota: parsedNota,
                ausente: isAusente,
                notaSegundaChamada: parsedNotaSegundaChamada,
                anoLetivo: 2026,
                lancadoById: user.id
              }
            })
          )
        }
      }
    }

    // Usar transaction garante que as conexões não fiquem presas e se uma falhar, nada é salvo (atomicidade)
    await prisma.$transaction(operations)

    await logAudit(
      user.id,
      'NOTA',
      turmaId,
      'UPDATE',
      { context: 'Lançamento em Lote de Simulados', areaId, unidade, notasLançadas: notas.length }
    )

    return NextResponse.json({ message: "Notas de simulado salvas com sucesso" })
  } catch (error) {
    console.error("Erro ao salvar notas de simulado:", error)
    return NextResponse.json({ message: "Erro ao salvar notas" }, { status: 500 })
  }
}
