import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { can } from '@/lib/rbac'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { rotaDoModulo } from '@/lib/modulos/guarda'

export const runtime = 'nodejs'

export const GET = rotaDoModulo('PLA', 'leitura', async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.escolaId) {
        return NextResponse.json({ message: 'Não autorizado' }, { status: 401 })
    }
    const escola = await prisma.escola.findUnique({ where: { id: session.user.escolaId }, select: { nome: true } })

    const { searchParams } = new URL(request.url)
    const professorId = searchParams.get('professorId')
    const turmaId = searchParams.get('turmaId')
    const disciplinaNome = searchParams.get('disciplinaNome')
    const dataInicio = searchParams.get('dataInicio')
    const dataFim = searchParams.get('dataFim')

    // PlanoEnsino não tem escolaId próprio - o escopo vem do professor
    const where: any = { professor: { escolaId: session.user.escolaId } }
    if (!can(session.user, 'plano.acompanhar')) {
        where.professorId = session.user.id
    } else if (professorId) {
        where.professorId = professorId
    }
    if (turmaId) {
        where.turmas = { some: { id: turmaId } }
    }
    if (disciplinaNome) {
        where.disciplinaNome = { contains: disciplinaNome, mode: 'insensitive' }
    }
    if (dataInicio && dataFim) {
        where.OR = [
            { periodoInicio: { gte: new Date(dataInicio), lte: new Date(dataFim) } },
            { periodoFim: { gte: new Date(dataInicio), lte: new Date(dataFim) } },
        ]
    }

    const planos = await prisma.planoEnsino.findMany({
      where,
      include: {
        professor: { select: { name: true } },
        turmas: { select: { nome: true } }
      },
      orderBy: { periodoInicio: 'desc' }
    })

    const doc = new jsPDF()

    // Cabeçalho Institucional Completo
    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(0)
    doc.text((escola?.nome ?? '').toUpperCase(), 105, 12, { align: 'center' })

    doc.setFontSize(20)
    doc.setTextColor(0, 0, 0)
    doc.text('RELATÓRIO DE PLANOS', 105, 25, { align: 'center' })
    


    // Linha separadora
    doc.setLineWidth(0.5)
    doc.line(20, 35, 190, 35)

    const tableData = planos.map(p => [
      p.disciplinaNome,
      p.turmas.map(t => t.nome).join(', '),
      p.professor.name || 'N/A',
      `${new Date(p.periodoInicio).toLocaleDateString('pt-BR')} - ${new Date(p.periodoFim).toLocaleDateString('pt-BR')}`
    ])

    autoTable(doc, {
      startY: 45,
      head: [['Disciplina', 'Turmas', 'Professor', 'Período']],
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
      columnStyles: { 0: { cellWidth: 50 }, 1: { cellWidth: 40 }, 2: { cellWidth: 40 }, 3: { cellWidth: 40 } }
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

    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="relatorio-planos-axis.pdf"'
      }
    })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ message: 'Erro ao gerar relatório' }, { status: 500 })
  }
})
