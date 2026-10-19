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
- [x] Regras puras `src/lib/services/identidade.ts` (teste `identidade.test.ts`): hex válido, contraste WCAG, texto legível automático sobre o destaque (branco ou quase preto), avisos de contraste (texto do botão < 4,5:1; destaque sobre branco < 3:1), validação do logo.
- [x] Tela `/dashboard/configuracoes/identidade` (só `gestao`): cor (seletor + hex), logo (envio de imagem ou endereço https), pré-visualização ao vivo (menu, botão, link, login) e contraste. Ação `salvarIdentidade` com escola da sessão (teste `src/lib/identidade-acoes.test.ts`). Atalho em Configurações.
  - **[decisão]** Não havia upload no projeto. O logo pode ser **enviado** (reduzido no navegador para até 256px, PNG ou JPEG, gravado em `Escola.logoUrl` como data URL de até 150 KB) ou um **endereço https**. Endereço externo aparece só nas telas; nos PDFs entra só a imagem enviada — o servidor nunca busca URL informada pelo usuário (evita SSRF).
  - **[decisão]** `corSecundaria` não foi usada: a direção pede uma única cor de destaque.
- [x] A cor da escola vira `--accent`/`--on-accent` no `<html>` (layout raiz, via `src/lib/escola-atual.ts` com o `x-escola-id` do proxy); hover e tons suaves derivam no CSS (`:root, [data-accent]`). `themeColor` do navegador e a barra de carregamento usam a mesma cor.
- [x] Logo no menu lateral, nas páginas de acesso (login, redefinir/trocar senha) e no cabeçalho dos PDFs (`src/lib/pdf-logo.ts` em `api/relatorio/*` e `api/boletim/[id]/pdf`; teste `pdf-logo.test.ts`). Portal: na fase 4.
- [x] Manifest dinâmico em `/manifest` (`src/app/manifest/route.ts`): nome e cor do tema da escola, com o `public/manifest.json` como base/fallback.
- [x] Login (`src/app/login`): duas colunas no desktop (formulário + painel na cor de destaque com a marca da escola e grade sutil, sem fotos), coluna única no celular; mostrar/ocultar senha e aviso de Caps Lock (`PasswordInput`); botão com estado carregando; mensagem com título e texto para cada código (`credenciais`, `inativo`, `pendente`, `bloqueado`, `escola`, sessão expirada); "Esqueci minha senha" ao lado do rótulo da senha, recuperação no `Dialog` acessível.
- [x] `/redefinir-senha` e `/trocar-senha` (`NovaSenhaForm`) no mesmo layout (`src/components/AcessoLayout.tsx`), com indicador de força (`src/lib/services/forca-senha.ts`, mínimo 8 igual ao servidor; teste `forca-senha.test.ts`) e confirmação em tempo real.
  - **[decisão]** `/cadastro-professor` hoje só redireciona para o login (não existe formulário de cadastro). Criar um fluxo de cadastro seria regra de negócio; ficou como está.
- [x] Página de entrada no domínio raiz (`/entrada`, servida em `/` quando não há subdomínio): apresentação curta + "Endereço da sua escola" que leva para `<slug>.<domínio>/login`. Não lista escolas nem consulta se o endereço existe. Helpers puros `src/lib/services/dominio.ts` (teste `dominio.test.ts`).
- [x] `src/proxy.ts`: no domínio raiz, `/` reescreve para `/entrada`; `/entrada` funciona em qualquer endereço; `/manifest` e `/api/auth/session` passam sem escola (também em escola inexistente/suspensa — antes o SessionProvider dava erro na página de escola inválida). DEV_ESCOLA_SLUG funciona como antes. Teste `src/lib/proxy.test.ts` (raiz sem slug, slug válido, inexistente, suspensa, cancelada, DEV_ESCOLA_SLUG).
  - **[correção de segurança]** O proxy agora **remove** qualquer `x-escola-id` enviado pelo cliente em toda resposta sem escola (rewrite para escola inválida, página de entrada, rotas sem escola). Antes, nesses caminhos o header do cliente seguia adiante; nenhuma página o lia ali, mas com páginas públicas novas passou a importar.
- [x] `/escola-invalida` no novo padrão, com botão para a página de entrada (endereço raiz calculado do host).

### 4. Migração das telas
- [x] Codemod `scripts/codemod-cores.py` (mecânico, reproduzível, documentado no próprio arquivo) aplicado em 88 arquivos de `src`: cinzas → zinc (texto cinza → `fg/fg-muted/fg-subtle`, para passar AA), azuis/roxos → destaque, verdes/amarelos/vermelhos → semânticas suaves, degradês e sombras coloridas removidos, sombras grandes → `shadow-card` (ou `shadow-overlay` em camadas flutuantes), `rounded-2xl` → `rounded-lg`, `rounded-3xl`/`rounded-[Nrem]` → `rounded-xl`, `font-black/extrabold` → `font-semibold`, ícones decorativos com classe dinâmica (`bg-${cor}-50`) → neutros. Dentro de `/dashboard`: cabeçalhos de página `sticky` com margem negativa (do layout antigo, colidiam com a barra superior) viram bloco normal; `min-h-screen` das páginas sai (empurrava o rodapé).
  - Contagem de classes de cor soltas: **2031 → 0** (padrão do PROGRESSO; `python3 scripts/codemod-cores.py src --contar`).
  - **[decisão]** `scripts/` e `docs/` fora da varredura do Tailwind (`@source not`): o Tailwind lia texto do script como classe e gerava CSS inválido (derrubou o app até a correção).
- [x] Codemod, passes seguintes: `text-white` sobre destaque → `text-on-accent` (legível com qualquer cor de escola); botões escuros (`bg-zinc-900/black`) → ação primária na cor da escola, `bg-zinc-700/800` → secundário neutro; títulos `h1–h4` sem cor de destaque; caixa alta + espaçamento largo removidos e `text-[8-11px]` → `text-xs` (uppercase 701 → 89, os restantes são siglas/códigos); classes `animate-in` (que nunca funcionaram, o plugin não está instalado) → animações de 150ms; modais com `shadow-overlay`; cabeçalhos de página legados (`cabecalhos()`) no padrão do `PageHeader` (sem borda, título 24/600, seta de voltar discreta e oculta no celular, ação primária no tamanho padrão do `Button`).
- [x] Prioridade 1 (manual): lançamento de notas (cabeçalho com ações, dicas recolhíveis, estados vazios), chamada (lista do dia + diários, barra de salvar fixa no rodapé da área, avatar, alternância presente/falta), diário de classe (números + tabela densa), frequência e justificativas, boletim (`Stat`, tabela densa com notas alinhadas à direita, situação em `Badge`), conselho de classe (barra de salvar grudada em vez de fixa na tela inteira, cartões compactos), resultados (situações em badges suaves, abas segmentadas). `ConfirmModal` reescrito sobre o `Dialog` (foco inicial no Cancelar em ação destrutiva).
- [x] Prioridade 2 (manual): turmas (sem faixa escura, cartões neutros, ações em ícones cinza com `aria-label`, relatório da turma com `Stat`), usuários (avatar do sistema, filtros suaves, barra de seleção e aviso em superfície clara), estudantes (busca/total discretos, tabela densa com matrícula em mono, ações neutras), disciplinas (turnos sem cor, lista expansível com `aria-expanded`), configurações (atalhos em lista, `Switch`/`Select`, confirmação no `Dialog`), calendário letivo (botões padrão, sem caixa alta, lixeira neutra que fica vermelha só no hover), esquemas de avaliação e horário pelo codemod de cabeçalhos.
  - **[correção]** Em 375px a página de estudantes rolava de lado: o `sr-only` do cabeçalho "Ações" é `absolute` e escapava do contêiner com rolagem. Contêineres de tabela com rolagem agora são `relative` (o `TableContainer` já era).
  - Verificado em 375px: estudantes, disciplinas, configurações, calendário, esquemas, usuários, turmas, horário, notas, AEE, questões, provas, ocorrências — sem rolagem lateral da página.
- [x] Prioridade 3: portal do estudante (`src/app/portal`), celular primeiro: topo com a marca da escola (logo ou inicial na cor de destaque), abas no desktop e barra inferior simples no celular (`aria-current`), início com turma/frequência/horário, avisos em lista com marca de não lido, boletim em tabela densa com a disciplina fixa na rolagem lateral e situação em `Badge`, perfil enxuto; comunicado e horário de aulas no `Dialog` (ganhou o tamanho `xl`). Lógica intocada (abas, mensagens lidas no navegador, análise de risco, frequência, professor do horário).
  - **[correção de segurança]** `portal/page.tsx` mandava a sessão inteira (`session.user`) para o componente cliente; agora vai só `{ id }`, que é o único campo usado.
- [x] Prioridade 4: demais telas, pelo codemod + ajustes pontuais:
  - `maiusculas()`: sem rótulos em caixa alta (exceto campos de digitação e a visão de impressão da prova).
  - `estados()`: selecionado preto → destaque suave; selecionado verde → sucesso suave; botão verde ou escuro **clicável** (tem `hover:`) → primário na cor da escola; chips/ícones escuros → neutros; fundos hex quase brancos → canvas.
  - Conselho de classe (lista): sem linhas avermelhadas, situação em `Badge`, link "abrir" com `aria-label`. Matriz curricular, estudante (formulário): barra de seleção e aviso em superfície clara. AEE: observações da direção em bloco claro, chips de CID e perfis selecionados em destaque suave. Ocorrências: botão primário padrão.
  - Cabeçalhos de formulário (turma, usuário, matriz, ficha AEE) deixam de ser `sticky top-0 z-50` (cobriam a barra superior ao rolar).
  - **[decisão]** As barras flutuantes escuras de ação em lote (banco de questões, vincular disciplinas) ficaram escuras: é uma camada flutuante, padrão do Linear. Usuários e matriz curricular já tinham sido trocadas para clara antes desta decisão; ficou assim.
- [x] Carregamento: `dashboard/loading.tsx` e `portal/loading.tsx` com esqueletos (menu e barra superior ficam); o carregamento da raiz deixou de cobrir a tela com um painel.
- Capturas: `docs/capturas/4-migracao/`.

### 5. Extras
- [x] Neutros fixos → tokens (regra `neutros()` do codemod): `bg-white` → `surface`, `zinc-50` → `canvas`, `zinc-100` → `subtle`, `border-zinc-200/300` → `line/line-strong`, `text-black` → `fg` etc. Mesmos valores no claro (conferido por captura); no escuro tudo se adapta. Ficam de fora a impressão da prova e a bolinha dos interruptores. Classes neutras fixas: ~1.600 → 139 (restantes: impressão, sobreposições `bg-zinc-900/60`, casos pontuais).
- [x] Seletor de tema no menu do usuário (Tema claro / escuro / do sistema, `menuitemradio` com marca). Preferência no cookie `axis_tema` (`src/lib/tema.ts`, teste `tema.test.ts`), lida no layout raiz: o HTML já vem com `data-theme` certo, sem piscar e sem script inline.
  - **[decisão]** Padrão é o **claro**; o escuro é opcional.
- [x] Busca rápida Ctrl+K / ⌘K (`src/components/CommandPalette.tsx`), também por botão "Buscar" no menu lateral. Páginas = as mesmas do menu (`modulosVisiveis()` em `src/lib/modules.ts`, agora usada pelos dois). Turmas e estudantes só para a gestão, sempre na escola da sessão e com seleção mínima de campos (`src/app/dashboard/paleta/actions.ts`; teste `src/lib/paleta-acoes.test.ts` cobre outra escola, professor, AEE, portal e sem sessão). Busca sem acento/caixa (`src/lib/services/busca.ts`, teste `busca.test.ts`). Combobox acessível (setas, Enter, Esc, `aria-activedescendant`).
- [x] Content-Security-Policy em todas as respostas (`src/lib/csp.ts`, teste `csp.test.ts`, usada no `next.config.ts`). Varredura das telas principais e do portal com o servidor rodando: sem violações no console.
  - **[decisão]** `script-src` com `'unsafe-inline'`: o Next injeta scripts inline de hidratação; usar nonce exigiria renderização dinâmica em todas as páginas e mexer no proxy. Mesmo assim a política fecha plugins, `<base>`, destino de formulários e embutir em outro site.
- Capturas finais: `docs/capturas/5-final/`.

## Contagens (antes → depois)
| Medida | Antes | Depois |
|---|---|---|
| Classes de cor soltas (padrão do PROGRESSO) | 2031 em 85 arquivos | **0** |
| `uppercase` | 701 | 3 (campos de digitação e uma constante de rótulo) |
| `rounded-2xl` / `rounded-3xl` | 1024 raios no total, muitos 2xl/3xl | 0 de 2xl/3xl |
| Neutros fixos (branco/zinc) | ~1.600 | 139 |
| Testes | 255 | 295 |

## Para validar localmente

Preparar: `npm ci`, `npx prisma migrate deploy` (nenhuma migração nova nesta sessão), seeds de sempre, `npm run dev`. Logins em `LOGINS_TESTE.md`.

**Telas (comparar `docs/capturas/0-antes/` com `docs/capturas/5-final/`, em 1440px e 375px):**
- Login (`/login`), recuperação de senha (link "Esqueci minha senha"), `/trocar-senha` e `/redefinir-senha` (indicador de força).
- Dashboard da direção e do professor.
- Turmas, relatório da turma, lançamento de notas, chamada (lista, fazer chamada, diário), frequência, boletim do estudante, conselho de classe (lista e turma), resultados, configurações, portal do estudante.
- Configurações → Identidade visual: trocar a cor (ver contraste e pré-visualização), enviar um logo, salvar; conferir menu, login, portal, cor do navegador e um PDF (boletim) com o logo.
- Domínio raiz: sem `DEV_ESCOLA_SLUG`, `http://localhost:3000` mostra a página de entrada; `http://inexistente.localhost:3000` cai em `/escola-invalida`.
- Ctrl+K como direção (páginas, turmas, estudantes) e como professor (só páginas).
- Menu do usuário → Tema escuro / do sistema; recarregar a página (não deve piscar claro).
- Celular (375px): nenhuma tela deve rolar de lado; tabelas rolam dentro do cartão.

**Migrações:** nenhuma.

**Testes novos:** `identidade.test.ts`, `identidade-acoes.test.ts`, `pdf-logo.test.ts`, `forca-senha.test.ts`, `dominio.test.ts`, `proxy.test.ts`, `paleta-acoes.test.ts`, `busca.test.ts`, `tema.test.ts`, `csp.test.ts` (295 no total, `npx vitest run`).

**Decisões não confirmadas** (marcadas com [decisão] acima):
- Destaque padrão índigo; tema escuro opcional, padrão claro.
- Menu lateral abre expandido por padrão.
- Logo enviado (data URL até 150 KB) ou endereço https; PDFs só usam o enviado.
- `corSecundaria` sem uso.
- `/cadastro-professor` continua só redirecionando para o login.
- `playwright` como devDependency (capturas).
- Barras flutuantes escuras de ação em lote mantidas em duas telas.
- CSP com `'unsafe-inline'` em script.
- Não confirmado no navegador: importação de alunos por **PDF** (worker do pdf.js vindo do unpkg) com a CSP; a política libera esse endereço, mas vale enviar um PDF de teste em Estudantes → Importar.
