import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { adicionarLogoNoPdf } from '@/lib/pdf-logo'
import { etapasDaNota, desistenteEmTodas } from '@/lib/services/notas'
import { carregarEsquemaDaTurma, SELECT_ETAPAS_DA_NOTA } from '@/lib/services/notas-leitura'
import { carregarFrequenciaDaTurma } from '@/lib/services/frequencia-leitura'
import { frequenciaConsiderada, formatarFrequencia, ROTULO_REPROVADO_FALTA } from '@/lib/services/frequencia'

export const runtime = 'nodejs'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()

    if (!session?.user?.escolaId) {
      return NextResponse.json({ message: 'Não autorizado' }, { status: 401 })
    }

    const { id } = await params

    // Se for professor, não pode baixar relatório global de todas as matérias
    if (session.user.isStaff && !session.user.isDirecao && !session.user.isSuperuser) {
      return NextResponse.json({ message: 'Professores devem emitir relatórios individuais por disciplina' }, { status: 403 })
    }

    const turma = await prisma.turma.findUnique({
      where: { id, escolaId: session.user.escolaId },
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
          }
        }
      }
    })

    if (!turma) {
      return NextResponse.json({ message: 'Turma não encontrada' }, { status: 404 })
    }

    const escola = await prisma.escola.findUnique({
      where: { id: session.user.escolaId },
      select: { nome: true }
    })

    // Criar PDF
    const doc = new jsPDF()
    await adicionarLogoNoPdf(doc, session.user.escolaId)

    // Cabeçalho
    doc.setFontSize(20)
    doc.setFont('helvetica', 'bold')
    doc.text('RELATÓRIO DA TURMA', 105, 20, { align: 'center' })

    doc.setFontSize(12)
    doc.setFont('helvetica', 'normal')
    doc.text(`Áxis - ${escola?.nome || 'Sistema'}`, 105, 28, { align: 'center' })

    // Linha separadora
    doc.setLineWidth(0.5)
    doc.line(20, 35, 190, 35)

    // Informações da Turma
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.text('Turma:', 20, 45)
    doc.setFont('helvetica', 'normal')
    doc.text(turma.nome, 50, 45)

    doc.setFont('helvetica', 'bold')
    doc.text('Total de Estudantes:', 20, 52)
    doc.setFont('helvetica', 'normal')
    doc.text(turma.estudantes.length.toString(), 70, 52)

    doc.setFont('helvetica', 'bold')
    doc.text('Total de Disciplinas:', 20, 59)
    doc.setFont('helvetica', 'normal')
    doc.text(turma.disciplinas.length.toString(), 70, 59)

    // Calcular estatísticas
    let totalAprovados = 0
    let totalRecuperacao = 0
    let totalDesistentes = 0

    // Etapas do esquema da turma (2, 3, 4...) - antes "isSemestral" por
    // Turma.modalidade, que nunca foi preenchida nos dados reais.
    const esquema = await carregarEsquemaDaTurma(turma)
    const etapas = esquema?.etapas ?? []

    turma.estudantes.forEach(estudante => {
      const aprovadas = estudante.notas.filter(n => n.status === 'APROVADO').length
      const recuperacao = estudante.notas.filter(n => n.status === 'RECUPERACAO').length
      
      const desistente = estudante.notas.some((n) => desistenteEmTodas(etapasDaNota(etapas, n.unidades)))

      if (desistente) {
        totalDesistentes++
      } else if (recuperacao > 0) {
        totalRecuperacao++
      } else if (aprovadas === turma.disciplinas.length && turma.disciplinas.length > 0) {
        totalAprovados++
      }
    })

    // Estatísticas
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text('Estatísticas', 20, 72)

    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.text(`Aprovados: ${totalAprovados}`, 20, 80)
    doc.text(`Em Recuperação: ${totalRecuperacao}`, 70, 80)
    doc.text(`Desistentes: ${totalDesistentes}`, 130, 80)

    // Frequência geral de cada aluno (coluna só aparece se já houve chamada)
    const frequencia = await carregarFrequenciaDaTurma(session.user.escolaId, turma.id)
    const comFrequencia = !!frequencia?.temChamada
    const fmtFreq = (p: number | null) => (p === null ? '-' : formatarFrequencia(p))

    // Tabela de Estudantes
    const tableData = turma.estudantes.map(estudante => {
      const aprovadas = estudante.notas.filter(n => n.status === 'APROVADO').length
      const recuperacao = estudante.notas.filter(n => n.status === 'RECUPERACAO').length
      const desistente = estudante.notas.some(n => n.status === 'DESISTENTE')
      const media = estudante.notas.length > 0
        ? (estudante.notas.reduce((acc, n) => acc + n.nota, 0) / estudante.notas.length)
        : 0

      let status = 'Pendente'
      if (desistente) {
        status = 'Desistente'
      } else if (recuperacao > 0) {
        status = 'Recuperação'
      } else if (aprovadas === turma.disciplinas.length && turma.disciplinas.length > 0) {
        status = 'Aprovado'
      }

      const freqAluno = frequencia?.porAluno.get(estudante.id)
      const freqConsiderada = freqAluno && frequencia ? frequenciaConsiderada(freqAluno, frequencia.regra) : null
      if (frequencia?.anoEncerrado && !desistente && freqConsiderada !== null && freqConsiderada < frequencia.regra.minimo) {
        status = ROTULO_REPROVADO_FALTA
      }

      const linha = [
        estudante.nome,
        estudante.notas.length.toString(),
        // Média simples das notas finais, na escala do esquema da turma
        estudante.notas.length > 0 ? media.toFixed(1).replace('.', ',') : '-',
        status
      ]
      if (comFrequencia) linha.splice(3, 0, fmtFreq(freqAluno?.geral.percentual ?? null))
      return linha
    })

    autoTable(doc, {
      startY: 90,
      head: [comFrequencia ? ['Estudante', 'Disciplinas', 'Média Geral', 'Freq.', 'Status Final'] : ['Estudante', 'Disciplinas', 'Média Geral', 'Status Final']],
      body: tableData,
      theme: 'grid',
      headStyles: {
        fillColor: [255, 255, 255],
        textColor: [51, 65, 85],
        fontStyle: 'bold',
        halign: 'center',
        lineWidth: 0.1,
        lineColor: [200, 200, 200]
      },
      bodyStyles: {
        fontSize: 9
      },
      columnStyles: comFrequencia ? {
        0: { halign: 'left', cellWidth: 75 },
        1: { halign: 'center', cellWidth: 25 },
        2: { halign: 'center', cellWidth: 30 },
        3: { halign: 'center', cellWidth: 25 },
        4: { halign: 'center', cellWidth: 35 }
      } : {
        0: { halign: 'left', cellWidth: 90 },
        1: { halign: 'center', cellWidth: 30 },
        2: { halign: 'center', cellWidth: 30 },
        3: { halign: 'center', cellWidth: 40 }
      },
      didParseCell: function(data: any) {
        if (data.section === 'body' && data.column.index === (comFrequencia ? 4 : 3)) {
          const status = data.cell.raw
          if (status === ROTULO_REPROVADO_FALTA) {
            data.cell.styles.textColor = [225, 29, 72]
            data.cell.styles.fontStyle = 'bold'
          } else if (status === 'Aprovado') {
            data.cell.styles.textColor = [22, 163, 74]
            data.cell.styles.fontStyle = 'bold'
          } else if (status === 'Recuperação') {
            data.cell.styles.textColor = [234, 88, 12]
            data.cell.styles.fontStyle = 'bold'
          } else if (status === 'Desistente') {
            data.cell.styles.textColor = [107, 114, 128]
          }
        }
      }
    })

    // Rodapé
    const finalY = (doc as any).lastAutoTable.finalY || 90
    doc.setFontSize(9)
    doc.setFont('helvetica', 'italic')
    doc.text(`Documento gerado em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}`, 105, finalY + 15, { align: 'center' })

    // Gerar PDF como buffer
    const pdfBuffer = Buffer.from(doc.output('arraybuffer'))

    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="relatorio-${turma.nome.replace(/\s+/g, '-')}.pdf"`
      }
    })
  } catch (error) {
    console.error('Erro ao gerar PDF:', error)
    return NextResponse.json(
      { message: 'Erro ao gerar PDF' },
      { status: 500 }
    )
  }
}
