import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import Link from "next/link"
import { ArrowLeft, Download, FileText } from "lucide-react"

export const metadata = {
  title: 'Áxis - Estudantes'
}

export const runtime = 'nodejs'

async function getEstudanteBoletim(escolaId: string, matricula: string) {
  return await prisma.estudante.findUnique({
    where: { escolaId_matricula: { escolaId, matricula } },
    include: {
      turma: true,
      notas: {
        include: {
          disciplina: true
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
      return 'text-green-700 bg-green-100 shadow-sm border border-green-200'
    case 'RECUPERACAO':
      return 'text-orange-700 bg-orange-100 shadow-sm border border-orange-200'
    case 'EM_CONSELHO':
      return 'text-amber-700 bg-amber-100 shadow-sm border border-amber-200 animate-pulse'
    case 'DEPENDENCIA':
      return 'text-slate-800 bg-slate-200 shadow-sm border border-slate-300'
    case 'CONSERVADO':
      return 'text-rose-700 bg-rose-100 shadow-sm border border-rose-200'
    case 'DESISTENTE':
      return 'text-blue-800 bg-slate-200 shadow-sm border border-slate-300'
    default:
      return 'text-slate-800 bg-slate-100'
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

  // Função para calcular a média real baseada nas unidades
  const calcularMediaReal = (n: any) => {
    if (n.nota === -1) return 0;
    
    // Se houver nota de recuperação, ela substitui a menor nota (entre n1, n2, n3)? 
    // Ou é média aritmética simples? Geralmente CETEP usa (N1+N2+N3)/3
    const n1 = n.nota1 || 0;
    const n2 = n.nota2 || 0;
    const n3 = n.nota3 || 0;
    
    let media = (n1 + n2 + n3) / 3;
    
    // Se houver recuperação e a média for < 5, a recuperação pode ajudar
    if (n.notaRecuperacao !== null && media < 5) {
      // Regra comum: Recuperação substitui a menor
      const notas = [n1, n2, n3].sort((a, b) => a - b);
      if (n.notaRecuperacao > notas[0]) {
        media = (n.notaRecuperacao + notas[1] + notas[2]) / 3;
      }
    }
    
    return Math.round(media * 10) / 10;
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
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link
                href="/dashboard/estudantes"
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-slate-700" />
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">Boletim</h1>
                <p className="text-sm text-slate-500 font-medium">{estudante.nome}</p>
              </div>
            </div>
            <a
              href={`/api/boletim/${estudante.matricula}/pdf`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center space-x-2 bg-gradient-to-r from-slate-700 to-slate-600 text-white px-4 py-2 rounded-lg hover:from-slate-800 hover:to-slate-700 transition-all shadow-lg"
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
        <div className="bg-white rounded-xl shadow-sm border border-slate-50 p-6 mb-6">
          <div className="flex items-start space-x-4">
            <div className="w-16 h-16 bg-gradient-to-br from-slate-500 to-slate-700 rounded-full flex items-center justify-center text-white text-2xl font-medium">
              {estudante.nome.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-slate-900 mb-2">{estudante.nome}</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-slate-400 font-medium uppercase tracking-wider">Turma</p>
                  <p className="font-medium text-slate-900">{estudante.turma.nome}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-400 font-medium uppercase tracking-wider">Média Geral</p>
                  <p className="font-medium text-slate-900">{mediaGeral}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-400 font-medium uppercase tracking-wider">Total de Disciplinas</p>
                  <p className="font-medium text-slate-900">{estudante.notas.length}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Resumo */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="bg-green-50 border border-green-200 rounded-xl p-6">
            <p className="text-sm text-green-700 mb-1">Aprovado</p>
            <p className="text-3xl font-medium text-green-900">{aprovadas}</p>
          </div>
          <div className="bg-orange-50 border border-orange-200 rounded-xl p-6">
            <p className="text-sm text-orange-700 mb-1">Recuperação</p>
            <p className="text-3xl font-medium text-orange-900">{recuperacao}</p>
          </div>
          <div className="bg-slate-100 border border-slate-300 rounded-xl p-6">
            <p className="text-sm text-slate-800 mb-1">Média</p>
            <p className="text-3xl font-medium text-blue-900">{mediaGeral}</p>
          </div>
        </div>

        {/* Notas por Disciplina */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 bg-gradient-to-r from-slate-50 to-slate-50 border-b border-slate-200">
            <h3 className="text-lg font-medium text-slate-900">Notas por Disciplina</h3>
          </div>

          {estudante.notas.length === 0 ? (
            <div className="p-12 text-center">
              <FileText className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-400">Nenhuma nota lançada ainda</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-100/50 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                      Disciplina
                    </th>
                    <th className="px-4 py-4 text-center text-xs font-medium text-slate-400 uppercase tracking-wider">
                      U1
                    </th>
                    <th className="px-4 py-4 text-center text-xs font-medium text-slate-400 uppercase tracking-wider">
                      U2
                    </th>
                    <th className="px-4 py-4 text-center text-xs font-medium text-slate-400 uppercase tracking-wider">
                      U3
                    </th>
                    <th className="px-4 py-4 text-center text-xs font-medium text-slate-400 uppercase tracking-wider">
                      Rec.
                    </th>
                    <th className="px-6 py-4 text-center text-xs font-medium text-slate-400 uppercase tracking-wider bg-slate-100/50">
                      Média
                    </th>
                    <th className="px-6 py-4 text-center text-xs font-medium text-slate-400 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-50">
                  {estudante.notas.map((nota) => {
                    const mediaCalculada = calcularMediaReal(nota);
                    const isInfrequente = nota.status === 'DESISTENTE' || nota.isDesistenteUnid1 || nota.isDesistenteUnid2 || nota.isDesistenteUnid3;
                    
                    return (
                      <tr key={nota.id} className="hover:bg-slate-100/50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-medium text-slate-900">
                                {nota.disciplina.nome}
                              </span>
                              {isInfrequente && (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-700 border border-slate-200 uppercase tracking-tight">
                                  Infrequente
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-center text-sm text-slate-700 font-medium">
                          {nota.nota1 !== null ? nota.nota1.toFixed(1) : '-'}
                        </td>
                        <td className="px-4 py-4 text-center text-sm text-slate-700 font-medium">
                          {nota.nota2 !== null ? nota.nota2.toFixed(1) : '-'}
                        </td>
                        <td className="px-4 py-4 text-center text-sm text-slate-700 font-medium">
                          {nota.nota3 !== null ? nota.nota3.toFixed(1) : '-'}
                        </td>
                        <td className="px-4 py-4 text-center">
                          {nota.notaRecuperacao !== null ? (
                            <span className="text-sm font-medium text-slate-700">
                              {nota.notaRecuperacao.toFixed(1)}
                            </span>
                          ) : '-'}
                        </td>
                        <td className="px-6 py-4 text-center bg-slate-50">
                          <span className={`text-base font-medium ${mediaCalculada < 5 ? 'text-red-600' : 'text-slate-800'}`}>
                            {nota.nota === -1 ? '-' : mediaCalculada.toFixed(1)}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          {(() => {
                            let statusParaExibir = nota.status;
                            if (statusParaExibir === 'DESISTENTE') {
                              statusParaExibir = mediaCalculada >= 5 ? 'APROVADO' : 'RECUPERACAO';
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
