import { describe, it, expect } from 'vitest'
import { cepValido, cpfValido, erroDeData, mascaraCEP, mascaraCPF, mascaraTelefone, telefoneValido } from './mascaras'

describe('máscaras e validação no navegador', () => {
  it('telefone: formata fixo e celular e exige DDD', () => {
    expect(mascaraTelefone('71987654321')).toBe('(71) 98765-4321')
    expect(mascaraTelefone('7132345678')).toBe('(71) 3234-5678')
    expect(mascaraTelefone('71')).toBe('(71')
    expect(telefoneValido('(71) 98765-4321')).toBe(true)
    expect(telefoneValido('')).toBe(true)
    expect(telefoneValido('98765-4321')).toBe(false)
    expect(telefoneValido('(01) 98765-4321')).toBe(false)
  })

  it('CPF: máscara e dígitos verificadores', () => {
    expect(mascaraCPF('52998224725')).toBe('529.982.247-25')
    expect(cpfValido('529.982.247-25')).toBe(true)
    expect(cpfValido('529.982.247-24')).toBe(false)
    expect(cpfValido('111.111.111-11')).toBe(false)
    expect(cpfValido('123')).toBe(false)
  })

  it('CEP', () => {
    expect(mascaraCEP('40000000')).toBe('40000-000')
    expect(cepValido('40000-000')).toBe(true)
    expect(cepValido('4000')).toBe(false)
  })

  it('datas: inexistente e fora do intervalo', () => {
    expect(erroDeData('2026-02-30')).toMatch(/válida/)
    expect(erroDeData('2026-02-28')).toBeNull()
    expect(erroDeData('2026-03-01', { max: '2026-02-28' })).toMatch(/anterior a 28\/02\/2026/)
    expect(erroDeData('2026-01-01', { min: '2026-02-01', rotuloMin: 'à data de início' })).toBe('A data deve ser igual ou posterior à data de início.')
    expect(erroDeData('')).toBeNull()
  })
})
