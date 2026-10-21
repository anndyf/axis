# Progresso — cadeado de unidade encerrada (branch `logica/cadeado-unidade`)

Sessão sem supervisão. Decisões tomadas sem confirmação ficam marcadas com **[decisão]**.

Ambiente: PostgreSQL 16 local, `axis_dev` e `axis_test` com `timezone = America/Sao_Paulo`, migrations aplicadas, seeds rodados. Base (main): 52 arquivos / 562 testes passando.

## Etapas
- [x] Etapa 1 — defeitos de fuso
- [x] Etapa 2 — defeito do redirecionamento
- [ ] Etapa 3 — modelo do cadeado
- [ ] Etapa 4 — regra única no servidor e cobertura
- [ ] Etapa 5 — telas
- [ ] Encerramento (PR)

**Próximo passo:** Etapa 4 — testes puros (src/lib/cadeado-unidade.test.ts) e de integração (src/lib/cadeado-acoes.test.ts) do cadeado.

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
