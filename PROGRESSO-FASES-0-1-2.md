# Progresso — Fases 0, 1 e 2 (segurança, módulos no servidor, assinaturas)

Branch: `fase/0-1-2-seguranca-modulos` (a partir da `main` em `12d556c`).
Escopo: `docs/arquitetura/roteiro-de-migracao.md`, fases 0, 1 e 2.

## Passos

| # | Etapa | Situação |
|---|---|---|
| 0 | Ambiente (npm ci, PostgreSQL, bancos, seeds, testes de base) | ⏳ |
| 0.1 | Fase 0: testes que provam as falhas (PDFs, action, questoes/[id]) | ⬜ |
| 0.2 | Fase 0: correções | ⬜ |
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

(preenchido ao longo da sessão)

## Como retomar
Checkout de `fase/0-1-2-seguranca-modulos`, ler esta tabela, continuar do primeiro passo não ✅.
