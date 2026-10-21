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
- [ ] 3. Fichas com abas (turma, estudante, usuário, AEE)
- [ ] 4. Listas e telas de trabalho
- [ ] 5. Rastreabilidade visível
- [ ] 6. Formulários e tabelas com rigor
- [ ] 7. Acabamento de produto maduro
- [ ] 8. Impressão

## Próximo passo exato

Etapa 3 (fichas com abas): turma em `src/app/dashboard/turmas/[id]/` com
layout de ficha (CabecalhoPagina + Abas) e rotas filhas que reaproveitam as
páginas existentes; depois estudante, usuário e ficha AEE.

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
