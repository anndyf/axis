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
| 2.3 | Fase 2: painel da plataforma | ✅ modal "Assinatura" por escola; conferido no navegador |
| 3 | Encerramento + PR | ✅ https://github.com/anndyf/axis/pull/14 |

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
- **GET de `api/questoes` para professor com o banco desligado**: antes respondia; agora é barrado como o resto do módulo (a página já barrava o professor; quem usa esse GET fora da página é o gerador de provas, da gestão, que continua liberado).
- **Achado extra (corrigido)**: a página do banco de questões listava para a gestão as disciplinas de **todas as escolas** (`where: {}`). Agora filtra pela escola da sessão.

### Fase 2
- **Assinatura.escolaId obrigatório** (no schema-alvo é opcional por causa da mantenedora, que ainda não existe). Sem `@@unique`: a vigente é a mais recente.
- **Planos iniciais** BASICO/PRO/ENTERPRISE calculados do catálogo de hoje: Básico = todos os módulos menos QST, PRV e FIN; Pro e Enterprise = todos. Limite de usuários copiado (15/50/sem limite); o limite em uso continua sendo o antigo (`LIMITE_USUARIOS`), como pede o roteiro. Sem preços (D-11).
- **Situação**: TRIAL → TESTE sem `fimTeste` (a definir: continua tudo liberado); ATIVA/SUSPENSA/CANCELADA iguais. Só INADIMPLENTE e teste vencido deixam módulos em somente leitura; suspensa e cancelada continuam tratadas no proxy (bloqueiam a escola inteira), por isso não mexem nos módulos.
- **Overrides de EscolaModulo**: viram AssinaturaModulo (EXCECAO) por módulo. Override em item sem plano mínimo (não tinha efeito) é ignorado e relatado; módulo com itens divergentes (ex.: provas ligado e simulados desligado) fica ATIVO e é relatado.
- **Leitura dupla**: `getModulosAtivos` e `estadosDaEscola` leem a assinatura; escola sem assinatura usa o modelo antigo (`getModulosAtivosLegado`, `estadosLegados`).
- **Escrita**: criar escola cria a assinatura; mudar plano/status pela tabela do painel muda também a assinatura; o liga/desliga do banco de questões em Configurações grava a exceção QST. Toda escrita na assinatura é espelhada em `Escola.plano`/`Escola.status` (o proxy ainda lê o status; INADIMPLENTE vira ATIVA lá) e em `EscolaModulo` para os itens pagos (QST, PRV, FIN), para o modelo antigo seguir coerente até ser removido.
- **Liga/desliga do banco de questões pela direção** continua podendo ligar o módulo numa escola Básico (como hoje). Fica para quando o toggle sair de `api/config` (passo "Depois" da fase 2).
- **Painel**: botão "Assinatura" em cada linha abre plano, situação, fim do teste, limites, observações, módulos (Do plano / Ativo / Somente leitura / Inativo, com a origem) e histórico. "Colocar em somente leitura" = situação INADIMPLENTE. Sem preços.
- **Selo "somente leitura" no menu**: não feito (a instrução limita as telas novas ao painel da plataforma). Quem tenta gravar num módulo em leitura recebe a mensagem "está em modo somente leitura…".

## Para validar localmente

```bash
git fetch && git checkout fase/0-1-2-seguranca-modulos
npm ci
npx prisma migrate deploy                       # axis_dev
DATABASE_URL=<axis_test> DIRECT_URL=<axis_test> npx prisma migrate deploy
npx prisma generate
npx tsx prisma/backfill/fase-2.ts               # cria planos e assinaturas e confere a equivalência
npx tsx prisma/backfill/fase-2.ts               # 2ª vez: "0 assinaturas criadas", tudo "equivalente"
npx tsc --noEmit                                # 0 erros
npx vitest run                                  # 432 testes (eram 367)
npm run dev
```

Para usar o painel da plataforma no banco de desenvolvimento, a conta `admin` da CETEP precisa da marca de plataforma: `npx tsx prisma/backfill-platform-admin.ts`.

### Migration
- `prisma/migrations/20261020120000_planos_e_assinaturas`: **só cria** (enums `ModuloId`, `EstadoModulo`, `SituacaoAssinatura`, `OrigemModulo`; tabelas `planos`, `planos_modulos`, `assinaturas`, `assinaturas_modulos`, `historico_assinaturas`). Não altera nem remove nada existente. Testada com `migrate deploy` sobre o axis_dev já populado pelos seeds.

### Backfill (`prisma/backfill/fase-2.ts`)
- Cria os planos BASICO, PRO e ENTERPRISE (se não existirem) com os módulos que cada um libera hoje.
- Para cada escola **sem** assinatura: cria a assinatura do plano da escola, situação a partir do status (TRIAL → TESTE sem fim), início = data de criação da escola, e converte `EscolaModulo` em exceções por módulo (origem EXCECAO); registra no histórico.
- Confere a equivalência (itens de menu e estado de cada módulo, modelo novo × antigo) para todas as escolas; diferença = código de saída 1. `--so-conferir` só confere.
- Idempotente: escola com assinatura e plano existente não são tocados. Em host que não seja local exige `FORCE_BACKFILL=true` (para rodar na cópia da produção, com backup verificado).
- Não mexe em `Escola.plano`, `Escola.status`, `PlanoTipo` nem `EscolaModulo` (remoção fica para depois da validação).

### Testes novos
- `src/lib/isolamento-escolas.test.ts`: aluno do portal barrado nos 3 PDFs de turma e na action `reportarEstudanteFaltante`; professor com o banco de questões desligado barrado em PUT/DELETE de `questoes/[id]`; `getTurmasForSelect` sem turmas de outra escola; direção de B não lê nem altera a assinatura de A. (Cada um falhou antes da correção.)
- `src/lib/services/modulos.test.ts` e `src/lib/services/planos.test.ts`: regras puras (estado pelo catálogo, pela assinatura, somente leitura, exceção do banco de questões, conversão dos overrides, validações).
- `src/lib/modulos/cobertura-modulos.test.ts`: **teste estático** — toda rota, action e página precisa estar no mapa e chamar a guarda do seu módulo; arquivo novo sem módulo faz o teste falhar.
- `src/lib/modulos/modulos-desligados.test.ts`: **comportamento** — escola BASICO real (QST/PRV/FIN barrados nas rotas e páginas; direção continua no banco de questões; ENTERPRISE tudo ativo); escola "sem módulos" (todas as rotas, actions e páginas de módulo barradas, banco intacto); somente leitura (escrita barrada, leitura passa).
- `src/lib/modulos/equivalencia-assinaturas.test.ts`: backfill em 10 cenários (planos, situações, toggles), equivalência e idempotência.
- `src/lib/plataforma.test.ts`: rotas novas de assinatura (acesso só da plataforma, inadimplência = somente leitura, espelho no modelo antigo, "volta ao plano").

### Telas para conferir
- **CETEP (tudo ligado)**: navegar pelo menu inteiro como admin, direção, professor e aluno — nada deve mudar.
- **Módulo indisponível**: no painel da plataforma, Assinatura da Horizonte → Gerador de Provas e Simulados = Inativo; entrar como `admin` em `horizonte.localhost:3000` → o menu perde Simulados e Gerador de Provas, `/dashboard/provas` mostra "Módulo indisponível". Voltar para "Do plano". Captura em `docs/capturas/fases-0-1-2/`.
- **Banco de questões desligado pela direção** (Configurações): professor vê "Módulo em Manutenção" (mesmo texto de antes, agora na tela de módulo indisponível); direção continua usando.
- **Painel da plataforma** (`/dashboard/plataforma`): botão "Assinatura" — plano, situação, fim do teste, limites, observações, módulos com origem e estado, histórico; "Colocar em somente leitura".
- **Somente leitura**: com a situação Inadimplente, telas abrem, mas gravar (ex.: salvar chamada) responde "está em modo somente leitura".

### Telas afetadas para avisar a escola
Nenhuma para a CETEP. Mudanças visíveis só em escola sem o módulo (tela "Módulo indisponível") e no painel da plataforma.

## Ajustes da revisão (20/10)
- **PATCH da escola no painel da plataforma agora é atômico**: `Escola` e assinatura mudam na mesma transação (`alterarAssinaturaEm`). Antes eram dois passos separados; se o segundo falhasse, o painel mostrava um plano/status e os módulos (lidos da assinatura) seguiam o antigo. Teste: `src/lib/plataforma-atomico.test.ts` (falha simulada na assinatura → escola não muda; conferido que o teste pega o comportamento antigo).
- **PDFs da turma liberados também para quem é só AEE** (`can(user, 'staff') || can(user, 'aee')`): a regra só com `staff` tirava o acesso de usuário AEE sem o papel de professor, que baixava antes. Aluno do portal continua recusado. Teste em `isolamento-escolas.test.ts`.
- Resultado: `npx vitest run` 437 testes passando.

## Como retomar
Checkout de `fase/0-1-2-seguranca-modulos`, ler esta tabela, continuar do primeiro passo não ✅.

STATUS: CONCLUÍDO
