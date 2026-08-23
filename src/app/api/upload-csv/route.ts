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
    
    if (!file) {
      return NextResponse.json({ message: 'Nenhum arquivo enviado' }, { status: 400 })
    }

    // Ler conteúdo do arquivo
    const text = await file.text()
    const lines = text.split('\n').filter(line => line.trim())

    if (lines.length <= 1) {
      return NextResponse.json({ message: 'Arquivo CSV vazio' }, { status: 400 })
    }

    // Listas para controle
    const linesToProcess = lines.slice(1)
    const skippedEntries: string[] = []
    const toCreate: { matricula: string, nome: string, turmaNome: string }[] = []
    
    // 1. Validar duplicatas dentro do arquivo e verificar no BD
    const matriculasInFile = new Set<string>()
    const matriculasToQuery: string[] = []
    const fileData: { matricula: string, nome: string, turmaNome: string }[] = []

    for (let i = 0; i < linesToProcess.length; i++) {
        const parts = linesToProcess[i].split(',').map(s => s.trim())
        let matricula = ""
        let nome = ""
        let turmaNome = ""

        if (parts.length >= 3) {
            [matricula, nome, turmaNome] = parts
        } else if (parts.length === 2) {
            [nome, turmaNome] = parts
        }

        if (!nome || !turmaNome || !matricula) continue

        // Monitorar duplicatas dentro do mesmo arquivo
        if (matriculasInFile.has(matricula)) {
            skippedEntries.push(`${nome} (${matricula}) - Duplicado no arquivo`)
            continue
        }
        
        matriculasInFile.add(matricula)
        matriculasToQuery.push(matricula)
        fileData.push({ matricula, nome, turmaNome })
    }

    // Buscar todos os existentes de uma vez
    const existingInDb = await prisma.estudante.findMany({
        where: { escolaId, matricula: { in: matriculasToQuery } },
        select: { matricula: true, nome: true }
    })

    const existingMatriculas = new Set(existingInDb.map((s: { matricula: string }) => s.matricula))

    // Separar quem será criado e quem será pulado
    for (const item of fileData) {
        if (existingMatriculas.has(item.matricula)) {
            skippedEntries.push(`${item.nome} (${item.matricula}) - Já cadastrado`)
        } else {
            toCreate.push(item)
        }
    }

    if (toCreate.length === 0) {
        return NextResponse.json({ 
            message: "Nenhum novo estudante para cadastrar. Todos os registros já existem ou são duplicados.",
            skipped: skippedEntries,
            created: 0
        }, { status: 200 })
    }

    // 3. Processar criação
    let createdCount = 0
    const bcrypt = await import('bcryptjs')
    
    // Buscar ano letivo atual
    const config = await prisma.globalConfig.findUnique({ where: { id: 'global' } })
    const currentYear = config?.anoLetivoAtual || new Date().getFullYear()

    for (const data of toCreate) {
        // Buscar ou criar turma
        let turma = await prisma.turma.findFirst({
          where: { nome: data.turmaNome, escolaId }
        })

        if (!turma) {
          turma = await prisma.turma.create({
            data: {
              nome: data.turmaNome,
              anoLetivo: currentYear,
              escolaId
            }
          })
        }

        // Criar estudante
        const estudante = await prisma.estudante.create({
          data: {
            nome: data.nome,
            matricula: data.matricula,
            turmaId: turma.id,
            escolaId
          }
        })

        createdCount++
    }

    revalidatePath('/dashboard/estudantes')
    revalidatePath('/dashboard')

    return NextResponse.json({
      message: 'Importação concluída',
      created: createdCount,
      skipped: skippedEntries
    })
  } catch (error) {
    console.error('Erro ao processar CSV:', error)
    return NextResponse.json(
      { message: 'Erro ao processar arquivo CSV' },
      { status: 500 }
    )
  }
}
