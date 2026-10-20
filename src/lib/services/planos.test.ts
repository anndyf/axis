import { describe, it, expect } from 'vitest'
import { planosIniciais, situacaoDoStatus, statusDaSituacao, validarMudancaAssinatura, validarModuloAssinatura, itensLegadosDoModulo } from './planos'

describe('planosIniciais', () => {
  it('três planos com limites de hoje e Básico sem os módulos pagos', () => {
    const p = planosIniciais()
    expect(p.map((x) => [x.codigo, x.limiteUsuarios])).toEqual([['BASICO', 15], ['PRO', 50], ['ENTERPRISE', null]])
    expect(p[0].modulos).not.toEqual(expect.arrayContaining(['QST']))
    expect(p[0].modulos).toEqual(expect.arrayContaining(['NUC', 'DIA', 'NOT', 'RES', 'AEE']))
    expect(p[2].modulos).toHaveLength(14)
  })
})

describe('situação × status', () => {
  it('ida e volta', () => {
    expect(situacaoDoStatus('TRIAL')).toBe('TESTE')
    expect(statusDaSituacao('TESTE')).toBe('TRIAL')
    expect(statusDaSituacao('INADIMPLENTE')).toBe('ATIVA')
    for (const s of ['ATIVA', 'SUSPENSA', 'CANCELADA'] as const) expect(statusDaSituacao(situacaoDoStatus(s))).toBe(s)
  })
})

describe('itensLegadosDoModulo', () => {
  it('PRV = provas e simulados; DIA não tem item pago', () => {
    expect(itensLegadosDoModulo('PRV').sort()).toEqual(['provas', 'simulados'])
    expect(itensLegadosDoModulo('DIA')).toEqual([])
  })
})

describe('validarMudancaAssinatura', () => {
  it('aceita campos válidos e ignora desconhecidos', () => {
    expect(validarMudancaAssinatura({ situacao: 'INADIMPLENTE', fimTeste: '2026-12-31', limiteUsuarios: null, escolaId: 'x' })).toEqual({ ok: true, mudanca: { situacao: 'INADIMPLENTE', fimTeste: '2026-12-31', limiteUsuarios: null } })
  })
  it('recusa valores inválidos e corpo vazio', () => {
    expect(validarMudancaAssinatura({ situacao: 'X' }).ok).toBe(false)
    expect(validarMudancaAssinatura({ fimTeste: '31/12/2026' }).ok).toBe(false)
    expect(validarMudancaAssinatura({ limiteUsuarios: -1 }).ok).toBe(false)
    expect(validarMudancaAssinatura({}).ok).toBe(false)
  })
})

describe('validarModuloAssinatura', () => {
  it('estado null volta ao plano; Núcleo não pode ser mexido', () => {
    expect(validarModuloAssinatura({ moduloId: 'PRV', estado: null })).toEqual({ ok: true, moduloId: 'PRV', alvo: null })
    expect(validarModuloAssinatura({ moduloId: 'NUC', estado: 'INATIVO' }).ok).toBe(false)
  })
  it('origem padrão EXCECAO; datas conferidas', () => {
    expect(validarModuloAssinatura({ moduloId: 'QST', estado: 'SOMENTE_LEITURA' })).toEqual({ ok: true, moduloId: 'QST', alvo: { estado: 'SOMENTE_LEITURA', origem: 'EXCECAO', fim: null, leituraAte: null } })
    expect(validarModuloAssinatura({ moduloId: 'QST', estado: 'ATIVO', fim: 'amanhã' }).ok).toBe(false)
  })
})
