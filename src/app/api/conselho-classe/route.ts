import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { StatusNota } from '@prisma/client'
import { logAudit } from '@/lib/audit'
import { can } from '@/lib/rbac'
import { calcularMediaFinal, resolverEsquemaAvaliacaoId, type EsquemaConfig, type UnidadeInput } from '@/lib/services/notas'

export const runtime = 'nodejs'

// Decisões que o Conselho de Classe pode tomar (mesmo conjunto oferecido
// pela UI em ConselhoClasseClient.tsx) - são decisões administrativas/
// discricionárias do comitê, por isso esta rota não recalcula o status
// automaticamente a partir da média (diferente de notas/lancar e
// notas/recuperacao); só valida que o valor recebido é um dos permitidos.
const DECISOES_CONSELHO_VALIDAS: StatusNota[] = [
  'APROVADO_RECUPERACAO',
  'APROVADO_CONSELHO',
  'DEPENDENCIA',
  'CONSERVADO',
]

export async function POST(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user?.escolaId || !can(session.user, 'gestao')) {
      return NextResponse.json({ message: 'Não autorizado' }, { status: 401 })
    }
    const escolaId = session.user.escolaId

    const { decisoes } = await request.json()

    if (!Array.isArray(decisoes) || decisoes.length === 0) {
      return NextResponse.json({ message: 'Dados inválidos' }, { status: 400 })
    }

    // Verificar se o usuário da sessão ainda existe no banco (na mesma escola -
    // email/username deixaram de ser globalmente unicos na migracao multi-tenant,
    // entao o fallback por email/username precisa ficar restrito a escola do
    // proprio usuario logado, senao pode resolver para um usuario de outra escola)
    let userId = session.user.id
    const dbUser = await prisma.user.findFirst({
        where: {
            escolaId,
            OR: [
                { id: userId },
                { email: session.user.email || "" },
                { username: session.user.name || "" }
            ].filter(v => Object.values(v)[0] !== "")
        },
        select: { id: true }
    })
    
    if (dbUser) {
        userId = dbUser.id
    } else {
        return NextResponse.json({ message: 'Sessão expirada ou usuário não encontrado. Por favor, saia e entre novamente no sistema.' }, { status: 401 })
    }

    // Processar cada decisão do conselho
    const results = await Promise.all(
      decisoes.map(async ({ notaId, novoStatus, novaNotaRec }: { notaId: string, novoStatus: string, novaNotaRec?: number | null }) => {
        // Validação de range para nota de recuperação (se fornecida) - Permite -1 para "Não Realizou"
        if (novaNotaRec !== undefined && novaNotaRec !== null && novaNotaRec !== -1 && (novaNotaRec < 0 || novaNotaRec > 10)) {
          throw new Error(`Nota de recuperação inválida: deve estar entre 0 e 10`)
        }

        const status = novoStatus as StatusNota
        if (!DECISOES_CONSELHO_VALIDAS.includes(status)) {
          throw new Error(`Decisão de conselho inválida: ${novoStatus}`)
        }

        // Buscar nota original, escopada a escola do chamador
        const notaOriginal = await prisma.notaFinal.findFirst({
          where: { id: notaId, estudante: { escolaId } }
        })

        if (!notaOriginal) {
          throw new Error(`Nota ${notaId} não encontrada`)
        }

        const [student, discipline] = await Promise.all([
          prisma.estudante.findUnique({
            where: { id: notaOriginal.estudanteId },
            select: { nome: true, turma: { select: { cursoId: true, esquemaAvaliacaoId: true } } }
          }),
          prisma.disciplina.findUnique({ where: { id: notaOriginal.disciplinaId }, select: { nome: true } })
        ])

        const targetName = student?.nome || 'Estudante desconhecido'
        const disciplineName = discipline?.nome || 'Disciplina desconhecida'

        // Calcula o que o motor sugeriria a partir da média das unidades,
        // só pra registro/transparência no log de auditoria - o Conselho é
        // um processo discricionário do comitê, então a decisão recebida
        // (`status`) sempre prevalece, nunca é sobrescrita automaticamente.
        let sugestaoAutomatica: string | null = null
        if (student?.turma) {
          const curso = student.turma.cursoId
            ? await prisma.curso.findUnique({ where: { id: student.turma.cursoId }, select: { esquemaAvaliacaoId: true } })
            : null
          const esquemaId = resolverEsquemaAvaliacaoId(student.turma, curso)
          const esquema = esquemaId
            ? await prisma.esquemaAvaliacao.findUnique({
                where: { id: esquemaId },
                include: { unidades: { orderBy: { ordem: 'asc' } } }
              })
            : null
          if (esquema) {
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
              atividades: [{ peso: 10, valor: notasPorOrdem[eu.ordem] ?? null }],
            }))
            const resultado = calcularMediaFinal(unidadesInput, esquemaConfig)
            sugestaoAutomatica = resultado.completo
              ? (resultado.media !== null && resultado.media >= esquemaConfig.notaMinimaAprovacao ? 'APROVADO' : 'RECUPERACAO')
              : 'incompleto'
          }
        }

        // Criar auditoria
        await prisma.notaFinalAudit.create({
          data: {
            notaFinalId: notaOriginal.id,
            notaAnterior: notaOriginal.nota,
            notaAtual: notaOriginal.nota, // Mantém a nota original
            status: status,
            modifiedById: userId
          }
        })

        // Atualizar status e nota de recuperação se fornecida
        const updated = await prisma.notaFinal.update({
          where: { id: notaId },
          data: {
            status: status,
            notaRecuperacao: novaNotaRec !== undefined ? novaNotaRec : notaOriginal.notaRecuperacao,
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
            atual: { st: status, rec: novaNotaRec },
            sugestaoAutomatica,
            context: 'CONSELHO'
          }
        )
        
        return updated
      })
    )

    return NextResponse.json({
      message: 'Decisões do conselho salvas com sucesso',
      count: results.length
    })
  } catch (error: any) {
    console.error('Erro ao salvar conselho:', error)
    
    // Mensagens mais específicas para erros de validação
    if (error.message.includes('Decisão de conselho inválida')) {
      return NextResponse.json({ message: error.message }, { status: 400 })
    }
    if (error.message.includes('deve estar entre 0 e 10')) {
      return NextResponse.json({ message: error.message }, { status: 400 })
    }
    if (error.message.includes('não encontrada')) {
      return NextResponse.json({ message: error.message }, { status: 404 })
    }
    
    return NextResponse.json(
      { message: 'Erro ao salvar decisões do conselho' },
      { status: 500 }
    )
  }
}
