import { describe, it, expect } from 'vitest'
import {
  PERMISSOES,
  PAPEIS_SISTEMA,
  CODIGOS_PAPEL,
  PAPEIS_ATRIBUIVEIS,
  papeisDosBooleanos,
  booleanosDosPapeis,
  permissoesDosPapeis,
  normalizarPapeis,
  rotuloDoPapelPrincipal,
  combinacoesDosBooleanos,
  type Booleanos,
} from './permissoes'
import { can, canLegado, ACOES_ANTIGAS } from './rbac'

const todasAsCombinacoes = combinacoesDosBooleanos

/** Só os papéis (sem booleanos): obriga can() a decidir pelo modelo novo. */
const soPapeis = (b: Booleanos) => ({ papeis: papeisDosBooleanos(b) })
const soPermissoes = (b: Booleanos) => ({ permissoes: [...permissoesDosPapeis(papeisDosBooleanos(b))] })

describe('lista de permissões e papéis de sistema', () => {
  it('formato recurso.acao, sem repetidas', () => {
    for (const p of PERMISSOES) expect(p).toMatch(/^[a-z]+(\.[a-z]+)+$/)
    expect(new Set(PERMISSOES).size).toBe(PERMISSOES.length)
  })

  it('papéis só usam permissões da lista, sem repetir', () => {
    for (const c of CODIGOS_PAPEL) {
      const ps = PAPEIS_SISTEMA[c].permissoes
      for (const p of ps) expect(PERMISSOES).toContain(p)
      expect(new Set(ps).size, c).toBe(ps.length)
    }
  })

  it('os 7 papéis pedidos existem (mais o Administrador da escola, que é o isSuperuser)', () => {
    for (const c of ['DIRECAO', 'SECRETARIA', 'COORDENACAO', 'PROFESSOR', 'AEE', 'ESTUDANTE', 'RESPONSAVEL', 'ADMINISTRADOR']) {
      expect(CODIGOS_PAPEL).toContain(c)
    }
  })

  it('editor oferece os papéis da equipe; Estudante e Responsável não', () => {
    expect(PAPEIS_ATRIBUIVEIS).toEqual(['ADMINISTRADOR', 'DIRECAO', 'SECRETARIA', 'COORDENACAO', 'PROFESSOR', 'AEE'])
  })
})

describe('conversão booleanos ⇄ papéis (tabela 2.5.3)', () => {
  it('um booleano = um papel', () => {
    expect(papeisDosBooleanos({ isSuperuser: true, isDirecao: true, isStaff: true })).toEqual(['ADMINISTRADOR', 'DIRECAO', 'PROFESSOR'])
    expect(papeisDosBooleanos({ isStaff: true, isAEE: true })).toEqual(['PROFESSOR', 'AEE'])
    expect(papeisDosBooleanos({ isPortalUser: true })).toEqual(['ESTUDANTE'])
    expect(papeisDosBooleanos({})).toEqual([])
  })

  it('ida e volta devolve os mesmos booleanos em todas as combinações', () => {
    for (const b of todasAsCombinacoes()) expect(booleanosDosPapeis(papeisDosBooleanos(b))).toEqual(b)
  })

  it('papéis novos não ligam booleano nenhum', () => {
    expect(booleanosDosPapeis(['SECRETARIA', 'COORDENACAO', 'RESPONSAVEL'])).toEqual({
      isSuperuser: false, isDirecao: false, isStaff: false, isAEE: false, isPortalUser: false,
    })
  })

  it('normalizarPapeis ordena, tira repetidos e desconhecidos', () => {
    expect(normalizarPapeis(['PROFESSOR', 'X', 'DIRECAO', 'PROFESSOR'])).toEqual(['DIRECAO', 'PROFESSOR'])
  })

  it('rótulo do papel principal segue o menu de hoje', () => {
    expect(rotuloDoPapelPrincipal(['ADMINISTRADOR', 'DIRECAO'])).toBe('Administrador')
    expect(rotuloDoPapelPrincipal(['PROFESSOR', 'AEE'])).toBe('Especialista AEE')
    expect(rotuloDoPapelPrincipal(['DIRECAO', 'PROFESSOR'])).toBe('Direção')
    expect(rotuloDoPapelPrincipal(['PROFESSOR'])).toBe('Professor')
    expect(rotuloDoPapelPrincipal(['SECRETARIA'])).toBe('Secretaria')
    expect(rotuloDoPapelPrincipal([])).toBe('Gestão escolar')
  })
})

describe('equivalência: can novo (papéis) = can antigo (booleanos)', () => {
  it('as 5 ações antigas, nas 32 combinações, lendo só papéis ou só permissões', () => {
    for (const b of todasAsCombinacoes()) {
      for (const acao of ACOES_ANTIGAS) {
        const antigo = canLegado(b, acao)
        expect(can(soPapeis(b), acao), `${acao} ${JSON.stringify(b)} (papéis)`).toBe(antigo)
        expect(can(soPermissoes(b), acao), `${acao} ${JSON.stringify(b)} (permissões)`).toBe(antigo)
        // sessão antiga, só com booleanos: cai na tabela 2.5.3
        expect(can(b, acao), `${acao} ${JSON.stringify(b)} (booleanos)`).toBe(antigo)
      }
    }
  })

  it('permissão desconhecida gravada no banco é ignorada', () => {
    expect(can({ permissoes: ['escola.gerir', 'tudo.pode'] }, 'gestao')).toBe(true)
    expect(can({ permissoes: ['tudo.pode'] } as never, 'tudo.pode' as never)).toBe(false)
  })

  it('sem usuário, nada', () => {
    expect(can(null, 'gestao')).toBe(false)
    expect(can(undefined, 'estudante.ler')).toBe(false)
  })
})

describe('papéis novos (Secretaria e Coordenação) — tabela 2.5.1', () => {
  const sec = { papeis: ['SECRETARIA'] }
  const coord = { papeis: ['COORDENACAO'] }

  it('não herdam os atalhos antigos', () => {
    for (const acao of ACOES_ANTIGAS) {
      expect(can(sec, acao), acao).toBe(false)
      expect(can(coord, acao), acao).toBe(false)
    }
  })

  it('Secretaria: cadastro, turmas e matriz; sem notas, usuários ou configurações', () => {
    for (const p of ['estudante.ler', 'estudante.editar', 'pendencia.resolver', 'turma.gerenciar', 'matriz.gerenciar', 'escopo.escola'] as const) expect(can(sec, p), p).toBe(true)
    for (const p of ['nota.lancar', 'nota.tela', 'usuario.gerenciar', 'configuracao.editar', 'conselho.decidir', 'aee.gerenciar'] as const) expect(can(sec, p), p).toBe(false)
  })

  it('Coordenação: diário, frequência, planos, resultados, conselho e questões; sem cadastro nem notas', () => {
    for (const p of ['frequencia.acompanhar', 'plano.acompanhar', 'resultado.ler', 'conselho.decidir', 'questao.moderar', 'estudante.ler'] as const) expect(can(coord, p), p).toBe(true)
    for (const p of ['frequencia.lancar', 'estudante.editar', 'turma.gerenciar', 'nota.lancar', 'nota.tela', 'usuario.gerenciar', 'configuracao.editar'] as const) expect(can(coord, p), p).toBe(false)
  })
})

describe('cadeado de unidade: unidade.encerrar', () => {
  it('só Direção e Coordenação encerram e reabrem unidades', () => {
    const com = (Object.keys(PAPEIS_SISTEMA) as (keyof typeof PAPEIS_SISTEMA)[]).filter((c) => PAPEIS_SISTEMA[c].permissoes.includes('unidade.encerrar'))
    expect(com.sort()).toEqual(['COORDENACAO', 'DIRECAO'])
    // Administrador da escola NÃO recebe (decisão da dona do produto)
    expect(can({ papeis: ['ADMINISTRADOR'] }, 'unidade.encerrar')).toBe(false)
    for (const c of ['PROFESSOR', 'SECRETARIA', 'AEE', 'ESTUDANTE']) expect(can({ papeis: [c] }, 'unidade.encerrar'), c).toBe(false)
    // sessão antiga só com booleanos: direção sim, superuser e staff não
    expect(can({ isDirecao: true }, 'unidade.encerrar')).toBe(true)
    expect(can({ isSuperuser: true, isStaff: true }, 'unidade.encerrar')).toBe(false)
  })
})
