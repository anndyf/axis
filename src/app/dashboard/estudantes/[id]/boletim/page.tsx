import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import Link from "next/link"
import { ArrowLeft, Download, FileText } from "lucide-react"
import { Badge, Card, CardHeader, EmptyState, PageHeader, Stat, buttonClasses, type BadgeTone } from "@/components/ui"
import { calcularMediaFinal, unidadesDeNotasSalvas, etapasDaNota } from "@/lib/services/notas"
import { carregarEsquemaDaTurma, SELECT_ETAPAS_DA_NOTA } from "@/lib/services/notas-leitura"
import { carregarFrequenciaDaTurma } from "@/lib/services/frequencia-leitura"
import { situacaoComFrequencia, formatarFrequencia, ROTULO_REPROVADO_FALTA } from "@/lib/services/frequencia"
import { paginaDoModulo } from '@/lib/modulos/guarda'

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


// Situação em tom semântico suave (Badge)
function tomDoStatus(status: string): BadgeTone {
  switch (status) {
    case 'APROVADO':
    case 'APROVADO_RECUPERACAO':
    case 'APROVADO_CONSELHO':
      return 'success'
    case 'RECUPERACAO':
    case 'EM_CONSELHO':
      return 'warning'
    case 'CONSERVADO':
    case 'REPROVADO_FALTA':
      return 'danger'
    default:
      return 'neutral'
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
  await paginaDoModulo('NOT')
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

  const fmt = (n: number | null | undefined) => (n === null || n === undefined ? '—' : n.toFixed(1).replace('.', ','))

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader
        title={estudante.nome}
        description={<>Boletim · {estudante.turma.nome} · <span className="font-mono">{estudante.matricula}</span></>}
        actions={
          <>
            <Link href="/dashboard/estudantes" className={buttonClasses({ variant: 'ghost' })}><ArrowLeft size={16} strokeWidth={1.75} /> Estudantes</Link>
            <a href={`/api/boletim/${estudante.matricula}/pdf`} target="_blank" rel="noopener noreferrer" className={buttonClasses({ variant: 'secondary' })}>
              <Download size={16} strokeWidth={1.75} /> Baixar PDF
            </a>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Média geral" value={mediaGeral.replace('.', ',')} hint={`${estudante.notas.length} disciplinas`} />
        <Stat label="Aprovado" value={aprovadas} hint="disciplinas" />
        <Stat label="Recuperação" value={recuperacao} hint="disciplinas" />
        {frequencia?.temChamada ? (
          <Stat
            label="Frequência"
            value={formatarFrequencia(freqAluno?.geral.percentual ?? null)}
            hint={`${freqAluno?.geral.faltasConsideradas ?? 0} faltas · mínimo ${freqMinima}%`}
            className={(freqAluno?.geral.percentual ?? 100) < freqMinima ? 'border-danger-line' : undefined}
          />
        ) : (
          <Stat label="Frequência" value="—" hint="Nenhuma chamada salva" />
        )}
      </div>

      <Card className="overflow-hidden">
        <CardHeader title="Notas por disciplina" />
        {estudante.notas.length === 0 ? (
          <EmptyState icon={FileText} title="Nenhuma nota lançada ainda" description="As notas aparecem aqui assim que os professores lançarem a primeira unidade." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[36rem] text-13">
              <thead>
                <tr className="border-b border-line text-xs text-fg-subtle">
                  <th scope="col" className="h-9 px-4 text-left font-medium sm:px-5">Disciplina</th>
                  {etapas.map((etapa, i) => (
                    <th key={etapa.id} scope="col" title={etapa.nome} className="h-9 px-3 text-right font-medium">U{i + 1}</th>
                  ))}
                  <th scope="col" className="h-9 px-3 text-right font-medium">Rec.</th>
                  <th scope="col" className="h-9 px-3 text-right font-medium text-fg-muted">Média</th>
                  {frequencia?.temChamada && <th scope="col" title="Frequência na disciplina" className="h-9 px-3 text-right font-medium">Freq.</th>}
                  <th scope="col" className="h-9 px-4 text-left font-medium sm:px-5">Situação</th>
                </tr>
              </thead>
              <tbody>
                {estudante.notas.map((nota) => {
                  const mediaCalculada = calcularMediaReal(nota)
                  const etapasDoAluno = etapasDaNota(etapas, nota.unidades)
                  const isInfrequente = nota.status === 'DESISTENTE' || etapasDoAluno.some(e => e.desistente)
                  const freqDisc = freqAluno?.porDisciplina[nota.disciplinaId]
                  let statusParaExibir: string = nota.status
                  if (statusParaExibir === 'DESISTENTE') {
                    statusParaExibir = mediaCalculada >= notaMinima ? 'APROVADO' : 'RECUPERACAO'
                  }
                  if (frequencia) {
                    statusParaExibir = situacaoComFrequencia(statusParaExibir as any, freqAluno, frequencia.regra, nota.disciplinaId, frequencia.anoEncerrado)
                  }

                  return (
                    <tr key={nota.id} className="border-b border-line-subtle transition-colors duration-150 last:border-0 hover:bg-subtle/60">
                      <td className="h-10 px-4 sm:px-5">
                        <span className="font-medium text-fg">{nota.disciplina.nome}</span>
                        {isInfrequente && <Badge className="ml-2">Infrequente</Badge>}
                      </td>
                      {etapasDoAluno.map((etapa, i) => (
                        <td key={i} className="h-10 px-3 text-right tabular-nums text-fg-muted">{fmt(etapa.nota)}</td>
                      ))}
                      <td className="h-10 px-3 text-right tabular-nums text-fg-muted">{fmt(nota.notaRecuperacao)}</td>
                      <td className={`h-10 px-3 text-right font-semibold tabular-nums ${mediaCalculada < notaMinima ? 'text-danger-fg' : 'text-fg'}`}>
                        {nota.nota === -1 ? '—' : fmt(mediaCalculada)}
                      </td>
                      {frequencia?.temChamada && (
                        <td className={`h-10 px-3 text-right tabular-nums ${(freqDisc?.percentual ?? 100) < freqMinima ? 'font-medium text-danger-fg' : 'text-fg-muted'}`} title={freqDisc ? `${freqDisc.faltasConsideradas} faltas em ${freqDisc.aulas} aulas` : undefined}>
                          {formatarFrequencia(freqDisc?.percentual ?? null)}
                        </td>
                      )}
                      <td className="h-10 px-4 sm:px-5"><Badge tone={tomDoStatus(statusParaExibir)} dot>{getStatusText(statusParaExibir)}</Badge></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}
