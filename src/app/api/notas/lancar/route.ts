import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logAudit } from '@/lib/audit'
import { reportarErro } from '@/lib/monitoramento'
import { can } from '@/lib/rbac'
import { resolverEsquemaAvaliacaoId, paraEsquemaConfig, type StatusNota } from '@/lib/services/notas'
import { atividadesDaDisciplina } from '@/lib/services/notas-leitura'
import {
  montarLancamentoAluno,
  ErroLancamento,
  unidadeMudou,
  type UnidadePayload,
  type LancamentoAluno,
} from '@/lib/services/lancamento-notas'
import { rotaDoModulo } from '@/lib/modulos/guarda'
import { contextoCadeado, verificarNotaUnidade, STATUS_CADEADO } from '@/lib/cadeado-unidade'

export const runtime = 'nodejs'

interface NotaInputPayload {
  estudanteId: string // matrícula
  disciplinaId: string
  unidades: UnidadePayload[]
}

/**
 * Lança notas de um lote de alunos de UMA disciplina. Atômico: o lote é
 * todo validado antes de gravar, e a gravação roda numa única transação -
 * um item inválido (nota fora do limite, aluno de outra turma/escola,
 * disciplina diferente) não salva nada.
 */
export const POST = rotaDoModulo('NOT', 'escrita', async function POST(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user?.escolaId || !can(session.user, 'nota.lancar')) {
      return NextResponse.json({ message: 'Não autorizado' }, { status: 401 })
    }
    const escolaId = session.user.escolaId

    const { notas }: { notas: NotaInputPayload[] } = await request.json()

    if (!Array.isArray(notas) || notas.length === 0) {
      return NextResponse.json({ message: 'Dados inválidos' }, { status: 400 })
    }

    const disciplinaId = notas[0].disciplinaId
    if (notas.some((n) => n.disciplinaId !== disciplinaId)) {
      return NextResponse.json({ message: 'Um lançamento deve ser de uma única disciplina' }, { status: 400 })
    }

    const disciplina = await prisma.disciplina.findFirst({
      where: { id: disciplinaId, turma: { escolaId } },
      include: {
        turma: { select: { id: true, cursoId: true, esquemaAvaliacaoId: true } },
        usuariosPermitidos: { where: { id: session.user.id }, select: { id: true } },
      },
    })

    if (!disciplina) {
      return NextResponse.json({ message: 'Disciplina não encontrada' }, { status: 404 })
    }
    // Só quem leciona a disciplina lança notas, em qualquer papel: Direção e
    // Administrador só visualizam (decisão da dona do produto, 20/10/2026)
    if (disciplina.usuariosPermitidos.length === 0) {
      return NextResponse.json({ message: 'Você não leciona esta disciplina' }, { status: 403 })
    }

    const curso = disciplina.turma.cursoId
      ? await prisma.curso.findFirst({ where: { id: disciplina.turma.cursoId, escolaId }, select: { esquemaAvaliacaoId: true } })
      : null
    const esquemaId = resolverEsquemaAvaliacaoId(disciplina.turma, curso)
    if (!esquemaId) {
      return NextResponse.json({ message: 'Esquema de avaliação não configurado para esta turma' }, { status: 400 })
    }
    const esquema = await prisma.esquemaAvaliacao.findFirst({
      where: { id: esquemaId, escolaId },
      include: { unidades: { orderBy: { ordem: 'asc' }, include: { atividades: { orderBy: { ordem: 'asc' } } } } },
    })
    if (!esquema) {
      return NextResponse.json({ message: 'Esquema de avaliação inválido' }, { status: 400 })
    }
    // PROFESSOR: as atividades de cada etapa são as avaliações que o
    // professor criou para a disciplina (gravadas em NotaAvaliacao)
    const porProfessor = esquema.definicaoAtividades === 'PROFESSOR'
    const atividades = await atividadesDaDisciplina(esquema, disciplinaId)
    const esquemaLancamento = {
      config: paraEsquemaConfig(esquema),
      notaMaxima: esquema.notaMaxima,
      casasDecimais: esquema.casasDecimais,
      unidades: esquema.unidades.map((u) => ({ ...u, atividades: atividades.get(u.id) ?? [] })),
    }

    // O frontend envia a matrícula; notas_finais.estudante_id guarda o id técnico.
    // Só valem alunos da turma da disciplina, na escola da sessão.
    const matriculas = notas.map((n) => n.estudanteId)
    const estudantes = await prisma.estudante.findMany({
      where: { escolaId, turmaId: disciplina.turma.id, matricula: { in: matriculas } },
      select: { id: true, matricula: true, nome: true },
    })
    const porMatricula = new Map(estudantes.map((e) => [e.matricula, e]))
    const naoEncontrado = matriculas.find((m) => !porMatricula.has(m))
    if (naoEncontrado !== undefined) {
      return NextResponse.json({ message: `Estudante ${naoEncontrado} não encontrado nesta turma` }, { status: 400 })
    }

    const existentes = await prisma.notaFinal.findMany({
      where: { disciplinaId, estudanteId: { in: estudantes.map((e) => e.id) } },
      include: { unidades: { include: { atividades: true, avaliacoes: true } } },
    })
    const existentePorAluno = new Map(existentes.map((n) => [n.estudanteId, n]))

    // Cadeado (depois da regra de quem leciona): etapa encerrada não muda
    const cadeado = await contextoCadeado(escolaId, disciplina.turma.id)
    const trancadas = new Map<string, string>()
    for (const u of esquema.unidades) {
      const r = cadeado ? verificarNotaUnidade(cadeado, disciplinaId, u.id) : { ok: true as const }
      if (!r.ok) trancadas.set(u.id, r.mensagem)
    }

    // 1) Valida e calcula o lote inteiro, sem gravar nada
    const plano: { estudante: (typeof estudantes)[number]; lancamento: LancamentoAluno; existente: (typeof existentes)[number] | undefined }[] = []
    for (const item of notas) {
      const estudante = porMatricula.get(item.estudanteId)!
      const existente = existentePorAluno.get(estudante.id)
      const unidadesExistentes = (existente?.unidades ?? []).map((u) => ({
        ...u,
        atividades: porProfessor
          ? u.avaliacoes.map((a) => ({ esquemaAtividadeId: a.avaliacaoId, valor: a.valor }))
          : u.atividades,
      }))
      const lancamento = montarLancamentoAluno(
        esquemaLancamento,
        item.unidades,
        unidadesExistentes,
        existente?.status as StatusNota | undefined,
        item.estudanteId
      )
      // Etapa encerrada: recusa o lote se ela mudaria; se não muda, não é regravada
      for (const u of lancamento.unidades) {
        const mensagem = trancadas.get(u.esquemaUnidadeId)
        if (mensagem && unidadeMudou(u, unidadesExistentes.find((e) => e.esquemaUnidadeId === u.esquemaUnidadeId))) {
          return NextResponse.json({ message: mensagem }, { status: STATUS_CADEADO })
        }
      }
      if (lancamento.tocado) plano.push({ estudante, lancamento, existente })
    }

    // 2) Grava tudo numa transação
    const etapasAnteriores = (e: (typeof existentes)[number] | undefined) =>
      esquema.unidades.map((eu) => e?.unidades.find((u) => u.esquemaUnidadeId === eu.id)?.notaCalculada ?? null)

    const gravados = await prisma.$transaction(async (tx) => {
      const ids: { notaId: string; criado: boolean }[] = []
      for (const { estudante, lancamento, existente } of plano) {
        const dados = { nota: lancamento.media, status: lancamento.status, modifiedById: session.user.id, modifiedAt: new Date() }
        const notaId = existente
          ? (await tx.notaFinal.update({ where: { id: existente.id }, data: dados })).id
          : (await tx.notaFinal.create({ data: { ...dados, estudanteId: estudante.id, disciplinaId } })).id
        ids.push({ notaId, criado: !existente })

        for (const u of lancamento.unidades) {
          if (trancadas.has(u.esquemaUnidadeId)) continue
          const campos = { notaCalculada: u.notaCalculada, notaRecuperacao: u.notaRecuperacao, isDesistente: u.isDesistente }
          const notaUnidade = await tx.notaUnidade.upsert({
            where: { notaFinalId_esquemaUnidadeId: { notaFinalId: notaId, esquemaUnidadeId: u.esquemaUnidadeId } },
            update: campos,
            create: { notaFinalId: notaId, esquemaUnidadeId: u.esquemaUnidadeId, ...campos },
          })
          for (const a of u.atividades) {
            if (porProfessor) {
              await tx.notaAvaliacao.upsert({
                where: { notaUnidadeId_avaliacaoId: { notaUnidadeId: notaUnidade.id, avaliacaoId: a.esquemaAtividadeId } },
                update: { valor: a.valor },
                create: { notaUnidadeId: notaUnidade.id, avaliacaoId: a.esquemaAtividadeId, valor: a.valor },
              })
              continue
            }
            await tx.notaAtividade.upsert({
              where: { notaUnidadeId_esquemaAtividadeId: { notaUnidadeId: notaUnidade.id, esquemaAtividadeId: a.esquemaAtividadeId } },
              update: { valor: a.valor },
              create: { notaUnidadeId: notaUnidade.id, esquemaAtividadeId: a.esquemaAtividadeId, valor: a.valor },
            })
          }
        }
      }
      return ids
    }, { timeout: 30_000 })

    // 3) Auditoria depois do commit (logAudit nunca derruba a operação)
    for (const [i, { estudante, lancamento, existente }] of plano.entries()) {
      const etapas = lancamento.unidades.map((u) => u.notaCalculada)
      await logAudit(
        session.user.id,
        'NOTA',
        gravados[i].notaId,
        existente ? 'UPDATE' : 'INSERT',
        existente
          ? { alvo: estudante.nome, disciplina: disciplina.nome, anterior: { etapas: etapasAnteriores(existente), st: existente.status }, atual: { etapas, st: lancamento.status } }
          : { alvo: estudante.nome, disciplina: disciplina.nome, etapas, status: lancamento.status }
      )
    }

    return NextResponse.json({ message: 'Processamento concluído', count: gravados.length })
  } catch (error: any) {
    if (error instanceof ErroLancamento) {
      return NextResponse.json({ message: error.message }, { status: 400 })
    }
    console.error('Erro crítico ao lançar notas:', error?.message || error)
    await reportarErro(error, { metodo: 'POST', caminho: '/api/notas/lancar' })
    return NextResponse.json({ message: 'Erro ao processar notas' }, { status: 500 })
  }
})
