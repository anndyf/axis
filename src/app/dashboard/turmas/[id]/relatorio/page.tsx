import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import Link from "next/link"
import { ArrowLeft, Download, FileText } from "lucide-react"
import RelatorioClient from "./RelatorioClient"

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
              disciplina: true
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
  const session = await auth()

  if (!session?.user?.escolaId) {
    redirect("/login")
  }

  const { id } = await params
  const turma = await getTurmaRelatorio(id, session.user.escolaId)

  if (!turma) {
    redirect("/dashboard/turmas")
  }

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

  const isProfessorOnly = session.user.isStaff && !session.user.isDirecao && !session.user.isSuperuser

  return (
    <div className="min-h-screen bg-slate-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-slate-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link
                href="/dashboard/turmas"
                className="p-2 hover:bg-slate-200 rounded-lg transition-colors"
                title="Voltar para Turmas"
              >
                <ArrowLeft className="w-5 h-5 text-slate-700" />
              </Link>
              <div>
                <h1 className="text-2xl font-medium text-blue-900">
                  {isProfessorOnly ? 'Relação de Estudantes' : 'Relatório da Turma'}
                </h1>
                <p className="text-sm text-slate-700">{turma.nome}</p>
              </div>
            </div>
            
            {!isProfessorOnly && (
              <a
                href={`/api/relatorio/turma/${turma.id}/pdf`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center space-x-2 bg-gradient-to-r from-slate-700 to-slate-600 text-white px-4 py-2 rounded-lg hover:from-slate-800 hover:to-slate-700 transition-all shadow-lg"
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
        turma={turma} 
        totalEstudantes={totalEstudantes}
        totalDisciplinas={totalDisciplinas}
        totalAprovados={totalAprovados}
        totalRecuperacao={totalRecuperacao}
        totalDesistentes={totalDesistentes}
        isProfessorOnly={isProfessorOnly}
      />
    </div>
  )
}
