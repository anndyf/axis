import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.escolaId) {
      return NextResponse.json({ message: 'Não autorizado' }, { status: 401 })
    }
    const escolaId = session.user.escolaId

    const formData = await request.formData()
    const file = formData.get('file') as File
    const manualTurma = formData.get('manualTurma') as string

    if (!file || !manualTurma) {
      return NextResponse.json({ message: 'Arquivo ou Turma ausente' }, { status: 400 })
    }

    const text = await file.text()
    const lines = text.split('\n').filter(line => line.trim())
    if (lines.length <= 1) {
      return NextResponse.json({ message: 'Arquivo CSV vazio' }, { status: 400 })
    }

    // Identificar a turma alvo
    const turmaAlvo = await prisma.turma.findFirst({
      where: { nome: manualTurma, escolaId }
    })
    if (!turmaAlvo) {
      return NextResponse.json({ message: 'Turma não encontrada' }, { status: 404 })
    }

    // Identificar/Criar turma de Evasão
    let turmaEvasao = await prisma.turma.findFirst({
      where: { nome: 'Transferidos / Evasão', escolaId }
    })
    if (!turmaEvasao) {
      const config = await prisma.globalConfig.findUnique({ where: { id: escolaId } })
      const currentYear = config?.anoLetivoAtual || new Date().getFullYear()
      turmaEvasao = await prisma.turma.create({
        data: { nome: 'Transferidos / Evasão', anoLetivo: currentYear, escolaId }
      })
    }

    const linesToProcess = lines.slice(1)
    const matriculasNoPdf = new Set<string>()
    const dataNoPdf: { matricula: string, nome: string }[] = []

    for (let i = 0; i < linesToProcess.length; i++) {
        const parts = linesToProcess[i].split(',').map(s => s.trim())
        if (parts.length >= 2) {
           const matricula = parts[0]
           const nome = parts[1]
           if (matricula && nome && !matriculasNoPdf.has(matricula)) {
               matriculasNoPdf.add(matricula)
               dataNoPdf.push({ matricula, nome })
           }
        }
    }

    // Buscar todos os estudantes da turma alvo atual
    const estudantesNaTurmaAtualmente = await prisma.estudante.findMany({
        where: { turmaId: turmaAlvo.id }
    })

    // Buscar todos os estudantes que estão no PDF para ver se existem no sistema (mesmo em outras turmas)
    const estudantesNoSistema = await prisma.estudante.findMany({
        where: { escolaId, matricula: { in: Array.from(matriculasNoPdf) } }
    })
    const mapSistema = new Map(estudantesNoSistema.map((e: any) => [e.matricula, e]))

    let createdCount = 0
    let updatedCount = 0
    let removedCount = 0

    // 1. Criar ou Atualizar estudantes do PDF
    for (const item of dataNoPdf) {
        const existente = mapSistema.get(item.matricula)
        
        if (!existente) {
            // Novo aluno
            await prisma.estudante.create({
                data: {
                    matricula: item.matricula,
                    nome: item.nome,
                    turmaId: turmaAlvo.id,
                    status: 'ATIVO',
                    escolaId
                }
            })
            createdCount++
        } else if (existente.turmaId !== turmaAlvo.id) {
            // Aluno estava em outra turma, trazer para esta
            await prisma.estudante.update({
                where: { id: existente.id },
                data: {
                    turmaId: turmaAlvo.id,
                    turmaAnteriorId: existente.turmaId,
                    status: 'ATIVO'
                }
            })
            updatedCount++
        }
        // Se já estava na turmaAlvo, não fazemos nada.
    }

    // 2. Remover quem não está no PDF
    for (const e of estudantesNaTurmaAtualmente) {
        if (!matriculasNoPdf.has(e.matricula)) {
            await prisma.estudante.update({
                where: { id: e.id },
                data: {
                    turmaId: turmaEvasao.id,
                    turmaAnteriorId: turmaAlvo.id,
                    status: 'REMOVIDO_VIA_VARREDURA'
                }
            })
            removedCount++
        }
    }

    revalidatePath('/dashboard/estudantes')
    revalidatePath('/dashboard')

    return NextResponse.json({
      message: 'Sincronização concluída com sucesso',
      created: createdCount,
      updated: updatedCount,
      removed: removedCount
    })
  } catch (error) {
    console.error('Erro na sincronização:', error)
    return NextResponse.json(
      { message: 'Erro interno ao sincronizar turma' },
      { status: 500 }
    )
  }
}
