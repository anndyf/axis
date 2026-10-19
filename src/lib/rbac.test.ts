import { describe, it, expect } from 'vitest'
import {
  aplicarFlags, can, dadosDePapeis, flagsDePapeis, normalizarPapeis, papeisDe, papeisDeFlags, papelPrincipal,
  type Acao, type FlagsDePapel, type RbacUser,
} from './rbac'

function user(overrides: Partial<FlagsDePapel> = {}): RbacUser {
  return { isSuperuser: false, isDirecao: false, isStaff: false, isAEE: false, ...overrides }
}

// Regras exatamente como eram antes dos papéis (campos is*), para provar que
// a migração não deu nem tirou acesso de ninguém.
const REGRAS_ANTIGAS: Record<'gestao' | 'staff' | 'superuser' | 'aee' | 'staffPuro', (u: FlagsDePapel) => boolean> = {
  gestao: (u) => u.isSuperuser || u.isDirecao,
  staff: (u) => u.isStaff || u.isSuperuser || u.isDirecao,
  superuser: (u) => u.isSuperuser,
  aee: (u) => u.isDirecao || u.isSuperuser || u.isAEE,
  staffPuro: (u) => u.isStaff && !u.isSuperuser && !u.isDirecao,
}

// As 16 combinações possíveis dos 4 campos
const TODAS_AS_FLAGS: FlagsDePapel[] = Array.from({ length: 16 }, (_, i) => ({
  isSuperuser: !!(i & 1), isDirecao: !!(i & 2), isStaff: !!(i & 4), isAEE: !!(i & 8),
}))

describe('equivalência com as regras antigas', () => {
  for (const [acao, regra] of Object.entries(REGRAS_ANTIGAS)) {
    it(`${acao}: mesmo resultado em todas as 16 combinações, por campos e por papéis`, () => {
      for (const flags of TODAS_AS_FLAGS) {
        const esperado = regra(flags)
        // sessão antiga (só campos is*)
        expect(can(flags, acao as Acao)).toBe(esperado)
        // sessão nova (papeis, sem campos)
        expect(can({ papeis: papeisDeFlags(flags) }, acao as Acao)).toBe(esperado)
      }
    })
  }

  it('campos -> papéis -> campos é ida e volta sem perda', () => {
    for (const flags of TODAS_AS_FLAGS) {
      expect(flagsDePapeis(papeisDeFlags(flags))).toEqual(flags)
    }
  })

  it('coordenação sozinha não ganha nenhuma ação antiga', () => {
    for (const acao of Object.keys(REGRAS_ANTIGAS)) {
      expect(can({ papeis: ['COORDENACAO'] }, acao as Acao)).toBe(false)
    }
  })
})

describe('permissões nomeadas', () => {
  const coord = { papeis: ['COORDENACAO'] }

  it('coordenação: leitura pedagógica, ocorrências, conselho e AEE só leitura', () => {
    expect(can(coord, 'verDadosPedagogicos')).toBe(true)
    expect(can(coord, 'verRelatorios')).toBe(true)
    expect(can(coord, 'gerirOcorrencias')).toBe(true)
    expect(can(coord, 'gerirConselho')).toBe(true)
    expect(can(coord, 'verAEE')).toBe(true)
    expect(can(coord, 'gerirAEE')).toBe(false)
  })

  it('coordenação não gere usuários nem configura a escola', () => {
    expect(can(coord, 'gerirUsuarios')).toBe(false)
    expect(can(coord, 'configurarEscola')).toBe(false)
  })

  it('professor não vê dados pedagógicos de todas as turmas', () => {
    expect(can({ papeis: ['PROFESSOR'] }, 'verDadosPedagogicos')).toBe(false)
  })

  it('admin e direção veem tudo que é pedagógico', () => {
    for (const p of ['ADMIN', 'DIRECAO'] as const) {
      expect(can({ papeis: [p] }, 'verDadosPedagogicos')).toBe(true)
      expect(can({ papeis: [p] }, 'gerirAEE')).toBe(true)
    }
  })

  it('sessão antiga de admin (sem papeis) mantém gerirUsuarios', () => {
    expect(can(user({ isSuperuser: true }), 'gerirUsuarios')).toBe(true)
  })
})

describe('papéis', () => {
  it('normalizarPapeis descarta inválidos e repetidos', () => {
    expect(normalizarPapeis(['AEE', 'X', 'AEE', 'ADMIN'])).toEqual(['ADMIN', 'AEE'])
    expect(normalizarPapeis('ADMIN')).toEqual([])
  })

  it('papeis na sessão tem prioridade sobre os campos', () => {
    expect(papeisDe({ papeis: ['COORDENACAO'], isSuperuser: false })).toEqual(['COORDENACAO'])
    expect(papeisDe(user({ isAEE: true }))).toEqual(['AEE'])
  })

  it('dadosDePapeis grava campos coerentes', () => {
    expect(dadosDePapeis(['COORDENACAO', 'PROFESSOR'])).toEqual({
      papeis: ['COORDENACAO', 'PROFESSOR'],
      isSuperuser: false, isDirecao: false, isStaff: true, isAEE: false,
    })
  })

  it('aplicarFlags (cliente antigo) preserva a coordenação e só mexe no que veio', () => {
    expect(aplicarFlags(['COORDENACAO', 'PROFESSOR'], { isAEE: true })).toEqual(['COORDENACAO', 'PROFESSOR', 'AEE'])
    expect(aplicarFlags(['COORDENACAO', 'PROFESSOR'], { isStaff: false })).toEqual(['COORDENACAO'])
    expect(aplicarFlags(['ADMIN'], {})).toEqual(['ADMIN'])
  })

  it('papelPrincipal segue a hierarquia', () => {
    expect(papelPrincipal({ papeis: ['PROFESSOR', 'DIRECAO'] })).toBe('DIRECAO')
    expect(papelPrincipal({ papeis: ['PROFESSOR', 'COORDENACAO'] })).toBe('COORDENACAO')
    expect(papelPrincipal({ papeis: ['PROFESSOR', 'AEE'] })).toBe('AEE')
    expect(papelPrincipal(user({ isSuperuser: true, isStaff: true }))).toBe('ADMIN')
    expect(papelPrincipal({ papeis: [] })).toBeNull()
  })
})
