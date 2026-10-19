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
- [x] Tokens em `src/app/globals.css` (`@theme inline`): superfícies `canvas/surface/elevated/subtle`, texto `fg/fg-muted/fg-subtle/fg-disabled`, bordas `line-subtle/line/line-strong`, destaque `accent/accent-hover/accent-subtle/accent-fg/on-accent/ring` (hover e versões suaves derivadas de `--accent` com `color-mix`, para a escola sobrescrever só `--accent` e `--on-accent`), semânticas `success/warning/danger/info` (+ `-subtle`, `-fg`, `-line`), sombras `shadow-card`/`shadow-overlay`, tamanho `text-13`, animações de 150ms (`animate-fade-in`, `animate-pop-in`, `animate-slide-up`, `animate-skeleton`), foco visível global, `prefers-reduced-motion`.
  - **[decisão]** Tema escuro definido, mas só liga com `data-theme="dark"` (ou `data-theme="system"` + preferência do sistema). Ligar pelo `prefers-color-scheme` sozinho deixaria as telas ainda não migradas metade claras/metade escuras.
  - **[decisão]** Raios pela escala padrão do Tailwind, que já bate com a direção: `rounded-md` 6px (controles), `rounded-lg` 8px (cards/inputs), `rounded-xl` 12px (modais). Sem `rounded-2xl/3xl`.
  - **[decisão]** Destaque padrão índigo `#4f46e5`, texto sobre ele branco.
- [x] Componentes em `src/components/ui` (sem dependência nova): `Button` (+ `buttonClasses` para links), `Field`/`Label`/`FieldError`/`FieldHint`, `Input`, `Textarea`, `Select`, `Checkbox`, `Switch`, `Badge`, `Alert`, `Card` (+ Header/Body/Footer), `PageHeader` + `Breadcrumb`, `Table` (`TableContainer` com rolagem interna e cabeçalho fixo, `TH/TD numeric`, `TableEmpty`), `EmptyState`, `Skeleton`/`SkeletonRows`, `Dialog` (foco preso, Esc, clique fora, foco volta), `Tabs` (setas/Home/End), `Menu` (setas, Esc, clique fora), `Tooltip`, `Toast` (`ToastProvider` em `Providers.tsx` + `useToast`), `Avatar`, `Stat`. Ícones: `ICONE = { size: 16, strokeWidth: 1.75 }`.
- [x] Vitrine `/dashboard/ui` (só superuser).

### 2. Casca do sistema
- [ ] pendente

### 3. Identidade visual da escola e acesso
- [ ] pendente

### 4. Migração das telas
- [ ] pendente

### 5. Extras
- [ ] pendente

## Próximo passo
Fase 2: menu lateral, barra superior e dashboard inicial.
