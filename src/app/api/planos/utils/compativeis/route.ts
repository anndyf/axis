import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { rotaDoModulo } from '@/lib/modulos/guarda'

export const GET = rotaDoModulo('PLA', 'leitura', async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ message: 'Não autorizado' }, { status: 401 })

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        disciplinasPermitidas: {
          include: {
            turma: true
          }
        }
      }
    })

    if (!user) return NextResponse.json({ message: 'Usuário não encontrado' }, { status: 404 })

    // Agrupar: Disciplina -> { "Serie - Modalidade": [Turmas] }
    const result: Record<string, Record<string, any[]>> = {}
    
    user.disciplinasPermitidas.forEach((d: any) => {
      const turma = d.turma
      if (!turma.serie || !turma.modalidade) return
      
      const discNome = d.nome
      const clusterKey = `${turma.serie} - ${turma.modalidade}`
      
      if (!result[discNome]) result[discNome] = {}
      if (!result[discNome][clusterKey]) result[discNome][clusterKey] = []
      
      result[discNome][clusterKey].push({
        id: turma.id,
        nome: turma.nome,
        serie: turma.serie,
        modalidade: turma.modalidade
      })
    })

    return NextResponse.json(result)
  } catch (err) {
    console.error(err)
    return NextResponse.json({ message: 'Erro ao buscar dados de compatibilidade' }, { status: 500 })
  }
})
