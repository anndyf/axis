import { describe, it, expect } from 'vitest'
import { ajudaDaRota } from './ajuda'

describe('ajuda contextual', () => {
  it('escolhe a ajuda mais específica para o endereço', () => {
    expect(ajudaDaRota('/dashboard')?.titulo).toBe('Painel')
    expect(ajudaDaRota('/dashboard/turmas')?.titulo).toBe('Turmas')
    expect(ajudaDaRota('/dashboard/turmas/abc123/estudantes')?.titulo).toBe('Ficha da turma')
    expect(ajudaDaRota('/dashboard/notas/lancar/abc')?.titulo).toBe('Lançamento de notas')
    expect(ajudaDaRota('/dashboard/chamada/fazer')?.titulo).toBe('Fazer chamada')
  })

  it('textos sem informalidade: frases terminadas e passos curtos', () => {
    for (const r of ['/dashboard/turmas', '/dashboard/ocorrencias', '/dashboard/frequencia']) {
      const a = ajudaDaRota(r)!
      expect(a.serve.endsWith('.')).toBe(true)
      expect(a.passos.every((p) => p.endsWith('.') && p.length < 200)).toBe(true)
    }
  })
})
