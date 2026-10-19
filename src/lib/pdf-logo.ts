import type jsPDF from 'jspdf'
import { prisma } from '@/lib/prisma'
import { logoParaPdf } from '@/lib/services/identidade'

/**
 * Logo da escola no canto superior esquerdo do PDF. Só imagem enviada pela
 * tela de identidade (data URL PNG/JPEG): nada é buscado na rede pelo
 * servidor. Sem logo ou com erro na imagem, o PDF sai como antes.
 */
export async function adicionarLogoNoPdf(doc: jsPDF, escolaId: string) {
  const escola = await prisma.escola.findUnique({ where: { id: escolaId }, select: { logoUrl: true } })
  const logo = logoParaPdf(escola?.logoUrl)
  if (!logo) return
  try {
    const { width, height } = doc.getImageProperties(logo.dados)
    const altura = 14
    const largura = Math.min(40, (width / height) * altura)
    doc.addImage(logo.dados, logo.formato, 14, 9, largura, (largura / (width / height)))
  } catch {
    // imagem corrompida: segue sem logo
  }
}
