# Progresso — cadeado de unidade encerrada (branch `logica/cadeado-unidade`)

Sessão sem supervisão. Decisões tomadas sem confirmação ficam marcadas com **[decisão]**.

Ambiente: PostgreSQL 16 local, `axis_dev` e `axis_test` com `timezone = America/Sao_Paulo`, migrations aplicadas, seeds rodados. Base (main): 52 arquivos / 562 testes passando.

## Etapas
- [x] Etapa 1 — defeitos de fuso
- [ ] Etapa 2 — defeito do redirecionamento
- [ ] Etapa 3 — modelo do cadeado
- [ ] Etapa 4 — regra única no servidor e cobertura
- [ ] Etapa 5 — telas
- [ ] Encerramento (PR)

**Próximo passo:** Etapa 2 — `npm run build && npm start`, reproduzir com Playwright (professor em /dashboard/usuarios) e achar a causa.

## Etapa 1 — fuso
- `logAudit` (src/lib/audit.ts) grava UTC verdadeiro (`@default(now())` do Prisma). O caminho alternativo em SQL bruto foi retirado (morto: o modelo `auditLog` sempre existe; e um `Date` do JS passado como parâmetro de SQL bruto é convertido para a hora local do banco — conferido).
- Migration de dados `20261023120000_audit_logs_utc`: `created_at + 3h` em `audit_logs`.
  - **[decisão]** Exceto `entity_type = 'PLATAFORMA_ESCOLA'`: gravado direto pelo Prisma (src/lib/plataforma.ts), sempre em UTC verdadeiro (conferido: o `now()` padrão do Prisma é gerado pelo cliente, em UTC).
- Leitores sem compensação, tudo em America/Sao_Paulo: `historico-leitura.ts` (sem o campo `fuso` e sem o +3h na ordenação), `RodapeRastreio` (sem `fusoAlteracao`), fichas de estudante/usuário, `/dashboard/auditoria` (passou a formatar com `timeZone: 'America/Sao_Paulo'`; antes dependia do fuso do servidor). Não há exportação/PDF que leia AuditLog.
  - De carona: `/dashboard/auditoria` não aguardava `searchParams` (Promise no Next 16), então filtros e paginação não funcionavam.
- `updated_at = NOW()` → `NOW() AT TIME ZONE 'UTC'` em `api/turmas/[id]` e `api/usuarios/[id]`. Também `api/turmas` (POST, caminho alternativo em SQL bruto) passava `new Date()` como parâmetro — mesmo defeito; trocado por `NOW() AT TIME ZONE 'UTC'`. Nenhum outro `$executeRaw`/`$queryRaw` usa NOW()/CURRENT_TIMESTAMP/datas.
  - **[decisão]** Dados antigos de `updated_at` NÃO foram corrigidos (pedido da tarefa): linhas gravadas por esses caminhos em SQL bruto podem ter `updated_at` 3h atrás.
- Teste: `src/lib/audit.test.ts` (logAudit agora → createdAt a menos de 1 min de `Date.now()`, conferido também em SQL contra `NOW() AT TIME ZONE 'UTC'`, com o banco em America/Sao_Paulo).
