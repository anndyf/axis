# Progresso — sessão de lógica acadêmica (branch `melhorias/logica-frequencia`)

Sessão sem supervisão. Decisões tomadas sem confirmação ficam marcadas com **[decisão]**.

Ambiente: PostgreSQL 16 local subiu; `axis_dev` e `axis_test` criados, migrations aplicadas, `npx vitest run` roda a cada commit.

## Itens

### 1. Restante do P0
- [x] `api/notas/lancar` atômico — validação do lote inteiro em `src/lib/services/lancamento-notas.ts` (pura, testada) e gravação numa única `prisma.$transaction`; auditoria gravada depois do commit. Teste de integração `src/lib/notas-lancar.test.ts`.
  - **[decisão]** Aluno de outra turma (ou matrícula inexistente) no lote agora recusa o lote inteiro (antes era ignorado em silêncio).
  - **[decisão]** Lote com disciplinas misturadas é recusado (antes a rota gravava tudo na disciplina do 1º item).
  - **[decisão]** A rota passou a exigir papel de equipe (`can(user,'staff')`) e, para professor, que a disciplina seja dele (`usuariosPermitidos`). Antes qualquer usuário logado da escola, inclusive aluno do portal, conseguia lançar.
  - **[decisão]** Recuperação por etapa validada entre 0 e `notaMaxima` do esquema.
- [x] `api/conselho-classe` valida a recuperação contra `notaMaxima` do esquema da turma (`notaRecuperacaoValida` em `services/notas.ts`, com teste) — teste de integração `src/lib/conselho-classe.test.ts` (escala 100 aceita 85, recusa 101; escala 10 recusa 11).
  - **[decisão]** O lote do conselho também ficou atômico (antes era `Promise.all`: uma decisão inválida no meio deixava as anteriores gravadas). Valor não numérico na recuperação passa a ser recusado com 400.
  - Turma sem esquema resolvido continua validando contra 10 (comportamento anterior).
- [ ] Sentry opcional

### 2. Chamada e frequência
- [ ] pendente

## Próximo passo
Sentry opcional.
