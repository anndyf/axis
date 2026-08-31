import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

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

    if (!estudante) {
      return NextResponse.json({ message: 'Estudante não encontrado' }, { status: 404 })
    }

    // Criar PDF
    const doc = new jsPDF()

    // Cabeçalho
    doc.setFontSize(20)
    doc.setFont('helvetica', 'bold')
    doc.text('BOLETIM ESCOLAR', 105, 20, { align: 'center' })
    
    doc.setFontSize(12)
    doc.setFont('helvetica', 'normal')
    doc.text('Áxis - CETEP/LNAB', 105, 28, { align: 'right' })

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

    // Tabela de Notas
    const tableData = estudante.notas.map(nota => [
      nota.disciplina.nome,
      nota.nota === -1 ? '-' : nota.nota.toFixed(1),
      nota.status === 'APROVADO' ? 'Aprovado' : 
      nota.status === 'RECUPERACAO' ? 'Recuperação' : 'Desistente'
    ])

    autoTable(doc, {
      startY: 70,
      head: [['Disciplina', 'Nota', 'Status']],
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
      columnStyles: {
        0: { halign: 'left', cellWidth: 100 },
        1: { halign: 'center', cellWidth: 40 },
        2: { halign: 'center', cellWidth: 40 }
      },
      didParseCell: function(data: any) {
        if (data.section === 'body' && data.column.index === 2) {
          const status = data.cell.raw
          if (status === 'Aprovado') {
            data.cell.styles.textColor = [22, 163, 74]
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
