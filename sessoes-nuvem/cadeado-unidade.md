Você vai implementar no Áxis (Next.js 16 + Prisma 6 + PostgreSQL, SaaS escolar multi-escola), repositório https://github.com/anndyf/axis, o CADEADO DE UNIDADE ENCERRADA (notas, chamadas, recuperação e conselho trancam quando a unidade fecha; a gestão reabre de forma pontual e auditada) e corrigir três defeitos conhecidos. É uma sessão de LÓGICA: telas só no necessário, seguindo o design system atual (src/components/ui, CabecalhoPagina, Painel, Tabela etc.).

Parta da `main` e crie a branch `logica/cadeado-unidade`; trabalhe só nela. Commits pequenos (mensagens em português, terminando com "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"), push a cada etapa. Ao final, abra um pull request para a `main` (não faça merge).

## Sessão sem supervisão
Ninguém vai acompanhar. Não pare para perguntar: na dúvida, escolha a opção mais restritiva que não tire de ninguém um acesso que já tem hoje fora do cadeado, anote em PROGRESSO-CADEADO.md (raiz) e siga. Mantenha esse arquivo atualizado e commitado a cada etapa.

## Retomada
- Se a branch `logica/cadeado-unidade` já existir no GitHub, faça checkout, leia PROGRESSO-CADEADO.md e continue do próximo passo pendente.
- Commite e dê push com frequência: no máximo a cada 20 minutos de trabalho, mesmo com a etapa pela metade (commit "wip: ..." que compila). Uma execução de retomada agendada considera a sessão parada se o último commit tiver mais de 45 minutos.
- Atualize PROGRESSO-CADEADO.md a cada commit com o próximo passo exato.
- Ao concluir (PR aberto), escreva `STATUS: CONCLUÍDO` no fim de PROGRESSO-CADEADO.md e dê push.

## Verificação
- `npm ci`; suba o PostgreSQL (`sudo apt-get update && sudo apt-get install -y postgresql`, iniciar, senha do postgres). Para reproduzir o ambiente da dona do produto, deixe o banco em horário de Brasília: `ALTER DATABASE axis_dev SET timezone TO 'America/Sao_Paulo'` e o mesmo no axis_test (defeitos de fuso só aparecem assim). Crie axis_dev e axis_test, .env e .env.test locais (não commitar), `npx prisma migrate deploy` nos dois (atenção: o prisma.config.ts lê o .env; para o banco de testes, rode com DATABASE_URL do .env.test exportada ou troque o .env temporariamente); no axis_dev rode `npm run db:seed`, `npx tsx prisma/onboard-escola-teste.ts`, `npx tsx prisma/seed-usuarios-teste.ts`, `npx tsx prisma/seed-calendario.ts`, `npx tsx prisma/seed-frequencia.ts`, `npx tsx prisma/backfill/fase-2.ts` e `npx tsx prisma/backfill/fase-3a.ts`.
- Antes de cada commit: `npx tsc --noEmit` com 0 erros (se reclamar de `.next/dev/types`, apague `.next`) e `npx vitest run` com tudo passando.
- Migrations geradas com `npx prisma migrate diff --from-schema-datamodel <schema anterior> --to-schema-datamodel prisma/schema.prisma --script` (ou `--from-migrations`), revisadas à mão; só aditivas, salvo a correção de dados da etapa 1.
- Conferência ao vivo com Playwright (reaproveite scripts/capturas.ts; navegador Chromium): logins `direcao`/direcao123, `professor`/professor123, `aee`/aee123, `secretaria`/secretaria123 e `coordenacao`/coordenacao123 (prisma/seed-usuarios-teste.ts). Capturas das telas novas/alteradas em docs/capturas/cadeado/, 1440px e 375px.

## Regras obrigatórias
- Toda consulta filtra pela escola da sessão; nada de dado novo ao navegador além do necessário; nunca o registro inteiro de User.
- A regra "só quem leciona grava nota e chamada; Direção e Administrador só visualizam" (src/lib/chamada-acesso.ts, src/lib/avaliacoes-acesso.ts, api/notas/*) continua valendo. O cadeado é uma checagem A MAIS, no servidor, depois dessa.
- A trava de módulos (`exigirModulo`, `rotaDoModulo`, `paginaDoModulo`) e o teste src/lib/modulos/cobertura-modulos.test.ts continuam valendo: rota/página/action nova entra no mapa com a guarda.
- Permissões novas seguem o padrão de src/lib/permissoes.ts (lista fechada, PAPEIS_SISTEMA, conversão de booleanos, testes de permissoes.test.ts e o backfill/equivalência da fase 3a). Se a permissão precisar ser gravada em PapelPermissao, inclua no backfill de forma idempotente e teste que a 2ª execução não altera nada.
- Horários: "hoje" e datas da escola sempre em America/Sao_Paulo (há `hojeNaEscola` em src/lib/services/chamada.ts). Nunca `NOW()` puro em coluna sem fuso.

## Etapa 1. Defeitos conhecidos de fuso
1. `logAudit` (src/lib/audit.ts) grava o horário de Brasília "como se fosse UTC" (soma o deslocamento). Passe a gravar UTC verdadeiro. Corrija os registros antigos com uma migration de dados (`UPDATE audit_logs SET created_at = created_at + interval '3 hours'`; o Brasil não tem horário de verão desde 2019) e retire a compensação dos leitores: src/lib/services/historico-leitura.ts (campo `fuso: 'UTC'`), a tela /dashboard/auditoria e qualquer outro lugar que leia AuditLog.createdAt (procure por `auditLog`, `audit_logs`, exportações e PDFs). Tudo passa a ser exibido com timeZone America/Sao_Paulo. Teste: um logAudit feito agora tem createdAt a menos de 1 minuto de Date.now(), com o banco em America/Sao_Paulo.
2. `updated_at = NOW()` em SQL puro (src/app/api/turmas/[id]/route.ts e src/app/api/usuarios/[id]/route.ts) grava a hora local do banco. Troque por `NOW() AT TIME ZONE 'UTC'` (como em src/lib/ultimo-acesso.ts) ou por gravação via Prisma. Procure TODOS os `$executeRaw`/`$queryRaw`/`$executeRawUnsafe` com NOW() ou CURRENT_TIMESTAMP e corrija. Não corrija dados antigos de updated_at (registre isso).

## Etapa 2. Defeito do redirecionamento
Abrir pelo endereço uma tela sem permissão (ex.: professor em /dashboard/usuarios ou /dashboard/auditoria; AEE em /dashboard/turmas/<id>) mostra "Application error: a client-side exception" com "Rendered more hooks than during the previous render" no `Router` do Next, em vez de levar à tela de destino do `redirect()`. Já existe na main. Faça `npm run build && npm start` e confira se acontece em produção; ache a causa (provável: algo na casca do dashboard — layout, barra superior, providers — que muda a quantidade de hooks quando o `redirect()` de uma página é lançado durante o render; ou um `redirect()` que deveria ser `notFound()`/feito no layout) e corrija. Teste com Playwright: professor abrindo /dashboard/usuarios termina em /dashboard sem erro de página (evento `pageerror`). Registre a causa em PROGRESSO-CADEADO.md.

## Etapa 3. Modelo do cadeado
Decisões da dona do produto (siga):
- ENCERRAMENTO AUTOMÁTICO + MANUAL. A unidade (EtapaCalendario: um esquemaUnidade num ano letivo da escola, com `inicio`, `fim` e `prazoLancamento`) fica encerrada:
  - automaticamente a partir do dia seguinte ao `prazoLancamento` (data em America/Sao_Paulo); sem prazo cadastrado, não encerra sozinha;
  - ou antes, quando a gestão clica em "Encerrar unidade" (grava quando e por quem).
  A gestão pode desfazer um encerramento ANTECIPADO por engano enquanto o prazo não passou (com motivo, auditado). Depois do prazo, só reabertura pontual.
- QUEM ENCERRA E REABRE: Direção e Coordenação. Crie a permissão `unidade.encerrar` para os papéis DIRECAO e COORDENACAO (Administrador da escola NÃO recebe; registre). Motivo obrigatório para reabrir e para desfazer encerramento. Tudo no AuditLog (novo entityType 'UNIDADE').
- REABERTURA POR TURMA E DISCIPLINA, COM PRAZO: a gestão reabre uma unidade encerrada só para uma turma + disciplina (na turma com chamada diária POR_DIA, disciplina nula = chamada diária da turma) até uma data (padrão 7 dias, máximo 30). Passada a data, tranca de novo sozinha. A gestão pode revogar antes. O resto da escola continua trancado.
- O QUE TRANCA (no servidor, em toda gravação):
  - Notas da unidade: NotaUnidade, NotaAtividade, avaliações da disciplina ligadas àquele esquemaUnidade (AvaliacaoDisciplina), marcações de infrequente/não realizou daquela unidade.
  - Chamadas e diário do período: Aula (fazer, editar, cancelar, replicar conteúdo, observação) e Falta, quando a data da aula cai entre `inicio` e `fim` de uma unidade encerrada do esquema da turma. Data fora de qualquer unidade não tranca (registre).
  - Recuperação final e conselho de classe: trancam quando a ÚLTIMA unidade do esquema (maior `ordem`) está encerrada; reabrir a última unidade para a turma+disciplina libera também a recuperação e o conselho daquela turma+disciplina.
  - Planos de ensino NÃO trancam.
  - Operações administrativas que movem notas (transferência/remanejamento de estudante, em api/usuarios/transferir, api/turmas/[id], api/usuarios/[id]) NÃO são bloqueadas; registre onde ficam.
Modelagem sugerida (ajuste se encontrar algo melhor e registre): colunas `encerradaEm`/`encerradaPorId` em EtapaCalendario; tabela `ReaberturaUnidade` (escolaId, etapaCalendarioId, turmaId, disciplinaId opcional, ate, motivo, criadoPorId, criadoEm, revogadaEm, revogadaPorId), índices por escola/etapa/turma.

## Etapa 4. Regra única no servidor e cobertura
- Um único módulo (ex.: src/lib/cadeado-unidade.ts) com: situação de cada unidade (aberta / prazo em dd/mm / encerrada em dd/mm por X / reaberta para você até dd/mm), `podeGravarNotaUnidade(escolaId, turmaId, disciplinaId, esquemaUnidadeId)`, `podeGravarAula(escolaId, turmaId, disciplinaId|null, data)`, `podeGravarRecuperacaoOuConselho(escolaId, turmaId, disciplinaId)`. Resolve o esquema pela turma (turma ?? curso, como `resolverEsquemaAvaliacaoId`). Sem calendário cadastrado para o ano: não tranca (registre).
- Aplique em TODOS os pontos que gravam: comece por src/app/api/notas/lancar, api/notas/recuperacao, api/conselho-classe, src/app/dashboard/chamada/actions.ts, src/lib/services/chamada.ts, src/app/dashboard/notas/avaliacoes/actions.ts, e procure os demais (`grep` por create/update/upsert/delete em notaUnidade, notaFinal, notaAtividade, avaliacaoDisciplina, aula, falta). Resposta de bloqueio: 423 (ou erro de action) com mensagem formal: "A 1ª Unidade foi encerrada em 18/10/2026. Para alterar, solicite a reabertura à coordenação."
- Teste de cobertura no estilo de cobertura-modulos.test.ts: falha se algum arquivo que grava nessas tabelas não chamar o módulo do cadeado (lista explícita de exceções administrativas comentada).
- Testes de integração: encerrada pelo prazo bloqueia; manual antes do prazo bloqueia; desfazer encerramento antecipado libera; reabertura libera só a turma+disciplina dela e só até a data; revogada volta a bloquear; outra escola não é afetada (A × B); chamada de data dentro da unidade encerrada bloqueia e fora não; recuperação/conselho seguem a última unidade; professor sem docência continua bloqueado pela regra antiga mesmo com reabertura; só quem tem `unidade.encerrar` encerra/reabre (professor, secretaria, AEE e Administrador recebem 403).

## Etapa 5. Telas
- Gestão (quem tem `unidade.encerrar`): tela "Encerramento de unidades" junto do calendário letivo (Configurações). Por esquema: cada unidade com período, prazo, situação e ação "Encerrar agora" / "Desfazer encerramento". Painel "Reaberturas": lista das ativas e encerradas (turma, disciplina, até, motivo, quem), botão "Reabrir para turma e disciplina" (turma, disciplina, até, motivo) e "Revogar". Quem só pode ver (Direção sem docência já vê tudo; Secretaria e Administrador) vê a situação sem botões, se tiverem acesso ao calendário hoje.
- Professor e quem lança: no lançamento de notas, coluna/aba da unidade encerrada com ícone de cadeado (lucide `Lock`) e campos em modo leitura (reaproveite o modo somente leitura já existente), com aviso "1ª Unidade encerrada em 18/10/2026. Para alterar, solicite a reabertura à coordenação." e, quando houver reabertura, "Reaberta para você até 25/10/2026". Na chamada e no diário, dias de unidade encerrada sem botão de editar, com cadeado. Recuperação e conselho com o mesmo aviso.
- Painel inicial da gestão: aviso das unidades que encerram nos próximos 7 dias e das reaberturas ativas (reaproveite a área de prazos do painel, src/lib/services/painel-leitura.ts).
- Botão "?" de ajuda (src/lib/produto/ajuda.ts) e entrada em Novidades (src/lib/produto/novidades.ts, na versão do topo) descrevendo o cadeado.

## Encerramento
Em PROGRESSO-CADEADO.md: "Para validar localmente" com o roteiro (como forçar uma unidade encerrada no seed: datas/prazo no calendário; logins e telas a conferir), migrations criadas, permissão nova, lista dos pontos de gravação cobertos e das exceções, causa do defeito do redirecionamento e decisões tomadas sem confirmação. Abra o PR para `main` com esse resumo e marque `STATUS: CONCLUÍDO`.
