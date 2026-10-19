import { describe, it, expect } from 'vitest'
import { itemAtivo, navegacaoMobile, perfilNavegacao } from './navegacao-mobile'

const u = (extra: Record<string, boolean>) => ({ isSuperuser: false, isDirecao: false, isStaff: false, isAEE: false, ...extra })
const TODOS = ['simulados', 'banco-questoes', 'provas', 'financeiro']
const rotulos = (n: ReturnType<typeof navegacaoMobile>) => n.barra.map((i) => i.rotulo)
const ids = (n: ReturnType<typeof navegacaoMobile>) => n.mais.map((i) => i.id)

describe('navegação mobile - perfil', () => {
  it('sai das visões do painel', () => {
    expect(perfilNavegacao(u({ isStaff: true }))).toBe('professor')
    expect(perfilNavegacao(u({ isDirecao: true }))).toBe('gestao')
    expect(perfilNavegacao(u({ isSuperuser: true }))).toBe('gestao')
    expect(perfilNavegacao(u({ isAEE: true }))).toBe('aee')
    expect(perfilNavegacao({ ...u({}), isPortalUser: true })).toBe('portal')
    expect(perfilNavegacao(u({}))).toBe('outro')
  })
})

describe('navegação mobile - barra por perfil', () => {
  it('professor: Início · Chamada · Notas · Diário', () => {
    const n = navegacaoMobile(u({ isStaff: true }), TODOS)
    expect(rotulos(n)).toEqual(['Início', 'Chamada', 'Notas', 'Diário'])
    expect(n.barra.find((i) => i.id === 'diario')?.href).toBe('/dashboard/chamada/diario')
    // nada da barra repete no "Mais"; o Mais tem só o que o professor abre
    expect(ids(n)).not.toContain('chamada')
    expect(ids(n)).not.toContain('notas')
    expect(ids(n)).toContain('mensagens')
    // o Mais é o menu lateral menos a barra: o professor não vê módulos da gestão
    for (const proibido of ['frequencia', 'resultados', 'usuarios', 'configuracoes', 'estudantes']) expect(ids(n)).not.toContain(proibido)
  })

  it('gestão: Início · Turmas · Frequência · Resultados', () => {
    expect(rotulos(navegacaoMobile(u({ isDirecao: true }), TODOS))).toEqual(['Início', 'Turmas', 'Frequência', 'Resultados'])
    const admin = navegacaoMobile(u({ isSuperuser: true }), TODOS)
    expect(rotulos(admin)).toEqual(['Início', 'Turmas', 'Frequência', 'Resultados'])
    expect(ids(admin)).toEqual(expect.arrayContaining(['usuarios', 'configuracoes', 'chamada']))
  })

  it('AEE: Início · Estudantes (atendimento) · Mensagens; nada de frequência ou notas', () => {
    const n = navegacaoMobile(u({ isAEE: true }), TODOS)
    expect(rotulos(n)).toEqual(['Início', 'Estudantes', 'Mensagens'])
    expect(n.barra[1].href).toBe('/dashboard/aee')
    for (const proibido of ['frequencia', 'notas', 'chamada', 'estudantes', 'resultados']) expect(ids(n)).not.toContain(proibido)
  })

  it('portal: Início · Boletim · Frequência · Horário, sem módulos do painel', () => {
    const n = navegacaoMobile({ ...u({}), isPortalUser: true }, TODOS)
    expect(rotulos(n)).toEqual(['Início', 'Boletim', 'Frequência', 'Horário'])
    expect(n.mais).toEqual([])
  })

  it('módulos fora do plano somem do "Mais"', () => {
    const comPlano = navegacaoMobile(u({ isStaff: true }), TODOS)
    const semPlano = navegacaoMobile(u({ isStaff: true }), [])
    expect(ids(comPlano)).toEqual(expect.arrayContaining(['simulados', 'banco-questoes']))
    expect(ids(semPlano)).not.toContain('simulados')
    expect(ids(semPlano)).not.toContain('banco-questoes')
    expect(rotulos(semPlano)).toEqual(['Início', 'Chamada', 'Notas', 'Diário'])
  })

  it('sem papel: só o que todos abrem', () => {
    const n = navegacaoMobile(u({}), [])
    expect(rotulos(n)).toEqual(['Início', 'Mensagens'])
    expect(ids(n)).toEqual(['laboratorios'])
  })
})

describe('navegação mobile - item ativo', () => {
  const n = navegacaoMobile(u({ isStaff: true }), [])
  const itens = [...n.barra, ...n.mais]
  it('prefixo mais longo vence; Início só na rota exata', () => {
    expect(itemAtivo('/dashboard', itens)).toBe('dashboard')
    expect(itemAtivo('/dashboard/chamada', itens)).toBe('chamada')
    expect(itemAtivo('/dashboard/chamada/fazer', itens)).toBe('chamada')
    expect(itemAtivo('/dashboard/chamada/diario', itens)).toBe('diario')
    expect(itemAtivo('/dashboard/notas/lancar/x', itens)).toBe('notas')
    expect(itemAtivo('/dashboard/notas/recuperacao', itens)).toBe('notas-recuperacao')
    expect(itemAtivo('/dashboard/perfil', itens)).toBeNull()
    expect(itemAtivo('/dashboard/chamadas', itens)).toBeNull()
  })
})
