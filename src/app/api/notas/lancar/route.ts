
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { v4 as uuidv4 } from 'uuid'
import { logAudit } from '@/lib/audit'
import {
  calcularMediaFinal,
  calcularStatus,
  resolverEsquemaAvaliacaoId,
  type EsquemaConfig,
  type StatusNota,
  type UnidadeInput,
} from '@/lib/services/notas'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user?.escolaId) {
      return NextResponse.json({ message: 'Não autorizado' }, { status: 401 })
    }
    const escolaId = session.user.escolaId

    const { notas } = await request.json()

    if (!Array.isArray(notas) || notas.length === 0) {
      return NextResponse.json({ message: 'Dados inválidos' }, { status: 400 })
    }

    // Otimização: Obter informações da disciplina e turma uma única vez
    // Assumindo que todas as notas no lote são da mesma disciplina (conforme o frontend envia)
    const firstNota = notas[0]
    const disciplinaId = firstNota.disciplinaId

    const disciplina = await prisma.disciplina.findUnique({
      where: { id: disciplinaId, turma: { escolaId } },
      include: {
        turma: { select: { cursoId: true, esquemaAvaliacaoId: true } }
      }
    })

    if (!disciplina) {
      return NextResponse.json({ message: 'Disciplina não encontrada' }, { status: 404 })
    }

    const disciplineName = disciplina?.nome || 'Disciplina desconhecida'

    // Resolve o esquema de avaliação da turma (override) ou do curso (padrão),
    // populado desde a Fase 2 do modelo de avaliação configurável.
    const curso = disciplina.turma.cursoId
      ? await prisma.curso.findUnique({ where: { id: disciplina.turma.cursoId }, select: { esquemaAvaliacaoId: true } })
      : null
    const esquemaId = resolverEsquemaAvaliacaoId(disciplina.turma, curso)
    if (!esquemaId) {
      return NextResponse.json({ message: 'Esquema de avaliação não configurado para esta turma' }, { status: 400 })
    }
    const esquema = await prisma.esquemaAvaliacao.findUnique({
      where: { id: esquemaId },
      include: { unidades: { orderBy: { ordem: 'asc' }, include: { atividades: { orderBy: { ordem: 'asc' } } } } }
    })
    if (!esquema) {
      return NextResponse.json({ message: 'Esquema de avaliação inválido' }, { status: 400 })
    }
    const esquemaConfig: EsquemaConfig = {
      numUnidades: esquema.numUnidades,
      notaMinimaAprovacao: esquema.notaMinimaAprovacao,
      recuperacaoUnidadeAtiva: esquema.recuperacaoUnidadeAtiva,
      modoRecuperacaoUnidade: esquema.modoRecuperacaoUnidade,
      recuperacaoFinalAtiva: esquema.recuperacaoFinalAtiva,
      modoRecuperacaoFinal: esquema.modoRecuperacaoFinal,
    }
    const isSemestral = esquema.numUnidades < 3

    // Otimização: Buscar todos os estudantes do lote de uma vez para os logs de auditoria.
    // O frontend envia a matricula (LancarNotasClient.tsx usa estudante.matricula como chave),
    // mas "notas_finais.estudante_id" guarda o id tecnico desde a Migration 3b - precisa
    // resolver matricula -> id antes de qualquer SELECT/UPDATE/INSERT na tabela.
    const matriculas = notas.map(n => n.estudanteId)
    const estudantes = await prisma.estudante.findMany({
      where: { escolaId, matricula: { in: matriculas } },
      select: { id: true, matricula: true, nome: true }
    })
    const studentNamesMap = new Map(estudantes.map(e => [e.matricula, e.nome]))
    const matriculaToIdMap = new Map(estudantes.map(e => [e.matricula, e.id]))

    const results = []

    // Processar sequencialmente para evitar exaustão do pool de conexões
    for (const notaData of notas) {
      const {
        estudanteId,
        nota1, nota2, nota3,
        isDesistente,
        isDesistenteUnid1, isDesistenteUnid2, isDesistenteUnid3
      } = notaData

      // estudanteId aqui e a matricula (nome mantido por compatibilidade com o
      // payload do frontend) - resolve para o id tecnico real da tabela estudantes.
      const estudanteRealId = matriculaToIdMap.get(estudanteId)
      if (!estudanteRealId) {
        results.push({ skipped: true, estudanteId, error: 'Estudante não encontrado nesta escola' })
        continue
      }

      // Se todos os campos estiverem vazios e não houver marcação de desistência, ignorar
      const isAllEmpty = (nota1 === '' || nota1 === null || nota1 === undefined) && 
                        (nota2 === '' || nota2 === null || nota2 === undefined) && 
                        (nota3 === '' || nota3 === null || nota3 === undefined || isSemestral) && 
                        !isDesistente && !isDesistenteUnid1 && !isDesistenteUnid2 && !isDesistenteUnid3;

      if (isAllEmpty) {
        results.push({ skipped: true, estudanteId });
        continue;
      }

      // Função auxiliar para parsing robusto
      const parseNota = (val: any) => {
        if (val === undefined || val === null || val === '') return null
        const parsed = parseFloat(String(val).replace(',', '.'))
        return isNaN(parsed) ? null : parsed
      }

      const n1 = parseNota(nota1)
      const n2 = parseNota(nota2)
      const n3 = !isSemestral ? parseNota(nota3) : null

      // Validação de range (0-10)
      if (n1 !== null && (n1 < 0 || n1 > 10)) {
        throw new Error(`Nota 1 inválida para estudante ${estudanteId}: deve estar entre 0 e 10`)
      }
      if (n2 !== null && (n2 < 0 || n2 > 10)) {
        throw new Error(`Nota 2 inválida para estudante ${estudanteId}: deve estar entre 0 e 10`)
      }
      if (n3 !== null && (n3 < 0 || n3 > 10)) {
        throw new Error(`Nota 3 inválida para estudante ${estudanteId}: deve estar entre 0 e 10`)
      }

      const targetName = studentNamesMap.get(estudanteId) || 'Estudante desconhecido'

      // Verificar se já existe nota
      const existing = await prisma.$queryRaw<any[]>`
        SELECT id, nota_1 as "nota1", nota_2 as "nota2", nota_3 as "nota3", status
        FROM "notas_finais"
        WHERE "estudante_id" = ${estudanteRealId} AND "disciplina_id" = ${disciplinaId}
        LIMIT 1
      `
      const existingRow = existing[0]

      // Preserva notas já salvas se vierem vazias/nulas na requisição atual
      const finalN1 = n1 !== null ? n1 : (existingRow?.nota1 != null ? Number(existingRow.nota1) : null)
      const finalN2 = n2 !== null ? n2 : (existingRow?.nota2 != null ? Number(existingRow.nota2) : null)
      const finalN3 = n3 !== null ? n3 : (existingRow?.nota3 != null ? Number(existingRow.nota3) : null)
      const finalPorOrdem: Record<number, number | null> = { 1: finalN1, 2: finalN2, 3: finalN3 }
      const desistentePorOrdem: Record<number, boolean> = {
        1: !!isDesistenteUnid1,
        2: !!isDesistenteUnid2,
        3: !!isDesistenteUnid3,
      }

      const unidadesInput: UnidadeInput[] = esquema.unidades.map((eu) => ({
        esquemaUnidadeId: eu.id,
        atividades: [{ peso: eu.atividades[0]?.peso ?? 10, valor: finalPorOrdem[eu.ordem] ?? null }],
      }))
      const resultado = calcularMediaFinal(unidadesInput, esquemaConfig)
      const currentStatus = existingRow?.status as StatusNota | undefined
      const finalStatus = calcularStatus(resultado, esquemaConfig, null, currentStatus)
      const notaCalculadaFinal = resultado.media ?? 0

      let notaId: string
      if (existingRow) {
        notaId = existingRow.id

        await prisma.$executeRaw`
          UPDATE "notas_finais"
          SET
            "nota_1" = ${finalN1},
            "nota_2" = ${finalN2},
            "nota_3" = ${finalN3},
            "nota" = ${notaCalculadaFinal},
            "status" = ${finalStatus}::"status_nota",
            "is_desistente_unid1" = ${!!isDesistenteUnid1},
            "is_desistente_unid2" = ${!!isDesistenteUnid2},
            "is_desistente_unid3" = ${!!isDesistenteUnid3},
            "modified_by_id" = ${session.user.id},
            "updated_at" = NOW(),
            "modified_at" = NOW()
          WHERE "id" = ${notaId}
        `

        await logAudit(
          session.user.id,
          'NOTA',
          notaId,
          'UPDATE',
          {
            alvo: targetName,
            disciplina: disciplineName,
            anterior: { n1: existingRow.nota1, n2: existingRow.nota2, n3: existingRow.nota3, st: existingRow.status },
            atual: { n1: finalN1, n2: finalN2, n3: finalN3, st: finalStatus }
          }
        )

        results.push({ id: notaId, updated: true })
      } else {
        notaId = uuidv4()
        await prisma.$executeRaw`
          INSERT INTO "notas_finais" (
            "id", "estudante_id", "disciplina_id", "nota_1", "nota_2", "nota_3", "nota", "status",
            "is_desistente_unid1", "is_desistente_unid2", "is_desistente_unid3",
            "modified_by_id", "created_at", "updated_at", "modified_at"
          )
          VALUES (
            ${notaId}, ${estudanteRealId}, ${disciplinaId}, ${finalN1}, ${finalN2}, ${finalN3}, ${notaCalculadaFinal}, ${finalStatus}::"status_nota",
            ${!!isDesistenteUnid1}, ${!!isDesistenteUnid2}, ${!!isDesistenteUnid3},
            ${session.user.id}, NOW(), NOW(), NOW()
          )
        `

        await logAudit(
          session.user.id,
          'NOTA',
          notaId,
          'INSERT',
          {
            alvo: targetName,
            disciplina: disciplineName,
            nota1: finalN1,
            nota2: finalN2,
            nota3: finalN3,
            status: finalStatus
          }
        )

        results.push({ id: notaId, created: true })
      }

      // Dual-write: popula NotaUnidade/NotaAtividade em paralelo às colunas
      // legadas (nota_1/2/3), enquanto os consumidores de leitura não migram
      // pro modelo novo (Fase 4/5 do rollout do modelo de avaliação).
      for (const eu of esquema.unidades) {
        const valor = finalPorOrdem[eu.ordem] ?? null
        const notaUnidade = await prisma.notaUnidade.upsert({
          where: { notaFinalId_esquemaUnidadeId: { notaFinalId: notaId, esquemaUnidadeId: eu.id } },
          update: { notaCalculada: valor, isDesistente: desistentePorOrdem[eu.ordem] ?? false },
          create: {
            notaFinalId: notaId,
            esquemaUnidadeId: eu.id,
            notaCalculada: valor,
            isDesistente: desistentePorOrdem[eu.ordem] ?? false
          }
        })
        const atividade = eu.atividades[0]
        if (atividade) {
          await prisma.notaAtividade.upsert({
            where: { notaUnidadeId_esquemaAtividadeId: { notaUnidadeId: notaUnidade.id, esquemaAtividadeId: atividade.id } },
            update: { valor },
            create: { notaUnidadeId: notaUnidade.id, esquemaAtividadeId: atividade.id, valor }
          })
        }
      }
    }

    return NextResponse.json({ message: 'Processamento concluído', count: results.length })
  } catch (error: any) {
    console.error('Erro crítico ao lançar notas:', error.message || error)
    
    if (error.message?.includes('deve estar entre 0 e 10')) {
      return NextResponse.json({ message: error.message }, { status: 400 })
    }
    
    return NextResponse.json({ 
      message: 'Erro ao processar notas', 
      error: error.message 
    }, { status: 500 })
  }
}
