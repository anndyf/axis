import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import Link from "next/link"
import { ArrowLeft, Download, FileText } from "lucide-react"
import RelatorioClient from "./RelatorioClient"
import { carregarEsquemaDaTurma, SELECT_ETAPAS_DA_NOTA } from "@/lib/services/notas-leitura"
import { etapasDaNota } from "@/lib/services/notas"
import { carregarFrequenciaDaTurma, resumoFrequenciaParaTela } from "@/lib/services/frequencia-leitura"
import { paginaDoModulo } from '@/lib/modulos/guarda'
import { restritoADocencia } from '@/lib/rbac'

export const metadata = {
  title: 'Áxis - Turmas'
}

export const runtime = 'nodejs'

async function getTurmaRelatorio(id: string, escolaId: string) {
  return await prisma.turma.findUnique({
    where: { id, escolaId },
    include: {
      estudantes: {
        include: {
          notas: {
            include: {
              disciplina: true,
              unidades: SELECT_ETAPAS_DA_NOTA
            }
          }
        },
        orderBy: {
          nome: 'asc'
        }
      },
      disciplinas: {
        orderBy: {
          nome: 'asc'
        },
        include: {
          usuariosPermitidos: {
            select: {
              id: true,
              name: true,
              email: true,
            }
          }
        }
      }
    }
  })
}

export default async function RelatorioTurmaPage({
  params
}: {
  params: Promise<{ id: string }>
}) {
  await paginaDoModulo('RES')
  const session = await auth()

  if (!session?.user?.escolaId) {
    redirect("/login")
  }

  const { id } = await params
  const turma = await getTurmaRelatorio(id, session.user.escolaId)

  if (!turma) {
    redirect("/dashboard/turmas")
  }

  // Colunas de unidade vêm do esquema da turma (2, 3, 4... etapas), não mais fixas em 3
  const esquema = await carregarEsquemaDaTurma(turma)
  const etapas = esquema?.etapas ?? []
  const turmaComEtapas = {
    ...turma,
    estudantes: turma.estudantes.map((e) => ({
      ...e,
      notas: e.notas.map((n) => ({ ...n, etapas: etapasDaNota(etapas, n.unidades) })),
    })),
  }

  const frequencia = resumoFrequenciaParaTela(await carregarFrequenciaDaTurma(session.user.escolaId, turma.id))

  // Calcular estatísticas
  const totalEstudantes = turma.estudantes.length
  const totalDisciplinas = turma.disciplinas.length
  
  let totalAprovados = 0
  let totalRecuperacao = 0
  let totalDesistentes = 0

  turma.estudantes.forEach((estudante: any) => {
    const aprovadas = estudante.notas.filter((n: any) => n.status === 'APROVADO').length
    const recuperacao = estudante.notas.filter((n: any) => n.status === 'RECUPERACAO').length
    const desistente = estudante.notas.filter((n: any) => n.status === 'DESISTENTE').length

    if (desistente > 0) {
      totalDesistentes++
    } else if (recuperacao > 0) {
      totalRecuperacao++
    } else if (aprovadas === totalDisciplinas) {
      totalAprovados++
    }
  })

  const isProfessorOnly = restritoADocencia(session.user)

  return (
    <div className="">
      {/* Header */}
      <header className="mb-6">
        <div className="py-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <Link
                href="/dashboard/turmas"
                aria-label="Voltar" className="hidden sm:inline-flex p-1.5 rounded-md text-fg-subtle transition-colors duration-150 hover:bg-subtle hover:text-fg"
                title="Voltar para Turmas"
              >
                <ArrowLeft className="w-5 h-5 text-fg-muted" />
              </Link>
              <div>
                <h1 className="text-2xl font-semibold tracking-tight text-fg">
                  {isProfessorOnly ? 'Relação de Estudantes' : 'Relatório da Turma'}
                </h1>
                <p className="text-sm text-fg-muted">{turma.nome}</p>
              </div>
            </div>
            
            {!isProfessorOnly && (
              <a
                href={`/api/relatorio/turma/${turma.id}/pdf`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center space-x-2 bg-surface border border-line text-fg px-4 py-2 rounded-lg hover:bg-subtle transition-all shadow-card"
              >
                <Download className="w-5 h-5" />
                <span>Baixar PDF Global</span>
              </a>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <RelatorioClient
        turma={turmaComEtapas}
        nomesEtapas={etapas.map((e) => e.nome)}
        totalEstudantes={totalEstudantes}
        totalDisciplinas={totalDisciplinas}
        totalAprovados={totalAprovados}
        totalRecuperacao={totalRecuperacao}
        totalDesistentes={totalDesistentes}
        isProfessorOnly={isProfessorOnly}
        frequencia={frequencia}
      />
    </div>
  )
}
