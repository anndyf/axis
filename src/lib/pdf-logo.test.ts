import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import jsPDF from 'jspdf'
import { prisma } from '@/lib/prisma'
import { adicionarLogoNoPdf } from '@/lib/pdf-logo'

const PNG_1X1 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
const SUFIXO = `pdflogo-${Date.now()}`
const E: Record<string, string> = {}

beforeAll(async () => {
  E.png = (await prisma.escola.create({ data: { nome: 'P', slug: `${SUFIXO}-p`, logoUrl: PNG_1X1 } })).id
  E.url = (await prisma.escola.create({ data: { nome: 'U', slug: `${SUFIXO}-u`, logoUrl: 'https://exemplo.com/logo.png' } })).id
  E.ruim = (await prisma.escola.create({ data: { nome: 'R', slug: `${SUFIXO}-r`, logoUrl: 'data:image/png;base64,AAAA' } })).id
})
afterAll(async () => {
  await prisma.escola.deleteMany({ where: { slug: { startsWith: SUFIXO } } })
  await prisma.$disconnect()
})

describe('logo no PDF', () => {
  it('imagem enviada entra no PDF', async () => {
    const doc = new jsPDF()
    const add = vi.spyOn(doc, 'addImage')
    await adicionarLogoNoPdf(doc, E.png)
    expect(add).toHaveBeenCalledOnce()
  })
  it('endereço https não é buscado pelo servidor', async () => {
    const doc = new jsPDF()
    const add = vi.spyOn(doc, 'addImage')
    const f = vi.spyOn(globalThis, 'fetch')
    await adicionarLogoNoPdf(doc, E.url)
    expect(add).not.toHaveBeenCalled()
    expect(f).not.toHaveBeenCalled()
  })
  it('imagem corrompida não derruba o PDF', async () => {
    const doc = new jsPDF()
    await expect(adicionarLogoNoPdf(doc, E.ruim)).resolves.toBeUndefined()
    expect(doc.output().length).toBeGreaterThan(0)
  })
})
