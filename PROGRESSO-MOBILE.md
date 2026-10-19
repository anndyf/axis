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

### 2. Início do professor por turma e disciplina — feito
- [x] Regras puras `src/lib/services/inicio-professor.ts` (teste `inicio-professor.test.ts`): `destaqueDoDia` (aula de agora pelos `TempoAula` do turno da turma; senão a próxima de hoje; senão a primeira de hoje sem chamada), `cartoesDoProfessor` (um cartão por turma × disciplina, com pendências e links), `rotuloTempos` ("1º e 6º tempos"), `horaNaEscola`, `turmasDosCartoes`.
  - A ação "Chamada" do cartão abre hoje se houver aula hoje ainda sem chamada; senão o último dia pendente; senão hoje (revisar) ou o diário. Na chamada diária (POR_DIA), chamada/diário/pendências são da turma.
  - "Notas" abre o lançamento já na disciplina (`/dashboard/notas/lancar/<turma>?disciplina=<id>`; o id só vale se estiver entre as disciplinas liberadas ao usuário naquela turma).
- [x] `pendenciasPorDisciplina` passou a devolver `ultimaPendente`; `resumoProfessor` devolve o turno normalizado de cada aula de hoje.
- [x] Tela: saudação com avatar ("Olá, Nome", data e escola, para todos os perfis), cartão de destaque em azul com botão grande "Fazer chamada", "Aulas de hoje" sem cortar o nome (quebra linha; era o bug "B.", "F."), "Minhas turmas" com fichas de filtro por turma (`ui/Fichas`, rolam de lado no celular) e cartões com selos de chamadas pendentes e alunos sem nota + Chamada · Notas · Diário (44px).
- [x] No celular saem os indicadores (os números já estão nos cartões), "Chamadas pendentes" (idem) e os "Atalhos" (duplicavam a barra inferior) — também nos painéis da gestão e da pedagogia.
- **[decisão]** Para as capturas mostrarem o destaque, apaguei no `axis_dev` local as aulas de hoje de História e Português da 1TIM1 (o seed de frequência marca todas as aulas até hoje como feitas). Só dado local.
- Capturas: `docs/capturas/mobile-2-inicio-professor/`.

### 3. Chamada redesenhada — feito
- [x] **Migration `20261020010000_falta_tempos_observacao_chamada`**: `Falta.tempos Int[]` (padrão `[]`) e modelo `ObservacaoChamada` (aula, aluno, texto, autor; único por aula + aluno; apaga junto com a aula/aluno). **Backfill**: cada falta existente recebe os primeiros `quantidade` tempos da aula (`aula.tempos[1:quantidade]`); chamada diária (aula sem tempos) fica com `[]`. Testada com `migrate deploy` sobre o `axis_dev` já populado (1.087 faltas; nenhuma com `tempos` diferente da quantidade depois) e no `axis_test`.
- [x] `validarFaltas` (pura, `src/lib/services/chamada.ts`): cada falta traz os `tempos` perdidos; todos precisam ser tempos desta aula, sem repetir; `quantidade` = nº de tempos (o motor de frequência continua usando a quantidade). Sem `tempos`, o formato antigo (`quantidade`) segue valendo e grava os primeiros tempos da aula. Na chamada diária, falta por tempo é recusada. Testes novos em `chamada.test.ts`.
- [x] Ação `salvarObservacao(aulaId, estudanteId, texto)`: mesmo acesso da chamada (professor da disciplina ou gestão, escola da sessão), aluno conferido contra a turma da aula, texto vazio apaga, autor gravado. `abrirChamada` devolve faltas com tempos e as observações. Integração em `src/lib/chamada-acoes.test.ts`: tempos gravados, tempo de fora recusado sem apagar a chamada anterior, observação (gravar, gestão editar, apagar), outro professor, escola A × B (aula de A e aluno de A numa aula de B) e conferência de que o portal do aluno não recebe a observação.
- [x] Tela `/dashboard/chamada/fazer`: cartão "Dados da aula" (disciplina sem cortar, turma, dia da semana e data, "1º e 6º tempos", troca de data, "Todos começam presentes; toque em quem faltou."); alunos em cartões tocáveis (toque marca falta: tom suave de erro e "Faltou"); com 2+ tempos, fichas por tempo no cartão de quem faltou (o toque marca todos; desmarcar o último volta para presente); ícone de observação abre bottom sheet (presentes ou faltosos; prévia do texto no cartão); conteúdo ministrado antes do salvar; rodapé fixo acima da barra inferior com "N presentes · N faltas" e "Salvar chamada" largo (a lista ganhou padding equivalente; no desktop o rodapé gruda no fim da área); "Aula não dada" no menu ⋮. Sem senha para gravar.
- [x] `/dashboard/chamada`: aulas do dia em cartões (nome inteiro, turma, tempos, situação, botão largo) e diários em lista de 56px.
- [x] Diário mostra as observações de cada aula (a reorganização por unidade vem na fase 5).
- Capturas: `docs/capturas/mobile-3-chamada/`.
