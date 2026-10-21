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
- [ ] 2. Casca (largura, barra superior de contexto, menu lateral compacto)
- [ ] 3. Fichas com abas (turma, estudante, usuário, AEE)
- [ ] 4. Listas e telas de trabalho
- [ ] 5. Rastreabilidade visível
- [ ] 6. Formulários e tabelas com rigor
- [ ] 7. Acabamento de produto maduro
- [ ] 8. Impressão

## Próximo passo exato

Etapa 2: em `src/app/dashboard/layout.tsx` tirar o `max-w-[1400px]` e usar
`px-pagina py-pagina-y`; nova barra superior de 48px em
`src/components/DashboardTopbar.tsx` (escola, "Ano letivo 2026" só exibido,
perfil/visão, busca Ctrl+K, notificações, usuário); caminho automático acima
do conteúdo, escondido quando a tela usa `CabecalhoPagina`; menu lateral
compacto (`DashboardSidebar.tsx`); remover `max-w-*` estreitos das páginas de
trabalho.

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
