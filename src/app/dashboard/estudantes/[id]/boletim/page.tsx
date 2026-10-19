import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import Link from "next/link"
import { ArrowLeft, Download, FileText } from "lucide-react"
import { calcularMediaFinal, unidadesDeNotasSalvas, etapasDaNota } from "@/lib/services/notas"
import { carregarEsquemaDaTurma, SELECT_ETAPAS_DA_NOTA } from "@/lib/services/notas-leitura"
import { carregarFrequenciaDaTurma } from "@/lib/services/frequencia-leitura"
import { situacaoComFrequencia, formatarFrequencia, ROTULO_REPROVADO_FALTA } from "@/lib/services/frequencia"

export const metadata = {
  title: 'Áxis - Estudantes'
}

export const runtime = 'nodejs'

async function getEstudanteBoletim(escolaId: string, matricula: string) {
  return await prisma.estudante.findUnique({
    where: { escolaId_matricula: { escolaId, matricula } },
    include: {
      turma: { select: { id: true, nome: true, cursoId: true, esquemaAvaliacaoId: true } },
      notas: {
        include: {
          disciplina: true,
          unidades: SELECT_ETAPAS_DA_NOTA
        },
        orderBy: {
          disciplina: {
            nome: 'asc'
          }
        }
      }
    }
  })
}


function getStatusColor(status: string) {
  switch (status) {
    case 'APROVADO':
    case 'APROVADO_RECUPERACAO':
    case 'APROVADO_CONSELHO':
      return 'text-success-fg bg-success-subtle shadow-sm border border-success-line'
    case 'RECUPERACAO':
      return 'text-warning-fg bg-warning-subtle shadow-sm border border-warning-line'
    case 'EM_CONSELHO':
      return 'text-warning-fg bg-warning-subtle shadow-sm border border-warning-line animate-pulse'
    case 'DEPENDENCIA':
      return 'text-fg bg-zinc-200 shadow-sm border border-zinc-300'
    case 'CONSERVADO':
      return 'text-danger-fg bg-danger-subtle shadow-sm border border-danger-line'
    case 'DESISTENTE':
      return 'text-accent-fg bg-zinc-200 shadow-sm border border-zinc-300'
    case 'REPROVADO_FALTA':
      return 'text-danger-fg bg-danger-subtle shadow-sm border border-danger-line'
    default:
      return 'text-fg bg-zinc-100'
  }
}

function getStatusText(status: string) {
  switch (status) {
    case 'APROVADO':
      return 'Aprovado'
    case 'RECUPERACAO':
      return 'Recuperação'
    case 'EM_CONSELHO':
      return 'Em Conselho'
    case 'DESISTENTE':
      return 'Infrequente'
    case 'APROVADO_RECUPERACAO':
      return 'Ap. Rec.'
    case 'APROVADO_CONSELHO':
      return 'Ap. Cons.'
    case 'DEPENDENCIA':
      return 'Dependência'
    case 'CONSERVADO':
      return 'Conservado'
    case 'REPROVADO_FALTA':
      return ROTULO_REPROVADO_FALTA
    default:
      return status
  }
}

export default async function BoletimPage({
  params
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()

  if (!session?.user?.escolaId) {
    redirect("/login")
  }

  const { id } = await params
  const estudante = await getEstudanteBoletim(session.user.escolaId, id)

  if (!estudante) {
    redirect("/dashboard/estudantes")
  }

  // Motor de cálculo único (src/lib/services/notas.ts) - substitui a
  // reimplementação antiga que tinha um bug real: sempre dividia por 3,
  // mesmo pra turmas semestrais (2 unidades), porque nunca soube ler o
  // esquema de avaliação da turma (que na prática nem existia antes desta
  // frente). Lê de NotaUnidade (populado desde a Fase 3 do backfill),
  // não mais das colunas fixas nota1/nota2/nota3.
  const esquema = await carregarEsquemaDaTurma(estudante.turma)
  const etapas = esquema?.etapas ?? []
  const notaMinima = esquema?.config.notaMinimaAprovacao ?? 5

  // Frequência (chamada): por disciplina e geral, regra do esquema da turma
  const frequencia = await carregarFrequenciaDaTurma(session.user.escolaId, estudante.turma.id, [estudante.id])
  const freqAluno = frequencia?.porAluno.get(estudante.id)
  const freqMinima = frequencia?.regra.minimo ?? 75

  const calcularMediaReal = (n: (typeof estudante.notas)[number]) => {
    if (n.nota === -1) return 0
    if (!esquema) return n.nota

    const resultado = calcularMediaFinal(unidadesDeNotasSalvas(etapas, n.unidades), esquema.config)
    return resultado.media ?? 0
  }

  const aprovadas = estudante.notas.filter(n => 
    ['APROVADO', 'APROVADO_RECUPERACAO', 'APROVADO_CONSELHO'].includes(n.status)
  ).length
  
  const recuperacao = estudante.notas.filter(n => n.status === 'RECUPERACAO').length
  
  const notasValidas = estudante.notas.filter(n => n.nota !== -1)
  const mediaGeral = notasValidas.length > 0
    ? (notasValidas.reduce((acc, n) => acc + calcularMediaReal(n), 0) / notasValidas.length).toFixed(2)
    : '0.00'

  return (
    <div className="bg-zinc-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-zinc-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link
                href="/dashboard/estudantes"
                className="p-2 hover:bg-zinc-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-fg-muted" />
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-fg">Boletim</h1>
                <p className="text-sm text-fg-subtle font-medium">{estudante.nome}</p>
              </div>
            </div>
            <a
              href={`/api/boletim/${estudante.matricula}/pdf`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center space-x-2 bg-zinc-700 to-zinc-600 text-white px-4 py-2 rounded-lg hover:bg-zinc-800 hover:to-zinc-700 transition-all shadow-card"
            >
              <Download className="w-5 h-5" />
              <span>Baixar PDF</span>
            </a>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Informações do Estudante */}
        <div className="bg-white rounded-xl shadow-sm border border-zinc-50 p-6 mb-6">
          <div className="flex items-start space-x-4">
            <div className="w-16 h-16 bg-zinc-500 to-zinc-700 rounded-full flex items-center justify-center text-white text-2xl font-medium">
              {estudante.nome.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-fg mb-2">{estudante.nome}</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-fg-subtle font-medium uppercase tracking-wider">Turma</p>
                  <p className="font-medium text-fg">{estudante.turma.nome}</p>
                </div>
                <div>
                  <p className="text-sm text-fg-subtle font-medium uppercase tracking-wider">Média Geral</p>
                  <p className="font-medium text-fg">{mediaGeral}</p>
                </div>
                <div>
                  <p className="text-sm text-fg-subtle font-medium uppercase tracking-wider">Total de Disciplinas</p>
                  <p className="font-medium text-fg">{estudante.notas.length}</p>
                </div>
                {frequencia?.temChamada && (
                  <div>
                    <p className="text-sm text-fg-subtle font-medium uppercase tracking-wider">Frequência</p>
                    <p className={`font-medium ${(freqAluno?.geral.percentual ?? 100) < freqMinima ? 'text-danger-fg' : 'text-fg'}`}>
                      {formatarFrequencia(freqAluno?.geral.percentual ?? null)}
                      <span className="text-xs text-fg-subtle font-normal"> · {freqAluno?.geral.faltasConsideradas ?? 0} faltas · mínimo {freqMinima}%</span>
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Resumo */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="bg-success-subtle border border-success-line rounded-xl p-6">
            <p className="text-sm text-success-fg mb-1">Aprovado</p>
            <p className="text-3xl font-medium text-success-fg">{aprovadas}</p>
          </div>
          <div className="bg-warning-subtle border border-warning-line rounded-xl p-6">
            <p className="text-sm text-warning-fg mb-1">Recuperação</p>
            <p className="text-3xl font-medium text-warning-fg">{recuperacao}</p>
          </div>
          <div className="bg-zinc-100 border border-zinc-300 rounded-xl p-6">
            <p className="text-sm text-fg mb-1">Média</p>
            <p className="text-3xl font-medium text-accent-fg">{mediaGeral}</p>
          </div>
        </div>

        {/* Notas por Disciplina */}
        <div className="bg-white rounded-xl shadow-sm border border-zinc-200 overflow-hidden">
          <div className="px-6 py-4 bg-zinc-50 to-zinc-50 border-b border-zinc-200">
            <h3 className="text-lg font-medium text-fg">Notas por Disciplina</h3>
          </div>

          {estudante.notas.length === 0 ? (
            <div className="p-12 text-center">
              <FileText className="w-16 h-16 text-zinc-300 mx-auto mb-4" />
              <p className="text-fg-subtle">Nenhuma nota lançada ainda</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-zinc-100/50 border-b border-zinc-200">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-medium text-fg-subtle uppercase tracking-wider">
                      Disciplina
                    </th>
                    {etapas.map((etapa, i) => (
                      <th key={etapa.id} title={etapa.nome} className="px-4 py-4 text-center text-xs font-medium text-fg-subtle uppercase tracking-wider">
                        U{i + 1}
                      </th>
                    ))}
                    <th className="px-4 py-4 text-center text-xs font-medium text-fg-subtle uppercase tracking-wider">
                      Rec.
                    </th>
                    <th className="px-6 py-4 text-center text-xs font-medium text-fg-subtle uppercase tracking-wider bg-zinc-100/50">
                      Média
                    </th>
                    {frequencia?.temChamada && (
                      <th title="Frequência na disciplina" className="px-4 py-4 text-center text-xs font-medium text-fg-subtle uppercase tracking-wider">
                        Freq.
                      </th>
                    )}
                    <th className="px-6 py-4 text-center text-xs font-medium text-fg-subtle uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-zinc-50">
                  {estudante.notas.map((nota) => {
                    const mediaCalculada = calcularMediaReal(nota);
                    const etapasDoAluno = etapasDaNota(etapas, nota.unidades);
                    const isInfrequente = nota.status === 'DESISTENTE' || etapasDoAluno.some(e => e.desistente);
                    const freqDisc = freqAluno?.porDisciplina[nota.disciplinaId];
                    
                    return (
                      <tr key={nota.id} className="hover:bg-zinc-100/50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-medium text-fg">
                                {nota.disciplina.nome}
                              </span>
                              {isInfrequente && (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-zinc-100 text-fg-muted border border-zinc-200 uppercase tracking-tight">
                                  Infrequente
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        {etapasDoAluno.map((etapa, i) => (
                          <td key={i} className="px-4 py-4 text-center text-sm text-fg-muted font-medium">
                            {etapa.nota !== null ? etapa.nota.toFixed(1) : '-'}
                          </td>
                        ))}
                        <td className="px-4 py-4 text-center">
                          {nota.notaRecuperacao !== null ? (
                            <span className="text-sm font-medium text-fg-muted">
                              {nota.notaRecuperacao.toFixed(1)}
                            </span>
                          ) : '-'}
                        </td>
                        <td className="px-6 py-4 text-center bg-zinc-50">
                          <span className={`text-base font-medium ${mediaCalculada < notaMinima ? 'text-danger-fg' : 'text-fg'}`}>
                            {nota.nota === -1 ? '-' : mediaCalculada.toFixed(1)}
                          </span>
                        </td>
                        {frequencia?.temChamada && (
                          <td className="px-4 py-4 text-center text-sm" title={freqDisc ? `${freqDisc.faltasConsideradas} faltas em ${freqDisc.aulas} aulas` : undefined}>
                            <span className={(freqDisc?.percentual ?? 100) < freqMinima ? 'text-danger-fg font-medium' : 'text-fg-muted'}>
                              {formatarFrequencia(freqDisc?.percentual ?? null)}
                            </span>
                          </td>
                        )}
                        <td className="px-6 py-4 text-center">
                          {(() => {
                            let statusParaExibir: string = nota.status;
                            if (statusParaExibir === 'DESISTENTE') {
                              statusParaExibir = mediaCalculada >= notaMinima ? 'APROVADO' : 'RECUPERACAO';
                            }
                            if (frequencia) {
                              statusParaExibir = situacaoComFrequencia(statusParaExibir as any, freqAluno, frequencia.regra, nota.disciplinaId, frequencia.anoEncerrado);
                            }
                            return (
                              <span className={`px-3 py-1 inline-flex text-[10px] leading-5 font-medium rounded-full uppercase tracking-wider ${getStatusColor(statusParaExibir)}`}>
                                {getStatusText(statusParaExibir)}
                              </span>
                            );
                          })()}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
