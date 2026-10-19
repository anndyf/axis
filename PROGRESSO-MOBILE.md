# Progresso — sessão mobile e fluxo do professor (branch `melhorias/mobile-professor`)

Sessão sem supervisão. Decisões tomadas sem confirmação ficam marcadas com **[decisão]**.

Base: `main` (o PR #5, `claude/zen-goldberg-frtkn3`, já estava mergeado).

Ambiente: PostgreSQL 16 local; `axis_dev` migrado e populado (seed, Horizonte, usuários de teste, calendário, frequência); `axis_test` migrado. Linha de base: `tsc` 0 erros, 304 testes passando.

Capturas: `npx tsx scripts/capturas.ts <fase>` com `npm run dev` rodando (`CHROMIUM_PATH=/opt/pw-browsers/chromium`). Agora em 375, 390 e 1440px; `CAPTURAS_TEMA=dark` gera as versões `-escuro`; `CAPTURAS_TELAS=a,b` e `CAPTURAS_LARGURAS=375` restringem a rodada.

## Linha de base (antes)
- Capturas: `docs/capturas/mobile-0-antes/`.
- Problemas vistos em 375px: no início do professor a lista "Aulas de hoje" está ok no seed atual, mas a linha usa `truncate` + selo à direita, o que corta nomes longos; lista longa de atalhos no fim duplica o menu; na chamada o nome do aluno com falta e controles de quantidade fica cortado ("Bea..."), e a barra "Salvar chamada" é `sticky` e cobre a lista.

## Fases

### 1. Navegação mobile — feito
- [x] Regra pura `src/lib/services/navegacao-mobile.ts` (teste `navegacao-mobile.test.ts`): perfil a partir de `visoesDoUsuario()` (administração → gestão; professor; só pedagogia → AEE; portal), itens da barra a partir de `modulosVisiveis()` (mesma regra do menu lateral, inclusive módulos fora do plano), "Mais" = módulos visíveis que não estão na barra, e `itemAtivo()` (prefixo mais longo; Início só na rota exata).
  - Professor: Início · Chamada · Notas · Diário · Mais. Gestão: Início · Turmas · Frequência · Resultados · Mais. AEE: Início · Estudantes · Mensagens · Mais. Portal: Início · Boletim · Frequência · Horário · Mais.
  - **[decisão]** "Estudantes" do AEE aponta para `/dashboard/aee` (lista do atendimento): o AEE não abre o cadastro geral de estudantes.
  - **[decisão]** "Diário" abre `/dashboard/chamada/diario`, que sem turma agora lista os diários do usuário por turma (antes redirecionava para a chamada).
- [x] `BarraInferior` (fixa abaixo de md, ícone + rótulo, ativo em destaque com pílula suave, `env(safe-area-inset-bottom)`), `MenuMais` (bottom sheet com módulos em grade, Buscar, Meu perfil, Trocar senha, tema claro/escuro/sistema, Sair) e `BottomSheet` em `src/components/ui` (alça, foco preso, Esc, toque fora, arrastar para baixo). Foco preso extraído para `ui/foco.ts` (o `Dialog` usa o mesmo).
- [x] Variável CSS `--barra-inferior` (globals.css, só quando a barra existe): o conteúdo ganha esse padding e as barras fixas/avisos existentes (toast, conselho de classe, matriz, usuários, questões, notificação de mensagem) sobem o mesmo tanto.
- [x] Cabeçalho mobile: avatar no início nas telas raiz, botão voltar (44px) nas subtelas (migalha de cima; um diário aberto volta à lista), título da tela e mensagens. Sem o botão de menu: o menu lateral não existe abaixo de md.
  - **[decisão]** "avatar no início" lido como: o avatar fica no começo do cabeçalho nas telas raiz; nas subtelas o lugar dele é do botão voltar (padrão das referências).
- [x] Campos (`Input`, `Select`, `Textarea`) com fundo cinza preenchido e texto de 16px no celular (evita zoom do iOS).
- [x] Portal: abas Início · Boletim · Frequência · Horário na barra inferior (aba na URL, `?aba=`), "Mais" com Avisos, Meu perfil, tema e Sair. Frequência por disciplina e horário por dia viraram abas em cartões (o horário era um modal com tabela larga).
- Sem contador de mensagens não lidas na barra (fica no sino do cabeçalho e no menu lateral).
- Capturas: `docs/capturas/mobile-1-navegacao/` (375, 390, 1440 e `-escuro` em 375).
