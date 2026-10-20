import { describe, it, expect } from 'vitest'
import { estadosPeloCatalogo, estadoPermite, estadoParaUsuario, estadosDaAssinatura, itensAtivosPelosEstados, diferencasDeModulos, excecoesDosOverrides, type ItemCatalogo, type DadosAssinatura } from './modulos'
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

describe('estadosDaAssinatura', () => {
  const HOJE = '2026-10-20'
  const base = (extra: Partial<DadosAssinatura> = {}): DadosAssinatura => ({ situacao: 'ATIVA', fimTeste: null, modulosDoPlano: ['DIA', 'NOT'], excecoes: [], ...extra })

  it('plano: módulos incluídos ativos, demais inativos, Núcleo sempre ativo', () => {
    const e = estadosDaAssinatura(base({ modulosDoPlano: [] }), HOJE)
    expect(e.NUC).toBe('ATIVO')
    const e2 = estadosDaAssinatura(base(), HOJE)
    expect([e2.DIA, e2.NOT, e2.QST]).toEqual(['ATIVO', 'ATIVO', 'INATIVO'])
  })

  it('exceção sobrescreve o plano (add-on liga, exceção desliga)', () => {
    const e = estadosDaAssinatura(base({ excecoes: [
      { moduloId: 'QST', estado: 'ATIVO', fim: null, leituraAte: null },
      { moduloId: 'NOT', estado: 'INATIVO', fim: null, leituraAte: null },
    ] }), HOJE)
    expect(e.QST).toBe('ATIVO')
    expect(e.NOT).toBe('INATIVO')
  })

  it('add-on vencido: somente leitura até leituraAte, depois inativo', () => {
    const vencido = (leituraAte: string | null) => estadosDaAssinatura(base({ excecoes: [{ moduloId: 'PRV', estado: 'ATIVO', fim: '2026-10-01', leituraAte }] }), HOJE).PRV
    expect(vencido(null)).toBe('SOMENTE_LEITURA')
    expect(vencido('2026-11-01')).toBe('SOMENTE_LEITURA')
    expect(vencido('2026-10-19')).toBe('INATIVO')
  })

  it('exceção vencida de módulo do plano volta ao plano', () => {
    const e = estadosDaAssinatura(base({ excecoes: [{ moduloId: 'DIA', estado: 'INATIVO', fim: '2026-10-01', leituraAte: null }] }), HOJE)
    expect(e.DIA).toBe('ATIVO')
  })

  it('o dia do fim ainda vale', () => {
    const e = estadosDaAssinatura(base({ excecoes: [{ moduloId: 'PRV', estado: 'ATIVO', fim: HOJE, leituraAte: null }] }), HOJE)
    expect(e.PRV).toBe('ATIVO')
  })

  it('inadimplência e teste vencido deixam tudo em somente leitura (menos o Núcleo)', () => {
    for (const a of [base({ situacao: 'INADIMPLENTE' }), base({ situacao: 'TESTE', fimTeste: '2026-10-19' })]) {
      const e = estadosDaAssinatura(a, HOJE)
      expect([e.NUC, e.DIA, e.NOT, e.QST]).toEqual(['ATIVO', 'SOMENTE_LEITURA', 'SOMENTE_LEITURA', 'INATIVO'])
    }
  })

  it('teste sem data de fim ou no prazo, suspensa e cancelada não mexem nos módulos (o proxy cuida)', () => {
    for (const a of [base({ situacao: 'TESTE' }), base({ situacao: 'TESTE', fimTeste: HOJE }), base({ situacao: 'SUSPENSA' }), base({ situacao: 'CANCELADA' })]) {
      expect(estadosDaAssinatura(a, HOJE).DIA).toBe('ATIVO')
    }
  })
})

describe('itensAtivosPelosEstados', () => {
  it('somente leitura aparece; inativo some; plataforma sempre', () => {
    const estados = estadosDaAssinatura({ situacao: 'ATIVA', fimTeste: null, modulosDoPlano: ['DIA'], excecoes: [{ moduloId: 'PRV', estado: 'SOMENTE_LEITURA', fim: null, leituraAte: null }] }, '2026-10-20')
    const itens = itensAtivosPelosEstados(MODULOS, estados)
    expect(itens).toContain('chamada')
    expect(itens).toContain('provas')
    expect(itens).toContain('plataforma')
    expect(itens).not.toContain('notas')
    expect(itens).not.toContain('banco-questoes')
  })
})

describe('diferencasDeModulos', () => {
  it('lista itens e estados diferentes', () => {
    const e = estadosPeloCatalogo(MODULOS, [])
    expect(diferencasDeModulos({ itens: ['a'], estados: e }, { itens: ['a'], estados: e })).toEqual([])
    expect(diferencasDeModulos({ itens: ['a'], estados: e }, { itens: ['b'], estados: { ...e, QST: 'ATIVO' } })).toHaveLength(3)
  })
})

describe('excecoesDosOverrides', () => {
  const noPlano = (pro: boolean) => (id: string) => pro || !MODULOS.find((m) => m.id === id)?.planoMinimo
  it('banco de questões desligado vira QST INATIVO', () => {
    expect(excecoesDosOverrides(MODULOS, [{ moduloId: 'banco-questoes', ativo: false }], noPlano(true)).excecoes).toEqual([{ moduloId: 'QST', estado: 'INATIVO' }])
  })
  it('provas ligado e simulados pelo plano BASICO (desligado) = divergente, fica ATIVO e avisa', () => {
    const r = excecoesDosOverrides(MODULOS, [{ moduloId: 'provas', ativo: true }], noPlano(false))
    expect(r.excecoes).toEqual([{ moduloId: 'PRV', estado: 'ATIVO' }])
    expect(r.avisos[0]).toMatch(/divergentes/)
  })
  it('override sem efeito ou desconhecido é ignorado com aviso', () => {
    const r = excecoesDosOverrides(MODULOS, [{ moduloId: 'chamada', ativo: false }, { moduloId: 'xyz', ativo: true }], noPlano(true))
    expect(r.excecoes).toEqual([])
    expect(r.avisos).toHaveLength(2)
  })
})
