import { describe, it, expect } from 'vitest'
import { estadosPeloCatalogo, estadoPermite, estadoParaUsuario, type ItemCatalogo } from './modulos'
import { MODULOS } from '@/lib/modules'
import { MODULO_IDS } from '@/lib/modulos/tipos'

const professor = { isSuperuser: false, isDirecao: false, isStaff: true }
const direcao = { isSuperuser: false, isDirecao: true, isStaff: true }

describe('estadosPeloCatalogo', () => {
  const catalogo: ItemCatalogo[] = [
    { id: 'chamada', moduloId: 'DIA' },
    { id: 'provas', moduloId: 'PRV', planoMinimo: 'PRO' },
    { id: 'simulados', moduloId: 'PRV', planoMinimo: 'PRO' },
    { id: 'banco-questoes', moduloId: 'QST', planoMinimo: 'PRO' },
  ]

  it('item sem plano mínimo fica sempre ativo, mesmo fora da lista', () => {
    expect(estadosPeloCatalogo(catalogo, []).DIA).toBe('ATIVO')
  })

  it('módulo pago sem nenhum item ativo fica inativo', () => {
    const e = estadosPeloCatalogo(catalogo, ['chamada'])
    expect(e.PRV).toBe('INATIVO')
    expect(e.QST).toBe('INATIVO')
  })

  it('basta um item do módulo ativo (conservador)', () => {
    expect(estadosPeloCatalogo(catalogo, ['simulados']).PRV).toBe('ATIVO')
  })

  it('módulo sem item no catálogo e o Núcleo ficam ativos', () => {
    const e = estadosPeloCatalogo(catalogo, [])
    expect(e.NUC).toBe('ATIVO')
    expect(e.DOC).toBe('ATIVO')
  })

  it('catálogo real: tudo ativo com todos os itens ativos (escola ENTERPRISE)', () => {
    const e = estadosPeloCatalogo(MODULOS, MODULOS.map((m) => m.id))
    for (const m of MODULO_IDS) expect(e[m], m).toBe('ATIVO')
  })

  it('catálogo real: escola BASICO perde só QST, PRV e FIN', () => {
    const e = estadosPeloCatalogo(MODULOS, MODULOS.filter((m) => !m.planoMinimo).map((m) => m.id))
    const inativos = MODULO_IDS.filter((m) => e[m] === 'INATIVO')
    expect(inativos.sort()).toEqual(['FIN', 'PRV', 'QST'])
  })
})

describe('estadoPermite', () => {
  it('ativo permite tudo; somente leitura só lê; inativo nada', () => {
    expect(estadoPermite('ATIVO', 'escrita')).toBe(true)
    expect(estadoPermite('SOMENTE_LEITURA', 'leitura')).toBe(true)
    expect(estadoPermite('SOMENTE_LEITURA', 'escrita')).toBe(false)
    expect(estadoPermite('INATIVO', 'leitura')).toBe(false)
  })
})

describe('estadoParaUsuario', () => {
  it('banco de questões desligado vale para professor, não para a gestão', () => {
    expect(estadoParaUsuario('QST', 'INATIVO', professor)).toBe('INATIVO')
    expect(estadoParaUsuario('QST', 'INATIVO', direcao)).toBe('ATIVO')
  })
  it('outros módulos valem para todos', () => {
    expect(estadoParaUsuario('PRV', 'INATIVO', direcao)).toBe('INATIVO')
  })
})
