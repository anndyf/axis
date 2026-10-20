Você vai implementar as FASES 0, 1 e 2 do roteiro de arquitetura do Áxis (Next.js 16 + Prisma + PostgreSQL, SaaS escolar multi-escola), repositório https://github.com/anndyf/axis. Parta da `main` e crie a branch `fase/0-1-2-seguranca-modulos`; trabalhe só nela. Commits pequenos (mensagens em português, terminando com "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"), push a cada etapa. Ao final, abra um pull request para a `main` (não faça merge).

## Leia antes de começar
- docs/arquitetura/roteiro-de-migracao.md: seção 5.1 (regras de todas as fases) e as Fases 0, 1 e 2, que são o seu escopo exato.
- docs/arquitetura/modulos-e-planos.md (seções 4.4 e 4.5: exigirModulo, teste de cobertura, planos, somente leitura).
- docs/arquitetura/inventario.md (rotas e o módulo de cada uma) e docs/arquitetura/schema-alvo.prisma (modelos Plano, PlanoModulo, Assinatura, AssinaturaModulo, HistoricoAssinatura).
- CONTINUAR.md (se existir) e o `git log` recente.

## Sessão sem supervisão
Ninguém vai acompanhar. Não pare para perguntar: na dúvida, escolha a opção mais conservadora (nenhuma escola perde acesso ao que usa hoje), anote em PROGRESSO-FASES-0-1-2.md (raiz) e siga. Mantenha esse arquivo atualizado e commitado a cada etapa.

## Retomada (a sessão pode ser interrompida pelo limite de uso)
- Se a branch `fase/0-1-2-seguranca-modulos` já existir no GitHub, NÃO a recrie: faça checkout, leia PROGRESSO-FASES-0-1-2.md e continue do próximo passo pendente.
- Commite e dê push com frequência, inclusive no meio de etapas longas.
- Quando o encerramento estiver completo (PR aberto), escreva `STATUS: CONCLUÍDO` no fim de PROGRESSO-FASES-0-1-2.md e dê push.

## Verificação
- `npm ci`; suba o PostgreSQL (`sudo apt-get update && sudo apt-get install -y postgresql`, iniciar, senha do postgres; funcionou nas sessões anteriores). Crie axis_dev e axis_test, .env e .env.test locais (não commitar), `npx prisma migrate deploy` nos dois; no axis_dev rode `npm run db:seed`, `npx tsx prisma/onboard-escola-teste.ts`, `npx tsx prisma/seed-usuarios-teste.ts`, `npx tsx prisma/seed-calendario.ts`, `npx tsx prisma/seed-frequencia.ts`.
- Antes de cada commit: `npx tsc --noEmit` com 0 erros e `npx vitest run` com tudo passando (hoje: 367 testes).
- Migrations: altere prisma/schema.prisma e gere com `npx prisma migrate diff --from-schema-datamodel /tmp/anterior.prisma --to-schema-datamodel prisma/schema.prisma --script` (anterior via `git show HEAD:prisma/schema.prisma > /tmp/anterior.prisma`), em prisma/migrations/<timestamp posterior ao último existente>_<nome>/migration.sql. Teste com `migrate deploy` sobre o axis_dev populado. Backfill como script idempotente em prisma/backfill/<fase>.ts (rodar duas vezes não duplica), conforme a seção 5.1.

## Regras obrigatórias
- Toda consulta filtra pela escola da sessão; ids do cliente conferidos contra a escola; escolaId nunca vem do cliente. Permissões via `can()` (src/lib/rbac.ts). Nunca enviar o registro inteiro de User ao navegador. Regras puras em src/lib/services com testes. Toda tabela nova com escolaId entra no src/lib/isolamento-escolas.test.ts.
- A CETEP (plano ENTERPRISE, tudo ligado) não pode perceber nenhuma mudança. Rotas de uso misto ficam no Núcleo (mapa conservador).
- Não mexa no visual geral (fonte, cores, menu); a única tela nova é "módulo indisponível" e, na fase 2, o que o painel da plataforma precisar para assinatura e módulos por escola.

## Ordem
1. **Fase 0:** antes de corrigir, escreva os testes que provam cada falha (3 PDFs de relatório sem checagem de papel, a action reportarEstudanteFaltante sem papel, checagem de módulo incompleta em questoes/[id]); veja os testes falharem; corrija; veja passarem. Depois os demais itens da fase (remover api/public/v1/register se confirmado código morto; ano letivo atual da escola no lugar de 2026 fixo no código que cria registros).
2. **Fase 1:** infraestrutura `exigirModulo`, mapa de rotas, aplicação em todas as rotas de API, server actions e páginas, página "módulo indisponível", teste estático de cobertura (falha se alguma rota/action/página de módulo ficar sem checagem) e teste de comportamento com uma escola sem módulos.
3. **Fase 2 (se houver tempo):** modelos de planos e assinaturas, backfill dos três planos atuais e das escolas, teste de equivalência (`getModulosAtivos` novo = velho para todas as escolas), estado somente leitura e o painel da plataforma. NÃO remova ainda `Escola.plano`, `PlanoTipo` nem `EscolaModulo` (isso fica para depois da validação). Preços ficam em branco/zero: são decisão da dona do produto.

## Encerramento
Em PROGRESSO-FASES-0-1-2.md: "Para validar localmente" com testes novos, migrations e o que cada backfill faz, telas para conferir e decisões tomadas sem confirmação. Abra o PR para `main` com esse resumo e marque `STATUS: CONCLUÍDO`.
