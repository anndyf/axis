import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { carregarFrequenciaDaTurma } from '@/lib/services/frequencia-leitura'
import { situacaoComFrequencia, formatarFrequencia, ROTULO_REPROVADO_FALTA } from '@/lib/services/frequencia'

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

    const estudante = await prisma.estudante.findUnique({
      where: { escolaId_matricula: { escolaId: session.user.escolaId, matricula: id } },
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

    // Aluno do portal só baixa o próprio boletim
    if (!estudante || (session.user.isPortalUser && estudante.id !== session.user.estudanteId)) {
      return NextResponse.json({ message: 'Estudante não encontrado' }, { status: 404 })
    }

    const frequencia = await carregarFrequenciaDaTurma(session.user.escolaId, estudante.turmaId, [estudante.id])
    const freqAluno = frequencia?.porAluno.get(estudante.id)
    const comFrequencia = !!frequencia?.temChamada
    // fonte padrão do jsPDF: hífen simples no lugar do travessão
    const fmtFreq = (p: number | null) => (p === null ? '-' : formatarFrequencia(p))

    const escola = await prisma.escola.findUnique({
      where: { id: session.user.escolaId },
      select: { nome: true }
    })

    // Criar PDF
    const doc = new jsPDF()

    // Cabeçalho
    doc.setFontSize(20)
    doc.setFont('helvetica', 'bold')
    doc.text('BOLETIM ESCOLAR', 105, 20, { align: 'center' })

    doc.setFontSize(12)
    doc.setFont('helvetica', 'normal')
    doc.text(`Áxis - ${escola?.nome || 'Sistema'}`, 105, 28, { align: 'right' })

    // Linha separadora
    doc.setLineWidth(0.5)
    doc.line(20, 35, 190, 35)

    // Informações do Estudante
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.text('Estudante:', 20, 45)
    doc.setFont('helvetica', 'normal')
    doc.text(estudante.nome, 50, 45)

    doc.setFont('helvetica', 'bold')
    doc.text('Turma:', 20, 52)
    doc.setFont('helvetica', 'normal')
    doc.text(estudante.turma.nome, 50, 52)

    // Calcular média
    const media = estudante.notas.length > 0
      ? (estudante.notas.reduce((acc, n) => acc + n.nota, 0) / estudante.notas.length).toFixed(2)
      : '0.00'

    doc.setFont('helvetica', 'bold')
    doc.text('Média Geral:', 20, 59)
    doc.setFont('helvetica', 'normal')
    doc.text(media, 50, 59)

    if (comFrequencia) {
      doc.setFont('helvetica', 'bold')
      doc.text('Frequência:', 110, 59)
      doc.setFont('helvetica', 'normal')
      doc.text(`${fmtFreq(freqAluno?.geral.percentual ?? null)} (mínimo ${frequencia!.regra.minimo}%)`, 135, 59)
    }

    // Tabela de Notas
    const tableData = estudante.notas.map(nota => {
      const situacao = frequencia
        ? situacaoComFrequencia(nota.status, freqAluno, frequencia.regra, nota.disciplinaId, frequencia.anoEncerrado)
        : nota.status
      const linha = [
        nota.disciplina.nome,
        nota.nota === -1 ? '-' : nota.nota.toFixed(1),
        situacao === 'REPROVADO_FALTA' ? ROTULO_REPROVADO_FALTA :
        situacao === 'APROVADO' ? 'Aprovado' :
        situacao === 'RECUPERACAO' ? 'Recuperação' : 'Desistente'
      ]
      if (comFrequencia) linha.splice(2, 0, fmtFreq(freqAluno?.porDisciplina[nota.disciplinaId]?.percentual ?? null))
      return linha
    })
    const colStatus = comFrequencia ? 3 : 2

    autoTable(doc, {
      startY: 70,
      head: [comFrequencia ? ['Disciplina', 'Nota', 'Freq.', 'Status'] : ['Disciplina', 'Nota', 'Status']],
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
        halign: 'center'
      },
      columnStyles: comFrequencia
        ? {
            0: { halign: 'left', cellWidth: 85 },
            1: { halign: 'center', cellWidth: 30 },
            2: { halign: 'center', cellWidth: 30 },
            3: { halign: 'center', cellWidth: 35 }
          }
        : {
            0: { halign: 'left', cellWidth: 100 },
            1: { halign: 'center', cellWidth: 40 },
            2: { halign: 'center', cellWidth: 40 }
          },
      didParseCell: function(data: any) {
        if (data.section === 'body' && data.column.index === colStatus) {
          const status = data.cell.raw
          if (status === 'Aprovado') {
            data.cell.styles.textColor = [22, 163, 74]
            data.cell.styles.fontStyle = 'bold'
          } else if (status === ROTULO_REPROVADO_FALTA) {
            data.cell.styles.textColor = [225, 29, 72]
            data.cell.styles.fontStyle = 'bold'
          } else if (status === 'Recuperação') {
            data.cell.styles.textColor = [234, 88, 12]
            data.cell.styles.fontStyle = 'bold'
          } else {
            data.cell.styles.textColor = [107, 114, 128]
          }
        }
      }
    })

    // Rodapé
    const finalY = (doc as any).lastAutoTable.finalY || 70
    doc.setFontSize(9)
    doc.setFont('helvetica', 'italic')
    doc.text(`Documento gerado em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}`, 105, finalY + 20, { align: 'center' })

    // Gerar PDF como buffer
    const pdfBuffer = Buffer.from(doc.output('arraybuffer'))

    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="boletim-${estudante.nome.replace(/\s+/g, '-')}.pdf"`
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
