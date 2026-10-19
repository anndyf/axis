# Progresso — sessão mobile e fluxo do professor (branch `melhorias/mobile-professor`)

Sessão sem supervisão. Decisões tomadas sem confirmação ficam marcadas com **[decisão]**.

Base: `main` (o PR #5, `claude/zen-goldberg-frtkn3`, já estava mergeado).

Ambiente: PostgreSQL 16 local; `axis_dev` migrado e populado (seed, Horizonte, usuários de teste, calendário, frequência); `axis_test` migrado. Linha de base: `tsc` 0 erros, 304 testes passando.

Capturas: `npx tsx scripts/capturas.ts <fase>` com `npm run dev` rodando (`CHROMIUM_PATH=/opt/pw-browsers/chromium`). Agora em 375, 390 e 1440px; `CAPTURAS_TEMA=dark` gera as versões `-escuro`; `CAPTURAS_TELAS=a,b` e `CAPTURAS_LARGURAS=375` restringem a rodada.

## Linha de base (antes)
- Capturas: `docs/capturas/mobile-0-antes/`.
- Problemas vistos em 375px: no início do professor a lista "Aulas de hoje" está ok no seed atual, mas a linha usa `truncate` + selo à direita, o que corta nomes longos; lista longa de atalhos no fim duplica o menu; na chamada o nome do aluno com falta e controles de quantidade fica cortado ("Bea..."), e a barra "Salvar chamada" é `sticky` e cobre a lista.

## Fases
