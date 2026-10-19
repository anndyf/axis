import { describe, it, expect } from 'vitest'
import { combina, normalizarBusca } from './busca'
import { modulosVisiveis } from '@/lib/modules'

describe('busca da paleta', () => {
  it('ignora acento e caixa', () => {
    expect(normalizarBusca('  Frequência ')).toBe('frequencia')
    expect(combina('Frequência', 'FREQUENCIA')).toBe(true)
    expect(combina('Conselho de Classe', 'classe cons')).toBe(true)
    expect(combina('Conselho de Classe', 'notas')).toBe(false)
    expect(combina('Qualquer coisa', '')).toBe(true)
  })
})

describe('modulosVisiveis', () => {
  const professor = { isSuperuser: false, isDirecao: false, isStaff: true }
  const direcao = { isSuperuser: false, isDirecao: true, isStaff: false }
  const ids = (u: Parameters<typeof modulosVisiveis>[0], ativos: string[] = []) => modulosVisiveis(u, ativos).map((m) => m.id)

  it('respeita a permissão do papel', () => {
    expect(ids(professor)).toContain('chamada')
    expect(ids(professor)).not.toContain('estudantes')
    expect(ids(professor)).not.toContain('usuarios')
    expect(ids(direcao)).toContain('estudantes')
    expect(ids(direcao)).not.toContain('usuarios')
  })

  it('módulo de plano só aparece se estiver ativo na escola', () => {
    expect(ids(direcao)).not.toContain('provas')
    expect(ids(direcao, ['provas'])).toContain('provas')
  })
})
