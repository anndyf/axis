# Progresso — sessão visual (branch `melhorias/seguranca-avaliacao`)

Sessão sem supervisão. Decisões tomadas sem confirmação ficam marcadas com **[decisão]**.

Ambiente: PostgreSQL 16 local; `axis_dev` recriado e populado (seed, Horizonte, usuários de teste, calendário, frequência); `axis_test` migrado. Linha de base: `tsc` 0 erros, 255 testes passando.

Capturas: `npx tsx scripts/capturas.ts <fase>` com `npm run dev` rodando (Chromium do ambiente via `CHROMIUM_PATH`). Saída em `docs/capturas/<fase>/` (1440px e 375px).
- **[decisão]** `playwright` entrou como devDependency (sem baixar navegador: o ambiente já tem o Chromium). O script libera a troca obrigatória de senha da conta de portal `1TIM1-001` e marca as dicas de primeiro acesso como vistas, só no banco/navegador locais.

## Linha de base (antes)
- Capturas: `docs/capturas/0-antes/`.
- Classes de cor soltas (`bg|text|border|ring|from|to|...-{blue,indigo,emerald,rose,amber,orange,purple,green,red,yellow,pink,violet,cyan,teal,sky,lime,fuchsia}-NNN`): **2031** ocorrências em **85** arquivos `.tsx`.
- Raios `rounded-{md,lg,xl,2xl,3xl}`: 1024 ocorrências.

## Fases

### 1. Fundação: design system
- [ ] Tokens em `globals.css`
- [ ] Componentes em `src/components/ui`
- [ ] `/dashboard/ui`

### 2. Casca do sistema
- [ ] pendente

### 3. Identidade visual da escola e acesso
- [ ] pendente

### 4. Migração das telas
- [ ] pendente

### 5. Extras
- [ ] pendente

## Próximo passo
Fase 1: componentes.
