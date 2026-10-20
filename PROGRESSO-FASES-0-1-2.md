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
| 1.1 | Fase 1: infraestrutura `exigirModulo` + mapa de rotas | ✅ |
| 1.2 | Fase 1: aplicação nas rotas de API | ✅ (páginas também) |
| 1.3 | Fase 1: actions e páginas + página "módulo indisponível" | ✅ |
| 1.4 | Fase 1: teste estático de cobertura + teste de comportamento | ✅ 402 testes |
| 2.1 | Fase 2: schema + migration + backfill | ✅ migration `20261020120000_planos_e_assinaturas`; `prisma/backfill/fase-2.ts` |
| 2.2 | Fase 2: `getModulosAtivos` novo + equivalência + somente leitura | ✅ 420 testes |
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

### Fase 1
- **Forma das guardas**: rotas usam `export const GET = rotaDoModulo('NOT', 'leitura', async function GET(...) {...})` (o acesso é explícito: GET = leitura; POST que só consulta, como `questoes/check-duplicate`, também é leitura). Server actions não usam envoltório porque arquivos `"use server"` só podem exportar funções async: a primeira linha de cada ação é `const bloqueado = await bloqueioDoModulo('DIA', 'escrita'); if (bloqueado) return { erro: bloqueado }` (chave `error` em `schedule-actions.ts`, que já usava esse formato). Páginas: `await paginaDoModulo('X')` na primeira linha. Arquivos de action do Núcleo e as 3 páginas cliente do Núcleo levam o marcador `@modulo NUC` (o Núcleo está sempre ativo).
- **Estados na fase 1**: derivados do `getModulosAtivos` atual. Hoje o menu só desliga itens com `planoMinimo`, então só **QST, PRV e FIN** podem ficar inativos; todos os outros módulos ficam ATIVO (nenhuma escola perde nada). PRV fica ativo se `provas` **ou** `simulados` estiver ativo (conservador).
- **Exceção herdada no Banco de Questões**: o liga/desliga sempre valeu só para professores (a direção e o administrador continuavam usando). Mantido em `estadoParaUsuario` (regra pura, testada). A tela "módulo indisponível" mostra para QST o mesmo texto que o professor já via ("Módulo em Manutenção…").
- **Mapa conservador** (`src/lib/modulos/mapa-rotas.ts`): no Núcleo ficaram os de uso misto — mensagens, portal do aluno, esquemas de avaliação (definem também a frequência), matriz curricular (gera as disciplinas da turma), cadastro básico de estudantes, importar/verificar horário de usuário e a action "reportar estudante faltante". SEC: ocorrências, importação CSV, sincronizar, promover turma. RES: relatórios/PDFs de turma, resultados, conselho. IND: professores pendentes.
- **Achado extra (corrigido)**: a página do banco de questões listava para a gestão as disciplinas de **todas as escolas** (`where: {}`). Agora filtra pela escola da sessão.

### Fase 2
- **Assinatura.escolaId obrigatório** (no schema-alvo é opcional por causa da mantenedora, que ainda não existe). Sem `@@unique`: a vigente é a mais recente.
- **Planos iniciais** BASICO/PRO/ENTERPRISE calculados do catálogo de hoje: Básico = todos os módulos menos QST, PRV e FIN; Pro e Enterprise = todos. Limite de usuários copiado (15/50/sem limite); o limite em uso continua sendo o antigo (`LIMITE_USUARIOS`), como pede o roteiro. Sem preços (D-11).
- **Situação**: TRIAL → TESTE sem `fimTeste` (a definir: continua tudo liberado); ATIVA/SUSPENSA/CANCELADA iguais. Só INADIMPLENTE e teste vencido deixam módulos em somente leitura; suspensa e cancelada continuam tratadas no proxy (bloqueiam a escola inteira), por isso não mexem nos módulos.
- **Overrides de EscolaModulo**: viram AssinaturaModulo (EXCECAO) por módulo. Override em item sem plano mínimo (não tinha efeito) é ignorado e relatado; módulo com itens divergentes (ex.: provas ligado e simulados desligado) fica ATIVO e é relatado.
- **Leitura dupla**: `getModulosAtivos` e `estadosDaEscola` leem a assinatura; escola sem assinatura usa o modelo antigo (`getModulosAtivosLegado`, `estadosLegados`).
- **Selo "somente leitura" no menu**: não feito (a instrução limita as telas novas ao painel da plataforma). Quem tenta gravar num módulo em leitura recebe a mensagem "está em modo somente leitura…".

## Como retomar
Checkout de `fase/0-1-2-seguranca-modulos`, ler esta tabela, continuar do primeiro passo não ✅.
