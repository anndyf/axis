
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { resolverEsquemaAvaliacaoId } from '@/lib/services/notas'

export const runtime = 'nodejs'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string, disciplinaId: string }> }
) {
  try {
    const session = await auth()

    if (!session?.user?.escolaId) {
      return NextResponse.json({ message: 'Não autorizado' }, { status: 401 })
    }
    const escolaId = session.user.escolaId

    const { id, disciplinaId } = await params

    const [turma, disciplina] = await Promise.all([
      prisma.turma.findUnique({
        where: { id, escolaId },
        include: {
          estudantes: {
            include: {
              notas: {
                where: { disciplinaId },
                include: { disciplina: true }
              }
            },
            orderBy: {
              nome: 'asc'
            }
          }
        }
      }),
      prisma.disciplina.findUnique({
        where: { id: disciplinaId, turma: { escolaId } }
      })
    ])

    if (!turma || !disciplina) {
      return NextResponse.json({ message: 'Turma ou Disciplina não encontrada' }, { status: 404 })
    }

    // Resolve o esquema de avaliação (turma ?? curso) - substitui o antigo
    // `isSemestral = turma.modalidade IN (PROEJA, SUBSEQUENTE)`, que nunca
    // funcionou de fato pra dados reais (Turma.modalidade sempre NULL).
    const curso = turma.cursoId
      ? await prisma.curso.findUnique({ where: { id: turma.cursoId }, select: { esquemaAvaliacaoId: true } })
      : null
    const esquemaId = resolverEsquemaAvaliacaoId(turma, curso)
    const esquema = esquemaId
      ? await prisma.esquemaAvaliacao.findUnique({ where: { id: esquemaId }, select: { numUnidades: true } })
      : null
    const isSemestral = (esquema?.numUnidades ?? 3) < 3

    // Criar PDF
    const doc = new jsPDF()

    // Cabeçalho
    doc.setFontSize(18)
    doc.setFont('helvetica', 'bold')
    doc.text('MAPA DE NOTAS DA DISCIPLINA', 105, 20, { align: 'center' })
    
    doc.setFontSize(12)
    doc.setFont('helvetica', 'normal')
    doc.text(`Disciplina: ${disciplina.nome}`, 105, 28, { align: 'center' })

    // Linha separadora
    doc.setLineWidth(0.5)
    doc.line(20, 35, 190, 35)

    // Informações da Turma
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.text('Turma:', 20, 45)
    doc.setFont('helvetica', 'normal')
    doc.text(turma.nome, 35, 45)

    doc.setFont('helvetica', 'bold')
    doc.text('Professor(a):', 20, 52)
    doc.setFont('helvetica', 'normal')
    doc.text(session.user.username || 'N/A', 45, 52)

    doc.setFont('helvetica', 'bold')
    doc.text('Data de Geração:', 130, 45)
    doc.setFont('helvetica', 'normal')
    doc.text(new Date().toLocaleDateString('pt-BR'), 165, 45)

    // Tabela de Estudantes
    const tableData = turma.estudantes.map((estudante: any, index: number) => {
      const nota = estudante.notas[0] || {}
      
      const n1 = (typeof nota.nota1 === 'number') ? nota.nota1.toFixed(1) : '-'
      const n2 = (typeof nota.nota2 === 'number') ? nota.nota2.toFixed(1) : '-'
      const n3 = (typeof nota.nota3 === 'number') ? nota.nota3.toFixed(1) : '-'
      
      let media = '-'
      if (nota.status === 'DESISTENTE' || (nota.isDesistenteUnid1 && nota.isDesistenteUnid2 && (isSemestral || nota.isDesistenteUnid3))) {
        media = 'DE'
      } else if (typeof nota.nota === 'number') {
        media = nota.nota.toFixed(1)
      }

      let status = 'Em Aberto'
      if (nota.status === 'APROVADO') status = 'Aprovado'
      else if (nota.status === 'RECUPERACAO') status = 'RP'
      else if (nota.status === 'DESISTENTE') status = 'DE'

      const row = [
        (index + 1).toString(),
        estudante.nome,
        n1,
        n2
      ]

      if (!isSemestral) row.push(n3)
      row.push(media, status)

      return row
    })

    const headers = ['#', 'Estudante', 'Unid 1', 'Unid 2']
    if (!isSemestral) headers.push('Unid 3')
    headers.push('Méd', 'Situação')

    autoTable(doc, {
      startY: 65,
      head: [headers],
      body: tableData,
      theme: 'grid',
      headStyles: {
        fillColor: [30, 41, 59],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        halign: 'center',
        lineWidth: 0.1
      },
      bodyStyles: {
        fontSize: 8,
        halign: 'center'
      },
      columnStyles: {
        0: { cellWidth: 10 },
        1: { halign: 'left', cellWidth: 80 }
      },
      didParseCell: function(data: any) {
        if (data.section === 'body' && (data.column.index === (headers.length - 1))) {
           const situation = data.cell.raw
           if (situation === 'Aprovado') data.cell.styles.textColor = [22, 163, 74]
           else if (situation === 'RP') data.cell.styles.textColor = [234, 88, 12]
        }
      }
    })

    // Rodapé
    const finalY = (doc as any).lastAutoTable.finalY || 65
    doc.setFontSize(8)
    doc.setFont('helvetica', 'italic')
    doc.text(`Este relatório reflete exclusivamente o rendimento técnico na disciplina de ${disciplina.nome}.`, 105, finalY + 15, { align: 'center' })
    doc.text(`Áxis - Sistema de Gestão Acadêmica v4.0`, 105, finalY + 20, { align: 'center' })

    const pdfBuffer = Buffer.from(doc.output('arraybuffer'))

    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="mapa-notas-${turma.nome}-${disciplina.nome}.pdf"`
      }
    })
  } catch (error) {
    console.error('Erro ao gerar PDF da disciplina:', error)
    return NextResponse.json({ message: 'Erro ao gerar PDF' }, { status: 500 })
  }
}
