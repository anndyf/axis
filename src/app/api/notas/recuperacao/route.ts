import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { StatusNota } from '@prisma/client'
import { logAudit } from '@/lib/audit'
import {
  calcularMediaFinal,
  calcularStatus,
  resolverEsquemaAvaliacaoId,
  type EsquemaConfig,
  type UnidadeInput,
} from '@/lib/services/notas'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user?.escolaId || !(session.user.isStaff || session.user.isSuperuser)) {
      return NextResponse.json({ message: 'Não autorizado' }, { status: 401 })
    }
    const escolaId = session.user.escolaId

    const { notas } = await request.json()

    if (!Array.isArray(notas) || notas.length === 0) {
      return NextResponse.json({ message: 'Dados inválidos' }, { status: 400 })
    }

    // Verificar se o usuário da sessão ainda existe no banco (pode ter mudado o ID após
    // um reset), na mesma escola - email/username deixaram de ser globalmente unicos
    // na migracao multi-tenant, entao o fallback por email/username precisa ficar
    // restrito a escola do proprio usuario logado, senao pode resolver para um
    // usuario de outra escola
    let userId = session.user.id
    const dbUser = await prisma.user.findFirst({
        where: {
            escolaId,
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

        // Buscar nota original, escopada a escola do chamador
        const notaOriginal = await prisma.notaFinal.findFirst({
          where: { id: notaId, estudante: { escolaId } },
          include: { estudante: { select: { turma: { select: { cursoId: true, esquemaAvaliacaoId: true } } } } }
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

        // Resolve o esquema de avaliação (turma ?? curso) pra decidir COMO a
        // recuperação final afeta o resultado - configurável por escola
        // (isolada por padrão no esquema legado, igual ao comportamento de
        // sempre desta rota; SUBSTITUI_MENOR_UNIDADE fica disponível quando
        // a escola configurar isso no painel).
        const turma = notaOriginal.estudante.turma
        const curso = turma.cursoId
          ? await prisma.curso.findUnique({ where: { id: turma.cursoId }, select: { esquemaAvaliacaoId: true } })
          : null
        const esquemaId = resolverEsquemaAvaliacaoId(turma, curso)
        const esquema = esquemaId
          ? await prisma.esquemaAvaliacao.findUnique({
              where: { id: esquemaId },
              include: { unidades: { orderBy: { ordem: 'asc' }, include: { atividades: { orderBy: { ordem: 'asc' } } } } }
            })
          : null

        if (!esquema) {
          throw new Error(`Esquema de avaliação não configurado para a turma desta nota (${notaId})`)
        }

        const esquemaConfig: EsquemaConfig = {
          numUnidades: esquema.numUnidades,
          notaMinimaAprovacao: esquema.notaMinimaAprovacao,
          recuperacaoUnidadeAtiva: esquema.recuperacaoUnidadeAtiva,
          modoRecuperacaoUnidade: esquema.modoRecuperacaoUnidade,
          recuperacaoFinalAtiva: esquema.recuperacaoFinalAtiva,
          modoRecuperacaoFinal: esquema.modoRecuperacaoFinal,
        }
        const notasPorOrdem: Record<number, number | null> = {
          1: notaOriginal.nota1,
          2: notaOriginal.nota2,
          3: notaOriginal.nota3,
        }
        const unidadesInput: UnidadeInput[] = esquema.unidades.map((eu) => ({
          esquemaUnidadeId: eu.id,
          atividades: [{ peso: eu.atividades[0]?.peso ?? 10, valor: notasPorOrdem[eu.ordem] ?? null }],
        }))
        const resultado = calcularMediaFinal(unidadesInput, esquemaConfig)
        // A proteção de status "especial" do motor existe pra não deixar uma
        // edição de nota normal desfazer uma aprovação por recuperação já
        // decidida (ver api/notas/lancar). Aqui é o contrário: esta rota É o
        // mecanismo de recuperação sendo reavaliado, então um reenvio precisa
        // poder regredir seu próprio resultado anterior - só continuam
        // protegidos status genuinamente administrativos/discricionários
        // (Conselho, Dependência, Conservado).
        const statusParaProtecao =
          notaOriginal.status === 'APROVADO_RECUPERACAO' ? undefined : (notaOriginal.status as StatusNota)
        const novoStatus: StatusNota = calcularStatus(
          resultado,
          esquemaConfig,
          notaRecuperacao,
          statusParaProtecao
        )

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
