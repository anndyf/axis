# Logins de Teste — Ambiente Local

> ⚠️ Somente para desenvolvimento local. Senhas fictícias — nunca usar em produção.

## Como acessar

| Escola | Endereço |
|---|---|
| **CETEP/LNAB** (escola principal, com dados) | http://localhost:3000 ou http://cetep.localhost:3000 |
| **Colégio Horizonte** (2ª escola, teste de isolamento) | http://horizonte.localhost:3000 |

Iniciar o sistema: `npm run dev` (na pasta `C:\AXIS`).

**Página de entrada (domínio raiz):** sem subdomínio de escola e sem `DEV_ESCOLA_SLUG`, o endereço raiz mostra a página "Endereço da sua escola" (`/entrada`), que leva para `<escola>.<domínio>/login`. Com `DEV_ESCOLA_SLUG` no `.env`, `http://localhost:3000` continua abrindo direto a escola, como antes; a página de entrada pode ser vista em `http://localhost:3000/entrada`. Subdomínio inexistente cai em `/escola-invalida`.

**No painel:** `Ctrl+K` (ou ⌘K) abre a busca rápida (páginas; para a direção/admin também turmas e estudantes). O tema (claro, escuro ou do sistema) fica no menu do usuário, no rodapé do menu lateral. A cor e o logo da escola se ajustam em Configurações → Identidade visual (direção/admin).

O login aceita **usuário ou e-mail**. Após **5 tentativas erradas** em 15 minutos o usuário fica bloqueado por 15 minutos (ou até redefinir a senha pelo link "Esqueci minha senha").

---

## Escola CETEP/LNAB

### Equipe

| Perfil | Usuário | Senha | O que testar |
|---|---|---|---|
| **Administrador (superuser)** | `admin` | `admin123` | Acesso total: criar/editar/excluir tudo, usuários, configurações |
| **Direção** | `direcao` | `direcao123` | Gestão sem ser superuser: relatórios, usuários, conselho |
| **Coordenação AEE** | `aee` | `aee123` | Painel AEE (há 1 estudante com perfil AEE: *1TIM1-003*) |
| **Professor** | `professor` | `professor123` | Vinculado às 5 disciplinas da turma **1TIM1** — lançar notas |
| Professor (seed) | `ricardo.prof` | `admin123` | Professor com disciplinas espalhadas por várias turmas |
| Professor (seed) | `ana.prof` | `admin123` | 〃 |
| Professor (seed) | `carlos.prof` | `admin123` | 〃 |
| Professor (seed) | `mariana.prof` | `admin123` | 〃 |
| Professor (seed) | `roberto.prof` | `admin123` | 〃 |

### Portal do Estudante

Padrão do sistema: usuário **e** senha = matrícula. No primeiro acesso o sistema exige a criação de uma senha própria (mínimo 8 caracteres) — use a nova senha nos acessos seguintes.

| Estudante | Usuário | Senha |
|---|---|---|
| Manuela Oliveira 1 (1TIM1) | `1TIM1-001` | `1TIM1-001` |
| Manuela Souza 2 (1TIM1) | `1TIM1-002` | `1TIM1-002` |

### Casos de bloqueio (login deve FALHAR)

| Situação | Usuário | Senha | Resultado esperado |
|---|---|---|---|
| Cadastro não aprovado | `professor.pendente` | `pendente123` | Login recusado (aguardando aprovação) |
| Usuário desativado | `professor.inativo` | `inativo123` | Login recusado (usuário inativo) |

---

## Escola Colégio Horizonte

Acessar por **http://horizonte.localhost:3000**

| Perfil | Usuário | Senha |
|---|---|---|
| Administrador | `admin` | `admin123` |

Teste de isolamento: os usuários da CETEP (ex.: `direcao`) **não** conseguem entrar aqui, e o `admin` da Horizonte só vê os dados da Horizonte (1 turma, 1 estudante).

---

## Dados de exemplo (CETEP)

- 3 cursos: Informática (I), Enfermagem (E), Administração (A)
- 9 turmas: `1TIM1`, `2TIM1`, `3TIM1`, `1TEM1`, `2TEM1`, `3TEM1`, `1TAN1`, `2TAN1`, `3TAN1`
- 10 estudantes por turma (matrículas `<TURMA>-001` a `<TURMA>-010`), com notas aleatórias
- 5 disciplinas por turma, com plano de ensino

---

## Banco de dados local

| Item | Valor |
|---|---|
| Servidor | PostgreSQL 17 (serviço Windows `postgresql-x64-17`) |
| Host / Porta | `localhost` / `5433` |
| Usuário / Senha | `postgres` / `devpassword` |
| Banco do sistema | `axis_dev` (configurado no `.env`) |
| Banco dos testes automatizados | `axis_test` (configurado no `.env.test`) |

### Comandos úteis

```bash
npm run dev                              # iniciar o sistema
npm test                                 # testes automatizados (usam o axis_test)
npm run db:seed                          # dados de exemplo da CETEP
npx tsx prisma/onboard-escola-teste.ts   # escola Horizonte
npx tsx prisma/seed-usuarios-teste.ts    # usuários de teste (direção, AEE, portal...)
npx tsx prisma/seed-calendario.ts       # calendário 2026, feriados, tempos de aula e horários
```

### Recriar o banco do zero

```bash
npx prisma migrate reset                 # apaga o axis_dev e reaplica as migrations
npm run db:seed
npx tsx prisma/onboard-escola-teste.ts
npx tsx prisma/seed-usuarios-teste.ts
npx tsx prisma/seed-calendario.ts
```
