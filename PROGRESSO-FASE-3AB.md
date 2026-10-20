# Progresso — Fases 3a e 3b (papéis e permissões)

Branch: `fase/3ab-papeis` (a partir da `main` em `3b97a43`).
Escopo: `docs/arquitetura/roteiro-de-migracao.md`, fase 3 (só 3a e 3b; a 3c fica de fora).

## Passos

| # | Etapa | Situação |
|---|---|---|
| 0 | Ambiente (npm ci, PostgreSQL, bancos, seeds, backfill da fase 2, testes de base) | ✅ 437 testes na base |
| 3a.1 | `src/lib/permissoes.ts`: lista fechada de permissões, papéis de sistema, conversão booleanos ⇄ papéis + testes; `can()` aceita papéis/permissões | ✅ 452 testes |
| 3a.2 | Schema `Papel`, `PapelPermissao`, `VinculoPapel` + migration | ✅ `20261021120000_papeis_e_vinculos` (só cria) |
| 3a.3 | Backfill `prisma/backfill/fase-3a.ts` (idempotente, com conferência) | ✅ axis_dev: 20 vínculos; 2ª vez 0 |
| 3a.4 | `can()` lê os papéis (sessão com papéis/permissões, atalhos antigos mantidos) | ✅ login carrega `papeis`/`permissoes` |
| 3a.5 | Teste de equivalência (usuários do banco × ações antigas) | ✅ axis_dev 14 usuários / 84 comparações / 0 diferenças; vitest 32 combinações × 5 ações; 459 testes |
| 3b.1 | Escrita dupla (criar/editar usuário grava vínculo e booleanos) | ✅ api/usuarios POST/PUT, portal do estudante, nova escola, seeds |
| 3b.2 | Migrar checagens soltas para `can(user, 'recurso.acao')`, por grupo, com testes por papel | ✅ 536 testes (checagens × 32 combinações, rotas por papel, isolamento, plataforma) |
| 3b.3 | Tela de Usuários: editor de papéis | ⏳ |
| 3b.4 | Capturas (375px e 1440px) | ⏳ |
| 4 | Encerramento + PR | ⏳ |

## Decisões tomadas sem confirmação

### Fase 3a
- **Papel "Administrador da escola" (`ADMINISTRADOR`)** além dos 7 pedidos: `isSuperuser` e `isDirecao` não dão o mesmo acesso hoje (usuários, configurações, auditoria, esquemas, promover/clonar turma e disciplinas são só do superuser). A tabela 2.5.3 permite "papel Administrador da escola"; sem ele a equivalência não fecha.
- **Um booleano = um papel**, sem absorver: a tabela diz "`isStaff` (sem os demais) → Professor", mas na CETEP a direção, o admin e a AEE também têm `isStaff` e usam o que só `isStaff` libera (ex.: "Lançar notas" é `isStaff || isSuperuser`). Então direção com `isStaff` ganha Direção **e** Professor. Assim ninguém ganha nem perde nada.
- **Permissões de legado**: cada permissão que substitui uma checagem antiga é dada exatamente aos papéis antigos que passavam nela (ex.: `nota.lancar` = Administrador + Professor, porque era `isStaff || isSuperuser`). Os atalhos antigos viram permissões: `gestao` = `escola.gerir`, `staff` = `equipe.acessar`, `superuser` = `escola.administrar`, `aee` = `aee.ler`; `staffPuro` = `docencia.exercer` sem `escola.gerir`.
- **Secretaria e Coordenação não recebem os atalhos antigos** (`gestao`, `staff`...): só as permissões finas da tabela 2.5.1. Assim nenhum código que ainda use atalho passa a liberar algo para eles sem querer.
- **Responsável** existe como papel de sistema, sem permissões e fora do editor (o portal da família é da fase 5c). **Estudante** também fica fora do editor: o acesso do estudante continua sendo criado pela tela de Estudantes.
- **Sessão**: no login, `papeis` e `permissoes` vêm dos vínculos vigentes (`inicio ≤ agora < fim`) de papéis de sistema ou da própria escola. Conta sem vínculo (antes do backfill) ou sessão aberta antes do deploy: `can()` deriva os papéis dos booleanos (mesmo resultado). Como hoje com os booleanos, mudança de papel vale no próximo login.
- **`@@unique([usuarioId, escolaId, papelId])`** em `VinculoPapel` (não está no schema-alvo): garante a idempotência do backfill. Escopos por curso/turma (mais de um vínculo do mesmo papel) ficam para quando existirem.
- **Índice único parcial** `papeis_sistema_codigo_key` (código único entre papéis com `escola_id` nulo), escrito à mão na migration: o `@@unique([escolaId, codigo])` não cobre nulos no PostgreSQL.
- `Papel.escola` com `onDelete: Cascade` (papel próprio some com a escola; o padrão do Prisma seria deixar `escola_id` nulo, o que o faria parecer papel de sistema).

## Como retomar
Checkout de `fase/3ab-papeis`, ler esta tabela, continuar do primeiro passo não ✅.
