Você vai implementar as FASES 3a e 3b (papéis e permissões) do roteiro de arquitetura do Áxis (Next.js 16 + Prisma + PostgreSQL, SaaS escolar multi-escola), repositório https://github.com/anndyf/axis. Parta da `main` e crie a branch `fase/3ab-papeis`; trabalhe só nela. Commits pequenos (mensagens em português, terminando com "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"), push a cada etapa. Ao final, abra um pull request para a `main` (não faça merge).

## Leia antes de começar
- docs/arquitetura/roteiro-de-migracao.md: seção 5.1 (regras de todas as fases) e a Fase 3. Seu escopo é a 3a e a 3b. NÃO faça a 3c.
- docs/arquitetura/dominio-alvo.md, seção 2.5 (papéis, permissões, escopo e a tabela 2.5.3 de conversão dos booleanos).
- docs/arquitetura/schema-alvo.prisma (Papel, PapelPermissao, VinculoPapel).
- src/lib/rbac.ts, todos os usos de `can()` e as checagens soltas (`isSuperuser`, `isDirecao`, `isStaff`, `isAEE`, `isPortalUser` usados direto em rotas, actions, páginas e componentes).
- src/lib/modulos/ (a trava de módulos da fase 1, que já está na main) e PROGRESSO-FASES-0-1-2.md.
- CONTINUAR.md e o `git log` recente.

## Sessão sem supervisão
Ninguém vai acompanhar. Não pare para perguntar: na dúvida, escolha a opção em que NINGUÉM ganha nem perde acesso, anote em PROGRESSO-FASE-3AB.md (raiz) e siga. Mantenha esse arquivo atualizado e commitado a cada etapa.

## Retomada (a sessão pode ser interrompida pelo limite de uso)
- Se a branch `fase/3ab-papeis` já existir no GitHub, NÃO a recrie: faça checkout, leia PROGRESSO-FASE-3AB.md e continue do próximo passo pendente.
- Commite e dê push com frequência, inclusive no meio de etapas longas.
- Quando o encerramento estiver completo (PR aberto), escreva `STATUS: CONCLUÍDO` no fim de PROGRESSO-FASE-3AB.md e dê push.

## Verificação
- `npm ci`; suba o PostgreSQL (`sudo apt-get update && sudo apt-get install -y postgresql`, iniciar, senha do postgres; funcionou nas sessões anteriores). Crie axis_dev e axis_test, .env e .env.test locais (não commitar), `npx prisma migrate deploy` nos dois; no axis_dev rode `npm run db:seed`, `npx tsx prisma/onboard-escola-teste.ts`, `npx tsx prisma/seed-usuarios-teste.ts`, `npx tsx prisma/seed-calendario.ts`, `npx tsx prisma/seed-frequencia.ts`, `npx tsx prisma/backfill/fase-2.ts`.
- Antes de cada commit: `npx tsc --noEmit` com 0 erros e `npx vitest run` com tudo passando (hoje: 437 testes). Se o tsc reclamar de `.next/dev/types`, apague a pasta `.next`.
- Migrations: altere prisma/schema.prisma e gere com `npx prisma migrate diff --from-schema-datamodel /tmp/anterior.prisma --to-schema-datamodel prisma/schema.prisma --script` (anterior via `git show HEAD:prisma/schema.prisma > /tmp/anterior.prisma`), em prisma/migrations/<timestamp posterior a 20261020120000>_<nome>/migration.sql. Teste com `migrate deploy` sobre o axis_dev populado. Backfill idempotente em prisma/backfill/fase-3a.ts (rodar duas vezes não duplica; confere a equivalência no fim, como o fase-2.ts).
- Telas alteradas: capturas com Playwright (dependência do projeto; reaproveite scripts/capturas.ts) em 375px e 1440px, em docs/capturas/fase-3/.

## Fase 3a: papéis no banco
- Schema `Papel`, `PapelPermissao`, `VinculoPapel` (só acréscimo; os booleanos de `User` continuam existindo e sendo gravados).
- Lista fechada de permissões em `src/lib/permissoes.ts`, no formato `recurso.acao`.
- Papéis de sistema: Direção, Secretaria, Coordenação, Professor, AEE, Estudante, Responsável.
- Backfill dos booleanos atuais para vínculos de papel, conforme a tabela 2.5.3.
- `can()` passa a ler os papéis e mantém as ações antigas (gestao, staff, superuser, aee, staffPuro) como atalhos.
- TESTE DE EQUIVALÊNCIA obrigatório: para todos os usuários do banco de exemplo × todas as ações antigas, `can` antigo e `can` novo dão o mesmo resultado. A fase só avança com ele passando.

## Fase 3b: o sistema usa os papéis
- Migrar as checagens soltas (`isSuperuser || isDirecao` etc.) para `can(user, 'recurso.acao')`, arquivo por arquivo, sem mudar quem acessa o quê. O teste de isolamento e o de equivalência precisam continuar passando, e cada grupo migrado ganha casos de teste por papel.
- Escrita dupla durante a transição: ao criar ou editar usuário, gravar o vínculo de papel E manter os booleanos coerentes (a 3c vai remover os booleanos depois).
- Tela de Usuários: editor de papéis (escolher um ou mais papéis) no lugar das caixas de seleção, no padrão visual atual (design system, mobile). Papéis novos (Secretaria, Coordenação) já ficam disponíveis para a escola usar, com as permissões da tabela 2.5.
- Escopo do professor continua derivado de `disciplinasPermitidas`/`turmasPermitidas`.
- A conta de administrador da plataforma (isPlatformAdmin) continua como está; ela sai da escola só na 3c.

## Regras obrigatórias
- Toda consulta filtra pela escola da sessão; ids do cliente conferidos contra a escola; escolaId nunca vem do cliente. Nunca enviar o registro inteiro de User ao navegador. Regras puras em src/lib com testes. Toda tabela nova com escolaId entra no src/lib/isolamento-escolas.test.ts.
- A trava de módulos (`exigirModulo`) e o teste de cobertura de módulos continuam valendo para tudo que for tocado.
- A proteção da conta da plataforma (src/lib/plataforma.ts: superuser da escola não altera a conta da plataforma) continua valendo no editor de papéis.
- Ninguém da CETEP pode perder ou ganhar acesso. Não mexa no visual geral (fonte, cores, menu) além da tela de Usuários.

## Encerramento
Em PROGRESSO-FASE-3AB.md: "Para validar localmente" com migration e o que o backfill faz, o resultado do teste de equivalência, a lista de checagens migradas, telas para conferir (com capturas) e decisões tomadas sem confirmação. Abra o PR para `main` com esse resumo e marque `STATUS: CONCLUÍDO`.
