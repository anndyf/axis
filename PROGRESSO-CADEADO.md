# Progresso — cadeado de unidade encerrada (branch `logica/cadeado-unidade`)

Sessão sem supervisão. Decisões tomadas sem confirmação ficam marcadas com **[decisão]**.

Ambiente: PostgreSQL 16 local, `axis_dev` e `axis_test` com `timezone = America/Sao_Paulo`, migrations aplicadas, seeds rodados. Base (main): 52 arquivos / 562 testes passando.

## Etapas
- [x] Etapa 1 — defeitos de fuso
- [x] Etapa 2 — defeito do redirecionamento
- [ ] Etapa 3 — modelo do cadeado
- [x] Etapa 4 — regra única no servidor e cobertura
- [x] Etapa 5 — telas
- [x] Encerramento (PR https://github.com/anndyf/axis/pull/19)

**Próximo passo:** nenhum — PR aberto: https://github.com/anndyf/axis/pull/19

## Etapa 1 — fuso
- `logAudit` (src/lib/audit.ts) grava UTC verdadeiro (`@default(now())` do Prisma). O caminho alternativo em SQL bruto foi retirado (morto: o modelo `auditLog` sempre existe; e um `Date` do JS passado como parâmetro de SQL bruto é convertido para a hora local do banco — conferido).
- Migration de dados `20261023120000_audit_logs_utc`: `created_at + 3h` em `audit_logs`.
  - **[decisão]** Exceto `entity_type = 'PLATAFORMA_ESCOLA'`: gravado direto pelo Prisma (src/lib/plataforma.ts), sempre em UTC verdadeiro (conferido: o `now()` padrão do Prisma é gerado pelo cliente, em UTC).
- Leitores sem compensação, tudo em America/Sao_Paulo: `historico-leitura.ts` (sem o campo `fuso` e sem o +3h na ordenação), `RodapeRastreio` (sem `fusoAlteracao`), fichas de estudante/usuário, `/dashboard/auditoria` (passou a formatar com `timeZone: 'America/Sao_Paulo'`; antes dependia do fuso do servidor). Não há exportação/PDF que leia AuditLog.
  - De carona: `/dashboard/auditoria` não aguardava `searchParams` (Promise no Next 16), então filtros e paginação não funcionavam.
- `updated_at = NOW()` → `NOW() AT TIME ZONE 'UTC'` em `api/turmas/[id]` e `api/usuarios/[id]`. Também `api/turmas` (POST, caminho alternativo em SQL bruto) passava `new Date()` como parâmetro — mesmo defeito; trocado por `NOW() AT TIME ZONE 'UTC'`. Nenhum outro `$executeRaw`/`$queryRaw` usa NOW()/CURRENT_TIMESTAMP/datas.
  - **[decisão]** Dados antigos de `updated_at` NÃO foram corrigidos (pedido da tarefa): linhas gravadas por esses caminhos em SQL bruto podem ter `updated_at` 3h atrás.
- Teste: `src/lib/audit.test.ts` (logAudit agora → createdAt a menos de 1 min de `Date.now()`, conferido também em SQL contra `NOW() AT TIME ZONE 'UTC'`, com o banco em America/Sao_Paulo).

## Etapa 2 — redirecionamento
- **Reproduzido em produção** (`npm run build && npm start`): professor abrindo /dashboard/usuarios numa sessão nova → `Minified React error #310` (Rendered more hooks…) em 5 de 8 tentativas; no `next dev`, "Rendered more hooks than during the previous render" no `Router`, intermitente.
- **Causa:** `src/app/loading.tsx` e `src/app/dashboard/loading.tsx` criam fronteiras de Suspense ACIMA das páginas. Com elas, o Next envia o HTML (casca + esqueleto) antes de a página terminar; o `redirect()` de "sem permissão", lançado depois, não vira mais um 307: vira resposta 200 com `<meta http-equiv="refresh" content="1;url=/dashboard">` + `router.replace` no navegador. Quando a navegação do roteador para /dashboard demora mais de ~1s, o meta refresh começa a navegação de página inteira, a busca do roteador é abortada, o roteador cai em navegação MPA (`pushRef.mpaNavigation`, que lança uma promessa no meio dos hooks do `Router`) e uma nova atualização de estado re-renderiza o `Router` com mais hooks → erro #310 / "Application error". Nada na casca (barra, providers) muda hooks; é a corrida entre os dois redirecionamentos, provocada pelo redirect em streaming.
- **Correção:** removidos os dois `loading.tsx` (raiz e painel). O `redirect()` volta a responder 307 antes de qualquer HTML (conferido com curl: 307 → /dashboard) e a navegação sem permissão termina na tela de destino sem erro (0 de 8; script abaixo).
  - **[decisão]** Efeito colateral: na troca de tela dentro do painel não aparece mais o esqueleto de carregamento; a tela anterior fica até a nova chegar, com a barra de progresso do topo (NextTopLoader, já existente). Alternativas (replicar as regras de cada página no layout/proxy) duplicariam as checagens de permissão. `src/app/portal/loading.tsx` foi mantido (fora do painel, não faz parte do defeito relatado).
- Testes: `src/lib/redirecionamento-sem-streaming.test.ts` (falha se voltar a existir loading.tsx na raiz ou dentro de /dashboard) e conferência ao vivo `npx tsx scripts/verificar-redirecionamento.ts` (Playwright; professor em /dashboard/usuarios e /dashboard/auditoria → /dashboard; AEE em /dashboard/turmas/<id> → /dashboard/turmas; sem `pageerror`; 4 repetições cada — 12/12 ok no build de produção).

## Etapa 3 — modelo
- Migration `20261023130000_cadeado_unidade` (só aditiva, gerada com `migrate diff` e revisada; `--from-migrations` × schema sem diferença):
  - `etapas_calendario`: `encerrada_em` (instante UTC) e `encerrada_por_id` (→ users, SET NULL).
  - `reaberturas_unidade`: escola, etapa do calendário (CASCADE), turma (CASCADE), disciplina opcional (CASCADE; nula = chamada diária POR_DIA), `ate` (DATE, inclusive), motivo, `criado_por_id`/`criado_em`, `revogada_em`/`revogada_por_id`. Índices por escola, (etapa, turma) e turma.
- Permissão `unidade.encerrar` (lista fechada em src/lib/permissoes.ts) para DIRECAO e COORDENACAO.
  - **[decisão]** Administrador da escola NÃO recebe (pedido da dona do produto). Quem é Administrador + Direção (como o admin do seed da CETEP) recebe pela Direção.
  - Entre os booleanos antigos, equivale a `isDirecao` (checagens-papeis.test.ts). O backfill da fase 3a grava a permissão em `papeis_permissoes` (garantirPapeisSistema já é idempotente); teste novo em equivalencia-papeis.test.ts: banco sem a permissão → 1ª execução grava só `+unidade.encerrar` em Direção e Coordenação; 2ª execução não altera nada. Rodado no axis_dev.

## Etapa 4 — regra no servidor
- Módulo único `src/lib/cadeado-unidade.ts`: parte pura (`encerramentoDaEtapa`, `podeDesfazerEncerramento`, `reaberturaVigente`, `estadoDaEtapa`, `verificarNotaUnidade`, `verificarAula`, `verificarRecuperacaoOuConselho`, mensagens) + leitura do banco (`contextoCadeado(escolaId, turmaId)`, uma leitura por turma) + as três funções pedidas `podeGravarNotaUnidade`, `podeGravarAula`, `podeGravarRecuperacaoOuConselho` (retornam `{ ok: true } | { ok: false, mensagem }`). Esquema resolvido pela turma (turma ?? curso); ano pelo `anoLetivoDaTurma`; "hoje" por `hojeNaEscola()` (America/Sao_Paulo).
- Recusa: rotas respondem **423** com `{ message }`; actions devolvem `{ erro }` com a mesma mensagem ("A 1ª Unidade foi encerrada em 18/10/2026. Para alterar, solicite a reabertura à coordenação."; "O 2º Bimestre foi encerrado…" para nomes masculinos).
- Ações da gestão em `src/app/dashboard/configuracoes/encerramento/actions.ts` (Núcleo, marcador `@modulo NUC`): `encerrarUnidade`, `desfazerEncerramento` (motivo ≥ 5 caracteres), `reabrirUnidade` (turma + disciplina, até, motivo), `revogarReabertura`. Todas exigem `unidade.encerrar`, escopo na escola da sessão, e gravam no AuditLog com entityType `UNIDADE` (detalhes: operação, unidade, turma, disciplina, até, motivo).

### Pontos de gravação cobertos
| Arquivo | O que tranca |
|---|---|
| `api/notas/lancar` | NotaUnidade, NotaAtividade, NotaAvaliacao e infrequente (isDesistente) de etapa encerrada. O lote é recusado (423) só se mudar algo numa etapa encerrada; sem mudança, a etapa encerrada não é regravada. |
| `api/notas/recuperacao` | recuperação final (última unidade) — conferido para o lote inteiro antes de gravar |
| `api/conselho-classe` | decisões do conselho (última unidade), na validação do lote |
| `dashboard/notas/avaliacoes/actions.ts` | criar, editar e remover AvaliacaoDisciplina da etapa |
| `dashboard/chamada/actions.ts` | abrir (não cria aula em dia trancado; aula existente abre só para leitura, campo `trancada`), salvar chamada (Aula + Falta), cancelar, observação, replicar conteúdo (por destino) |

- `src/lib/services/chamada.ts` é só lógica pura (não grava); a checagem fica nas actions que a usam.
- Teste de cobertura `src/lib/cadeado-cobertura.test.ts`: falha se algum arquivo de src/ gravar em notas_finais/notas_unidades/notas_atividades/notas_avaliacoes/avaliacoes_disciplina/aulas/faltas/observacoes_chamada (Prisma, gravação aninhada ou SQL bruto) sem importar o cadeado e chamar uma checagem.
- **Exceções (não bloqueadas, decisão da dona do produto)**: `api/usuarios/transferir` (transfere a autoria `modifiedById` das notas), `api/usuarios/[id]` (exclusão de conta: `modifiedById` → null), `api/turmas/[id]` (exclusão da turma com as notas). Falsos positivos do detector: `lib/services/esquemas-padrao.ts` e `lib/services/esquemas-avaliacao.ts` (criam atividades do TEMPLATE do esquema). Exclusões em cascata (turma/disciplina/estudante apagados) também não passam pelo cadeado.
- **[decisão]** Não trancam: justificativas/atestados (`dashboard/frequencia/actions.ts`; não fazem parte da lista), planos de ensino, horário da turma.
- **[decisão]** Sem calendário cadastrado para o ano, turma sem esquema, etapa sem datas no calendário, ou data de aula fora de qualquer etapa: não tranca.
- **[decisão]** Desfazer encerramento de unidade SEM prazo cadastrado: permitido a qualquer momento (o prazo nunca "passa").
- **[decisão]** Reabertura: só de unidade efetivamente encerrada; `ate` entre hoje e hoje + 30 dias (inclusive); a turma precisa seguir o esquema da unidade no mesmo ano letivo; disciplina nula só em turma POR_DIA; uma reabertura ativa por (unidade, turma, disciplina) — para mudar a data, revogar e criar outra. Revogar não pede motivo (a tarefa pede motivo só para reabrir e desfazer).
- **[decisão]** Conselho de classe e recuperação final trancam quando a última unidade está encerrada, como pedido. Consequência prática: se o conselho acontece depois do prazo da última unidade, a gestão precisa reabrir a última unidade para a turma + disciplina (ou cadastrar o prazo depois da data do conselho).
- **[decisão]** "Encerrar agora" não pede motivo (a tarefa não pede); fica no AuditLog com quem e quando.
- Testes: `src/lib/cadeado-unidade.test.ts` (puro) e `src/lib/cadeado-acoes.test.ts` (integração, "hoje" = 21/10/2026): encerrada pelo prazo bloqueia (423 + mensagem); sem prazo não encerra; infrequente tranca; manual antes do prazo bloqueia (com auditoria); desfazer exige motivo e libera, e não vale depois do prazo; reabertura libera só turma + disciplina e só até a data (tranca de novo no dia seguinte); revogada volta a bloquear; escola A × B; chamada dentro da unidade encerrada bloqueia (abrir, salvar, cancelar, observação) e fora não; reabertura libera a chamada da disciplina; recuperação e conselho seguem a última unidade (reabrir a última libera só a turma + disciplina); avaliações do professor; professor sem docência e Direção continuam 403 mesmo com reabertura; professor, secretaria, AEE e Administrador recebem "Não autorizado" nas ações da gestão.

## Etapa 5 — telas
- **Encerramento de unidades** (`/dashboard/configuracoes/encerramento`, Núcleo): por esquema, cada unidade com período, situação (aberta · prazo em dd/mm / encerrada em dd/mm por X ou "(prazo)") e ação "Encerrar agora" / "Desfazer encerramento" / "Reabrir". Painel "Reaberturas" (ativas; "Mostrar encerradas" lista vencidas e revogadas) com turma, disciplina, unidade, até, motivo, quem, situação e "Revogar"; botão "Reabrir para turma e disciplina" (unidade encerrada, turma do esquema, disciplina ou "Chamada diária" em turma POR_DIA, até — padrão +7, máx. +30 —, motivo).
  - Acesso: `unidade.encerrar` (Direção, Coordenação) age; `calendario.gerenciar` (Secretaria, Administrador) só vê, sem botões. Item novo no menu (grupo Configurações), atalho em Configurações e botão no Calendário letivo.
  - Ao navegador vão só nomes de unidade/esquema/turma/disciplina, datas, motivo e o nome de quem fez (nada de registro de User).
- **Lançamento de notas**: a API de leitura (`api/notas/turma/.../disciplina/...`) devolve `cadeado` por unidade; colunas de unidade encerrada com `Lock` e campos em modo leitura (mesmo visual do "somente leitura"), aviso "1ª Unidade encerrada em …" e, com reabertura, "Reaberta para você até …".
- **Chamada**: dia de unidade encerrada abre só para leitura (aula existente) ou mostra o aviso com cadeado (sem aula); sem salvar, "aula não dada" nem replicar. **Diário**: dias encerrados sem "Editar", com cadeado (também nos dias pendentes).
- **Recuperação final e conselho**: aviso com cadeado por disciplina e campos/decisões desabilitados; o conselho não envia decisões de disciplina trancada.
- **Painel da gestão**: seção "Encerramento de unidades" junto do Calendário — unidades que encerram sozinhas nos próximos 7 dias e reaberturas ativas (`avisosDoCadeado` em `painel-leitura.ts`, testado).
- Ajuda "?" (`ajuda.ts`: tela nova + passos em notas, chamada, diário, recuperação e conselho) e Novidades 0.1.0 ("Cadeado de unidade encerrada").
- Capturas (build de produção, 1440 e 375px, sem `pageerror`): `docs/capturas/cadeado/` — painel-gestao, encerramento-direcao, encerramento-reabrir, encerramento-coordenacao, encerramento-secretaria-leitura, notas-encerradas, notas-reaberta, chamada-dia-encerrado, diario-encerrado, recuperacao-encerrada, conselho-encerrado.

## Para validar localmente
1. `npm ci`; PostgreSQL com `axis_dev` e `axis_test` em `ALTER DATABASE … SET timezone TO 'America/Sao_Paulo'`; `.env`/`.env.test` locais; `npx prisma migrate deploy` nos dois.
2. No axis_dev: `npm run db:seed`, `npx tsx prisma/onboard-escola-teste.ts`, `npx tsx prisma/seed-usuarios-teste.ts`, `npx tsx prisma/seed-calendario.ts`, `npx tsx prisma/seed-frequencia.ts`, `npx tsx prisma/backfill/fase-2.ts`, `npx tsx prisma/backfill/fase-3a.ts` (grava `unidade.encerrar` em Direção e Coordenação) e **`npx tsx prisma/seed-cadeado.ts`** (novo).
   - **Como forçar unidade encerrada**: o seed-cadeado define `prazoLancamento = fim da etapa + 7 dias` onde não há prazo. Com o calendário do seed (3 unidades: 02/02–15/05, 18/05–28/08, 31/08–18/12) a 1ª e a 2ª Unidade ficam encerradas pelo prazo a partir de 23/05 e 05/09/2026; a 3ª segue aberta (prazo 25/12). Também cria uma reabertura de 1TIM1 · Português · 2ª Unidade por 4 dias. Para outros cenários, edite o prazo em Calendário letivo (prazo no passado = encerrada desde o dia seguinte) ou use "Encerrar agora".
3. `npx tsc --noEmit` e `npx vitest run` (57 arquivos, 597 testes, todos passando nesta sessão).
4. `npm run build && npm start` e:
   - `direcao`/direcao123 ou `coordenacao`/coordenacao123: Painel (seção Encerramento de unidades), Configurações → Encerramento de unidades (encerrar a 3ª, desfazer com motivo, reabrir para turma e disciplina, revogar); Auditoria → filtro UNIDADE.
   - `secretaria`/secretaria123: mesma tela, só leitura. `aee`/aee123 e `professor`/professor123 não têm o item no menu (endereço direto → /dashboard).
   - `professor`/professor123: Lançar notas → 1TIM1 → História (1ª e 2ª com cadeado) e Português (2ª reaberta); Chamada de 24/08/2026 em História (aviso de cadeado); Diário de História (dias com cadeado); Recuperação final (encerre a 3ª antes).
   - `npx tsx scripts/capturas-cadeado.ts` refaz as capturas; `npx tsx scripts/verificar-redirecionamento.ts` confere o defeito da Etapa 2.

## Resumo
- Migrations: `20261023120000_audit_logs_utc` (correção de dados do AuditLog, +3h exceto PLATAFORMA_ESCOLA) e `20261023130000_cadeado_unidade` (só aditiva).
- Permissão nova: `unidade.encerrar` (Direção, Coordenação; Administrador não).
- Pontos de gravação cobertos, exceções e decisões: ver Etapa 4. Causa do redirecionamento: ver Etapa 2.

STATUS: CONCLUÍDO
