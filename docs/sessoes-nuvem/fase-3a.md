Você vai implementar a FASE 3a (papéis e permissões, primeira parte) do roteiro de arquitetura do Áxis (Next.js 16 + Prisma + PostgreSQL, SaaS escolar multi-escola), repositório https://github.com/anndyf/axis. Parta da `main` e crie a branch `fase/3a-papeis`; trabalhe só nela. Outra sessão está fazendo as fases 0, 1 e 2 em paralelo na branch `fase/0-1-2-seguranca-modulos`: não toque nela e evite mexer em rotas de API e páginas além do estritamente necessário. Commits pequenos (mensagens em português, terminando com "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"), push a cada etapa. Ao final, abra um pull request para a `main` (não faça merge).

## Leia antes de começar
- docs/arquitetura/roteiro-de-migracao.md: seção 5.1 (regras de todas as fases) e a Fase 3 (o seu escopo é só a 3a).
- docs/arquitetura/dominio-alvo.md, seção 2.5 (papéis, permissões, escopo e a tabela 2.5.3 de conversão dos booleanos).
- docs/arquitetura/schema-alvo.prisma (Papel, PapelPermissao, VinculoPapel).
- src/lib/rbac.ts e os usos de `can()`.

## Sessão sem supervisão
Ninguém vai acompanhar. Não pare para perguntar: na dúvida, escolha a opção em que NINGUÉM ganha nem perde acesso, anote em PROGRESSO-FASE-3A.md (raiz) e siga. Mantenha esse arquivo atualizado e commitado a cada etapa.

## Retomada
- Se a branch `fase/3a-papeis` já existir no GitHub, faça checkout, leia PROGRESSO-FASE-3A.md e continue do próximo passo pendente.
- Commite e dê push com frequência. Ao concluir (PR aberto), escreva `STATUS: CONCLUÍDO` no fim de PROGRESSO-FASE-3A.md e dê push.

## Verificação
- `npm ci`; suba o PostgreSQL (`sudo apt-get update && sudo apt-get install -y postgresql`, iniciar, senha do postgres). Crie axis_dev e axis_test, .env e .env.test locais (não commitar), `npx prisma migrate deploy` nos dois; no axis_dev rode `npm run db:seed`, `npx tsx prisma/onboard-escola-teste.ts`, `npx tsx prisma/seed-usuarios-teste.ts`, `npx tsx prisma/seed-calendario.ts`, `npx tsx prisma/seed-frequencia.ts`.
- Antes de cada commit: `npx tsc --noEmit` com 0 erros e `npx vitest run` com tudo passando (hoje: 367 testes).
- Migrations geradas com `npx prisma migrate diff --from-schema-datamodel /tmp/anterior.prisma --to-schema-datamodel prisma/schema.prisma --script`, timestamp posterior ao último existente; backfill idempotente em prisma/backfill/fase-3a.ts.

## Escopo (só a 3a)
- Schema `Papel`, `PapelPermissao`, `VinculoPapel` (só acréscimo; os booleanos de User continuam).
- Lista fechada de permissões em `src/lib/permissoes.ts`; papéis de sistema: Direção, Secretaria, Coordenação, Professor, AEE, Estudante, Responsável.
- Backfill dos booleanos atuais para vínculos de papel, conforme a tabela 2.5.3.
- `can()` passa a ler os papéis e mantém as ações antigas (gestao, staff, superuser, aee, staffPuro) como atalhos.
- TESTE DE EQUIVALÊNCIA obrigatório: para todos os usuários do banco de exemplo × todas as ações antigas, `can` antigo e `can` novo dão o mesmo resultado. A fase só termina com ele passando.
- Papéis novos (Secretaria, Coordenação) ficam disponíveis, mas nenhum usuário existente muda de acesso.
- Não faça a 3b (migrar checagens inline e a tela de usuários) nem a 3c.

## Regras obrigatórias
Toda consulta filtra pela escola da sessão; toda tabela nova com escolaId entra no src/lib/isolamento-escolas.test.ts; regras puras em src/lib com testes; nunca enviar o registro inteiro de User ao navegador; não mexer no visual.

## Encerramento
Em PROGRESSO-FASE-3A.md: "Para validar localmente" com migration e o que o backfill faz, o teste de equivalência e o resultado, e decisões tomadas sem confirmação. Abra o PR para `main` e marque `STATUS: CONCLUÍDO`.
