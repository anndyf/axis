import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { StatusNota } from '@prisma/client'
import { logAudit } from '@/lib/audit'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session) {
      return NextResponse.json({ message: 'Não autorizado' }, { status: 401 })
    }

    const { notas } = await request.json()

    if (!Array.isArray(notas) || notas.length === 0) {
      return NextResponse.json({ message: 'Dados inválidos' }, { status: 400 })
    }

    // Verificar se o usuário da sessão ainda existe no banco (pode ter mudado o ID após um reset)
    let userId = session.user.id
    const dbUser = await prisma.user.findFirst({
        where: {
            OR: [
                { id: userId },
                { email: session.user.email || "" },
                { username: session.user.name || "" } // Caso use username no name
            ].filter(v => Object.values(v)[0] !== "")
        },
        select: { id: true }
    })
    
    if (dbUser) {
        userId = dbUser.id
    } else {
        // Se não encontrar o usuário no banco, não podemos criar auditoria com FK
        // Mas podemos permitir o salvamento sem o modificador se necessário, 
        // ou pedir para logar novamente.
        return NextResponse.json({ message: 'Sessão expirada ou usuário não encontrado. Por favor, saia e entre novamente no sistema.' }, { status: 401 })
    }

    // Processar cada nota de recuperação
    const results = await Promise.all(
      notas.map(async ({ notaId, notaRecuperacao }) => {
        // Validação de range (0-10) ou valor especial -1 (Não Realizou)
        if (notaRecuperacao !== -1 && (notaRecuperacao < 0 || notaRecuperacao > 10)) {
          throw new Error(`Nota de recuperação inválida: deve estar entre 0 e 10`)
        }

        // Buscar nota original
        const notaOriginal = await prisma.notaFinal.findUnique({
          where: { id: notaId }
        })

        if (!notaOriginal) {
          throw new Error(`Nota ${notaId} não encontrada`)
        }

        const [student, discipline] = await Promise.all([
          prisma.estudante.findUnique({ where: { id: notaOriginal.estudanteId }, select: { nome: true } }),
          prisma.disciplina.findUnique({ where: { id: notaOriginal.disciplinaId }, select: { nome: true } })
        ])

        const targetName = student?.nome || 'Estudante desconhecido'
        const disciplineName = discipline?.nome || 'Disciplina desconhecida'

        // Lógica do Python: Apenas verifica se a nota da recuperação é >= 5
        // Não calcula média, e não altera a nota original.
        
        let novoStatus: StatusNota = 'RECUPERACAO'
        
        if (notaRecuperacao >= 5) {
          novoStatus = 'APROVADO_RECUPERACAO'
        } else {
          novoStatus = 'RECUPERACAO'
        }

        // Criar auditoria
        await prisma.notaFinalAudit.create({
          data: {
            notaFinalId: notaOriginal.id,
            notaAnterior: notaOriginal.nota,
            notaAtual: notaOriginal.nota, // Nota original não muda
            status: novoStatus,
            modifiedById: userId
          }
        })

        // Atualizar nota com recuperação (apenas notaRecuperacao e Status)
        const updated = await prisma.notaFinal.update({
          where: { id: notaId },
          data: {
            notaRecuperacao,
            status: novoStatus,
            modifiedById: userId,
            modifiedAt: new Date()
          }
        })

        await logAudit(
          userId,
          'NOTA',
          notaId,
          'UPDATE',
          { 
            alvo: targetName, 
            disciplina: disciplineName, 
            anterior: { st: notaOriginal.status, rec: notaOriginal.notaRecuperacao },
            atual: { st: novoStatus, rec: notaRecuperacao },
            context: 'RECUPERACAO' 
          }
        )
        
        return updated
      })
    )

    return NextResponse.json({
      message: 'Notas de recuperação lançadas com sucesso',
      count: results.length
    })
  } catch (error: any) {
    console.error('Erro ao lançar recuperação:', error)
    
    // Mensagens mais específicas para erros de validação
    if (error.message.includes('deve estar entre 0 e 10')) {
      return NextResponse.json({ message: error.message }, { status: 400 })
    }
    if (error.message.includes('não encontrada')) {
      return NextResponse.json({ message: error.message }, { status: 404 })
    }
    
    return NextResponse.json(
      { message: 'Erro ao lançar recuperação' },
      { status: 500 }
    )
  }
}
