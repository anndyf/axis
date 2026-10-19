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
- [x] Monitoramento opcional: `src/instrumentation.ts` (`onRequestError` do Next) + `src/lib/monitoramento.ts`. Só age com `SENTRY_DSN`; sem ela não há rede nem efeito.
  - **[decisão]** Sem instalar `@sentry/nextjs`: envio direto para a API de envelope do Sentry via `fetch` (sem nova dependência, sem mexer em `next.config.ts`). Não envia cabeçalhos, cookies, corpo nem query string. Só erro do servidor (erros de navegador ficam para depois — exigiria mexer em layout/componentes visuais).
  - `api/notas/lancar` e `api/conselho-classe` também reportam os 500 que eles próprios capturam.

### 2. Chamada e frequência
- [x] Modelos `Aula`, `Falta`, `Justificativa` + enums `SituacaoAula`, `TipoJustificativa`, `EfeitoJustificativa` — migration `20261019020000_chamada_frequencia` (só tabelas novas).
  - **[decisão]** POR_AULA: uma `Aula` por (turma, disciplina, dia), com `quantidade` = nº de tempos da disciplina no dia e `tempos` = quais tempos; `Falta.quantidade` = tempos perdidos (1 toque marca falta em todos; dá para ajustar). Evita uma chamada por tempo em aulas geminadas, como o diário do SUAP.
  - **[decisão]** Unicidade por `Aula.chave` (`turma|data|disciplina` ou `DIA`), porque unique composto com `disciplinaId` nulo (POR_DIA) não impede duplicata no Postgres.
  - **[decisão]** Em vez de `chamadaRealizada` (seção 3.4), `situacao`: PREVISTA (chamada aberta, não conta), REALIZADA (salva, conta), CANCELADA.
  - **[decisão]** Sem `Falta.justificativaId`: a justificativa vale por intervalo de datas e é aplicada no cálculo, então cobre faltas lançadas antes ou depois do cadastro do atestado.
- [x] Motor de frequência `src/lib/services/frequencia.ts` (puro, `frequencia.test.ts`): por disciplina e geral, GERAL/POR_COMPONENTE, mínimo do esquema, ABONA/SO_JUSTIFICA, projeção até o fim do período, `calcularSituacaoFinal` (REPROVADO_FALTA).
  - **[decisão]** REPROVADO_FALTA é calculado na leitura (situação final = status das notas + frequência) e **não é gravado** em `NotaFinal.status`; o enum do banco não mudou. Assim a situação nunca fica desatualizada quando entra uma falta ou um atestado.
  - **[decisão]** REPROVADO_FALTA só se aplica com o período encerrado (fim do ano letivo passou ou todas as etapas têm nota). Antes disso, abaixo do mínimo é alerta.
  - **[decisão]** Decisão do conselho (APROVADO_CONSELHO, DEPENDENCIA, CONSERVADO) e DESISTENTE prevalecem sobre a frequência.
  - **[decisão]** Chamada POR_DIA força apuração GERAL (não há disciplina).
- [x] Planejamento da chamada `src/lib/services/chamada.ts` (puro, `chamada.test.ts`): dia letivo pelo calendário (período, feriados da escola/turma, dias extras), tempos da disciplina pelo horário, POR_AULA/POR_DIA, validação das faltas.
  - **[decisão]** Chamada só em dia letivo com aula da disciplina no horário, nunca em data futura; sem calendário configurado, a chamada é recusada com aviso.
- [ ] Tela de chamada do professor + diário
- [ ] Frequência no boletim, portal, relatórios e conselho
- [ ] Justificativas (gestão) + relatório de infrequência + risco por faltas
- [ ] Seed de aulas/faltas

## Próximo passo
Tela de chamada do professor (server actions + página).
