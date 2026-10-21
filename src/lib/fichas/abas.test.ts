import { describe, it, expect } from 'vitest'
import { abaAtiva } from '@/components/ui/Abas'
import { abasDaTurma, abasDoEstudante, abasDoUsuario } from './abas'

const nada = { horario: false, notas: false, resultados: false, frequencia: false, ocorrencias: false, historico: false }

describe('abas das fichas', () => {
  it('turma: só mostra as abas das telas que o usuário pode abrir', () => {
    expect(abasDaTurma('t1', nada).map((a) => a.rotulo)).toEqual(['Visão geral', 'Estudantes', 'Disciplinas'])
    expect(abasDaTurma('t1', { ...nada, horario: true, frequencia: true }).map((a) => a.href)).toEqual([
      '/dashboard/turmas/t1', '/dashboard/turmas/t1/estudantes', '/dashboard/turmas/t1/disciplinas',
      '/dashboard/turmas/t1/horario', '/dashboard/turmas/t1/frequencia',
    ])
  })

  it('estudante: AEE só com permissão e ficha; matrícula vai codificada no endereço', () => {
    const abas = abasDoEstudante('1TIM1 001', { editar: true, boletim: true, aee: false, historico: false })
    expect(abas.map((a) => a.rotulo)).toEqual(['Dados', 'Notas e frequência'])
    expect(abas[0].href).toBe('/dashboard/estudantes/1TIM1%20001')
    expect(abasDoEstudante('x', { editar: false, boletim: false, aee: true, historico: false }).at(-1)?.href).toBe('/dashboard/aee/x')
  })

  it('aba ativa: exata, subpágina e endereços extras', () => {
    const [dados, disciplinas] = abasDoUsuario('u1', { disciplinas: true, historico: false })
    expect(abaAtiva('/dashboard/usuarios/u1', dados)).toBe(true)
    expect(abaAtiva('/dashboard/usuarios/u1/editar', dados)).toBe(true)
    expect(abaAtiva('/dashboard/usuarios/u1/disciplinas', dados)).toBe(false)
    expect(abaAtiva('/dashboard/usuarios/u1/importar-horario', disciplinas)).toBe(true)
    expect(abaAtiva('/dashboard/turmas/t1/frequencia', { href: '/dashboard/turmas/t1', exato: true })).toBe(false)
  })
})
