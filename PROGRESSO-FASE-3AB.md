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
| 3b.3 | Tela de Usuários: editor de papéis | ✅ |
| 3b.4 | Capturas (375px e 1440px) | ✅ `docs/capturas/fase-3/` |
| 4 | Encerramento + PR | ✅ https://github.com/anndyf/axis/pull/15 |

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

### Fase 3b
- **Atalhos antigos também migrados**: além das checagens soltas de booleanos, as chamadas `can(user, 'gestao' | 'staff' | 'superuser' | 'aee')` viraram permissões finas. Sem isso, Secretaria e Coordenação não entrariam nas telas que a tabela 2.5 lhes dá. Os 5 atalhos continuam funcionando em `rbac.ts`, mas nenhum arquivo os usa mais.
- **O que cada papel novo recebe** (só quem tem o papel; ninguém da CETEP o tem hoje):
  - Secretaria: estudantes (ver, cadastrar, acesso ao portal, importar CSV, pendências), turmas/cursos/disciplinas da turma/horários, matriz, calendário letivo, laboratórios, PDFs da turma, resultados, painel "Administração", escopo da escola inteira. Sem notas, chamada, conselho, AEE, usuários ou configurações.
  - Coordenação: frequência da escola, professores pendentes, resultados, conselho, planos (ver todos), banco de questões (moderar), gerador de provas, simulados, ocorrências, PDFs da turma, busca de estudantes, painel "Administração", escopo da escola. **Sem chamada** (a chamada e o diário gravam; deixei de fora na dúvida), sem notas, cadastro, AEE, usuários ou configurações.
- **Negações viraram combinação de permissões**, sem mudar o resultado: `!isAEE` → `!can('aee.atender')`; `isStaff && !isSuperuser && !isDirecao` → `restritoADocencia()` (`docencia.exercer` sem `escopo.escola`); TurmasListClient `isSuperuser || (isDirecao && !isStaff)` → `escola.administrar || (turma.gerenciar && !docencia.exercer)`. Testadas nas 32 combinações (`checagens-papeis.test.ts`).
- **Rótulos**: menu do usuário usa o papel principal (mesma ordem de antes; Secretaria/Coordenação ganham o próprio nome em vez de "Gestão escolar"); perfil mantém "Administrador"/"Professor" e só acrescenta Secretaria/Coordenação.
- **Não migrados (consultas ao banco, não decisões de acesso)**: filtros `where: { isStaff: true }` etc. (ex.: destinatários de comunicados, `role=professor`), contagem de usuários do plano e o rótulo dos *outros* usuários na tela de mensagens. Saem na 3c junto com os booleanos.
- **Editor de papéis**: oferece Administrador da escola, Direção, Secretaria, Coordenação, Professor e AEE. Estudante/Responsável não aparecem e, se a conta tiver, são preservados. A API aceita `papeis: [...]` e, por compatibilidade, os booleanos antigos (cada um liga/desliga só o seu papel). Papel fora da lista → 400. A conta da plataforma aparece travada para o superuser da escola (aviso + campos desabilitados) e a API continua recusando (403).
- **Campo "Senha inicial" removido do formulário de novo usuário**: o servidor sempre ignorou essa senha e gera uma provisória enviada por e-mail; a tela agora diz isso.
- **Selo "Direção", "Secretaria" e "Coordenação"** na lista de usuários (antes só havia Admin, Professor e AEE). Mudança visual só na tela de Usuários.
- **Achados corrigidos (filtro de escola)**: `deactivateAllPortals` apagava os acessos ao portal de **todas** as escolas; `getUsersForSelect` (mensagens) listava usuários de todas as escolas; o e-mail do comunicado geral ia para usuários de todas as escolas. Os três agora filtram pela escola da sessão. Para a CETEP nada muda dentro da própria escola.
- **Seeds**: `seed.ts`, `onboard-escola-teste.ts` e `seed-usuarios-teste.ts` criam os vínculos; `seed-usuarios-teste.ts` cria `secretaria`/`secretaria123` e `coordenacao`/`coordenacao123` (em `LOGINS_TESTE.md`).

## Para validar localmente

```bash
git fetch && git checkout fase/3ab-papeis
npm ci
npx prisma migrate deploy                       # axis_dev
DATABASE_URL=<axis_test> DIRECT_URL=<axis_test> npx prisma migrate deploy
npx prisma generate
npx tsx prisma/backfill/fase-3a.ts              # cria papéis e vínculos e confere a equivalência
npx tsx prisma/backfill/fase-3a.ts              # 2ª vez: "já estavam iguais", 0 vínculos criados
npx tsx prisma/seed-usuarios-teste.ts           # opcional: contas secretaria e coordenacao
npx tsc --noEmit                                # 0 erros
npx vitest run                                  # 536 testes (eram 437)
npm run dev
```

Quem já estava logado continua com a sessão antiga (sem papéis): `can()` usa os booleanos e o resultado é o mesmo. Depois de sair e entrar, a sessão passa a ter `papeis`/`permissoes` dos vínculos.

### Migration
- `prisma/migrations/20261021120000_papeis_e_vinculos`: **só cria** o enum `EscopoPapel` e as tabelas `papeis`, `papeis_permissoes`, `vinculos_papel` (+ índice único parcial dos papéis de sistema). Não altera nada existente. Testada com `migrate deploy` sobre o axis_dev já populado.

### Backfill (`prisma/backfill/fase-3a.ts`)
- Cria/acerta os 8 papéis de sistema e suas permissões a partir de `src/lib/permissoes.ts` (acrescenta as que faltam, tira as que sobram).
- Para cada usuário, cria os vínculos a partir dos booleanos: `isSuperuser` → Administrador da escola, `isDirecao` → Direção, `isStaff` → Professor (escopo DOCENCIA), `isAEE` → AEE, `isPortalUser` → Estudante (escopo PROPRIO, `escopoId` = estudante). Vínculos de Secretaria/Coordenação não são tocados.
- Confere: papéis de sistema no banco = lista do código; para cada usuário × 5 ações antigas, `can()` com os papéis do banco = regra antiga com os booleanos; para quem só tem papéis "antigos", o conjunto inteiro de permissões é igual. Diferença = saída 1. `--so-conferir` só confere. Host não local exige `FORCE_BACKFILL=true`.
- Não mexe nos booleanos de `User`.

### Resultado do teste de equivalência
- **Banco de exemplo (axis_dev, após todos os seeds)**: 16 usuários (CETEP e Horizonte, incluindo secretaria e coordenacao), 94 comparações, **0 diferenças**; 2ª execução: 0 vínculos criados/removidos.
- **vitest** `src/lib/equivalencia-papeis.test.ts`: contas com as 32 combinações dos booleanos × 5 ações antigas (160 comparações) + todas as 51 permissões, lendo os papéis do banco como o login faz: tudo igual. Também: idempotência, vínculo vencido ou de papel de outra escola ignorado, escrita dupla coerente.
- **vitest** `src/lib/checagens-papeis.test.ts`: cada permissão = a checagem antiga que ela substitui, nas 32 combinações; checagens compostas; casos por papel (incluindo Secretaria e Coordenação).

### Checagens migradas (permissão ← checagem antiga)
| Permissão | Era | Onde |
|---|---|---|
| `usuario.gerenciar` | isSuperuser | api/usuarios (POST), usuarios/[id] (PUT/DELETE), aprovar, aprovar-em-massa, toggle-status, transferir, importar/verificar horário; páginas de usuários; menu |
| `configuracao.editar` | isSuperuser | api/config, esquemas-avaliacao, configurações/avaliação; menu |
| `auditoria.ler` | isSuperuser | auditoria |
| `turma.promover` | isSuperuser | turmas/[id]/promover, clonar; botão em TurmasListClient |
| `disciplina.gerenciar` | can('superuser') | menu e botão de Disciplinas |
| `escola.administrar` | isSuperuser / can('superuser') | /dashboard/ui e link "Componentes" |
| `mensagem.suporte.atender` | isSuperuser | mensagens (chamados de suporte) |
| `estudante.ler` | can('gestao') | menu Estudantes, busca rápida (paleta) |
| `estudante.editar` | isSuperuser‖isDirecao / gestao | api/estudantes (POST), estudantes/[id], sincronizar, upload-csv, estudantes/actions, botões da página |
| `estudante.buscar` | can('staff') | GET api/estudantes |
| `pendencia.resolver` | isSuperuser‖isDirecao | admin/pendencias (página e 8 actions) |
| `ocorrencia.gerenciar` | isSuperuser‖isDirecao | api/ocorrencias, ocorrencias/[id]; menu |
| `turma.gerenciar` | isSuperuser‖isDirecao / gestao | api/turmas, turmas/[id], disciplinas, cursos, merge-turmas, horário, schedule-actions, botão Nova turma |
| `matriz.gerenciar` | gestao / isSuperuser‖isDirecao | api/matriz, matriz/importar, página e menu |
| `escopo.escola` | isSuperuser‖isDirecao / gestao | data-fetching (turmas/disciplinas), chamada-acesso, avaliacoes-acesso, notas/lancar, notas turma, páginas lancar/recuperação [turmaId], estudantes |
| `frequencia.lancar` | can('staff') | chamada (3 páginas), chamada-acesso; menu |
| `frequencia.acompanhar` | can('gestao') | frequência (página e action); menu |
| `nota.lancar` | can('staff') | api/notas/lancar, notas turma, avaliações (página e acesso) |
| `nota.tela` | isStaff‖isSuperuser | menu Lançar notas e Recuperação, api/notas/recuperacao |
| `resultado.ler` | gestao / isSuperuser‖isDirecao | resultados; menu |
| `conselho.decidir` | can('gestao') | api/conselho-classe; menu |
| `indicador.ler` | can('gestao') | relatorios/professores-pendentes |
| `relatorio.turma` | staff‖aee | 3 PDFs da turma |
| `plano.ler` / `plano.elaborar` / `plano.acompanhar` | staff / isStaff / isSuperuser‖isDirecao | menu; POST api/planos; planos (lista, [id], PDFs), GET api/usuarios, PlanosClient |
| `questao.usar` / `questao.moderar` | staff / isSuperuser‖isDirecao | menu; questoes, questoes/[id], página e cliente; exceção do módulo QST |
| `prova.gerenciar` | isSuperuser‖isDirecao | api/provas, provas/[id], filtros, página; menu |
| `simulado.ler` / `simulado.gerenciar` | staff / isSuperuser‖isDirecao | menu, simulados/actions; api/simulados, responsáveis, páginas e cliente |
| `laboratorio.gerenciar` | isSuperuser‖isDirecao | api/laboratorios, reservas, página e cliente |
| `calendario.gerenciar` | can('gestao') | configurações/calendário (página e action) |
| `identidade.editar` | can('gestao') | identidade visual (página e action) |
| `financeiro.gerenciar` | can('gestao') | financeiro (rota, página, menu) |
| `aee.ler` / `aee.gerenciar` / `aee.ficha.editar` / `aee.atender` | aee / isDirecao‖isSuperuser‖isAEE / isDirecao‖isSuperuser / isAEE | menu AEE; api/estudantes/[id]/aee, painel AEE; aee/[matricula], atestar; menu reduzido do AEE |
| `mensagem.direcao.atender` / `comunicado.receber.equipe` / `docencia.exercer` | isDirecao‖isSuperuser / isStaff‖isSuperuser / isStaff | mensagens (actions e cliente), assumir/encerrar chamado |
| `portal.acessar` | isPortalUser | layout do painel, portal, login, trocar senha, boletim PDF, chamada, frequência, notas, identidade, paleta, navegação mobile |
| `painel.gestao` / `painel.professor` | gestao / staff | visões do painel inicial |

### Testes novos
- `src/lib/permissoes.test.ts`, `src/lib/checagens-papeis.test.ts`: regras puras (lista, papéis, conversão, equivalência nas 32 combinações, casos por papel).
- `src/lib/equivalencia-papeis.test.ts`: backfill e equivalência no banco.
- `src/lib/papeis-rotas.test.ts`: rotas reais com sessão só de papéis (ocorrências, professores pendentes, busca de estudantes, lista de professores, criar usuário, editor de papéis, sessão antiga só com booleanos).
- `src/lib/isolamento-escolas.test.ts`: B não dá papel a usuário de A; vínculos de A intactos; criar usuário em B não gera vínculo em A.
- `src/lib/plataforma.test.ts`: superuser da escola não altera os papéis da conta da plataforma (nem pelos booleanos).

### Telas para conferir (capturas em `docs/capturas/fase-3/`, 375 e 1440px)
- **Usuários** (`admin`): lista com selos por papel (`usuarios-*`), novo usuário (`usuario-novo-*`), editar com o editor de papéis (`usuario-editar-*`).
- **Secretaria** (`secretaria`): menu e painel (`dashboard-secretaria-*`), estudantes (`estudantes-secretaria-*`).
- **Coordenação** (`coordenacao`): menu e painel (`dashboard-coordenacao-*`), frequência (`frequencia-coordenacao-*`).
- **Sem mudança** (`conferencia/`): painel da direção, do professor, chamada e portal do aluno.
- Conferir também: entrar como `admin`, editar a conta `plataforma` (se houver, após `prisma/backfill-platform-admin.ts`) com outro superuser → aviso e campos travados.

### Telas afetadas para avisar a escola
Só a tela de Usuários (editor de papéis no lugar das caixas, selos novos, sem o campo de senha inicial que não era usado). Professores, direção, AEE e alunos: nada muda.

## Como retomar
Checkout de `fase/3ab-papeis`, ler esta tabela, continuar do primeiro passo não ✅.

STATUS: CONCLUÍDO
