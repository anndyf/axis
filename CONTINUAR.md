# Continuar o trabalho (passagem entre computadores)

Atualizado em 20/10/2026. Estado do projeto, o que está pendente e como montar o ambiente em outro computador.

## Estado em uma linha

A `main` tem: avaliação configurável, calendário letivo, chamada e frequência (com falta por tempo, observação por aluno, calendário com legenda, diário por unidade, replicar conteúdo), visual premium com mobile em barra inferior, menu azul-marinho, painel da plataforma protegido, e 367 testes passando.

## Pendente de merge (abrir no GitHub e fazer merge)

| Branch / PR | O que é | Observação |
|---|---|---|
| `estilo/tipografia-inter` | Fonte Inter no lugar da Geist; `font-bold` passa a 600; títulos com peso 600 | 3 arquivos, sem conflito. Link: https://github.com/anndyf/axis/compare/main...estilo/tipografia-inter |
| PR #12 `planejamento/arquitetura` | Revisão de arquitetura: só documentos em `docs/arquitetura/` | Ler antes de qualquer implementação nova |

## Próximos passos (em ordem)

1. **Confirmar com teste e corrigir 3 possíveis falhas** apontadas na revisão de arquitetura:
   - três PDFs de relatório conferem só login e escola, não o papel (aluno do portal talvez baixe pelo endereço direto);
   - a ação `reportarEstudanteFaltante` não confere papel;
   - rotas de módulos pagos funcionam com o módulo desligado.
2. **Decidir as 20 decisões** de `docs/arquitetura/decisoes.md` (as 5 mais urgentes: D-03, D-01, D-14, D-06, D-04).
3. **Fases 0 a 3** de `docs/arquitetura/roteiro-de-migracao.md` (segurança, checagem de módulo no servidor, assinaturas, papéis) não dependem das decisões e podem começar.
4. **Tipografia, etapa 2** (depois do merge da Inter): títulos de seção maiores em vez de 12px em negrito, rótulos discretos, sem Maiúscula Em Cada Palavra. Tela por tela.

## Decisões já tomadas pela dona do produto

- Chamada: falta marcada por tempo de aula; não pede senha para gravar; observação por aluno não aparece no portal do aluno/responsável.
- Mobile: barra de navegação inferior por perfil (professor, gestão, AEE, aluno).
- Visual: azul Áxis #205EE6 como destaque; menu lateral azul-marinho #0F1D3D nos temas claro e escuro; fonte Inter (opção B da comparação), "o mais próximo de sistemas de gestão acadêmica".
- Referência de fluxo para professores: SIGEduc (Bahia).
- Avaliação: atividades, chamada e frequência configuráveis por esquema; só nota numérica por enquanto.
- Venda por módulos (detalhamento em `docs/arquitetura/modulos-e-planos.md`).

## Como trabalhamos

- Cada mudança numa branch própria, com PR revisado pela dona do produto antes do merge na `main`.
- Sessões longas rodam na nuvem (claude.ai/code) com instruções sem supervisão: não param para perguntar, registram decisões num arquivo `PROGRESSO-*.md` e abrem PR sem merge. Depois, a validação local: `git pull`, `npx prisma migrate deploy` nos dois bancos, `npx prisma generate`, `npx tsc --noEmit`, `npx vitest run`, revisão de segurança das rotas novas e conferência das telas.
- Regras fixas do código: toda consulta filtra pela escola da sessão; permissões por `can()` em `src/lib/rbac.ts`; nunca mandar o registro inteiro de `User` ao navegador; regras de negócio puras em `src/lib/services/` com testes; toda rota nova que recebe id entra num teste de isolamento escola A × B.

## Montar o ambiente em outro computador (Windows)

1. Instalar Node.js (24), Git e PostgreSQL 17. Na instalação do PostgreSQL usar a porta **5433** e a senha **devpassword** para o usuário `postgres` (os mesmos valores do computador original; ver `LOGINS_TESTE.md`).
2. Clonar e instalar:
   ```bash
   git clone https://github.com/anndyf/axis.git
   cd axis
   npm ci
   ```
3. Criar os bancos `axis_dev` e `axis_test` (pelo pgAdmin ou `psql -h localhost -p 5433 -U postgres -c "create database axis_dev"` e o mesmo para `axis_test`).
4. Copiar `.env.example` para `.env` e preencher. `DATABASE_URL` e `DIRECT_URL` = `postgresql://postgres:devpassword@localhost:5433/axis_dev`; `DEV_ESCOLA_SLUG=cetep`; gerar um `NEXTAUTH_SECRET` novo (`npx auth secret` ou qualquer texto longo aleatório). SMTP pode ficar vazio em desenvolvimento.
5. Criar `.env.test` com:
   ```
   DATABASE_URL=postgresql://postgres:devpassword@localhost:5433/axis_test
   DIRECT_URL=postgresql://postgres:devpassword@localhost:5433/axis_test
   ```
6. Aplicar as migrations nos dois bancos e gerar o cliente:
   ```bash
   npx prisma migrate deploy
   DATABASE_URL=postgresql://postgres:devpassword@localhost:5433/axis_test DIRECT_URL=postgresql://postgres:devpassword@localhost:5433/axis_test npx prisma migrate deploy
   npx prisma generate
   ```
7. Popular o banco de desenvolvimento, nesta ordem:
   ```bash
   npm run db:seed
   npx tsx prisma/onboard-escola-teste.ts
   npx tsx prisma/seed-usuarios-teste.ts
   npx tsx prisma/seed-calendario.ts
   npx tsx prisma/seed-frequencia.ts
   ```
8. Conferir: `npx tsc --noEmit` (0 erros), `npx vitest run` (367 testes) e `npm run dev` → http://localhost:3000. Logins em `LOGINS_TESTE.md`.

Observações:
- Os dados de teste são gerados de novo pelos seeds; nada do banco antigo precisa ser copiado.
- Se o `npx prisma generate` der erro de permissão (EPERM), pare o `npm run dev` antes.
- No Windows, use o Git Bash para os comandos com `VARIAVEL=valor comando`; no PowerShell, defina antes com `$env:DATABASE_URL="..."`.
- Para capturas com Playwright sem baixar navegador: `chromium.launch({ channel: 'chrome' })` usa o Chrome instalado.
