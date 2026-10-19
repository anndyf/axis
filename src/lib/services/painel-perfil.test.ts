import { describe, it, expect } from 'vitest'
import { perfisDoUsuario, perfilEfetivo, modeloValido } from './painel-perfil'

const u = (extra: Record<string, boolean>) => ({ isSuperuser: false, isDirecao: false, isStaff: false, isAEE: false, ...extra })

describe('perfis do painel', () => {
  it('cada papel tem as visões que as permissões dos módulos permitem', () => {
    expect(perfisDoUsuario(u({ isStaff: true }))).toEqual(['professor'])
    expect(perfisDoUsuario(u({ isAEE: true }))).toEqual(['pedagogia'])
    expect(perfisDoUsuario(u({ isDirecao: true }))).toEqual(['administracao', 'pedagogia'])
    expect(perfisDoUsuario(u({ isSuperuser: true, isStaff: true }))).toEqual(['administracao', 'pedagogia', 'professor'])
    // AEE não entra em gestão nem diário, mesmo com outra marca
    expect(perfisDoUsuario(u({ isAEE: true, isDirecao: true, isStaff: true }))).toEqual(['pedagogia'])
    expect(perfisDoUsuario(u({}))).toEqual([])
  })

  it('vê a visão mais alta; a pedida só vale se for do usuário', () => {
    const diretor = u({ isDirecao: true, isStaff: true })
    expect(perfilEfetivo(diretor)).toBe('administracao')
    expect(perfilEfetivo(diretor, 'professor')).toBe('professor')
    expect(perfilEfetivo(u({ isStaff: true }), 'administracao')).toBe('professor')
    expect(perfilEfetivo(u({ isStaff: true }), 'qualquer')).toBe('professor')
    expect(perfilEfetivo(u({}), 'professor')).toBeNull()
  })

  it('modelo padrão é o A', () => {
    expect(modeloValido('b')).toBe('b')
    expect(modeloValido('c')).toBe('a')
    expect(modeloValido(null)).toBe('a')
  })
})
