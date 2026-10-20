# Progresso — Fases 3a e 3b (papéis e permissões)

Branch: `fase/3ab-papeis` (a partir da `main` em `3b97a43`).
Escopo: `docs/arquitetura/roteiro-de-migracao.md`, fase 3 (só 3a e 3b; a 3c fica de fora).

## Passos

| # | Etapa | Situação |
|---|---|---|
| 0 | Ambiente (npm ci, PostgreSQL, bancos, seeds, backfill da fase 2, testes de base) | ✅ 437 testes na base |
| 3a.1 | `src/lib/permissoes.ts`: lista fechada de permissões, papéis de sistema, conversão booleanos ⇄ papéis + testes; `can()` aceita papéis/permissões | ✅ 452 testes |
| 3a.2 | Schema `Papel`, `PapelPermissao`, `VinculoPapel` + migration | ⏳ |
| 3a.3 | Backfill `prisma/backfill/fase-3a.ts` (idempotente, com conferência) | ⏳ |
| 3a.4 | `can()` lê os papéis (sessão com papéis/permissões, atalhos antigos mantidos) | ⏳ |
| 3a.5 | Teste de equivalência (usuários do banco × ações antigas) + isolamento | ⏳ |
| 3b.1 | Escrita dupla (criar/editar usuário grava vínculo e booleanos) | ⏳ |
| 3b.2 | Migrar checagens soltas para `can(user, 'recurso.acao')`, por grupo, com testes por papel | ⏳ |
| 3b.3 | Tela de Usuários: editor de papéis | ⏳ |
| 3b.4 | Capturas (375px e 1440px) | ⏳ |
| 4 | Encerramento + PR | ⏳ |

## Decisões tomadas sem confirmação

(preenchido a cada etapa)

## Como retomar
Checkout de `fase/3ab-papeis`, ler esta tabela, continuar do primeiro passo não ✅.
