import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { can } from '@/lib/rbac'
import { StatusNota } from '@prisma/client'
import { logAudit } from '@/lib/audit'
import {
  calcularMediaFinal,
  calcularStatus,
  resolverEsquemaAvaliacaoId,
  paraEsquemaConfig,
  unidadesDeNotasSalvas,
  type EsquemaConfig,
} from '@/lib/services/notas'
import { rotaDoModulo } from '@/lib/modulos/guarda'
import { contextoCadeado, verificarRecuperacaoOuConselho, STATUS_CADEADO, type ContextoCadeado } from '@/lib/cadeado-unidade'

export const runtime = 'nodejs'

export const POST = rotaDoModulo('NOT', 'escrita', async function POST(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user?.escolaId || !can(session.user, 'nota.tela')) {
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

    // Cadeado (depois da regra de quem leciona): a recuperação final segue a
    // última unidade do esquema. Conferido para o lote inteiro antes de
    // gravar qualquer nota (a gravação abaixo não é atômica).
    const alvos = await prisma.notaFinal.findMany({
      where: { id: { in: notas.map((n: { notaId?: unknown }) => String(n?.notaId)) }, estudante: { escolaId }, disciplina: { usuariosPermitidos: { some: { id: userId } } } },
      select: { disciplinaId: true, disciplina: { select: { turmaId: true } } },
    })
    const contextos = new Map<string, ContextoCadeado | null>()
    for (const a of alvos) {
      const turmaId = a.disciplina.turmaId
      if (!contextos.has(turmaId)) contextos.set(turmaId, await contextoCadeado(escolaId, turmaId))
      const ctx = contextos.get(turmaId)
      const r = ctx ? verificarRecuperacaoOuConselho(ctx, a.disciplinaId) : { ok: true as const }
      if (!r.ok) return NextResponse.json({ message: r.mensagem }, { status: STATUS_CADEADO })
    }

    // Processar cada nota de recuperação
    const results = await Promise.all(
      notas.map(async ({ notaId, notaRecuperacao }) => {
        // Validação de range ou valor especial -1 (Não Realizou) - o teto
        // depende da escala do esquema, checado depois de resolvê-lo
        if (notaRecuperacao !== -1 && notaRecuperacao < 0) {
          throw new Error(`Nota de recuperação inválida: não pode ser negativa`)
        }

        // Buscar nota original, escopada a escola do chamador
        const notaOriginal = await prisma.notaFinal.findFirst({
          // Só quem leciona a disciplina grava a recuperação (antes qualquer
          // professor da escola gravava em disciplina de outro)
          where: { id: notaId, estudante: { escolaId }, disciplina: { usuariosPermitidos: { some: { id: userId } } } },
          include: {
            estudante: { select: { turma: { select: { cursoId: true, esquemaAvaliacaoId: true } } } },
            unidades: { select: { esquemaUnidadeId: true, notaCalculada: true, notaRecuperacao: true } }
          }
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

        if (notaRecuperacao !== -1 && notaRecuperacao > esquema.notaMaxima) {
          throw new Error(`Nota de recuperação inválida: deve estar entre 0 e ${esquema.notaMaxima}`)
        }

        const esquemaConfig: EsquemaConfig = paraEsquemaConfig(esquema)
        // Lê as etapas do modelo novo (NotaUnidade), não mais nota_1/2/3
        const resultado = calcularMediaFinal(unidadesDeNotasSalvas(esquema.unidades, notaOriginal.unidades), esquemaConfig)
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
})
