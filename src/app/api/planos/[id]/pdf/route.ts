import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import jsPDF from 'jspdf'

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

    const plano = await prisma.planoEnsino.findFirst({
      where: { id, professor: { escolaId: session.user.escolaId } },
      include: {
        professor: { select: { name: true, escola: { select: { nome: true } } } },
        turmas: { select: { nome: true } }
      }
    })

    if (!plano) {
      return NextResponse.json({ message: 'Plano de ensino não encontrado' }, { status: 404 })
    }

    // Mesma regra do GET de detalhe: só o dono ou a gestão
    if (!session.user.isSuperuser && !session.user.isDirecao && plano.professorId !== session.user.id) {
      return NextResponse.json({ message: 'Acesso negado' }, { status: 403 })
    }

    const doc = new jsPDF()

    // Cabeçalho Institucional Completo
    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(0)
    doc.text(plano.professor.escola.nome.toUpperCase(), 105, 12, { align: 'center' })

    doc.setFontSize(20)
    doc.setTextColor(0, 0, 0)
    doc.text('PLANO QUINZENAL', 105, 25, { align: 'center' })
    


    // Linha separadora
    doc.setLineWidth(0.5)
    doc.line(20, 35, 190, 35)

    // Informações
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.text('Disciplina:', 20, 45)
    doc.setFont('helvetica', 'normal')
    doc.text(plano.disciplinaNome, 50, 45)

    doc.setFont('helvetica', 'bold')
    doc.text('Professor:', 20, 52)
    doc.setFont('helvetica', 'normal')
    doc.text(plano.professor.name || 'N/A', 50, 52)

    doc.setFont('helvetica', 'bold')
    doc.text('Turmas:', 20, 59)
    doc.setFont('helvetica', 'normal')
    doc.text(plano.turmas.map(t => t.nome).join(', '), 50, 59)

    doc.setFont('helvetica', 'bold')
    doc.text('Período:', 20, 66)
    doc.setFont('helvetica', 'normal')
    const dataInicio = new Date(plano.periodoInicio).toLocaleDateString('pt-BR', { timeZone: 'UTC' })
    const dataFim = new Date(plano.periodoFim).toLocaleDateString('pt-BR', { timeZone: 'UTC' })
    doc.text(`${dataInicio} a ${dataFim}`, 50, 66)

    // Corpo
    const sections = [
        { title: 'INDICADORES ESPECÍFICOS', content: plano.indicadores },
        { title: 'CONTEÚDOS PROGRAMÁTICOS', content: plano.conteudos },
        { title: 'METODOLOGIA APLICADA', content: plano.metodologias },
        { title: 'RECURSOS DIDÁTICOS', content: plano.recursos },
        { title: 'INSTRUMENTOS DE AVALIAÇÃO', content: plano.avaliacao }
    ]

    if (plano.observacoes) {
        sections.push({ title: 'OBSERVAÇÕES', content: plano.observacoes })
    }

    let currentY = 75
    sections.forEach(section => {
        doc.setFontSize(10)
        doc.setFont('helvetica', 'bold')
        doc.text(section.title, 20, currentY)
        currentY += 7

        doc.setFontSize(10)
        doc.setFont('helvetica', 'normal')
        const splitText = doc.splitTextToSize(section.content || '', 170)
        const textHeight = splitText.length * 5

        if (currentY + textHeight > 270) {
            doc.addPage()
            currentY = 20
        }
        doc.text(splitText, 25, currentY)
        currentY += textHeight + 10
    })

    // Adicionar marca Áxis no fim de cada página
    const totalPages = doc.getNumberOfPages()
    for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i)
        const pageHeight = doc.internal.pageSize.height || doc.internal.pageSize.getHeight()
        doc.setFontSize(8)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(0)
        doc.text('Áxis - Sistema de Gestão Escolar', 105, pageHeight - 10, { align: 'center' })
    }

    const pdfBuffer = Buffer.from(doc.output('arraybuffer'))
    const firstTurma = plano.turmas[0]?.nome.replace(/\s+/g, '-') || 'sem-turma'

    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="plano-${firstTurma}-${plano.disciplinaNome.replace(/\s+/g, '-')}.pdf"`
      }
    })
  } catch (error) {
    console.error('Erro ao gerar PDF:', error)
    return NextResponse.json({ message: 'Erro ao gerar PDF' }, { status: 500 })
  }
}
