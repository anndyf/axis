/**
 * Fase 3b - checagens migradas para can(user, 'recurso.acao').
 *
 * Cada permissão substitui uma checagem de antes (booleanos de User). Aqui
 * fica, para cada uma, a checagem antiga; o teste confere, nas 32
 * combinações de booleanos, que quem passa na permissão (lendo só papéis) é
 * exatamente quem passava na checagem antiga - ninguém ganha nem perde
 * acesso. Permissão nova sem linha aqui faz o teste falhar.
 *
 * Os casos por papel (Secretaria, Coordenação e os papéis de hoje) ficam no
 * fim, com o que cada grupo de telas libera.
 */
import { describe, it, expect } from 'vitest'
import { PERMISSOES, papeisDosBooleanos, combinacoesDosBooleanos as todasAsCombinacoes, type Booleanos, type Permissao } from './permissoes'
import { can, type RbacUser } from './rbac'

type B = Booleanos
const gestao = (b: B) => !!(b.isSuperuser || b.isDirecao)
const staff = (b: B) => !!(b.isStaff || b.isSuperuser || b.isDirecao)
const superuser = (b: B) => !!b.isSuperuser
const aee = (b: B) => !!(b.isDirecao || b.isSuperuser || b.isAEE)

/** Permissão → checagem antiga que ela substitui (e onde era usada). */
export const CHECAGEM_ANTIGA: Record<Permissao, (b: B) => boolean> = {
  'escola.gerir': gestao, // can('gestao')
  'escola.administrar': superuser, // can('superuser'); /dashboard/ui
  'equipe.acessar': staff, // can('staff')
  'aee.ler': aee, // can('aee'): menu AEE, visão Pedagogia
  'docencia.exercer': (b) => !!b.isStaff, // isStaff: criar plano, comunicados de professores
  'aee.atender': (b) => !!b.isAEE, // isAEE: menu reduzido
  'portal.acessar': (b) => !!b.isPortalUser, // isPortalUser
  'painel.gestao': gestao, // visão Administração do painel
  'painel.professor': staff, // visão Professor do painel
  'escopo.escola': gestao, // isSuperuser || isDirecao: todas as turmas/disciplinas
  'estudante.ler': gestao, // menu e tela de estudantes, busca rápida
  'estudante.buscar': staff, // GET api/estudantes
  'estudante.editar': gestao, // api/estudantes, estudantes/actions, sincronizar, upload-csv
  'pendencia.resolver': gestao, // admin/pendencias
  'ocorrencia.gerenciar': gestao, // api/ocorrencias, menu
  'aee.gerenciar': aee, // painel AEE completo, api/estudantes/[id]/aee
  'aee.ficha.editar': gestao, // aee/[matricula], atestar
  'turma.ler': staff, // menu Turmas
  'turma.gerenciar': gestao, // api/turmas, horário, disciplinas, cursos, unificar
  'turma.promover': superuser, // promover e clonar
  'disciplina.gerenciar': superuser, // menu e tela de disciplinas
  'matriz.gerenciar': gestao, // matriz curricular
  'frequencia.lancar': staff, // chamada e diário
  'frequencia.acompanhar': gestao, // painel de frequência
  'nota.lancar': staff, // api/notas, avaliações
  'nota.tela': (b) => !!(b.isStaff || b.isSuperuser), // menu Lançar notas / Recuperação, api/notas/recuperacao
  'resultado.ler': gestao,
  'indicador.ler': gestao, // professores pendentes
  'conselho.decidir': gestao,
  'relatorio.turma': (b) => staff(b) || aee(b), // PDFs da turma
  'plano.ler': staff,
  'plano.elaborar': (b) => !!b.isStaff,
  'plano.acompanhar': gestao,
  'questao.usar': staff,
  'questao.moderar': gestao,
  'prova.gerenciar': gestao,
  'simulado.ler': staff,
  'simulado.gerenciar': gestao,
  'laboratorio.gerenciar': gestao,
  'calendario.gerenciar': gestao,
  'financeiro.gerenciar': gestao,
  'mensagem.direcao.atender': gestao,
  'mensagem.suporte.atender': superuser,
  'comunicado.receber.equipe': (b) => !!(b.isStaff || b.isSuperuser),
  'usuario.gerenciar': superuser,
  'configuracao.editar': superuser,
  'identidade.editar': gestao,
  'auditoria.ler': superuser,
}

const daSessao = (b: B): RbacUser => ({ papeis: papeisDosBooleanos(b) })

describe('checagens migradas: permissão nova = checagem antiga', () => {
  it('toda permissão da lista tem a sua checagem antiga registrada', () => {
    expect(Object.keys(CHECAGEM_ANTIGA).sort()).toEqual([...PERMISSOES].sort())
  })

  for (const p of PERMISSOES) {
    it(p, () => {
      for (const b of todasAsCombinacoes()) expect(can(daSessao(b), p), JSON.stringify(b)).toBe(CHECAGEM_ANTIGA[p](b))
    })
  }
})

describe('casos por papel', () => {
  const papel = (...papeis: string[]): RbacUser => ({ papeis })
  const ADMIN = papel('ADMINISTRADOR', 'DIRECAO', 'PROFESSOR') // como o admin da CETEP
  const DIR = papel('DIRECAO', 'PROFESSOR')
  const PROF = papel('PROFESSOR')
  const AEE = papel('PROFESSOR', 'AEE')
  const SEC = papel('SECRETARIA')
  const COORD = papel('COORDENACAO')
  const EST = papel('ESTUDANTE')

  const tabela: [string, Permissao[], RbacUser[], RbacUser[]][] = [
    ['usuários e configurações', ['usuario.gerenciar', 'configuracao.editar', 'auditoria.ler', 'turma.promover', 'disciplina.gerenciar'], [ADMIN], [DIR, PROF, AEE, SEC, COORD, EST]],
    ['estudantes (cadastro)', ['estudante.ler', 'estudante.editar', 'pendencia.resolver'], [ADMIN, DIR, SEC], [PROF, AEE, EST]],
    ['estrutura (turmas, matriz, calendário)', ['turma.gerenciar', 'matriz.gerenciar', 'calendario.gerenciar'], [ADMIN, DIR, SEC], [PROF, AEE, COORD, EST]],
    ['acompanhamento pedagógico', ['frequencia.acompanhar', 'conselho.decidir', 'plano.acompanhar', 'questao.moderar', 'prova.gerenciar', 'simulado.gerenciar', 'ocorrencia.gerenciar', 'indicador.ler'], [ADMIN, DIR, COORD], [PROF, AEE, SEC, EST]],
    ['resultados', ['resultado.ler'], [ADMIN, DIR, SEC, COORD], [PROF, AEE, EST]],
    ['chamada e diário', ['frequencia.lancar'], [ADMIN, DIR, PROF, AEE], [SEC, COORD, EST]],
    ['planos, questões e simulados', ['plano.ler', 'questao.usar', 'simulado.ler'], [ADMIN, DIR, PROF, AEE, COORD], [SEC, EST]],
    ['lançar notas', ['nota.lancar'], [ADMIN, DIR, PROF, AEE], [SEC, COORD, EST]],
    ['AEE', ['aee.ler', 'aee.gerenciar'], [ADMIN, DIR, AEE], [PROF, SEC, COORD, EST]],
    ['escopo da escola inteira', ['escopo.escola'], [ADMIN, DIR, SEC, COORD], [PROF, AEE, EST]],
    ['portal', ['portal.acessar'], [EST], [ADMIN, DIR, PROF, AEE, SEC, COORD]],
  ]
  for (const [grupo, permissoes, passam, naoPassam] of tabela) {
    it(grupo, () => {
      for (const p of permissoes) {
        for (const u of passam) expect(can(u, p), `${p} ${u.papeis}`).toBe(true)
        for (const u of naoPassam) expect(can(u, p), `${p} ${u.papeis}`).toBe(false)
      }
    })
  }

  it('escopo do professor continua só nas próprias turmas (staffPuro)', () => {
    expect(can(PROF, 'staffPuro')).toBe(true)
    expect(can(AEE, 'staffPuro')).toBe(true)
    expect(can(DIR, 'staffPuro')).toBe(false)
    expect(can(papel('PROFESSOR', 'COORDENACAO'), 'escopo.escola')).toBe(true)
  })
})
