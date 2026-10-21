import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { Download } from "lucide-react"
import { buttonClasses } from "@/components/ui"
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
      {/* Dentro da ficha da turma (o cabeçalho com o nome vem do layout) */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-fg-muted">{isProfessorOnly ? 'Relação de estudantes e notas' : 'Notas e frequência por estudante'}</p>
        {!isProfessorOnly && (
          <a
            href={`/api/relatorio/turma/${turma.id}/pdf`}
            target="_blank"
            rel="noopener noreferrer"
            className={buttonClasses({ variant: "secondary", size: "sm" })}
          >
            <Download size={14} strokeWidth={1.75} aria-hidden /> Baixar PDF da turma
          </a>
        )}
      </div>

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
