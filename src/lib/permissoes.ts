/**
 * Papéis e permissões (domínio-alvo 2.5; roteiro, fase 3).
 *
 * - PERMISSOES: lista FECHADA, no formato `recurso.acao`. O código só
 *   reconhece o que está aqui; permissão gravada no banco que não esteja na
 *   lista é ignorada.
 * - PAPEIS_SISTEMA: os papéis que vêm prontos. A escola atribui um ou mais
 *   a cada conta (VinculoPapel). O conteúdo de cada papel é gravado em
 *   PapelPermissao pelo backfill (prisma/backfill/fase-3a.ts) e conferido
 *   contra esta tabela.
 * - Conversão booleanos ⇄ papéis (tabela 2.5.3): enquanto os booleanos de
 *   User existirem (até a fase 3c), cada booleano vira um papel e cada papel
 *   "antigo" volta a ser o seu booleano. Papéis sem booleano (Secretaria,
 *   Coordenação, Responsável) não ligam nenhum.
 *
 * Regra de ouro da transição: para quem já existe, os papéis dão EXATAMENTE
 * o acesso que os booleanos davam. Cada permissão de "legado" é concedida a
 * um conjunto de papéis antigos igual ao da checagem que ela substitui
 * (testado em permissoes.test.ts para todas as combinações de booleanos).
 */

export const PERMISSOES = [
  // Atalhos das ações antigas de can() (rbac.ts). Não use em código novo.
  'escola.gerir', // 'gestao': direção e administrador
  'escola.administrar', // 'superuser': só o administrador
  'equipe.acessar', // 'staff': professor, direção e administrador
  'aee.ler', // 'aee': AEE, direção e administrador

  // Quem a conta é (usado para o perfil do menu e para restringir o escopo)
  'docencia.exercer', // é professor: escopo nas próprias turmas/disciplinas
  'aee.atender', // é especialista AEE: menu reduzido ao atendimento
  'portal.acessar', // portal do estudante (não usa o painel da equipe)

  // Painel inicial: visões "Administração" e "Professor"
  'painel.gestao',
  'painel.professor',

  // Escopo: enxerga todas as turmas e disciplinas da escola (sem isto, só as da docência)
  'escopo.escola',

  // Estudantes
  'estudante.ler', // tela de estudantes e busca rápida (Ctrl+K)
  'estudante.buscar', // procurar estudante pelo nome/matrícula (seletores das telas da equipe)
  'estudante.editar', // cadastrar, editar, excluir, criar acesso ao portal
  'pendencia.resolver', // pendências de cadastro (estudante faltante etc.)
  'ocorrencia.gerenciar',

  // AEE
  'aee.gerenciar', // painel AEE com todos os estudantes; criar/editar/excluir fichas
  'aee.ficha.editar', // abrir e editar a ficha de qualquer estudante

  // Estrutura
  'turma.ler', // tela de turmas
  'turma.gerenciar', // criar/editar/excluir turma, horário, unificar
  'turma.promover', // promover e clonar turma
  'disciplina.gerenciar',
  'matriz.gerenciar',

  // Diário, notas e resultados
  'frequencia.lancar', // chamada e diário
  'frequencia.acompanhar', // painel de frequência da escola
  'nota.lancar', // gravar notas e atividades/avaliações das disciplinas
  'nota.tela', // telas "Lançar notas" e "Recuperação final" (eram isStaff || isSuperuser)
  'resultado.ler',
  'indicador.ler', // professores com lançamentos pendentes
  'conselho.decidir',
  'relatorio.turma', // PDFs de relatório da turma

  // Planos de ensino
  'plano.ler', // tela de planos de ensino
  'plano.elaborar', // criar o próprio plano
  'plano.acompanhar', // ver e editar planos de todos os professores

  // Questões, provas e simulados
  'questao.usar',
  'questao.moderar',
  'prova.gerenciar',
  'simulado.ler',
  'simulado.gerenciar',

  // Recursos
  'laboratorio.gerenciar',
  'calendario.gerenciar', // calendário letivo da escola
  'financeiro.gerenciar',

  // Comunicação
  'mensagem.direcao.atender', // mensagens à direção; comunicados para o grupo da direção
  'mensagem.suporte.atender', // mensagens de suporte
  'comunicado.receber.equipe', // comunicados para o grupo "equipe"

  // Configuração
  'usuario.gerenciar',
  'configuracao.editar',
  'identidade.editar', // identidade visual (logo, cores)
  'auditoria.ler',
] as const

export type Permissao = (typeof PERMISSOES)[number]

const CONJUNTO_PERMISSOES = new Set<string>(PERMISSOES)
export function ehPermissao(p: string): p is Permissao {
  return CONJUNTO_PERMISSOES.has(p)
}

export const CODIGOS_PAPEL = [
  'ADMINISTRADOR',
  'DIRECAO',
  'SECRETARIA',
  'COORDENACAO',
  'PROFESSOR',
  'AEE',
  'ESTUDANTE',
  'RESPONSAVEL',
] as const
export type CodigoPapel = (typeof CODIGOS_PAPEL)[number]

export function ehCodigoPapel(c: string): c is CodigoPapel {
  return (CODIGOS_PAPEL as readonly string[]).includes(c)
}

export type EscopoPadrao = 'ESCOLA' | 'DOCENCIA' | 'PROPRIO' | 'DEPENDENTES'

export type DefinicaoPapel = {
  nome: string
  descricao: string
  /** Escopo do vínculo criado para este papel. */
  escopo: EscopoPadrao
  /** Pode ser escolhido no editor de papéis da tela de Usuários. */
  atribuivel: boolean
  permissoes: readonly Permissao[]
}

// Conjuntos de legado: cada um reproduz uma checagem antiga.
const GESTAO = [
  'escola.gerir', 'escopo.escola', 'estudante.ler', 'estudante.editar', 'pendencia.resolver',
  'ocorrencia.gerenciar', 'aee.ficha.editar', 'turma.gerenciar', 'matriz.gerenciar',
  'frequencia.acompanhar', 'resultado.ler', 'conselho.decidir', 'plano.acompanhar',
  'questao.moderar', 'prova.gerenciar', 'simulado.gerenciar', 'laboratorio.gerenciar',
  'mensagem.direcao.atender', 'identidade.editar', 'indicador.ler', 'calendario.gerenciar',
  'financeiro.gerenciar', 'painel.gestao',
] as const satisfies readonly Permissao[]

const EQUIPE = [
  'equipe.acessar', 'turma.ler', 'frequencia.lancar', 'nota.lancar', 'relatorio.turma',
  'plano.ler', 'questao.usar', 'simulado.ler', 'estudante.buscar', 'painel.professor',
] as const satisfies readonly Permissao[]

export const PAPEIS_SISTEMA: Record<CodigoPapel, DefinicaoPapel> = {
  ADMINISTRADOR: {
    nome: 'Administrador da escola',
    descricao: 'Tudo da escola, inclusive usuários, configurações e auditoria.',
    escopo: 'ESCOLA',
    atribuivel: true,
    permissoes: [
      ...GESTAO, ...EQUIPE, 'aee.ler', 'aee.gerenciar', 'nota.tela', 'escola.administrar',
      'turma.promover', 'disciplina.gerenciar', 'mensagem.suporte.atender',
      'comunicado.receber.equipe', 'usuario.gerenciar', 'configuracao.editar', 'auditoria.ler',
    ],
  },
  DIRECAO: {
    nome: 'Direção',
    descricao: 'Gestão da escola: estudantes, turmas, resultados, conselho, AEE e identidade visual.',
    escopo: 'ESCOLA',
    atribuivel: true,
    permissoes: [...GESTAO, ...EQUIPE, 'aee.ler', 'aee.gerenciar'],
  },
  SECRETARIA: {
    nome: 'Secretaria escolar',
    descricao: 'Cadastro de estudantes, pendências de cadastro, turmas, horários e matriz. Não lança nem altera notas.',
    escopo: 'ESCOLA',
    atribuivel: true,
    permissoes: [
      'painel.gestao', 'escopo.escola', 'estudante.ler', 'estudante.buscar', 'estudante.editar',
      'pendencia.resolver', 'turma.ler', 'turma.gerenciar', 'matriz.gerenciar', 'relatorio.turma',
      'resultado.ler', 'laboratorio.gerenciar', 'calendario.gerenciar', 'comunicado.receber.equipe',
    ],
  },
  COORDENACAO: {
    nome: 'Coordenação pedagógica',
    descricao: 'Acompanha diários, frequência, planos de ensino, resultados e conselho; modera questões e ocorrências. Não mexe em cadastro nem lança notas.',
    escopo: 'ESCOLA',
    atribuivel: true,
    permissoes: [
      'painel.gestao', 'escopo.escola', 'estudante.ler', 'estudante.buscar', 'ocorrencia.gerenciar',
      'turma.ler', 'frequencia.acompanhar', 'resultado.ler', 'indicador.ler',
      'conselho.decidir', 'relatorio.turma', 'plano.ler',
      'plano.acompanhar', 'questao.usar', 'questao.moderar', 'prova.gerenciar', 'simulado.ler',
      'simulado.gerenciar', 'comunicado.receber.equipe',
    ],
  },
  PROFESSOR: {
    nome: 'Professor',
    descricao: 'Chamada, diário, notas e planos das suas turmas e disciplinas.',
    escopo: 'DOCENCIA',
    atribuivel: true,
    permissoes: [...EQUIPE, 'docencia.exercer', 'nota.tela', 'plano.elaborar', 'comunicado.receber.equipe'],
  },
  AEE: {
    nome: 'AEE',
    descricao: 'Atendimento educacional especializado: fichas AEE dos estudantes.',
    escopo: 'ESCOLA',
    atribuivel: true,
    // relatorio.turma: os PDFs da turma já eram liberados para quem é só AEE
    permissoes: ['aee.ler', 'aee.atender', 'aee.gerenciar', 'relatorio.turma'],
  },
  ESTUDANTE: {
    nome: 'Estudante',
    descricao: 'Portal do estudante: o próprio boletim, frequência e avisos.',
    escopo: 'PROPRIO',
    // o acesso do estudante é criado pela tela de Estudantes, ligado ao cadastro dele
    atribuivel: false,
    permissoes: ['portal.acessar'],
  },
  RESPONSAVEL: {
    nome: 'Responsável',
    descricao: 'Portal da família (ainda não disponível).',
    escopo: 'DEPENDENTES',
    // sem portal da família ainda (fase 5c): não é oferecido no editor
    atribuivel: false,
    permissoes: [],
  },
}

export const PAPEIS_ATRIBUIVEIS: CodigoPapel[] = CODIGOS_PAPEL.filter((c) => PAPEIS_SISTEMA[c].atribuivel)

/** Os booleanos que existem hoje em User (saem na fase 3c). */
export type Booleanos = {
  isSuperuser?: boolean
  isDirecao?: boolean
  isStaff?: boolean
  isAEE?: boolean
  isPortalUser?: boolean
}

/**
 * Tabela 2.5.3: cada booleano ligado vira um papel. Um booleano = um papel
 * (sem "absorver" um no outro): direção que também é isStaff ganha Direção
 * e Professor, e assim o acesso continua exatamente o mesmo.
 */
export function papeisDosBooleanos(b: Booleanos): CodigoPapel[] {
  const papeis: CodigoPapel[] = []
  if (b.isSuperuser) papeis.push('ADMINISTRADOR')
  if (b.isDirecao) papeis.push('DIRECAO')
  if (b.isStaff) papeis.push('PROFESSOR')
  if (b.isAEE) papeis.push('AEE')
  if (b.isPortalUser) papeis.push('ESTUDANTE')
  return papeis
}

/** As 32 combinações dos booleanos de hoje (testes de equivalência). */
export function combinacoesDosBooleanos(): Required<Booleanos>[] {
  const chaves = ['isSuperuser', 'isDirecao', 'isStaff', 'isAEE', 'isPortalUser'] as const
  const r: Required<Booleanos>[] = []
  for (let m = 0; m < 1 << chaves.length; m++) {
    const b = {} as Required<Booleanos>
    chaves.forEach((k, i) => { b[k] = !!(m & (1 << i)) })
    r.push(b)
  }
  return r
}

/** Caminho de volta, para a escrita dupla: os booleanos coerentes com os papéis. */
export function booleanosDosPapeis(papeis: readonly string[]): Required<Booleanos> {
  const tem = (c: CodigoPapel) => papeis.includes(c)
  return {
    isSuperuser: tem('ADMINISTRADOR'),
    isDirecao: tem('DIRECAO'),
    isStaff: tem('PROFESSOR'),
    isAEE: tem('AEE'),
    isPortalUser: tem('ESTUDANTE'),
  }
}

export function permissoesDosPapeis(papeis: readonly string[]): Set<Permissao> {
  const s = new Set<Permissao>()
  for (const c of papeis) {
    if (!ehCodigoPapel(c)) continue
    for (const p of PAPEIS_SISTEMA[c].permissoes) s.add(p)
  }
  return s
}

/** Ordena e tira repetidos/desconhecidos (para gravar e comparar). */
export function normalizarPapeis(papeis: readonly string[]): CodigoPapel[] {
  return CODIGOS_PAPEL.filter((c) => papeis.includes(c))
}

/** Rótulo curto do papel principal (menu do usuário). */
export function rotuloDoPapelPrincipal(papeis: readonly string[]): string {
  const ordem: [CodigoPapel, string][] = [
    ['ADMINISTRADOR', 'Administrador'],
    ['AEE', 'Especialista AEE'],
    ['DIRECAO', 'Direção'],
    ['SECRETARIA', 'Secretaria'],
    ['COORDENACAO', 'Coordenação'],
    ['PROFESSOR', 'Professor'],
    ['ESTUDANTE', 'Estudante'],
  ]
  return ordem.find(([c]) => papeis.includes(c))?.[1] ?? 'Gestão escolar'
}
