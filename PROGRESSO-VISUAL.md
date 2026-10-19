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
- [x] Menu lateral (`src/components/DashboardSidebar.tsx`) estilo Linear: fundo neutro, itens de 32px com ícone 16px, item ativo com fundo sutil + marca na cor de destaque, rótulos de grupo pequenos, marca da escola (logo ou inicial na cor de destaque) + nome + ano letivo no topo, usuário no rodapé com menu (Meu perfil, Trocar senha → `/dashboard/perfil#senha`, Componentes para superuser, Sair). Recolhível no desktop (preferência no navegador), gaveta no celular que fecha ao navegar. Itens e permissões continuam vindo de `src/lib/modules.ts`; contadores de mensagens/usuários pendentes mantidos.
  - **[decisão]** Menu passa a abrir **expandido** por padrão (antes recolhido); quem recolher, fica recolhido.
- [x] Barra superior (`src/components/DashboardTopbar.tsx`) fixa, com migalhas derivadas da rota (módulo do catálogo + subpáginas conhecidas; ids não aparecem) e área de ações. Layout com largura máxima de 1400px e espaçamentos padronizados; rodapé discreto.
- [x] Dashboard inicial por perfil (`src/app/dashboard/page.tsx`, dados em `src/lib/services/painel-leitura.ts`, só leitura e escopado pela escola):
  - Gestão: alunos, frequência média, alunos em risco (em recuperação ∪ abaixo da frequência mínima, sem contar duas vezes), chamadas pendentes; tabela por turma (frequência média, abaixo do mínimo, chamadas pendentes); atalhos; comunicados. Resumo por turma em cache de 5 min por escola (mesmo padrão `unstable_cache` com `escolaId` como argumento).
  - Professor: aulas de hoje com botão para a chamada, notas pendentes (alunos sem nota lançada por disciplina), minhas turmas, atalhos, comunicados.
- [x] `devIndicators: false` em `next.config.ts` (o indicador do modo dev cobria o menu do usuário).
- **[correção]** Lista de turmas vazia: o banco grava o turno como `MATUTINO` e a tela agrupava por `Matutino`, então nenhuma turma aparecia (já estava assim antes, ver `0-antes/turmas-1440.png`). Agrupamento agora normaliza o turno; dados intocados.
- Capturas: `docs/capturas/2-casca/`.
- Nota: com `npm run dev` rodando, o Next às vezes corrompe `.next/dev/types/routes.d.ts` (gerado); a verificação considera 0 erros de `tsc` fora de `.next/`.

### 3. Identidade visual da escola e acesso
- [ ] pendente

### 4. Migração das telas
- [ ] pendente

### 5. Extras
- [ ] pendente

## Próximo passo
Fase 3: identidade visual da escola, login, páginas de acesso, página de entrada no domínio raiz.
