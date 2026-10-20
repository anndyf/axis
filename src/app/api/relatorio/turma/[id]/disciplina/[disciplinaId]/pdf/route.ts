
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { can } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { adicionarLogoNoPdf } from '@/lib/pdf-logo'
import { etapasDaNota } from '@/lib/services/notas'
import { carregarEsquemaDaTurma, SELECT_ETAPAS_DA_NOTA } from '@/lib/services/notas-leitura'
import { rotaDoModulo } from '@/lib/modulos/guarda'

export const runtime = 'nodejs'

export const GET = rotaDoModulo('RES', 'leitura', async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string, disciplinaId: string }> }
) {
  try {
    const session = await auth()

    if (!session?.user?.escolaId) {
      return NextResponse.json({ message: 'Não autorizado' }, { status: 401 })
    }
    // Relatório da turma inteira: só equipe (aluno do portal fica de fora)
    if (!can(session.user, 'staff')) {
      return NextResponse.json({ message: 'Acesso negado' }, { status: 403 })
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
                include: { disciplina: true, unidades: SELECT_ETAPAS_DA_NOTA }
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

    // Uma coluna por etapa do esquema da turma (turma ?? curso) - lida de
    // NotaUnidade, não mais das colunas fixas nota_1/2/3.
    const etapas = (await carregarEsquemaDaTurma(turma))?.etapas ?? []

    // Criar PDF
    const doc = new jsPDF()
    await adicionarLogoNoPdf(doc, session.user.escolaId)

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
      const etapasDoAluno = etapasDaNota(etapas, nota.unidades ?? [])

      let media = '-'
      if (nota.status === 'DESISTENTE' || (etapasDoAluno.length > 0 && etapasDoAluno.every(e => e.desistente))) {
        media = 'DE'
      } else if (typeof nota.nota === 'number') {
        media = nota.nota.toFixed(1)
      }

      let status = 'Em Aberto'
      if (nota.status === 'APROVADO') status = 'Aprovado'
      else if (nota.status === 'RECUPERACAO') status = 'RP'
      else if (nota.status === 'DESISTENTE') status = 'DE'

      return [
        (index + 1).toString(),
        estudante.nome,
        ...etapasDoAluno.map(e => e.nota !== null ? e.nota.toFixed(1) : '-'),
        media,
        status
      ]
    })

    const headers = ['#', 'Estudante', ...etapas.map((_, i) => `Unid ${i + 1}`), 'Méd', 'Situação']

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
})
