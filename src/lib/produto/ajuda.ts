/**
 * Ajuda contextual (botão "?" no cabeçalho): para que a tela serve e os
 * passos principais. Escolhida pelo endereço; vence o prefixo mais longo.
 * `[id]` casa com qualquer segmento.
 */
export interface AjudaDaTela {
  titulo: string
  serve: string
  passos: string[]
}

export const AJUDAS: Record<string, AjudaDaTela> = {
  '/dashboard': { titulo: 'Painel', serve: 'Resumo do dia conforme o seu perfil: pendências, aulas, avisos e atalhos.', passos: ['Use "Perfil" na barra superior para trocar a visão do painel, quando tiver mais de uma.', 'Clique num indicador ou numa linha para abrir a tela de origem.'] },
  '/dashboard/turmas': { titulo: 'Turmas', serve: 'Lista das turmas do ano letivo e acesso à ficha de cada turma.', passos: ['Busque pelo nome ou curso e filtre por turno.', 'Clique na linha para abrir a ficha da turma (estudantes, disciplinas, horário, notas, frequência).', 'Use "Colunas" para escolher o que aparece e "Exportar" para baixar a lista em CSV.'] },
  '/dashboard/turmas/[id]': { titulo: 'Ficha da turma', serve: 'Tudo da turma em um lugar, organizado em abas.', passos: ['Visão geral: dados da turma e atalhos de trabalho.', 'Estudantes e Disciplinas: quem está na turma e quem leciona.', 'Horário, Notas, Resultados, Frequência e Ocorrências aparecem conforme o seu acesso.'] },
  '/dashboard/estudantes': { titulo: 'Estudantes', serve: 'Cadastro de estudantes, acesso ao portal e boletins.', passos: ['Busque pelo nome ou matrícula, ou filtre por curso, turno, série e turma.', 'Clique no nome para abrir a ficha do estudante.', 'Pelas ações da linha: acesso ao portal, editar dados, ficha AEE e boletim.'] },
  '/dashboard/estudantes/[id]': { titulo: 'Ficha do estudante', serve: 'Dados, notas e frequência do estudante, em abas.', passos: ['Dados: informações do cadastro; "Editar" abre o formulário.', 'Notas e frequência: boletim com o PDF para baixar.', 'AEE e Histórico aparecem para quem tem permissão.'] },
  '/dashboard/usuarios': { titulo: 'Usuários', serve: 'Contas da equipe, papéis e aprovação de cadastros.', passos: ['Filtre por situação: todos, ativos ou pendentes.', 'Marque as contas pendentes e use "Aprovar" para aprovar em lote.', 'Clique no nome para abrir a ficha da conta.'] },
  '/dashboard/usuarios/[id]': { titulo: 'Ficha do usuário', serve: 'Dados de acesso, papéis e disciplinas da conta.', passos: ['"Editar" abre o formulário com o editor de papéis.', 'Disciplinas e turmas: vínculo do professor às disciplinas (ou importar do horário).'] },
  '/dashboard/disciplinas': { titulo: 'Disciplinas', serve: 'Disciplinas de todas as turmas do ano letivo.', passos: ['Busque pela disciplina ou turma e filtre por turno.', 'Clique na linha para editar a disciplina.'] },
  '/dashboard/chamada': { titulo: 'Chamada e diário', serve: 'Aulas do dia para fazer a chamada e acesso aos diários de classe.', passos: ['Escolha a data no alto da tela.', 'Clique em "Fazer chamada" na aula; quem não leciona a disciplina vê o diário.', 'Em "Diários", veja aulas dadas, conteúdo e dias sem chamada.'] },
  '/dashboard/chamada/fazer': { titulo: 'Fazer chamada', serve: 'Registro de presença e do conteúdo ministrado na aula.', passos: ['Todos começam presentes: clique em quem faltou.', 'Com mais de um tempo de aula, marque em quais tempos o estudante faltou.', 'Escreva o conteúdo e clique em "Salvar chamada". O indicador mostra se há alterações não salvas.'] },
  '/dashboard/chamada/diario': { titulo: 'Diário de classe', serve: 'Aulas dadas, conteúdo e dias com aula sem chamada, por unidade.', passos: ['Clique num dia pendente para fazer a chamada (só quem leciona).', 'Abra a unidade para ver as aulas registradas.'] },
  '/dashboard/notas': { titulo: 'Lançar notas', serve: 'Escolha da turma para lançar ou consultar as notas por unidade.', passos: ['Clique na turma e depois escolha a disciplina.', 'A recuperação final fica no botão do cabeçalho.'] },
  '/dashboard/notas/lancar': { titulo: 'Lançamento de notas', serve: 'Notas de cada estudante por unidade e atividade.', passos: ['Escolha a disciplina.', 'Digite as notas; a média é calculada na hora.', 'Clique em "Salvar notas". Só o professor da disciplina grava; a gestão vê em modo leitura.'] },
  '/dashboard/notas/recuperacao': { titulo: 'Recuperação final', serve: 'Notas substitutivas dos estudantes que ficaram em recuperação.', passos: ['Escolha a turma e a disciplina.', 'Digite a nota ou marque "não realizou" e salve.'] },
  '/dashboard/resultados': { titulo: 'Resultados', serve: 'Desempenho por unidade e resultado final das turmas.', passos: ['Clique na turma para ver o mapa de resultados e baixar o PDF.'] },
  '/dashboard/frequencia': { titulo: 'Frequência', serve: 'Infrequência por turma e registro de atestados e justificativas.', passos: ['Escolha a turma no alto da tela.', 'Veja quem está abaixo ou perto do mínimo; "Mostrar a turma toda" lista todos.', 'Registre atestados e justificativas no painel abaixo.'] },
  '/dashboard/conselho-classe': { titulo: 'Conselho de classe', serve: 'Deliberação sobre estudantes que não atingiram a média após a recuperação.', passos: ['Clique na turma com pendência.', 'Registre a decisão de cada estudante; as decisões ficam na ata.'] },
  '/dashboard/ocorrencias': { titulo: 'Livro de ocorrências', serve: 'Registro e acompanhamento das ocorrências escolares.', passos: ['Filtre por estudante, período, turma e tipo.', 'Clique na linha para ler o registro completo.', '"Novo registro" abre o formulário; "Imprimir" gera a folha do que está filtrado.'] },
  '/dashboard/aee': { titulo: 'Atendimento educacional especializado', serve: 'Fichas AEE dos estudantes e confirmação de leitura pelos professores.', passos: ['Busque o estudante e abra a ficha.', 'Quem edita fichas clica em "Editar ficha"; o professor confirma a leitura.'] },
  '/dashboard/mensagens': { titulo: 'Mensagens', serve: 'Chamados, mensagens internas e comunicados oficiais.', passos: ['"Novo chamado" para falar com o suporte ou com a direção.', 'Abra a mensagem para responder ou acompanhar o andamento.'] },
  '/dashboard/planos': { titulo: 'Planos de ensino', serve: 'Planejamento das disciplinas por período.', passos: ['Crie o plano escolhendo disciplina, período e turmas.', 'Abra um plano para ler, editar ou imprimir.'] },
  '/dashboard/questoes': { titulo: 'Banco de questões', serve: 'Questões cadastradas pelos professores para montar provas.', passos: ['Filtre por área, disciplina, turma, status e tipo.', 'A coordenação aprova as questões pendentes.'] },
  '/dashboard/provas': { titulo: 'Gerador de provas', serve: 'Montagem de provas a partir do banco de questões.', passos: ['Escolha as questões e a ordem.', 'Gere a prova e o gabarito para impressão.'] },
  '/dashboard/simulados': { titulo: 'Simulados', serve: 'Lançamento das notas dos simulados por turma e área.', passos: ['Escolha a turma, a prova e a unidade.', 'Marque faltas e digite as notas.'] },
  '/dashboard/laboratorios': { titulo: 'Reserva de laboratórios', serve: 'Agenda de uso dos laboratórios e espaços da escola.', passos: ['Escolha o espaço e o dia.', 'Clique em "Nova reserva" e informe o horário.'] },
  '/dashboard/configuracoes': { titulo: 'Configurações', serve: 'Funcionalidades globais da escola.', passos: ['Esquemas de avaliação, calendário letivo e identidade visual ficam nas opções da lista.', 'Ajuste os módulos pedagógicos e salve.'] },
  '/dashboard/configuracoes/calendario': { titulo: 'Calendário letivo', serve: 'Início e fim do ano, unidades, feriados, sábados letivos e tempos de aula.', passos: ['Defina o período do ano e as datas de cada unidade.', 'Cadastre dias sem aula e dias letivos extras.'] },
  '/dashboard/matriz': { titulo: 'Matriz curricular', serve: 'Disciplinas por curso e série, que geram as disciplinas das turmas.', passos: ['Escolha o curso e a série.', 'Adicione as disciplinas; elas são propagadas para as turmas existentes.'] },
  '/dashboard/auditoria': { titulo: 'Auditoria', serve: 'Registro das alterações feitas no sistema.', passos: ['Filtre por texto, entidade e usuário.', 'Cada linha mostra quem alterou, quando e o quê.'] },
}

export function ajudaDaRota(pathname: string): AjudaDaTela | null {
  const partes = pathname.split('/').filter(Boolean)
  let melhor: { chave: string; tam: number } | null = null
  for (const chave of Object.keys(AJUDAS)) {
    const p = chave.split('/').filter(Boolean)
    if (p.length > partes.length) continue
    const casa = p.every((seg, i) => seg === '[id]' ? !!partes[i] : seg === partes[i])
    if (casa && (!melhor || p.length > melhor.tam)) melhor = { chave, tam: p.length }
  }
  return melhor ? AJUDAS[melhor.chave] : null
}
