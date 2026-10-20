import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { StatusNota } from '@prisma/client'
import { logAudit } from '@/lib/audit'
import { reportarErro } from '@/lib/monitoramento'
import { can } from '@/lib/rbac'
import { calcularMediaFinal, resolverEsquemaAvaliacaoId, paraEsquemaConfig, unidadesDeNotasSalvas, notaRecuperacaoValida, type EsquemaConfig } from '@/lib/services/notas'
import { rotaDoModulo } from '@/lib/modulos/guarda'

class ErroValidacao extends Error {}

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

export const POST = rotaDoModulo('RES', 'escrita', async function POST(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user?.escolaId || !can(session.user, 'conselho.decidir')) {
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

    // 1) Valida o lote inteiro antes de gravar: nota da escola, decisão
    // permitida e nota de recuperação na escala do esquema da turma (0 a
    // notaMaxima - 10 ou 100), não em 0-10 fixo.
    type Decisao = { notaId: string; novoStatus: string; novaNotaRec?: number | null }
    const esquemaPorTurma = new Map<string, Awaited<ReturnType<typeof carregarEsquema>>>()
    async function carregarEsquema(turma: { cursoId: string | null; esquemaAvaliacaoId: string | null }) {
      const curso = turma.cursoId
        ? await prisma.curso.findFirst({ where: { id: turma.cursoId, escolaId }, select: { esquemaAvaliacaoId: true } })
        : null
      const esquemaId = resolverEsquemaAvaliacaoId(turma, curso)
      return esquemaId
        ? prisma.esquemaAvaliacao.findFirst({ where: { id: esquemaId, escolaId }, include: { unidades: { orderBy: { ordem: 'asc' } } } })
        : null
    }

    const buscarNota = (notaId: string) => prisma.notaFinal.findFirst({
      where: { id: notaId, estudante: { escolaId } },
      include: {
        unidades: { select: { esquemaUnidadeId: true, notaCalculada: true, notaRecuperacao: true } },
        estudante: { select: { nome: true, turmaId: true, turma: { select: { cursoId: true, esquemaAvaliacaoId: true } } } },
        disciplina: { select: { nome: true } },
      },
    })
    const validadas: {
      notaOriginal: NonNullable<Awaited<ReturnType<typeof buscarNota>>>
      status: StatusNota
      novaNotaRec: number | null | undefined
      sugestaoAutomatica: string | null
    }[] = []
    for (const { notaId, novoStatus, novaNotaRec } of decisoes as Decisao[]) {
      const status = novoStatus as StatusNota
      if (!DECISOES_CONSELHO_VALIDAS.includes(status)) {
        throw new Error(`Decisão de conselho inválida: ${novoStatus}`)
      }

      const notaOriginal = await buscarNota(notaId)
      if (!notaOriginal) {
        throw new Error(`Nota ${notaId} não encontrada`)
      }

      const turmaId = notaOriginal.estudante.turmaId
      if (!esquemaPorTurma.has(turmaId)) esquemaPorTurma.set(turmaId, await carregarEsquema(notaOriginal.estudante.turma))
      const esquema = esquemaPorTurma.get(turmaId) ?? null
      const notaMaxima = esquema?.notaMaxima ?? 10

      if (typeof novaNotaRec === 'number' ? !notaRecuperacaoValida(novaNotaRec, notaMaxima) : (novaNotaRec !== undefined && novaNotaRec !== null)) {
        throw new ErroValidacao(`Nota de recuperação inválida: deve estar entre 0 e ${notaMaxima}`)
      }

      // O que o motor sugeriria a partir das etapas - só para registro no log
      // de auditoria: o Conselho é discricionário, a decisão recebida prevalece.
      let sugestaoAutomatica: string | null = null
      if (esquema) {
        const esquemaConfig: EsquemaConfig = paraEsquemaConfig(esquema)
        const resultado = calcularMediaFinal(unidadesDeNotasSalvas(esquema.unidades, notaOriginal.unidades), esquemaConfig)
        sugestaoAutomatica = resultado.completo
          ? (resultado.media !== null && resultado.media >= esquemaConfig.notaMinimaAprovacao ? 'APROVADO' : 'RECUPERACAO')
          : 'incompleto'
      }

      validadas.push({ notaOriginal, status, novaNotaRec, sugestaoAutomatica })
    }

    // 2) Grava tudo numa transação
    const results = await prisma.$transaction(async (tx) => {
      const atualizadas = []
      for (const { notaOriginal, status, novaNotaRec } of validadas) {
        await tx.notaFinalAudit.create({
          data: {
            notaFinalId: notaOriginal.id,
            notaAnterior: notaOriginal.nota,
            notaAtual: notaOriginal.nota, // Mantém a nota original
            status,
            modifiedById: userId,
          },
        })
        atualizadas.push(await tx.notaFinal.update({
          where: { id: notaOriginal.id },
          data: {
            status,
            notaRecuperacao: novaNotaRec !== undefined ? novaNotaRec : notaOriginal.notaRecuperacao,
            modifiedById: userId,
            modifiedAt: new Date(),
          },
        }))
      }
      return atualizadas
    })

    for (const { notaOriginal, status, novaNotaRec, sugestaoAutomatica } of validadas) {
      await logAudit(userId, 'NOTA', notaOriginal.id, 'UPDATE', {
        alvo: notaOriginal.estudante.nome,
        disciplina: notaOriginal.disciplina.nome,
        anterior: { st: notaOriginal.status, rec: notaOriginal.notaRecuperacao },
        atual: { st: status, rec: novaNotaRec },
        sugestaoAutomatica,
        context: 'CONSELHO',
      })
    }

    return NextResponse.json({
      message: 'Decisões do conselho salvas com sucesso',
      count: results.length
    })
  } catch (error: any) {
    console.error('Erro ao salvar conselho:', error)
    
    // Mensagens mais específicas para erros de validação
    if (error?.message?.includes('Decisão de conselho inválida')) {
      return NextResponse.json({ message: error.message }, { status: 400 })
    }
    if (error instanceof ErroValidacao) {
      return NextResponse.json({ message: error.message }, { status: 400 })
    }
    if (error?.message?.includes('não encontrada')) {
      return NextResponse.json({ message: error.message }, { status: 404 })
    }
    
    await reportarErro(error, { metodo: 'POST', caminho: '/api/conselho-classe' })
    return NextResponse.json(
      { message: 'Erro ao salvar decisões do conselho' },
      { status: 500 }
    )
  }
})
