
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

export const runtime = 'nodejs'

declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF
  }
}

function abreviarNome(nome: string) {
    const nomeUpper = nome.toUpperCase()
    const mapa: Record<string, string> = {
      'ALGORITMOS E LINGUAGEM DE PROGRAMAÇÃO': 'ALGORITMOS',
      'FUNDAMENTOS DA COMPUTAÇÃO': 'FUND. COMP.',
      'INICIAÇÃO CIENTÍFICA': 'INIC. CIENT.',
      'LÍNGUA PORTUGUESA': 'PORTUGUÊS',
      'EDUCAÇÃO FÍSICA': 'ED. FÍSICA',
      'BANCO DE DADOS': 'B. DADOS',
      'EDUCAÇÃO DIGITAL E MIDIÁTICA': 'ED. DIGITAL',
      'HISTÓRIA DA BAHIA': 'HIST. BAHIA',
      'FUNDAMENTOS DE ARQUITETURA DE COMPUTADORES': 'ARQ. COMP.',
      'PROJETO TECNOLOGIAS SOCIAIS': 'TEC. SOCIAIS'
    }
    if (mapa[nomeUpper]) return mapa[nomeUpper]
    return nome.length > 20 ? nome.substring(0, 17) + '...' : nome.toUpperCase()
}

function getStatusAbbr(status: string) {
  const map: Record<string, string> = {
    'APROVADO': 'AP',
    'RECUPERACAO': 'RC',
    'DESISTENTE': 'DS',
    'APROVADO_RECUPERACAO': 'RC',
    'APROVADO_CONSELHO': 'RC',
    'DEPENDENCIA': 'DP',
    'CONSERVADO': 'CO'
  }
  return map[status] || '-'
}

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
    const { searchParams } = new URL(request.url)
    const unit = (searchParams.get('unit') || 'FINAL') as any

    const turma = await prisma.turma.findUnique({
      where: { id, escolaId: session.user.escolaId },
      include: {
        disciplinas: {
          orderBy: { nome: 'asc' }
        },
        estudantes: {
          include: {
            notas: {
              include: {
                disciplina: true
              }
            }
          },
          orderBy: { nome: 'asc' }
        }
      }
    })

    if (!turma) {
      return NextResponse.json({ message: 'Turma não encontrada' }, { status: 404 })
    }

    // Criar PDF em formato paisagem
    const doc = new jsPDF('landscape')

    // Preparar dados da tabela
    const headers = ['Nº', 'NOME DO ALUNO', ...turma.disciplinas.map(d => abreviarNome(d.nome))]
    
    const tableData = turma.estudantes.map((estudante, index) => {
      const notasMap = new Map(
        estudante.notas.map(n => [n.disciplinaId, n])
      )

      const row = [
        (index + 1).toString(),
        estudante.nome.toUpperCase(),
        ...turma.disciplinas.map(disc => {
          const n = notasMap.get(disc.id) as any
          if (!n) return '-'
          
          if (unit === 'UNIDADE_1') {
            if (n.isDesistenteUnid1) {
              return n.nota1 !== null ? `${n.nota1.toFixed(1).replace('.', ',')}\n(INF)` : 'DS'
            }
            return n.nota1 !== null ? n.nota1.toFixed(1).replace('.', ',') : '-'
          }
          if (unit === 'UNIDADE_2') {
            if (n.isDesistenteUnid2) {
              return n.nota2 !== null ? `${n.nota2.toFixed(1).replace('.', ',')}\n(INF)` : 'DS'
            }
            return n.nota2 !== null ? n.nota2.toFixed(1).replace('.', ',') : '-'
          }
          if (unit === 'UNIDADE_3') {
            if (n.isDesistenteUnid3) {
              return n.nota3 !== null ? `${n.nota3.toFixed(1).replace('.', ',')}\n(INF)` : 'DS'
            }
            return n.nota3 !== null ? n.nota3.toFixed(1).replace('.', ',') : '-'
          }

          const isActuallyDS = n.isDesistenteUnid1 && n.isDesistenteUnid2 && n.isDesistenteUnid3 && 
                               n.nota1 === null && n.nota2 === null && n.nota3 === null;

          if (isActuallyDS) return 'DS'
          
          return getStatusAbbr(n.status)
        })
      ]

      return row
    })

    // Criar tabela
    autoTable(doc, {
      startY: 55, // Mais espaço para a legenda
      margin: { top: 25 }, // Margem para cabeçalho nas próximas páginas
      head: [headers],
      body: tableData,
      theme: 'grid',
      headStyles: {
        fillColor: [255, 255, 255],
        textColor: [71, 85, 105],
        fontStyle: 'bold',
        halign: 'center',
        valign: 'middle',
        fontSize: 7,
        minCellHeight: 40,
        lineWidth: 0.1,
        lineColor: [226, 232, 240]
      },
      bodyStyles: {
        fontSize: 8,
        halign: 'center',
        valign: 'middle',
        textColor: [15, 23, 42],
        lineWidth: 0.1,
        lineColor: [226, 232, 240],
        minCellHeight: 10
      },
      columnStyles: {
        0: { halign: 'center', cellWidth: 10, fontStyle: 'bold' },
        1: { halign: 'left', cellWidth: 65, fontStyle: 'bold' }
      },
      didParseCell: function(data: any) {
        if (data.section === 'head' && data.column.index > 1) {
          data.cell.text = [] 
        }

        if (data.section === 'body' && data.column.index > 1) {
          const status = data.cell.raw
          
          // Forçar alinhamento vertical no meio
          data.cell.styles.valign = 'middle'

          const valStr = String(status).replace(',', '.')
          const isNumeric = !isNaN(parseFloat(valStr))
          const isRC = status === 'RC' || (isNumeric && parseFloat(valStr) < 5)
          const isAP = status === 'AP' || (isNumeric && parseFloat(valStr) >= 5)

          if (isRC) {
             // Destaque para Recuperação ou Nota < 5 (Fundo Laranja)
             data.cell.styles.fillColor = [249, 115, 22] // Orange 500
             data.cell.styles.textColor = [255, 255, 255]
             data.cell.styles.fontStyle = 'bold'
          } else if (isAP) {
             // Aprovados ou Nota >= 5
             data.cell.styles.fillColor = [255, 255, 255]
             data.cell.styles.textColor = [0, 0, 0]
             data.cell.styles.fontStyle = 'bold'
          } else if (['DS', 'DS_U', 'CO'].includes(status) || valStr.includes('(INF)')) {
             // Desistente ou Infrequente: Fundo Cinza
             data.cell.styles.fillColor = [148, 163, 184] // Slate 400
             data.cell.styles.textColor = [255, 255, 255]
             data.cell.styles.fontStyle = 'bold'
          } else {
             // Padrão Branco, Texto Preto
             data.cell.styles.fillColor = [255, 255, 255]
             data.cell.styles.textColor = [0, 0, 0]
          }
        }
      },
      didDrawCell: function(data: any) {
        if (data.section === 'head' && data.column.index > 1) {
          const doc = data.doc
          const text = String(data.cell.raw)
          
          doc.setTextColor(51, 65, 85)
          doc.setFontSize(7)
          doc.setFont('helvetica', 'bold')
          
          // Desenhar texto vertical (90 graus)
          doc.text(text, data.cell.x + data.cell.width / 2 + 1, data.cell.y + data.cell.height - 4, { angle: 90 })
        }
      }
    })
    
    // Adicionar Rodapé, Cabeçalho e Numeração de Páginas (Pós-processamento)
    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        const pageSize = doc.internal.pageSize;
        const pageHeight = pageSize.height ? pageSize.height : pageSize.getHeight();
        const pageWidth = pageSize.width ? pageSize.width : pageSize.getWidth();
        
        if (i === 1) {
            // Texto Superior Esquerdo
            doc.setFontSize(7);
            doc.setTextColor(100);
            doc.setFont('helvetica', 'bold');
            doc.text("CENTRO TERRITORIAL DE EDUCAÇÃO PROFISSIONAL DO LITORAL NORTE E AGRESTE BAIANO", 15, 15);

            // Linha "EduClass | Título"
            doc.setFontSize(16);
            doc.setTextColor(37, 99, 235); // Blue 600
            doc.text("Áxis", 15, 23);
           
            doc.setTextColor(200); // Gray
            doc.text("|", 45, 23);

            let tituloRelatorio = "Relatório de Status Geral";
            if (unit === 'UNIDADE_1') tituloRelatorio = "Relatório de Status - 1ª Unidade";
            else if (unit === 'UNIDADE_2') tituloRelatorio = "Relatório de Status - 2ª Unidade";
            else if (unit === 'UNIDADE_3') tituloRelatorio = "Relatório de Status - 3ª Unidade";

            doc.setTextColor(15, 23, 42); // Black
            doc.text(tituloRelatorio, 50, 23);

            // Subtítulo do Curso/Turno (Esquerda, abaixo do título)
            doc.setFontSize(10);
            doc.setTextColor(100);
            doc.setFont('helvetica', 'normal');
            const cursoInfo = `${turma.curso || ''} - ${turma.turno || ''}`;
            doc.text(cursoInfo, 15, 30);
             
            // Data de Impressão
            doc.setFontSize(8);
            doc.setTextColor(150);
            const dateStr = `Impresso em: ${new Date().toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR').substring(0,5)}`;
            doc.text(dateStr, 15, 35);

            // --- LADO DIREITO ---

            // Nome da Turma (Canto Direito Superior)
            doc.setFontSize(16);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(0);
            doc.text(turma.nome, pageWidth - 15, 15, { align: 'right' });

            // LEGENDA (Abaixo da Turma, alinhada à direita)
             const legendY = 25;
             const itemHeight = 6;
             
             const legendItems = [
                { code: 'AP', label: 'Aprovado', bg: [255, 255, 255], txt: [0, 0, 0], border: [200, 200, 200] },
                { code: 'RC', label: 'Recuperação', bg: [249, 115, 22], txt: [255, 255, 255], border: [249, 115, 22] }
             ];

             let currentX = pageWidth - 15;
             
             [...legendItems].reverse().forEach(item => {
                 doc.setFontSize(7);
                 doc.setFont('helvetica', 'bold');
                 
                 const labelWidth = doc.getTextWidth(item.label);
                 const codeWidth = 8;
                 const gap = 1.5;
                 const itemSpacing = 6;
                 
                 const totalItemWidth = codeWidth + gap + labelWidth;
                 const startX = currentX - totalItemWidth;
                 
                 // Caixinha
                 doc.setDrawColor(item.border[0], item.border[1], item.border[2]);
                 doc.setFillColor(item.bg[0], item.bg[1], item.bg[2]);
                 doc.roundedRect(startX, legendY, codeWidth, itemHeight, 1, 1, 'FD');
                 
                 // Texto Código
                 doc.setTextColor(item.txt[0], item.txt[1], item.txt[2]);
                 doc.text(item.code, startX + (codeWidth/2), legendY + 4, { align: 'center' });
                 
                 // Texto Label
                 doc.setTextColor(80);
                 doc.text(item.label, startX + codeWidth + gap, legendY + 4);
                 
                 currentX = startX - itemSpacing;
             });
             
             doc.setFontSize(7);
             doc.setTextColor(50);
             doc.setFont('helvetica', 'bold');
             doc.text("LEGENDA:", currentX - 10, legendY + 4);
       } else {
             // Cabeçalho Simplificado (Páginas Seguintes)
             doc.setFontSize(10);
             doc.setFont('helvetica', 'bold');
             doc.setTextColor(100);
             doc.text(turma.nome, pageWidth - 15, 15, { align: 'right' });
       }

        // Rodapé profissional
        doc.setDrawColor(226, 232, 240);
        doc.line(15, pageHeight - 15, pageWidth - 15, pageHeight - 15);

        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(37, 99, 235); // Blue 600
        doc.text('Áxis', 15, pageHeight - 10);
        
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(148, 163, 184);
        doc.text('Sistema de Gestão Acadêmica', 30, pageHeight - 10);
        
        doc.text(`Página ${i} de ${totalPages}`, pageWidth - 15, pageHeight - 10, { align: 'right' });
    }

    // Gerar PDF como buffer
    const pdfBuffer = Buffer.from(doc.output('arraybuffer'))

    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="relatorio-status-${unit}-${turma.nome.replace(/\s+/g, '-')}.pdf"`
      }
    })
  } catch (error) {
    console.error('Erro ao gerar PDF:', error)
    return NextResponse.json(
      { 
        message: 'Erro ao gerar PDF', 
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    )
  }
}
