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

    const isSemestral = turma.modalidade === 'PROEJA' || turma.modalidade === 'SUBSEQUENTE'

    turma.estudantes.forEach(estudante => {
      const aprovadas = estudante.notas.filter(n => n.status === 'APROVADO').length
      const recuperacao = estudante.notas.filter(n => n.status === 'RECUPERACAO').length
      
      const desistente = isSemestral 
        ? estudante.notas.some((n: any) => 
            n.isDesistenteUnid1 && n.isDesistenteUnid2 &&
            n.nota1 === null && n.nota2 === null
          )
        : estudante.notas.some((n: any) => 
            n.isDesistenteUnid1 && n.isDesistenteUnid2 && n.isDesistenteUnid3 && 
            n.nota1 === null && n.nota2 === null && n.nota3 === null
          )

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

      return [
        estudante.nome,
        estudante.notas.length.toString(),
        media >= 5 ? 'AP' : 'RC',
        status
      ]
    })

    autoTable(doc, {
      startY: 90,
      head: [['Estudante', 'Disciplinas', 'Média Geral', 'Status Final']],
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
      columnStyles: {
        0: { halign: 'left', cellWidth: 90 },
        1: { halign: 'center', cellWidth: 30 },
        2: { halign: 'center', cellWidth: 30 },
        3: { halign: 'center', cellWidth: 40 }
      },
      didParseCell: function(data: any) {
        if (data.section === 'body' && data.column.index === 3) {
          const status = data.cell.raw
          if (status === 'Aprovado') {
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
