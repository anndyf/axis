Você vai dar ao Áxis (Next.js 16 + Tailwind 4 + Prisma + PostgreSQL, SaaS escolar multi-escola), repositório https://github.com/anndyf/axis, uma CARA DE SISTEMA no computador. Hoje o desktop parece um site comum: conteúdo centralizado numa coluna estreita (max-w-4xl/5xl), cartões flutuantes muito arredondados (428 rounded-xl, 81 rounded-2xl) com muito espaço interno, sem barra de contexto, sem abas nem barra de ferramentas nas listas. O CELULAR já tem cara de app (barra inferior, cartões, bottom sheets): mantenha-o como está, salvo ajustes para continuar coerente.

Parta da `main` e crie a branch `estilo/layout-sistema`; trabalhe só nela. Logo no início, se `origin/regra/so-docente-grava` não estiver contida na `main`, faça `git merge origin/regra/so-docente-grava` na sua branch: é a regra "só quem leciona grava nota e chamada; Direção e Administrador só visualizam", já validada pela dona do produto. Não altere essa regra; nas telas de notas, recuperação, chamada e diário, mantenha e dê bom acabamento ao modo somente leitura (aviso, campos bloqueados com aparência de leitura, sem botão salvar). Commits pequenos (mensagens em português, terminando com "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"), push a cada etapa. Ao final, abra um pull request para a `main` (não faça merge).

## Decisões da dona do produto (siga)
- Densidade EQUILIBRADA: linhas de tabela de ~40px, painéis com borda de 1px, raio 6–8px (12px só em modais), sombra só em camadas flutuantes, espaçamento justo mas confortável. Referência de organização: SIGEduc (Bahia) e SUAP, com acabamento moderno.
- Fichas de entidade COM ABAS (turma, estudante, professor/usuário).
- Barra superior com CONTEXTO de trabalho, mas o ano letivo é SÓ EXIBIDO (sem seletor). O seletor de consulta de anos anteriores fica para a fase 6 (matrícula por ano), com somente leitura, faixa de aviso e volta automática ao ano atual; NÃO implemente o seletor agora.
- Fonte Inter já está na main; pesos só 400/500/600.

## Sessão sem supervisão
Ninguém vai acompanhar. Não pare para perguntar: na dúvida, escolha a opção mais sóbria e que não muda o que cada tela faz, anote em PROGRESSO-LAYOUT.md (raiz) e siga. Mantenha esse arquivo atualizado e commitado a cada etapa.

## Retomada
- Se a branch `estilo/layout-sistema` já existir no GitHub, faça checkout, leia PROGRESSO-LAYOUT.md e continue do próximo passo pendente.
- Commite e dê push com frequência: no máximo a cada 20 minutos de trabalho, mesmo que a etapa esteja pela metade (commit "wip: ..." que compila). Uma execução de retomada agendada considera a sessão parada se o último commit tiver mais de 45 minutos.
- Atualize PROGRESSO-LAYOUT.md a cada commit com o próximo passo exato, para a retomada continuar sem refazer nada.
- Ao concluir (PR aberto), escreva `STATUS: CONCLUÍDO` no fim de PROGRESSO-LAYOUT.md e dê push.

## Verificação
- `npm ci`; suba o PostgreSQL (`sudo apt-get update && sudo apt-get install -y postgresql`, iniciar, senha do postgres). Crie axis_dev e axis_test, .env e .env.test locais (não commitar), `npx prisma migrate deploy` nos dois; no axis_dev rode `npm run db:seed`, `npx tsx prisma/onboard-escola-teste.ts`, `npx tsx prisma/seed-usuarios-teste.ts`, `npx tsx prisma/seed-calendario.ts`, `npx tsx prisma/seed-frequencia.ts`, `npx tsx prisma/backfill/fase-2.ts` e, se existir, `npx tsx prisma/backfill/fase-3a.ts`.
- Antes de cada commit: `npx tsc --noEmit` com 0 erros (se reclamar de `.next/dev/types`, apague `.next`) e `npx vitest run` com tudo passando.
- Capturas com Playwright (reaproveite scripts/capturas.ts) em 1440px, 1280px e 375px, claro e escuro, ANTES de começar e ao final de cada etapa, em docs/capturas/layout-sistema/<etapa>/. Olhe as capturas e corrija o que estiver desalinhado, apertado ou com rolagem horizontal. Confira que o celular não regrediu.

## Regras obrigatórias
- Mudança VISUAL e de organização (exceções explícitas: último acesso na etapa 7 e leitura do histórico na etapa 5): não altere regras de negócio, consultas, permissões, a trava de módulos (`exigirModulo`) nem rotas de API. As abas só reorganizam telas que já existem (links para as rotas atuais ou rotas filhas que reaproveitam os mesmos componentes e consultas).
- Toda consulta continua filtrando pela escola da sessão; nada de dado novo vai ao navegador além do que a tela já mostrava; nunca o registro inteiro de User.
- O teste de cobertura de módulos (src/lib/modulos/cobertura-modulos.test.ts) precisa continuar passando: rota/página nova entra no mapa de módulos com a guarda.
- Use e amplie o design system (tokens em src/app/globals.css, componentes em src/components/ui). Atualize a vitrine /dashboard/ui com os componentes novos.

## Etapas, nesta ordem

### 1. Fundação de "área de trabalho"
- Tokens: raios (controle 6px, painel 8px, modal 12px), espaçamentos de página e de painel, alturas de linha de tabela; reduzir sombras de cartão a zero (borda no lugar).
- Componentes: `Painel` (borda, faixa de título com ações à direita, corpo, rodapé), `BarraFerramentas` (busca, fichas de filtro com contagem, ações à direita, exportar), `Abas` (sublinhado na cor de destaque, rolam de lado no celular), `CabecalhoPagina` (caminho, título, dados-chave em linha, ações), `ListaDescritiva` (rótulo × valor em grade, para fichas em modo leitura), `Tabela` revisada (cabeçalho fixo, números à direita e tabulares, linha clicável, rodapé com contagem e paginação).
- Tipografia, etapa 2: títulos de seção/painel em 14–15px peso 600 (não 11–12px em negrito); rótulos 12.5–13px peso 400–500 em cor secundária; texto 13.5–14px; nada de Maiúsculas Em Cada Palavra em títulos e rótulos (frase normal); um destaque por bloco.

### 2. Casca
- Conteúdo ocupa a largura disponível (remover os max-w estreitos das páginas de trabalho); só formulários curtos e telas de leitura longa ficam limitados (~720–880px).
- Barra superior (48px) com: escola, "Ano letivo 2026" exibido, visão/perfil (o seletor de visão do painel já existe), busca (Ctrl+K já existe), notificações e usuário. No celular, a barra atual continua.
- Menu lateral: itens mais compactos (densidade equilibrada), mantendo a cor e os itens atuais.

### 3. Fichas com abas
- Turma: Visão geral · Estudantes · Disciplinas · Horário · Notas · Frequência · Ocorrências (cada aba aponta para o que já existe hoje para a turma; o que não existir para a turma fica fora).
- Estudante: Dados · Notas/Boletim · Frequência · Ocorrências · AEE (se o usuário puder ver e o módulo estiver ativo) · Documentos (se existir). Dados em `ListaDescritiva` com botão "Editar" que abre o formulário atual.
- Usuário/professor: Dados · Papéis (a tela de papéis da fase 3b, se já estiver na main) · Disciplinas e turmas.
- Ficha AEE: modo leitura em `ListaDescritiva` e painéis; "Editar ficha" abre o formulário atual. Respeite as permissões e a auditoria de leitura existentes.

### 4. Listas e telas de trabalho
Na ordem: turmas, estudantes, usuários, disciplinas, resultados, frequência/infrequência, conselho de classe, lançamento de notas, chamada e diário (desktop), mensagens, ocorrências, AEE, provas/questões/simulados, configurações. Em cada uma: `CabecalhoPagina` + `Painel` + `BarraFerramentas` + `Tabela`, sem mudar o que a tela faz. Dashboard inicial: painéis em grade usando a largura toda.

### 5. Rastreabilidade visível
- Rodapé discreto em fichas e registros (turma, estudante, usuário, ficha AEE, plano de ensino, ocorrência, avaliação): "Criado por Fulana em 12/03/2026 · Última alteração por Beltrano em 18/10/2026, 14:32", com os dados que já existem (createdAt/updatedAt, AuditLog, autores já gravados). Onde o autor não é gravado hoje, mostre só a data (não invente autor; registre em PROGRESSO-LAYOUT.md onde faltaria gravar).
- Aba "Histórico" nas fichas com as entradas do AuditLog/NotaFinalAudit daquela entidade, só para quem já pode ver auditoria hoje (mesmas permissões da tela /dashboard/auditoria) e sempre filtrando pela escola da sessão. Teste de isolamento escola A × B e aluno do portal para a leitura do histórico.
- Indicador de gravação nos formulários longos e no lançamento de notas/chamada: "Alterações não salvas" enquanto houver mudança pendente e "Salvo às 14:32" depois de gravar.

### 6. Formulários e tabelas com rigor
- Máscaras e validação no navegador (sem trocar a validação do servidor): CPF (com dígito verificador), telefone, CEP e datas, onde esses campos existirem; obrigatórios marcados; erro na linha do campo.
- Formulários longos em seções numeradas (1. Dados pessoais, 2. Documentos…), com botão salvar fixo.
- Tabelas: ordenação por coluna, seleção em lote onde já existe ação em lote, escolha de colunas visíveis (guardada no navegador) e exportar (CSV) do que está na tela, respeitando as permissões.

### 7. Acabamento de produto maduro
- Trocar todos os emojis das telas (há em 7 arquivos: 💡 ✅ ⚠ 🚨 📢 💬 👥 🏛 🛠) por ícones lucide-react no padrão do sistema.
- Linguagem formal e consistente em mensagens de erro, sucesso, confirmação e estados vazios ("Não foi possível salvar. Tente novamente."). Sem tom informal.
- Rodapé do sistema (desktop) com versão lida do package.json, links de Suporte, Termos e Privacidade (páginas simples, com texto provisório marcado como tal), e uma tela "Novidades" que lista as mudanças por versão (pode começar com as entregas recentes). NÃO altere o número da versão: isso é decisão da dona do produto; registre a sugestão em PROGRESSO-LAYOUT.md.
- Após o login: aviso discreto "Seu último acesso foi em 19/10/2026 às 21:14". Pode exigir guardar o último acesso do usuário (coluna nova, migration aditiva gerada com prisma migrate diff, teste); grave no login, mostre o acesso ANTERIOR. Sem IP na tela.
- Ajuda contextual: botão "?" no cabeçalho de cada tela principal abrindo um painel curto explicando para que a tela serve e os passos principais (textos objetivos em português).

### 8. Impressão
- Botão "Imprimir" com folha de estilo própria (sem menu, sem cores de fundo, cabeçalho com nome da escola, data/hora de impressão e paginação) em: lista de estudantes da turma, ficha do estudante, ficha AEE (respeitando permissão), diário da disciplina, resultados da turma e frequência/infrequência.

## Encerramento
Em PROGRESSO-LAYOUT.md: "Para validar localmente" com as telas para conferir (capturas antes/depois por etapa, claro/escuro, desktop/celular), componentes novos e decisões tomadas sem confirmação. Abra o PR para `main` com esse resumo e marque `STATUS: CONCLUÍDO`.
