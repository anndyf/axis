# Progresso — Fases 0, 1 e 2 (segurança, módulos no servidor, assinaturas)

Branch: `fase/0-1-2-seguranca-modulos` (a partir da `main` em `12d556c`).
Escopo: `docs/arquitetura/roteiro-de-migracao.md`, fases 0, 1 e 2.

## Passos

| # | Etapa | Situação |
|---|---|---|
| 0 | Ambiente (npm ci, PostgreSQL, bancos, seeds, testes de base) | ✅ 367 testes na base |
| 0.1 | Fase 0: testes que provam as falhas (PDFs, action, questoes/[id]) | ✅ 7 testes novos, todos falharam antes da correção |
| 0.2 | Fase 0: correções | ✅ 374 testes passando |
| 0.3 | Fase 0: remover `api/public/v1/register`; ano letivo atual no lugar de 2026 fixo | ⬜ |
| 1.1 | Fase 1: infraestrutura `exigirModulo` + mapa de rotas | ⬜ |
| 1.2 | Fase 1: aplicação nas rotas de API | ⬜ |
| 1.3 | Fase 1: actions e páginas + página "módulo indisponível" | ⬜ |
| 1.4 | Fase 1: teste estático de cobertura + teste de comportamento | ⬜ |
| 2.1 | Fase 2: schema + migration + backfill | ⬜ |
| 2.2 | Fase 2: `getModulosAtivos` novo + equivalência + somente leitura | ⬜ |
| 2.3 | Fase 2: painel da plataforma | ⬜ |
| 3 | Encerramento + PR | ⬜ |

## Decisões tomadas sem confirmação

- **Fase 0 / PDFs**: os 3 PDFs passam a exigir `can(user, 'staff')` (toda a equipe: professor, AEE, direção, admin). Não restringi o professor às próprias disciplinas, para não tirar acesso de quem usa hoje.
- **Fase 0 / reportarEstudanteFaltante**: exige `can(user, 'staff')`. Continua no arquivo `simulados/actions.ts` (mudar de lugar fica para a fase de Secretaria).
- **Fase 0 / questoes/[id]**: PUT e DELETE seguem a mesma regra que o POST já tinha — o toggle do banco de questões vale para **professores**; direção e administrador continuam usando (comportamento atual da página e do POST).

## Como retomar
Checkout de `fase/0-1-2-seguranca-modulos`, ler esta tabela, continuar do primeiro passo não ✅.
