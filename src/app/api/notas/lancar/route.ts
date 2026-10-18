
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logAudit } from '@/lib/audit'
import {
  calcularNotaUnidade,
  calcularMediaFinal,
  calcularStatus,
  resolverEsquemaAvaliacaoId,
  paraEsquemaConfig,
  type EsquemaConfig,
  type StatusNota,
  type UnidadeInput,
  type FormaCalculo,
} from '@/lib/services/notas'

export const runtime = 'nodejs'

interface AtividadeInputPayload {
  esquemaAtividadeId: string
  valor: number | string | null
}

interface UnidadeInputPayload {
  esquemaUnidadeId: string
  notaRecuperacao?: number | string | null
  isDesistente?: boolean
  atividades: AtividadeInputPayload[]
}

interface NotaInputPayload {
  estudanteId: string // matrícula
  disciplinaId: string
  unidades: UnidadeInputPayload[]
}

function parseNota(val: any): number | null {
  if (val === undefined || val === null || val === '') return null
  const parsed = parseFloat(String(val).replace(',', '.'))
  return isNaN(parsed) ? null : parsed
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user?.escolaId) {
      return NextResponse.json({ message: 'Não autorizado' }, { status: 401 })
    }
    const escolaId = session.user.escolaId

    const { notas }: { notas: NotaInputPayload[] } = await request.json()

    if (!Array.isArray(notas) || notas.length === 0) {
      return NextResponse.json({ message: 'Dados inválidos' }, { status: 400 })
    }

    // Otimização: Obter informações da disciplina e turma uma única vez
    // Assumindo que todas as notas no lote são da mesma disciplina (conforme o frontend envia)
    const disciplinaId = notas[0].disciplinaId

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
    const esquemaConfig: EsquemaConfig = paraEsquemaConfig(esquema)
    const casas = esquema.casasDecimais

    // Otimização: Buscar todos os estudantes do lote de uma vez para os logs de auditoria.
    // O frontend envia a matricula (LancarNotasClient.tsx usa estudante.matricula como chave),
    // mas "notas_finais.estudante_id" guarda o id tecnico desde a Migration 3b - precisa
    // resolver matricula -> id antes de qualquer SELECT/UPDATE/INSERT na tabela.
    const matriculas = notas.map((n) => n.estudanteId)
    const estudantes = await prisma.estudante.findMany({
      where: { escolaId, matricula: { in: matriculas } },
      select: { id: true, matricula: true, nome: true }
    })
    const studentNamesMap = new Map(estudantes.map((e) => [e.matricula, e.nome]))
    const matriculaToIdMap = new Map(estudantes.map((e) => [e.matricula, e.id]))

    const results: any[] = []

    // Processar sequencialmente para evitar exaustão do pool de conexões
    for (const notaData of notas) {
      const { estudanteId, unidades: unidadesPayload } = notaData

      // estudanteId aqui e a matricula (nome mantido por compatibilidade com o
      // payload do frontend) - resolve para o id tecnico real da tabela estudantes.
      const estudanteRealId = matriculaToIdMap.get(estudanteId)
      if (!estudanteRealId) {
        results.push({ skipped: true, estudanteId, error: 'Estudante não encontrado nesta escola' })
        continue
      }

      const existing = await prisma.notaFinal.findUnique({
        where: { estudanteId_disciplinaId: { estudanteId: estudanteRealId, disciplinaId } },
        include: { unidades: { include: { atividades: true } } }
      })
      const existingUnidadeMap = new Map((existing?.unidades ?? []).map((u) => [u.esquemaUnidadeId, u]))

      // Monta, pra cada unidade do esquema, o valor final de cada atividade -
      // usa o que veio no payload, ou preserva o que já estava salvo se o
      // campo vier vazio/ausente (mesmo comportamento do fluxo legado de
      // nota1/nota2/nota3).
      let algumCampoTocado = false
      const unidadesParaSalvar: {
        esquemaUnidadeId: string
        isDesistente: boolean
        notaRecuperacao: number | null
        peso: number
        formaCalculo: FormaCalculo
        divisor: number | null
        atividades: { esquemaAtividadeId: string; peso: number; valor: number | null }[]
      }[] = []

      for (const eu of esquema.unidades) {
        const payloadUnidade = unidadesPayload?.find((u) => u.esquemaUnidadeId === eu.id)
        const existingUnidade = existingUnidadeMap.get(eu.id)
        const existingAtividadeMap = new Map((existingUnidade?.atividades ?? []).map((a) => [a.esquemaAtividadeId, a.valor]))

        if (payloadUnidade) {
          const temValor = payloadUnidade.atividades.some((a) => a.valor !== null && a.valor !== undefined && a.valor !== '')
          if (temValor || payloadUnidade.isDesistente || payloadUnidade.notaRecuperacao !== undefined) {
            algumCampoTocado = true
          }
        }

        const isDesistente = payloadUnidade?.isDesistente ?? existingUnidade?.isDesistente ?? false
        const notaRecuperacao = payloadUnidade
          ? (parseNota(payloadUnidade.notaRecuperacao) ?? existingUnidade?.notaRecuperacao ?? null)
          : (existingUnidade?.notaRecuperacao ?? null)

        const atividadesFinal = eu.atividades.map((ea) => {
          const payloadAtividade = payloadUnidade?.atividades.find((a) => a.esquemaAtividadeId === ea.id)
          const valor = parseNota(payloadAtividade?.valor) ?? existingAtividadeMap.get(ea.id) ?? null
          if (valor !== null && (valor < 0 || valor > ea.notaMaxima)) {
            throw new Error(`Nota inválida para estudante ${estudanteId}: ${ea.nome} deve estar entre 0 e ${ea.notaMaxima}`)
          }
          return { esquemaAtividadeId: ea.id, peso: ea.peso, valor }
        })

        unidadesParaSalvar.push({
          esquemaUnidadeId: eu.id,
          peso: eu.peso,
          formaCalculo: eu.formaCalculo,
          divisor: eu.divisor,
          isDesistente,
          notaRecuperacao,
          atividades: atividadesFinal
        })
      }

      // Se nada foi de fato tocado neste lote para este estudante, ignora -
      // evita reescrever um registro sem nenhuma mudança real.
      if (!algumCampoTocado) {
        results.push({ skipped: true, estudanteId })
        continue
      }

      const targetName = studentNamesMap.get(estudanteId) || 'Estudante desconhecido'

      const unidadesInput: UnidadeInput[] = unidadesParaSalvar.map((u) => ({
        esquemaUnidadeId: u.esquemaUnidadeId,
        peso: u.peso,
        formaCalculo: u.formaCalculo,
        divisor: u.divisor,
        atividades: u.atividades.map((a) => ({ peso: a.peso, valor: a.valor })),
        notaRecuperacao: u.notaRecuperacao,
      }))
      const resultado = calcularMediaFinal(unidadesInput, esquemaConfig)
      const currentStatus = existing?.status as StatusNota | undefined
      // Passa null pra recuperação final aqui de propósito: essa rota não
      // mexe em recuperação final (isso é papel exclusivo de
      // api/notas/recuperacao) - a proteção de STATUS_ESPECIAIS do motor
      // já garante que uma aprovação por recuperação existente não regride
      // por causa de uma edição de nota normal.
      const finalStatus = calcularStatus(resultado, esquemaConfig, null, currentStatus)
      const notaCalculadaFinal = resultado.media ?? 0

      // Nota de cada etapa, na ordem do esquema - gravada em NotaUnidade
      // abaixo. As colunas legadas nota_1/2/3 e is_desistente_unidN não são
      // mais escritas: todos os leitores migraram para NotaUnidade
      // (plano-avaliacao-frequencia.md, passo 4).
      const notasEtapas = unidadesParaSalvar.map((u) => calcularNotaUnidade(u.atividades, u.formaCalculo, u.divisor, casas))
      const notasEtapasAnteriores = esquema.unidades.map((eu) => existingUnidadeMap.get(eu.id)?.notaCalculada ?? null)

      const dataComum = {
        nota: notaCalculadaFinal,
        status: finalStatus,
      }

      let notaId: string
      if (existing) {
        notaId = existing.id

        await prisma.notaFinal.update({
          where: { id: notaId },
          data: { ...dataComum, modifiedById: session.user.id, modifiedAt: new Date() }
        })

        await logAudit(
          session.user.id,
          'NOTA',
          notaId,
          'UPDATE',
          {
            alvo: targetName,
            disciplina: disciplineName,
            anterior: { etapas: notasEtapasAnteriores, st: existing.status },
            atual: { etapas: notasEtapas, st: finalStatus }
          }
        )

        results.push({ id: notaId, updated: true })
      } else {
        const criada = await prisma.notaFinal.create({
          data: { ...dataComum, estudanteId: estudanteRealId, disciplinaId, modifiedById: session.user.id }
        })
        notaId = criada.id

        await logAudit(
          session.user.id,
          'NOTA',
          notaId,
          'INSERT',
          {
            alvo: targetName,
            disciplina: disciplineName,
            etapas: notasEtapas,
            status: finalStatus
          }
        )

        results.push({ id: notaId, created: true })
      }

      // Grava as etapas (NotaUnidade) e atividades (NotaAtividade) - fonte
      // de verdade das notas por etapa.
      for (const [i, u] of unidadesParaSalvar.entries()) {
        const notaUnidade = await prisma.notaUnidade.upsert({
          where: { notaFinalId_esquemaUnidadeId: { notaFinalId: notaId, esquemaUnidadeId: u.esquemaUnidadeId } },
          update: {
            notaCalculada: notasEtapas[i],
            notaRecuperacao: u.notaRecuperacao,
            isDesistente: u.isDesistente
          },
          create: {
            notaFinalId: notaId,
            esquemaUnidadeId: u.esquemaUnidadeId,
            notaCalculada: notasEtapas[i],
            notaRecuperacao: u.notaRecuperacao,
            isDesistente: u.isDesistente
          }
        })

        for (const a of u.atividades) {
          await prisma.notaAtividade.upsert({
            where: { notaUnidadeId_esquemaAtividadeId: { notaUnidadeId: notaUnidade.id, esquemaAtividadeId: a.esquemaAtividadeId } },
            update: { valor: a.valor },
            create: { notaUnidadeId: notaUnidade.id, esquemaAtividadeId: a.esquemaAtividadeId, valor: a.valor }
          })
        }
      }
    }

    return NextResponse.json({ message: 'Processamento concluído', count: results.length })
  } catch (error: any) {
    console.error('Erro crítico ao lançar notas:', error.message || error)

    if (error.message?.startsWith('Nota inválida')) {
      return NextResponse.json({ message: error.message }, { status: 400 })
    }

    return NextResponse.json({
      message: 'Erro ao processar notas',
      error: error.message
    }, { status: 500 })
  }
}
