import { describe, it, expect } from 'vitest'
import { visoesDoUsuario, visaoEfetiva } from './painel-visoes'

const u = (extra: Record<string, boolean>) => ({ isSuperuser: false, isDirecao: false, isStaff: false, isAEE: false, ...extra })

describe('visões do painel', () => {
  it('cada papel tem as visões que can() libera', () => {
    expect(visoesDoUsuario(u({ isStaff: true }))).toEqual(['professor'])
    expect(visoesDoUsuario(u({ isAEE: true }))).toEqual(['pedagogia'])
    expect(visoesDoUsuario(u({ isDirecao: true }))).toEqual(['administracao', 'pedagogia', 'professor'])
    expect(visoesDoUsuario(u({ isSuperuser: true }))).toEqual(['administracao', 'pedagogia', 'professor'])
    expect(visoesDoUsuario(u({}))).toEqual([])
  })

  it('vê a visão mais alta; a pedida só vale se for do usuário', () => {
    const diretor = u({ isDirecao: true })
    expect(visaoEfetiva(diretor)).toBe('administracao')
    expect(visaoEfetiva(diretor, 'pedagogia')).toBe('pedagogia')
    expect(visaoEfetiva(u({ isStaff: true }), 'administracao')).toBe('professor')
    expect(visaoEfetiva(u({ isAEE: true }), 'professor')).toBe('pedagogia')
    expect(visaoEfetiva(u({ isStaff: true }), 'qualquer')).toBe('professor')
    expect(visaoEfetiva(u({}), 'professor')).toBeNull()
  })
})
