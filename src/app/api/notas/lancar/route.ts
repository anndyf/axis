
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { v4 as uuidv4 } from 'uuid'
import { logAudit } from '@/lib/audit'

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
        turma: { select: { modalidade: true } }
      }
    })

    if (!disciplina) {
      return NextResponse.json({ message: 'Disciplina não encontrada' }, { status: 404 })
    }

    const modalidade = disciplina?.turma?.modalidade
    const isSemestral = modalidade === 'PROEJA' || modalidade === 'SUBSEQUENTE'
    const disciplineName = disciplina?.nome || 'Disciplina desconhecida'

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

      const val1 = n1 ?? 0
      const val2 = n2 ?? 0
      const val3 = n3 ?? 0

      let notaCalculada = 0
      if (isSemestral) {
          notaCalculada = (val1 + val2) / 2
      } else {
          notaCalculada = (val1 + val2 + val3) / 3
      }
      
      notaCalculada = Math.round(notaCalculada * 10) / 10

      let status = 'RECUPERACAO'
      const allNotesLaunched = isSemestral ? (n1 !== null && n2 !== null) : (n1 !== null && n2 !== null && n3 !== null)
      
      if (notaCalculada >= 5 && allNotesLaunched) {
        status = 'APROVADO'
      }

      const statusEnum = status as any
      const targetName = studentNamesMap.get(estudanteId) || 'Estudante desconhecido'

      // Verificar se já existe nota
      const existing = await prisma.$queryRaw<any[]>`
        SELECT id, nota_1 as "nota1", nota_2 as "nota2", nota_3 as "nota3", status 
        FROM "notas_finais" 
        WHERE "estudante_id" = ${estudanteRealId} AND "disciplina_id" = ${disciplinaId}
        LIMIT 1
      `

      if (existing.length > 0) {
        const notaId = existing[0].id
        
        // Proteção contra exclusão acidental: Preservar notas já salvas se vierem vazias/nulas na requisição atual
        const finalN1 = n1 !== null ? n1 : (existing[0].nota1 !== null && existing[0].nota1 !== undefined ? Number(existing[0].nota1) : null)
        const finalN2 = n2 !== null ? n2 : (existing[0].nota2 !== null && existing[0].nota2 !== undefined ? Number(existing[0].nota2) : null)
        const finalN3 = n3 !== null ? n3 : (existing[0].nota3 !== null && existing[0].nota3 !== undefined ? Number(existing[0].nota3) : null)

        // Recalcular a média final com base nas notas preservadas reais
        const val1 = finalN1 ?? 0
        const val2 = finalN2 ?? 0
        const val3 = finalN3 ?? 0

        let notaCalculadaPreservada = 0
        if (isSemestral) {
            notaCalculadaPreservada = (val1 + val2) / 2
        } else {
            notaCalculadaPreservada = (val1 + val2 + val3) / 3
        }
        notaCalculadaPreservada = Math.round(notaCalculadaPreservada * 10) / 10

        // Recalcular status baseado nas notas finais preservadas
        let status = 'RECUPERACAO'
        const allNotesLaunched = isSemestral ? (finalN1 !== null && finalN2 !== null) : (finalN1 !== null && finalN2 !== null && finalN3 !== null)
        
        if (notaCalculadaPreservada >= 5 && allNotesLaunched) {
          status = 'APROVADO'
        }

        let finalStatus = status as any
        const currentStatus = existing[0].status
        
        // Proteção de Status: Preservar status especiais de aprovação (Conselho, Recuperação, Dependência, Conservado)
        // se a média das notas regulares continuar menor que 5
        const isSpecialStatus = ['APROVADO_RECUPERACAO', 'APROVADO_CONSELHO', 'DEPENDENCIA', 'CONSERVADO'].includes(currentStatus)
        if (isSpecialStatus && status === 'RECUPERACAO') {
          finalStatus = currentStatus
        }

        await prisma.$executeRaw`
          UPDATE "notas_finais"
          SET 
            "nota_1" = ${finalN1},
            "nota_2" = ${finalN2},
            "nota_3" = ${finalN3},
            "nota" = ${notaCalculadaPreservada},
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
            anterior: { n1: existing[0].nota1, n2: existing[0].nota2, n3: existing[0].nota3, st: existing[0].status },
            atual: { n1: finalN1, n2: finalN2, n3: finalN3, st: finalStatus }
          }
        )
        
        results.push({ id: notaId, updated: true })
      } else {
        const newId = uuidv4()
        await prisma.$executeRaw`
          INSERT INTO "notas_finais" (
            "id", "estudante_id", "disciplina_id", "nota_1", "nota_2", "nota_3", "nota", "status", 
            "is_desistente_unid1", "is_desistente_unid2", "is_desistente_unid3",
            "modified_by_id", "created_at", "updated_at", "modified_at"
          )
          VALUES (
            ${newId}, ${estudanteRealId}, ${disciplinaId}, ${n1}, ${n2}, ${n3}, ${notaCalculada}, ${statusEnum}::"status_nota",
            ${!!isDesistenteUnid1}, ${!!isDesistenteUnid2}, ${!!isDesistenteUnid3},
            ${session.user.id}, NOW(), NOW(), NOW()
          )
        `
        
        await logAudit(
          session.user.id,
          'NOTA',
          newId,
          'INSERT',
          { 
            alvo: targetName, 
            disciplina: disciplineName,
            nota1: n1, 
            nota2: n2, 
            nota3: n3, 
            status: statusEnum 
          }
        )
        
        results.push({ id: newId, created: true })
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
