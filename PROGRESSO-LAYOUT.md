# Progresso — layout de sistema (branch `estilo/layout-sistema`)

Objetivo: dar ao Áxis cara de sistema no computador (área de trabalho larga,
painéis com borda, abas nas fichas, barra de contexto, listas com barra de
ferramentas), mantendo o celular como app.

Base: `main` (d096efa) + merge de `origin/regra/so-docente-grava` (4b63947),
que não estava na `main`. A regra "só quem leciona grava nota e chamada" não
foi alterada.

## Ambiente usado na sessão

PostgreSQL 16 local (porta 5432, senha `devpassword`), bancos `axis_dev` e
`axis_test`, seeds e backfills da fase 2 e 3a. Base de testes: tsc 0 erros,
vitest 541 testes passando.

Capturas: `scripts/capturas.ts` (ampliado com mais telas), 1440, 1280 e 375px,
claro e escuro, em `docs/capturas/layout-sistema/<etapa>/`. A rodada "antes"
foi feita numa cópia limpa da base (worktree em outra porta), porque o
servidor de desenvolvimento recarrega as mudanças em andamento.

## Etapas

- [x] 1. Fundação de área de trabalho (tokens e componentes)
- [x] 2. Casca (largura, barra superior de contexto, menu lateral compacto)
- [x] 3. Fichas com abas (turma, estudante, usuário, AEE)
- [x] 4. Listas e telas de trabalho
- [x] 5. Rastreabilidade visível
- [x] 6. Formulários e tabelas com rigor
- [x] 7. Acabamento de produto maduro
- [x] 8. Impressão

## Próximo passo exato

Encerramento: rodada final de capturas (1440, 1280 e 375px, claro e escuro)
em `docs/capturas/layout-sistema/9-final/`, conferir celular, escrever "Para
validar localmente", abrir o PR para `main` e marcar STATUS.

## Etapa 1 — o que foi feito

Tokens (`src/app/globals.css`):
- Raios: controle 6px (`rounded-control`), painel 8px (`rounded-painel`),
  modal 12px (`rounded-modal`). A escala do Tailwind foi achatada para as
  classes já espalhadas pelas telas seguirem a regra sem editar arquivo por
  arquivo: `rounded-md/lg` = 6px, `rounded-xl/2xl` = 8px, `rounded-3xl` = 12px.
- Sombra de cartão zerada (`--shadow-card: none`, `shadow-sm`/`shadow-xs`
  sem efeito): borda no lugar. Sombra só em camadas flutuantes
  (`shadow-overlay`: menus, modais, avisos, folhas do celular).
- Espaçamentos: `px-pagina`/`py-pagina-y` (16px no celular, 24/20px no
  desktop), `px-painel`/`py-painel-y` (16/12px), `h-linha` (40px, linha de
  tabela), `h-barra` (48px, barra superior).
- Larguras: `max-w-formulario` (720px) e `max-w-leitura` (880px), só para
  formulários curtos e leitura longa.
- Tipografia: `text-rotulo` (12,5px) para rótulos de campo, coluna e ficha.

Componentes novos (`src/components/ui`), todos na vitrine `/dashboard/ui`:
- `Painel`: borda, faixa de título (14px, peso 600) com ações à direita,
  corpo (com ou sem recuo) e rodapé.
- `BarraFerramentas`: busca, filtros (fichas com contagem), ações à direita e
  "Exportar". Não guarda estado: a tela continua dona dos filtros.
- `Abas` (links): cada aba aponta para uma rota; sublinhado na cor de
  destaque; rola de lado no celular. O `Tabs` antigo (troca de conteúdo na
  mesma tela) continua.
- `CabecalhoPagina`: caminho, título, dados-chave em linha, ações, botão de
  ajuda e abas da ficha.
- `ListaDescritiva`: rótulo × valor em grade, para fichas em modo leitura.
- `Tabela` revisada: linhas de 40px, cabeçalho fixo, rótulos de coluna em
  12,5px peso 500, coluna ordenável (`TH ordem/onOrdenar`, com `aria-sort`),
  linha clicável/selecionada, `RodapeTabela` com contagem e paginação.
- `Fichas` aceita `contagem` e `compactas` (32px no desktop).
- `Field`/`Label` aceitam `obrigatorio` (asterisco + texto para leitor de
  tela); campos `readOnly` ganham aparência de leitura.
- `src/lib/navegador/csv.ts` (+ teste): exportar CSV do que está na tela,
  separador ";" com BOM, proteção contra fórmula no Excel.

## Decisões tomadas sem confirmação

1. Raios achatados na escala do Tailwind (em vez de trocar 500+ classes à
   mão): todas as telas ficam em 6/8px de uma vez; modais e folhas do
   celular usam `rounded-modal` (12px) explicitamente.
2. Capturas: rodada completa (todas as telas) em "0-antes" e no final; nas
   etapas intermediárias só as telas afetadas, para não inchar o repositório.

## Etapa 2 — o que foi feito

- `src/app/dashboard/layout.tsx`: a área de trabalho ocupa a largura toda
  (`px-pagina py-pagina-y`, sem o `max-w-[1400px]`). Acima do conteúdo, o
  caminho automático (`CaminhoAutomatico`), que some quando a tela traz
  `CabecalhoPagina` (regra em `globals.css`).
- Barra superior nova (`DashboardTopbar.tsx`, 48px no desktop): escola, "Ano
  letivo 2026" só exibido (sem seletor), perfil com o seletor de visão do
  painel (as mesmas visões de antes, agora calculadas em
  `src/lib/services/painel-visoes-servidor.ts` e usadas também pelo painel),
  busca (abre a mesma busca do Ctrl+K), notificações com contagem de não
  lidas e menu do usuário (perfil, senha, componentes, tema, sair). No
  celular a barra continua como era.
- Menu lateral mais compacto: itens de 32px, rótulos de grupo em frase
  normal (sem caixa alta), mesma cor e mesmos itens. Busca e menu do usuário
  saíram do menu lateral (estão na barra superior); a consulta de não lidas
  e pendentes passou para o `DashboardLayoutWrapper` (uma só, para o menu e
  o sino).
- Nomes dos módulos em frase normal (`src/lib/modules.ts`): "Lançar notas",
  "Chamada e diário", "Gestão acadêmica"... O item "Dashboard" virou
  "Painel".
- `max-w` estreitos removidos das telas de trabalho (33 arquivos, junto com
  o recuo lateral duplicado `px-4 sm:px-6 lg:px-8`). Ficam limitados só
  formulários curtos (`max-w-formulario`: reportar estudante, unificar
  turmas, nova mensagem) e telas de leitura (`max-w-leitura`: configurações,
  perfil, calendário, vincular disciplinas, importar horário, minhas
  avaliações, leitura de mensagem).

Decisões:
3. O caminho (migalhas) saiu da barra superior para o cabeçalho de cada tela;
   a barra superior ficou com o contexto de trabalho (como SIGEduc/SUAP).
4. O seletor de visão do painel fica na barra superior (menu do perfil); no
   celular continua nas fichas dentro do painel.

## Etapa 3 — o que foi feito

Abas = links para telas que já existiam ou rotas filhas que reaproveitam os
mesmos componentes e consultas. A aba só aparece se o usuário puder abrir a
tela de destino (mesma guarda de módulo + `can()`), em
`src/lib/fichas/abas.ts` (puro, com teste) e `src/lib/fichas/permissoes.ts`.

- Turma (`src/app/dashboard/turmas/[id]/layout.tsx`): cabeçalho com curso,
  turno, ano letivo e contagens; abas Visão geral (nova, `page.tsx`: dados
  em `ListaDescritiva` + atalhos de trabalho) · Estudantes (nova rota filha,
  mesma consulta da tela Estudantes, extraída para
  `src/lib/services/estudantes-lista.ts`) · Disciplinas (nova rota filha:
  disciplina, área, professor e carga horária — dados que relatório e
  horário já mostravam) · Horário · Notas (relatório da turma) · Resultados
  (situação) · Frequência (rota filha que usa `ConteudoFrequencia`, extraído
  da tela Frequência) · Ocorrências (rota filha com o livro filtrado pela
  turma). Rotas filhas novas entraram no mapa de módulos (DIA, SEC).
  Os cabeçalhos repetidos de horário, relatório e situação viraram uma linha
  de ações.
- Estudante (`src/app/dashboard/estudantes/[id]/layout.tsx` +
  `components/fichas/CabecalhoFichaEstudante.tsx`): abas Dados (nova,
  leitura em `ListaDescritiva`, botão "Editar" abre o formulário de sempre)
  · Notas e frequência (boletim, que já traz a frequência por disciplina) ·
  AEE (só com ficha AEE, módulo ativo e `aee.ler`). O formulário de
  estudante passou para o design system (Painel, Field com obrigatórios).
- Usuário (`src/app/dashboard/usuarios/[id]/layout.tsx`): abas Dados e
  papéis (nova, leitura; "Editar" abre o formulário com o editor de papéis
  da fase 3b) · Disciplinas e turmas (professor; inclui importar horário).
- Ficha AEE (`AEEProfileClient`): modo leitura em painéis e
  `ListaDescritiva`; "Editar ficha" (só `aee.ficha.editar`) abre os mesmos
  campos; professor continua confirmando a leitura (mesma ação). Quem pode
  ver a ficha do estudante vê também as abas dele; o especialista AEE vê o
  cabeçalho próprio. Mensagens de salvar viraram avisos (toast) formais.

Correção de segurança encontrada no caminho: a tela "Vincular disciplinas"
mandava o registro inteiro de `User` (com o hash da senha) ao navegador;
agora seleciona só `id`, `name` e as disciplinas.

Ficaram fora (não existe tela para isso hoje):
- Aba "Ocorrências" do estudante: a tela de ocorrências só filtra por nome do
  estudante, não por estudante; seria preciso um filtro novo na API.
- Aba "Documentos" do estudante: não há documentos anexados no sistema.
- Aba "Papéis" separada no usuário: o editor de papéis faz parte do
  formulário de usuário; a ficha mostra os papéis na aba "Dados e papéis".

## Etapa 4 — o que foi feito

- Componentes de lista: `components/estudantes/TabelaEstudantes` (tela
  Estudantes e aba da turma) e `components/listas/ListaDeTurmas` (telas de
  "escolha a turma": resultados, conselho, lançar notas, recuperação), com
  busca, fichas de turno com contagem, ordenação, linha clicável, rodapé com
  contagem e exportar CSV do que está na tela.
- Turmas, estudantes, usuários (seleção em lote e aprovação em massa
  mantidas), disciplinas e ocorrências: `CabecalhoPagina` + `Painel` +
  `BarraFerramentas` + `Tabela` no desktop. No celular, turmas, disciplinas,
  resultados, conselho, notas e recuperação mantêm os cartões de antes (o
  bloco antigo ficou em `md:hidden`); ocorrências ganhou cartões compactos.
- `PageHeader` antigo agora delega para `CabecalhoPagina` (frequência,
  chamada, diário, configurações, calendário, identidade e lançamento de
  notas ganharam o cabeçalho novo sem reescrever cada tela).
- Lançamento de notas: linhas de ~44px, rótulos de coluna discretos,
  matrícula em mono; barra de salvar fixa no pé do painel com o indicador
  de gravação. Somente leitura (gestão): faixa informativa, campos com
  aparência de texto, sem botões de infrequente e sem salvar.
- Recuperação final: mesmo tratamento de somente leitura (antes o botão
  salvar aparecia desabilitado; agora some) e indicador de gravação.
- Chamada (desktop): alunos numa lista única em painel com linhas de ~44px,
  calendário à esquerda, barra de salvar com indicador; celular igual.
- Chamada e diário (lista): aulas do dia e diários lado a lado no desktop
  largo.
- Painel inicial: indicadores mais compactos; na visão de administração,
  "Turmas com pendências" ocupa 2/3 e comunicados/calendário a lateral;
  professores atrasados e atalhos na linha de baixo.
- Telas grandes ainda não reescritas (mensagens, AEE, questões, provas,
  simulados, laboratórios, planos, conselho da turma, resultados da turma,
  auditoria, perfil, pendências, matriz, formulários de turma/disciplina):
  passada de densidade com regra fixa (espaçamentos p-8/p-10 → p-4/p-5,
  títulos 3xl/4xl → xl, sem caixa alta forçada, sem sombras de cartão, sem
  animações de pulsar/escala) e título de página normalizado em 20px peso
  600 por CSS (`main h1` em globals.css). Mensagens ganhou cabeçalho novo e
  aviso de suporte em `Alert`.
- Formulários curtos e telas de leitura ficam alinhados à esquerda (sem
  centralizar) com `max-w-formulario`/`max-w-leitura`.

Decisões:
5. Celular: onde a tela tinha cartões próprios, o desktop ganhou a tabela e
   o celular manteve os cartões (bloco antigo em `md:hidden`), para não
   regredir o app.
6. Dicas fixas no topo de notas, recuperação, resultados e conselho ficam só
   no celular; no desktop a ajuda vai para o botão "?" (etapa 7).

## Etapa 5 — o que foi feito

- `RodapeRastreio` (src/components/ui): "Criado por … em … · Última
  alteração por … em …". Usado em: ficha da turma (só datas: a turma não
  grava autor), ficha do estudante e do usuário (datas; autor da última
  alteração vem do AuditLog e só aparece para quem já vê a auditoria),
  ficha AEE (só datas), plano de ensino (autor = professor do plano, datas).
  Ocorrência: a linha aberta mostra "Registrado em … por …" (autor gravado).
- Aba "Histórico" nas fichas do estudante (cadastro + notas: AuditLog
  ESTUDANTE/NOTA e NotaFinalAudit) e do usuário (AuditLog USUARIO), em
  `src/lib/services/historico-leitura.ts`. Só com `auditoria.ler` (mesma
  regra da tela de auditoria) e nunca para conta do portal; sempre na escola
  da sessão: a entidade é buscada pela escola e o AuditLog só entra se o
  autor for da mesma escola (o AuditLog não grava a escola).
  Teste: `src/lib/historico-leitura.test.ts` (mesma matrícula nas escolas A e
  B, registro da escola B apontando para a nota da A, conta da escola B,
  aluno do portal e professor sem acesso).
- Indicador de gravação ("Alterações não salvas" / "Salvando…" / "Salvo às
  14:32"): lançamento de notas, recuperação final, chamada e ficha AEE.

Onde faltaria gravar autor (não inventei):
- Turma: nenhuma ação grava AuditLog de TURMA (criar, editar, horário,
  promover, clonar). Por isso a turma não tem aba Histórico.
- Estudante: o cadastro (POST /api/estudantes) não grava AuditLog de
  criação; só alteração e exclusão.
- Ficha AEE: não grava quem criou nem quem alterou (só datas).
- Avaliações do professor (AvaliacaoDisciplina): tem `criadoPorId`, mas a
  tela "Minhas avaliações" é do próprio professor; o rodapé ficou de fora.
- Fuso: o `logAudit` grava o horário de Brasília "como se fosse UTC"
  (src/lib/audit.ts); o histórico formata essas entradas em UTC para mostrar
  a hora certa. Vale corrigir a gravação numa fase própria.

## Etapa 6 — o que foi feito

- `src/lib/navegador/mascaras.ts` (+ teste): telefone (máscara e DDD), CPF
  (máscara e dígitos verificadores), CEP e datas (existência e intervalo).
  O sistema hoje só tem telefone (contato de emergência da ficha AEE) e
  datas; não há campo de CPF nem de CEP (utilitários prontos para quando
  existirem). Telefone com máscara e erro na linha do campo na ficha AEE;
  plano de ensino não aceita fim antes do início (erro na linha do campo,
  `min` no campo). A validação do servidor não mudou.
- Obrigatórios: `Field`/`Label` com `obrigatorio`, e uma regra em
  globals.css marca com asterisco o rótulo de qualquer campo `required`
  nos formulários antigos (sem editar arquivo por arquivo). Campo inválido
  depois de tocado ganha a borda de erro (`:user-invalid`).
- Formulários longos em seções numeradas com `BarraSalvar` fixa (estado +
  ações): usuário (1. Dados de acesso, 2. Papéis, com "Alterações não
  salvas") e ficha AEE em edição (1 a 7).
- Tabelas: ordenação por coluna (turmas, estudantes, disciplinas, listas de
  turma, demonstração na vitrine); seleção em lote onde já havia ação em
  lote (usuários: aprovação em massa); escolha de colunas visíveis
  (`SeletorColunas` + `useColunasVisiveis`, guardada no navegador por tela)
  em turmas, estudantes e listas de turma; exportar CSV do que está na tela
  (respeita as colunas visíveis) em turmas, estudantes, usuários,
  disciplinas, ocorrências e listas de turma.

Correção feita no caminho: a passada de densidade da etapa 4 tinha tirado o
espaço entre classes e interpolações `${...}` em alguns arquivos (classes
coladas); voltou com base nas versões anteriores (nenhum desses arquivos
tinha classe colada a interpolação antes).

## Etapa 7 — o que foi feito

- Emojis das telas trocados por ícones lucide (mensagens: categorias com
  Megaphone, Wrench, Landmark e MessageCircle; aviso de transferência,
  símbolos, cursos, matriz, portal e dica do lançamento de notas). Ficaram
  os emojis do assunto de e-mail (`mensagens/actions.ts`, não é tela) e de
  logs/comentários do servidor.
- Linguagem: mensagens de erro e sucesso padronizadas ("Não foi possível
  salvar. Tente novamente.", "Não foi possível conectar ao servidor. Tente
  novamente.", sucesso sem exclamação) em 31 arquivos; rótulos e títulos
  em Maiúsculas Em Cada Palavra passados para frase normal (48 arquivos,
  só texto de tela, nomes próprios preservados).
- Rodapé do sistema (`components/RodapeSistema.tsx`): versão lida do
  package.json (0.1.0), Novidades, Suporte, Termos de uso e Privacidade.
  Páginas: `/dashboard/novidades` (lista por versão em
  `src/lib/produto/novidades.ts`), `/dashboard/suporte`, `/termos` e
  `/privacidade` (públicas, texto provisório marcado como tal).
- Último acesso: coluna nova `User.acessoAnterior` (migration aditiva
  `20261022120000_acesso_anterior`, gerada com `prisma migrate diff`). O
  login copia `last_login` para `acesso_anterior` e grava o atual numa só
  instrução (`src/lib/ultimo-acesso.ts`, com teste). Depois do login, um
  aviso discreto: "Seu último acesso foi em 19/10/2026 às 21:14" (uma vez
  por login, sem IP). Só no painel da equipe (o portal do aluno ficou de
  fora).
- Ajuda contextual: botão "?" ao lado do título (`AjudaTela`), com textos
  em `src/lib/produto/ajuda.ts` (31 telas). Aparece sozinho no
  `CabecalhoPagina` e, nas telas com cabeçalho antigo, ao lado do caminho.

Sugestão de versão (não alterei; decisão da dona do produto): esta entrega
muda a cara do sistema e acrescenta uma coluna; sugiro 0.2.0 (ou 1.0.0 se
for a versão de lançamento para as escolas).

## Etapa 8 — o que foi feito

- Folha de impressão do sistema (`globals.css`, página nomeada
  `folha-sistema`): A4 em paisagem, sem menu, barras, abas, botões, busca e
  seletores; sem fundo de cor (texto preto, bordas cinza); cabeçalho só no
  papel com o nome da escola e "Impresso em 21/10/2026 às 14:32"
  (`CabecalhoImpressao`, no layout do painel, atualizado no `beforeprint`);
  "Página X de Y" no rodapé da folha; cabeçalho de tabela repetido em cada
  folha e linha sem quebra no meio; rolagens internas abertas; seções
  recolhidas (`<details>`) abertas para o papel e fechadas de novo depois.
- Vale só nas telas com o botão `BotaoImprimir` (marca
  `data-folha-impressao`; Ctrl+P na mesma tela dá o mesmo resultado). As
  impressões próprias que já existiam (provas, conselho de classe) não
  mudam. `data-sem-impressao` tira um bloco do papel; links com cara de
  botão (`buttonClasses`) ganharam `print:hidden`.
- Botão "Imprimir" em: estudantes da turma (aba Estudantes), ficha do
  estudante (cabeçalho da ficha, em todas as abas), ficha AEE (mesmo
  cabeçalho; a página continua com a permissão e a auditoria de leitura de
  antes), diário da disciplina (sem o calendário lateral), resultados da
  turma (ao lado do PDF que já existia) e frequência/infrequência (tela
  Frequência e aba da turma; o cadastro de atestados fica fora do papel).
- Vitrine `/dashboard/ui`: seção "Impressão".
- Prévias (PDF gerado pelo Chromium, página 1) em
  `docs/capturas/layout-sistema/8-impressao/`.

Decisão sem confirmação: folha em paisagem. Em retrato a largura útil da A4
(~700px) cai no layout do celular (cartões em vez de tabela); em paisagem
(~1030px) sai a tabela do desktop, que é o que se espera no papel.

## Para validar localmente

Ambiente: `npm ci`, PostgreSQL local com `axis_dev`, `.env` local,
`npx prisma migrate deploy` (há uma migration nova, aditiva:
`20261022120000_acesso_anterior`), seeds de `LOGINS_TESTE.md`, `npm run dev`.
Entre como `direcao` / `direcao123` e como `professor` / `professor123`.

Capturas: antes em `docs/capturas/layout-sistema/0-antes/`, depois em
`docs/capturas/layout-sistema/9-final/` (mesmos nomes; 1440, 1280 e 375px;
sufixo `-escuro` no tema escuro). Intermediárias em `2-3-casca-e-fichas/`;
folhas de impressão em `8-impressao/`.

Telas para conferir (desktop claro e escuro, e celular):
1. Casca: barra superior (escola, "Ano letivo 2026" só exibido, perfil com
   o seletor de visão, busca/Ctrl+K, notificações, usuário), menu lateral
   compacto, conteúdo na largura toda, rodapé com versão e links.
2. Turmas → uma turma: ficha com abas (Visão geral, Estudantes, Disciplinas,
   Horário, Notas, Resultados, Frequência, Ocorrências) e rodapé de criação.
3. Estudantes → um estudante: Dados em modo leitura com "Editar", Notas e
   frequência, AEE (estudante com ficha), Histórico (direção), Imprimir.
4. Usuários → um usuário: Dados e papéis, Disciplinas e turmas, Histórico.
5. Ficha AEE: leitura em painéis, "Editar ficha" em seções numeradas com
   barra de salvar fixa e telefone com máscara.
6. Listas: turmas, estudantes, usuários (seleção em lote), disciplinas,
   ocorrências — busca, fichas de filtro, ordenação por coluna, colunas
   visíveis (lembradas no navegador), exportar CSV.
7. Lançamento de notas, recuperação e chamada: como professor (grava, com
   "Alterações não salvas" / "Salvo às …") e como direção (somente
   leitura: aviso, campos com aparência de leitura, sem salvar).
8. Diário, resultados da turma e frequência: botão Imprimir (A4 paisagem,
   cabeçalho com escola e data/hora, "Página X de Y").
9. Depois de sair e entrar de novo: aviso "Seu último acesso foi em …".
10. Botão "?" ao lado do título das telas principais; páginas Novidades,
    Suporte, Termos de uso e Privacidade (texto provisório marcado).
11. Vitrine `/dashboard/ui` com os componentes novos.

Componentes novos (`src/components/ui`): `Painel`, `BarraFerramentas`,
`Abas`, `CabecalhoPagina`, `ListaDescritiva`, `Tabela` revisada
(`TH` ordenável, `RodapeTabela`), `IndicadorGravacao`, `RodapeRastreio`,
`BarraSalvar`, `SeletorColunas` + `useColunasVisiveis`, `AjudaTela`,
`CaminhoAutomatico`, `BotaoImprimir` + `CabecalhoImpressao`. Fora de `ui`:
`DashboardTopbar` (barra de contexto), `RodapeSistema`, `AvisoUltimoAcesso`,
`TabelaEstudantes`, `ListaDeTurmas`.

Decisões tomadas sem confirmação: itens 1 a 6 em "Decisões" acima e as das
etapas 5 a 8 (onde faltaria gravar autor, folha de impressão em paisagem,
sugestão de versão 0.2.0 sem alterar o package.json).
