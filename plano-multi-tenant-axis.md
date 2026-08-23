# Plano de Arquitetura Multi-Tenant — Sistema Áxis

**Objetivo:** transformar o sistema Áxis (hoje single-tenant, feito sob medida para o CETEP/LNAB) em um produto SaaS multi-tenant, capaz de atender múltiplas escolas com isolamento de dados, identificação por subdomínio e pacotes de assinatura (Básico/Pro/Enterprise).

Este documento é apenas de planejamento — nenhuma alteração de código foi feita ainda.

---

## 1. Modelo de Tenant

Novo modelo raiz `Escola`, do qual toda a aplicação passa a depender.

```prisma
model Escola {
  id            String    @id @default(cuid())
  nome          String
  slug          String    @unique   // usado no subdomínio: {slug}.seusistema.com
  plano         PlanoTipo @default(BASICO)
  status        String    @default("TRIAL") // TRIAL, ATIVA, SUSPENSA, CANCELADA
  logoUrl       String?
  corPrimaria   String?
  corSecundaria String?
  emailDominio  String?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
}

enum PlanoTipo {
  BASICO
  PRO
  ENTERPRISE
}
```

- Plano modelado como **enum** por simplicidade inicial. Migra para tabela `PlanoFeatures` separada só se surgir necessidade de planos customizados por cliente.
- `slug` é o identificador único usado para resolver o subdomínio.
- `status` permite suspender uma escola (inadimplência, fim de trial) sem apagar dados.

---

## 2. Identificação por Subdomínio

**Fluxo escolhido:** `escola.seusistema.com` (cada escola tem seu próprio subdomínio).

### Infraestrutura necessária
- DNS wildcard (`*.seusistema.com`) apontando para o mesmo deploy.
- Configuração de domínios wildcard no provedor de hosting (ex: Vercel suporta isso via "Wildcard Domains", precisa de plano compatível).
- Certificado SSL wildcard (geralmente automático em provedores modernos).

### Lógica de resolução (Next.js Middleware)
Antes de qualquer autenticação, um middleware precisa:
1. Ler o `Host` header da requisição.
2. Extrair o subdomínio (`cetep` de `cetep.seusistema.com`).
3. Buscar a `Escola` correspondente pelo `slug` (com cache leve, já que muda pouco).
4. Injetar o `escolaId` no contexto da requisição (ex: header interno ou cookie assinado) para uso posterior no `auth.ts` e nas rotas.
5. Se o subdomínio não corresponder a nenhuma escola ativa → página de erro amigável ("escola não encontrada" ou "assinatura suspensa").

### Impacto na autenticação (`auth.ts`)
- O `authorize()` do NextAuth precisa filtrar o `User` por `escolaId` **além** de username/email, já que esses campos deixam de ser únicos globalmente (ver seção 4).
- O JWT/sessão passa a carregar `escolaId` como claim, junto dos campos que já existem hoje (`isSuperuser`, `isDirecao` etc.).
- Todas as queries subsequentes (dashboard, notas, turmas...) usam esse `escolaId` da sessão para filtrar dados — nunca confiar em `escolaId` vindo do client.

### Ambiente de desenvolvimento local
Subdomínios não funcionam de forma trivial em `localhost`. Soluções comuns:
- Usar `escola.localhost:3000` (funciona em navegadores modernos sem configuração de `/etc/hosts`).
- Ou manter um modo de fallback por variável de ambiente para dev (`DEV_ESCOLA_SLUG=cetep`).

---

## 3. Mudanças no Schema Prisma

### 3.1 Modelos que recebem `escolaId` diretamente
Ponto de entrada do tenant — esses modelos ganham a coluna e o relacionamento com `Escola`:

| Modelo | Motivo |
|---|---|
| `User` | Login e permissões dependem disso |
| `Turma` | Raiz da maior parte dos dados acadêmicos |
| `Curso` | Catálogo de cursos é por escola |
| `AreaConhecimento` | Nomenclatura pode variar por escola |
| `Laboratorio` | Recurso físico da escola |
| `Message` | Sistema de mensagens/tickets |
| `GlobalConfig` | Deixa de ser singleton (`id: "global"` fixo) — passa a ter `id = escolaId` (uma config por escola) |

### 3.2 Modelos que herdam via relação (sem coluna própria, por ora)
Chegam a `Escola` através de `Turma` — mantidos assim para não duplicar dado, mas podem ganhar `escolaId` denormalizado depois se performance exigir:

`Estudante`, `Disciplina`, `NotaFinal`, `Prova`, `Questao`, `HorarioAula`, `Ocorrencia`, `MatrizCurricular`, `ReservaLaboratorio`

### 3.3 Constraints que precisam mudar (globais → por escola)

| Campo | Hoje | Depois |
|---|---|---|
| `User.email` | `@unique` | `@@unique([escolaId, email])` |
| `User.username` | `@unique` | `@@unique([escolaId, username])` |
| `Estudante.matricula` | `@id` (chave primária!) | Vira `@@unique([escolaId, matricula])`; a PK passa a ser um `id` técnico (cuid) novo |
| `Curso.sigla` | `@unique` | `@@unique([escolaId, sigla])` |
| `Curso.[nome, modalidade]` | `@@unique` | `@@unique([escolaId, nome, modalidade])` |
| `AreaConhecimento.nome` | `@unique` | `@@unique([escolaId, nome])` |
| `Laboratorio.nome` | `@unique` | `@@unique([escolaId, nome])` |

**Ponto de atenção crítico:** `Estudante.matricula` como chave primária é referenciada como FK em `NotaFinal`, `NotaSimulado`, `TeamMember` e `User.estudanteId`. Trocar a PK exige migração cuidadosa de todas essas foreign keys, na ordem correta, com backup antes de rodar.

---

## 4. Migração dos dados existentes (CETEP)

O CETEP/LNAB vira a **primeira `Escola`** no novo modelo. Passos, em ordem:

1. Criar a tabela `escolas` e inserir uma linha para o CETEP (`slug: "cetep"` ou equivalente).
2. Adicionar as colunas `escola_id` (nullable inicialmente) nos modelos da seção 3.1.
3. Popular `escola_id = <id do CETEP>` em todas as linhas existentes (UPDATE em massa).
4. Tornar `escola_id` `NOT NULL` após confirmar que não sobrou nenhuma linha órfã.
5. Recriar as constraints únicas (seção 3.3) como compostas.
6. Migrar `GlobalConfig` do singleton `"global"` para `id = <id do CETEP>`.
7. Validar em ambiente de staging com uma cópia do banco antes de tocar em produção.

Cada passo deve ser uma migration Prisma separada e reversível — nada de uma migration gigante monolítica.

---

## 5. Pacotes de Assinatura — proposta

| Recurso | Básico | Pro | Enterprise |
|---|---|---|---|
| Usuários (professores/direção) | até 15 | até 50 | ilimitado |
| Portal do aluno | ✅ | ✅ | ✅ |
| Gerador de provas + banco de questões | ❌ | ✅ | ✅ |
| Simulados / análise de risco | ❌ | ✅ | ✅ |
| Relatórios em PDF | básico | ✅ | ✅ + marca própria |
| Branding (logo/cores) | ❌ | ✅ | ✅ completo |
| Suporte | e-mail | e-mail prioritário | dedicado / SLA |

*A definir com o usuário: quais features específicas do sistema atual (conselho de classe, AEE, laboratórios, mensagens) entram em qual pacote.*

Enforcement de plano em código: checagem centralizada (ex: `escola.plano` + tabela/mapa de features) nas rotas e componentes que renderizam funcionalidades pagas — nunca só no frontend, sempre validado no backend também.

---

## 6. Ordem de execução recomendada

1. **Fase 0 — Preparação:** ambiente de staging com cópia do banco atual (não a produção).
2. **Fase 1 — Schema:** criar `Escola`, adicionar `escolaId` nullable, sem quebrar nada em produção ainda.
3. **Fase 2 — Backfill:** popular `escolaId` do CETEP em todas as linhas.
4. **Fase 3 — Constraints:** tornar `escolaId` obrigatório, recriar unique constraints compostas.
5. **Fase 4 — Middleware de subdomínio:** resolver tenant antes do auth.
6. **Fase 5 — Auth:** `auth.ts` passa a filtrar por `escolaId`.
7. **Fase 6 — Auditoria de queries:** revisar toda rota/query no código para garantir filtro por `escolaId` (incluir os `$queryRaw` encontrados hoje).
8. **Fase 7 — Enforcement de plano:** lógica de feature-flag por pacote.
9. **Fase 8 — Onboarding de nova escola:** fluxo (mesmo que manual no início) para provisionar uma segunda escola de teste e validar isolamento real.
10. **Fase 9 — Catálogo de módulos e RBAC central:** criar o registro de módulos e a função `can()`, migrando sidebar/dashboard/rotas para consumi-los (seção 7).
11. **Fase 10 — Limpeza de dívida técnica:** aplicar a tabela da seção 8 (SQL raw, `as any`, hardcodes do CETEP, vestígios de migração Django).
12. **Fase 11 — Estrutura pronta para módulo financeiro:** com o catálogo de módulos e `EscolaModulo` no lugar, o financeiro (ou qualquer outro módulo futuro) passa a ser um projeto isolado de adicionar, sem tocar no núcleo.

---

## 7. Arquitetura Modular e Extensibilidade

Objetivo: permitir plugar módulos futuros (financeiro, comunicação, integrações externas etc.) sem reescrever o núcleo, e sem repetir lógica de permissão/visibilidade em vários arquivos como acontece hoje.

### 7.1 Problema atual
A checagem de "quem vê o quê" está duplicada em pelo menos três lugares (`DashboardSidebar.tsx`, `dashboard/page.tsx`, e dentro de cada rota/página individualmente), todas usando comparações booleanas inline (`user.isSuperuser || user.isDirecao`). Isso funciona para o conjunto fixo de telas de hoje, mas não escala para módulos que precisam ser ativados seletivamente por escola/plano.

### 7.2 Registro central de módulos
Criar um catálogo único (`src/lib/modules.ts` ou equivalente) onde cada módulo/funcionalidade se autodescreve:

```ts
{
  id: "financeiro",
  nome: "Financeiro",
  icone: DollarSign,
  rota: "/dashboard/financeiro",
  planoMinimo: "PRO",
  permissao: (user) => user.isSuperuser || user.isDirecao,
}
```

Sidebar, dashboard e a checagem de acesso nas rotas passam a **ler desse catálogo** em vez de reimplementar a lógica em cada lugar. Adicionar um módulo novo vira "adicionar uma entrada no catálogo", não "editar N arquivos".

### 7.3 Sistema de permissões (RBAC) centralizado
Substituir as checagens booleanas espalhadas por uma função central `can(user, acao)`. Os campos booleanos (`isSuperuser`, `isDirecao`, `isStaff`, `isAEE`) continuam existindo no banco — só a decisão de acesso passa a ficar em um único ponto, o que facilita adicionar papéis novos (ex: "Financeiro", "Secretaria") sem caçar todo lugar que verifica permissão.

### 7.4 Ativação de módulo por escola
Nova tabela `EscolaModulo` (`escolaId`, `moduloId`, `ativo`), complementar ao `plano` da `Escola`. Permite ligar/desligar um módulo específico por escola independentemente do pacote contratado (ex: trial de um módulo novo, ou desativar algo pontualmente). Generaliza o padrão que já existe hoje em `GlobalConfig.isBancoQuestoesAtivo`, hoje hardcoded para um único recurso — esse campo deve migrar para dentro dessa tabela também.

### 7.5 Módulos futuros como "satélites" do núcleo
Regra de desenho: um módulo novo (financeiro ou outro) pode referenciar modelos do núcleo (`Escola`, `User`, `Estudante`), mas o núcleo **nunca** referencia de volta um módulo opcional. Isso significa:
- Modelos próprios do módulo, isolados no schema (ex: prefixo ou schema Prisma separado).
- Rotas próprias, sob seu próprio prefixo (ex: `/dashboard/financeiro/**`, `/api/financeiro/**`).
- O núcleo acadêmico continua funcionando perfeitamente com o módulo desligado.

### 7.6 Camada de serviço (service layer)
Hoje a lógica de negócio está bastante misturada diretamente nas rotas de API (visto em `provas/route.ts`, `conselho-classe/route.ts`, `notas/recuperacao/route.ts`). Extrair regras de negócio para funções em `src/lib/` (ex: `src/lib/services/notas.ts`), que tanto a rota HTTP quanto uma futura integração (webhook de pagamento, API externa) possam reutilizar sem duplicar código.

### 7.7 Pontos de extensão via eventos (opcional, avançado)
Se o roadmap prevê vários módulos (não só financeiro), vale um mini sistema de eventos internos — ex: `emitEvent("nota.lancada", { estudanteId, disciplinaId })` — que outros módulos escutam sem o núcleo precisar conhecê-los. Mais custoso de implementar; só compensa se a lista de módulos futuros for mesmo grande.

---

## 8. Reestruturação do código existente

Estes pontos convergem diretamente com a arquitetura modular acima — não é trabalho extra, é a mesma reestruturação aplicada ao que já existe:

| Problema identificado | Onde | Ação recomendada |
|---|---|---|
| Sessão "rebuscada" manualmente por ID/email/username a cada rota | `conselho-classe/route.ts`, `notas/recuperacao/route.ts` | Investigar causa raiz da dessincronização de sessão; centralizar em uma função utilitária única enquanto isso, em vez de repetir o padrão |
| `prisma.$queryRaw` / `$executeRaw` misturado ao client tipado | `auth.ts`, `usuarios/page.tsx` | Migrar para Prisma Client tipado onde possível; auditar os que restarem como SQL raw por segurança (risco de injection) |
| Uso extensivo de `as any` para contornar tipos do Prisma | Vários arquivos | Corrigir tipagem na origem (geralmente sintoma de schema desalinhado com o client gerado) |
| Permissão checada inline e duplicada | `DashboardSidebar.tsx`, `dashboard/page.tsx`, rotas individuais | Resolvido pela função `can(user, acao)` da seção 7.3 |
| Hardcodes específicos do CETEP (mapeamento de disciplinas, cabeçalho de PDF, ícones por curso) | `mapeamento_disciplinas.json`, `GeradorProvasClient.tsx`, geração de PDF | Mover para configuração por escola (via `Escola.logoUrl`, tabela de mapeamento por `escolaId`, etc.) |
| Vestígios de migração Django não finalizada | `migrate-from-django.ts`, `tmp_seed_planos.js` na raiz | Confirmar se ainda são necessários; remover ou mover para uma pasta `scripts/legacy/` clara |
| Toggle de feature único e hardcoded | `GlobalConfig.isBancoQuestoesAtivo` | Migrar para a tabela `EscolaModulo` (seção 7.4) |

---

## 9. Riscos e pontos de atenção

- **Vazamento de dado entre escolas** é o risco mais grave — qualquer query sem filtro de `escolaId` é uma falha de segurança grave, não só um bug.
- Uso atual de `prisma.$queryRaw`/`$executeRaw` (visto em `auth.ts`, `usuarios/page.tsx`) precisa de auditoria manual, pois esses não passam pelo Prisma Client tipado e podem escapar de qualquer proteção automática futura.
- Mudança de PK da `Estudante` é a migration mais arriscada tecnicamente — fazer isolada e com backup verificado.
- Ambiente de desenvolvimento local precisa de solução para subdomínio antes que o time consiga trabalhar confortavelmente na Fase 4 em diante.
