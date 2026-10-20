# Progresso — Fases 0, 1 e 2 (segurança, módulos no servidor, assinaturas)

Branch: `fase/0-1-2-seguranca-modulos` (a partir da `main` em `12d556c`).
Escopo: `docs/arquitetura/roteiro-de-migracao.md`, fases 0, 1 e 2.

## Passos

| # | Etapa | Situação |
|---|---|---|
| 0 | Ambiente (npm ci, PostgreSQL, bancos, seeds, testes de base) | ✅ 367 testes na base |
| 0.1 | Fase 0: testes que provam as falhas (PDFs, action, questoes/[id]) | ✅ 7 testes novos, todos falharam antes da correção |
| 0.2 | Fase 0: correções | ✅ 374 testes passando |
| 0.3 | Fase 0: remover `api/public/v1/register`; ano letivo atual no lugar de 2026 fixo | ✅ |
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
- **Fase 0 / register**: `api/public/v1/register` só respondia 403 e nada no código o chamava → removido.
- **Fase 0 / ano letivo**: helper `anoLetivoAtualDaEscola(escolaId)` em `src/lib/data-fetching.ts` (configuração da escola; sem ela, o ano do calendário). Trocado em `api/simulados` (leitura e gravação de `NotaSimulado` e responsáveis), `api/simulados/responsaveis` (padrão de GET e POST), `turmas/[id]/promover` (`|| 2026`), páginas `simulados` e `simulados/responsaveis`, action `getTurmasForSelect` e a criação de `GlobalConfig` na página de questões. Como a CETEP está com o ano atual configurado em 2026, nada muda para ela. Mantidos: o seletor de anos 2024–2027 da matriz (tela) e o `@default(2026)` do schema (sai na fase 4). O "___/___/2026" do cabeçalho de prova impressa virou o ano corrente.
- **Achado extra (corrigido)**: `getTurmasForSelect` (mensagens) não filtrava por escola — a gestão via turmas de todas as escolas. Agora filtra; teste novo no isolamento (falhou antes, passa depois).
- **Achado anotado (não corrigido)**: `reportarEstudanteFaltante` monta HTML com o nome digitado sem escapar. Hoje o conteúdo principal não é renderizado como HTML bruto (a tela de pendências extrai os campos por expressão regular), então não há injeção ativa; fica para a mudança de lugar dessa action.

## Como retomar
Checkout de `fase/0-1-2-seguranca-modulos`, ler esta tabela, continuar do primeiro passo não ✅.
