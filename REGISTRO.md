# Registro de atividades do Áxis

Diário do que foi feito, do que está rodando e do que vem a seguir. Fica na branch `registro`, atualizada a cada ação (sem PR).

- Ver no navegador: https://github.com/anndyf/axis/blob/registro/REGISTRO.md
- Ver no VS Code de outro computador: `git fetch origin` e depois `git show origin/registro:REGISTRO.md` (ou abrir a branch `registro`).
- Como montar o ambiente e as regras do projeto: `CONTINUAR.md` na `main`.

> **Para o Claude (em qualquer computador):** leia este arquivo e o `CONTINUAR.md` ao começar. A cada ação relevante (merge, sessão da nuvem iniciada ou concluída, validação, correção, decisão da dona do produto), atualize as seções "Agora" e "Histórico" (com data), faça commit e push direto na branch `registro`, sem PR. Não altere a `main` por causa deste arquivo.

---

## Agora

**Rodando na nuvem**
- Nada no momento. As retomadas agendadas de 21/10 já dispararam (a das 00:00–06:00 concluiu a etapa 8 e abriu o PR #17).

**Esperando merge da dona do produto**
- Branch `versao/0.2.0`: número da versão 0.1.0 → 0.2.0 (rodapé e tela Novidades). https://github.com/anndyf/axis/pull/new/versao/0.2.0

**Pronto para iniciar quando quiser**
- Sessão de lógica (depois do layout): fechamento de unidade com cadeado em notas e chamadas, reabertura pela direção auditada. Instrução ainda a escrever.

**Para elaborar no futuro (pedido da dona do produto)**
- Telas de cadastro do estudante e da secretaria escolar (fase 5 do roteiro). Requisito: a Secretaria NÃO vê as fichas AEE, mas no cadastro do estudante pode anexar laudo e informar a condição (deficiência/necessidade), que alimenta o AEE. Definir na fase 5 quem lê o laudo anexado (dado sensível de saúde, LGPD art. 11 e 14).

**Esperando decisão da dona do produto**
- As 20 decisões de `docs/arquitetura/decisoes.md`. As 5 mais urgentes: D-03 (público-alvo), D-01 (núcleo e módulos), D-14 (quando a CETEP migra para matrícula por ano), D-06 (etapas de ensino no lançamento), D-04 (redes agora ou depois).
- Preços dos planos (a fase 2 criou os planos com preço zerado).

**Defeitos conhecidos (a corrigir em sessão própria)**
- Abrir pelo endereço uma tela sem permissão mostra "Application error" em vez de voltar ao início (React: "Rendered more hooks than during the previous render" no Router do Next ao redirecionar). Já existe na main; visto no modo desenvolvimento, falta conferir no build de produção.
- Fuso de horário em gravações feitas direto em SQL: o `logAudit` grava o horário de Brasília como se fosse UTC (o Histórico compensa na tela) e `updated_at = NOW()` em `api/turmas/[id]` e `api/usuarios/[id]` grava a hora local do banco. O último acesso já foi corrigido no PR #17.

**Próximos passos**
1. Merge da branch `versao/0.2.0`.
2. Iniciar na nuvem a sessão do cadeado (`sessoes-nuvem/cadeado-unidade.md`), que também corrige os defeitos conhecidos acima.
3. Fase 3c depois: remover os booleanos de User, tirar a conta da plataforma da escola, trocar as consultas que ainda filtram por booleano (ex.: destinatários de comunicados).
4. Fases seguintes do roteiro conforme as decisões.
5. Em produção (quando houver): `prisma migrate deploy`, depois `npx tsx prisma/backfill/fase-2.ts` e `npx tsx prisma/backfill/fase-3a.ts`, com backup verificado.

---

## Histórico

### 21/10/2026
- Decisões do cadeado de unidade: encerra automaticamente no dia seguinte ao prazo de lançamento do calendário e a gestão pode encerrar antes; Direção e Coordenação encerram e reabrem (nova permissão `unidade.encerrar`; Administrador não), com motivo e auditoria; reabertura por turma + disciplina com prazo (padrão 7 dias, máx. 30), que tranca de novo sozinha; tranca notas da unidade, chamadas/diário do período, e recuperação/conselho quando a última unidade encerra; planos de ensino não trancam. Instrução da sessão escrita (`sessoes-nuvem/cadeado-unidade.md`).
- PR #17 (layout de sistema + regra "só quem leciona grava") mergeado na main.
- Versão decidida: 0.2.0 (branch `versao/0.2.0`, esperando merge; tsc 0 erros, 562 testes).
- Sessão do layout de sistema concluída na nuvem (PR #17); a retomada agendada terminou a etapa 8 (impressão) depois que a sessão principal parou pelo limite. Inclui a regra "só quem leciona grava".
- Validação local do PR #17: migration `20261022120000_acesso_anterior` só acrescenta uma coluna; tsc 0 erros; 562 testes passando; lógica de acesso e rotas de API idênticas à regra já validada; varredura com direção, professor e AEE em 26 telas, a 1440px e 375px (156 aberturas): todas 200, sem erro de JavaScript, sem rolagem horizontal; celular continua com cara de app. Aba Histórico restrita à escola e à permissão da auditoria; aba AEE só com módulo, ficha e permissão.
- Duas correções feitas na validação e enviadas ao PR #17: (1) o último acesso gravava a hora com 3h de diferença quando o banco não está em UTC (`NOW()` numa coluna sem fuso) — teste agora confere os dois sentidos; (2) a aba Ocorrências da turma e o livro de ocorrências quebravam ("ocorrencias.map is not a function") quando abertos pelo endereço por quem não tem a permissão (ex.: AEE) — agora redirecionam.
- Confirmado que o PR #17 fecha um vazamento existente na main: a tela "Vincular disciplinas" enviava ao navegador o registro inteiro do usuário, com o hash da senha.
- Encontrado defeito antigo (também na main): tela sem permissão aberta pelo endereço mostra "Application error" em vez de redirecionar. Anotado em "Defeitos conhecidos".

### 20/10/2026
- Sessão do layout de sistema preparada para a noite, com 4 retomadas automáticas agendadas (00:00, 02:00, 04:00, 06:00).
- Implementada a regra "só quem leciona grava nota e chamada" (branch `regra/so-docente-grava`): vale para qualquer papel; Direção e Administrador visualizam (tela de chamada mostra "Ver diário", diário e calendário sem edição, lançamento de notas e recuperação em modo somente leitura); quem é da direção e dá aula grava só onde leciona. Corrigida também uma brecha antiga: qualquer professor gravava a recuperação final de disciplina de outro. 541 testes passando; conferido ao vivo com direção e professor.
- Decisões sobre papéis: (1) Direção NÃO lança notas nem faz chamada, apenas visualiza (a implementar); (2) Coordenação decide no conselho de classe: confirmado; (3) Coordenação NÃO faz chamada: confirmado; (4) Secretaria não vê fichas AEE, mas poderá anexar laudo e condição no cadastro do estudante (anotado para as telas de cadastro/secretaria).
- PR #15 (fases 3a+3b) mergeado na main. Panorama dos papéis: Administrador da escola, Direção, Secretaria, Coordenação, Professor, AEE, Estudante, Responsável (sem portal ainda) e a conta da Plataforma (fora dos papéis até a 3c). Lista de permissões em `src/lib/permissoes.ts`.
- Fases 3a+3b concluídas na nuvem (PR #15) e validadas localmente: migration `20261021120000_papeis_e_vinculos` só cria tabelas; backfill `fase-3a.ts` com 16 usuários, 94 comparações e 0 diferenças, e a 2ª execução não altera nada; 536 testes passando (eram 437); sem conflito com a main. Conferido ao vivo: menus de direção, professor e AEE idênticos aos da main; novos logins `secretaria` e `coordenacao` com menus próprios. Só o papel Administrador da escola (= superuser) gerencia usuários. A sessão corrigiu dois vazamentos entre escolas ("Desativar todos os portais" e destinatários/e-mail de comunicado geral). Decisões dela a conferir: papel extra "Administrador da escola"; direção recebe também o papel Professor (porque tem isStaff); Coordenação sem chamada; campo "senha inicial" removido do cadastro (o servidor já ignorava).
- Deliberado o que dá cara de sistema robusto: entram na sessão do layout a rastreabilidade visível (criado/alterado por, aba Histórico, "Salvo às"), máscaras e seções nos formulários, tabelas com ordenação e colunas, troca de emojis por ícones, linguagem formal, rodapé com versão/suporte/privacidade, "Novidades", último acesso após o login, ajuda "?" por tela e impressão. Documentos oficiais ficam na fase 9; o cadeado de unidade encerrada vira sessão de lógica própria.
- Deliberado o layout "cara de sistema" no computador (celular continua com cara de app): densidade equilibrada, painéis com borda, barra de ferramentas nas listas, fichas com abas (turma, estudante, usuário, AEE), conteúdo na largura toda. Barra superior só EXIBE o ano letivo; o seletor de consulta de anos anteriores fica para a fase 6, com somente leitura, faixa de aviso e volta automática ao ano atual (preocupação de usabilidade da dona do produto).
- Decidido rodar as fases 3a + 3b juntas na nuvem (3c depois da validação, por ser a única que remove coisas).
- Fases 0, 1 e 2 mergeadas (PR #14) e validadas localmente: migration `20261020120000_planos_e_assinaturas` aplicada nos dois bancos; backfill `prisma/backfill/fase-2.ts` criou 3 planos e 2 assinaturas, equivalente nas duas escolas, e na 2ª execução não criou nada; 437 testes passando. Conferido ao vivo: com o módulo de provas desligado na Horizonte, o menu some, a página mostra "Módulo indisponível" e a API responde 403; na CETEP nada muda. Inclui as correções de segurança da fase 0 (PDFs e `reportarEstudanteFaltante` exigem papel; questões conferem o módulo) e a trava `exigirModulo` em todas as rotas, actions e páginas, com teste que falha se alguma ficar de fora.
- Revisão de arquitetura concluída na nuvem e mergeada (PR #12): inventário, domínio-alvo, personalização, módulos e planos, roteiro de migração em 12 fases, 20 decisões, schema-alvo. Apontou 3 possíveis falhas de segurança (PDFs sem checagem de papel, `reportarEstudanteFaltante` sem papel, módulos pagos sem trava no servidor), que entram na fase 0.
- Tipografia: fonte Inter no lugar da Geist, `font-bold` limitado a 600, títulos com peso 600 (PR #11, mergeado). Escolha da dona do produto: opção B da comparação, "o mais próximo de sistemas de gestão acadêmica".
- Documento de passagem entre computadores `CONTINUAR.md` e instruções prontas em `docs/sessoes-nuvem/` (PR #13, mergeado).
- Iniciada na nuvem a sessão das fases 0, 1 e 2.
- Criada esta branch `registro`.

### 19/10/2026
- Menu lateral azul-marinho #0F1D3D nos temas claro e escuro (PR #10).
- Recuperação final mostra "precisa X" por aluno, calculado pelo motor de notas nos três modos de recuperação; subtotal e textos sem o 5 fixo; temporizador de sessão sem derrubar a tela (PR #9). 367 testes.
- Mobile com cara de app, inspirado no SIGEduc e nas referências (PR #8): barra inferior por perfil, início do professor por turma e disciplina, chamada em cartões com falta por tempo e observação por aluno, calendário da disciplina com legenda, diário por unidade, "Salvar e replicar" conteúdo, notas e portal em cartões. Migration `20261020010000_falta_tempos_observacao_chamada`.
- Painel da plataforma: conta da plataforma protegida contra tomada por superuser da escola, acesso conferido no banco, criação de escola completa e auditada; PDFs com o mínimo do esquema (PR #7).
- Visual premium, etapa 2 (PR #5): marca azul Áxis #205EE6, painel inicial por perfil.
- Revisão de arquitetura iniciada na nuvem com retomada agendada para 23:51.

### 18/10/2026 e antes
- Projeto clonado, ambiente local montado (PostgreSQL 17 na porta 5433, bancos `axis_dev` e `axis_test`, usuários de teste em `LOGINS_TESTE.md`).
- Regra de avaliação configurável (formas de cálculo, pesos, recuperação), notas por etapa em todas as telas, remoção das colunas legadas `nota_1/2/3`.
- Segurança P0: redefinição de senha por link, limite de tentativas de login, troca obrigatória de senha, cabeçalhos HTTP, CI no GitHub Actions, teste de isolamento entre escolas (cerca de 40 vazamentos corrigidos).
- Calendário letivo, tempos de aula e horário com disciplina e professor.
- Na nuvem: chamada e frequência completas, diário de classe, atividades do professor, lançamento de notas atômico (branch `melhorias/logica-frequencia`); design system, identidade da escola, login novo, tema escuro, busca Ctrl+K e CSP (visual premium, etapa 1).
