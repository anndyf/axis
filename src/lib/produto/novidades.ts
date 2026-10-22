/**
 * Novidades por versão (tela /dashboard/novidades). A versão exibida vem do
 * package.json; o número só muda por decisão da dona do produto. Cada
 * entrega nova entra no topo da versão em andamento.
 */
export interface Entrega {
  titulo: string
  itens: string[]
}

export interface VersaoNovidades {
  versao: string
  rotulo: string
  entregas: Entrega[]
}

export const NOVIDADES: VersaoNovidades[] = [
  {
    versao: '0.1.0',
    rotulo: 'Versão atual',
    entregas: [
      {
        titulo: 'Cadeado de unidade encerrada',
        itens: [
          'A unidade encerra sozinha no dia seguinte ao prazo de lançamento, ou antes, quando a Direção ou a Coordenação clica em "Encerrar agora".',
          'Unidade encerrada tranca notas, avaliações, infrequência, chamadas e diário do período; com a última unidade encerrada, também a recuperação final e o conselho de classe.',
          'Reabertura pontual por turma e disciplina, com motivo e prazo (padrão 7 dias, no máximo 30), que tranca de novo sozinha na data; a gestão pode revogar antes.',
          'Nova tela "Encerramento de unidades" e aviso no painel das unidades que encerram nos próximos 7 dias e das reaberturas ativas. Tudo registrado na auditoria.',
        ],
      },
      {
        titulo: 'Layout de sistema no computador',
        itens: [
          'Área de trabalho usando a largura toda, barra superior com escola, ano letivo, perfil, busca e notificações.',
          'Fichas de turma, estudante e usuário com abas; ficha AEE em modo leitura.',
          'Listas com barra de ferramentas, ordenação, colunas visíveis e exportação em CSV.',
          'Rodapé de rastreabilidade e aba Histórico nas fichas; indicador de gravação nos lançamentos.',
          'Ajuda contextual nas telas principais e impressão com cabeçalho da escola.',
        ],
      },
      {
        titulo: 'Papéis e permissões',
        itens: [
          'Papéis de Secretaria e Coordenação pedagógica; uma conta pode ter mais de um papel.',
          'Só quem leciona grava nota e chamada; Direção e Administração visualizam.',
        ],
      },
      {
        titulo: 'Segurança e módulos',
        itens: [
          'Conferência de módulo contratado no servidor em todas as rotas e telas.',
          'Planos e assinaturas por escola no painel da plataforma.',
        ],
      },
      {
        titulo: 'Chamada, frequência e avaliação',
        itens: [
          'Falta por tempo de aula, observação por estudante e calendário da disciplina.',
          'Diário de classe por unidade e replicação do conteúdo para outras turmas.',
          'Esquemas de avaliação configuráveis e calendário letivo.',
        ],
      },
    ],
  },
]
