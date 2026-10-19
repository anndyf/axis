# Próximos passos — Áxis

> Salvo em 19/10/2026, ao pausar a sessão. Este arquivo também está no GitHub
> (branch `feature/papeis`, PR #6) e em `~/AXIS-PROXIMOS-PASSOS.md`, no disco interno do Mac.

## Onde paramos

| Frente | Onde | Estado |
|---|---|---|
| Visual (modelo A, institucional, azul #205EE6) | PR #5 · branch `claude/zen-goldberg-frtkn3` · sessão na nuvem "Painel e portal do estudante" | Etapa 2 (aplicar no site todo) em andamento na nuvem |
| **Fase 1 · papéis e Coordenação** | PR #6 · branch `feature/papeis` | Pronto, verificação ok. **Falta juntar na main** |
| Fase 2 · plataforma | — | Não começou |
| Fase 3 · telas usando `can()` | — | Esperar o PR #5 entrar |
| Fase 4 · limpeza | — | Depois da Fase 3 |

`main` já tem: segurança, avaliação, frequência, imagens de `referencias/` e o painel de plataforma (PR #4).

## Ao voltar, nesta ordem

1. **Reconectar o SSD** e conferir que `/Volumes/anndy/PROJETOS/axis` aparece.
2. **Subir o banco** (se o Mac reiniciou):
   ```
   colima start
   docker start axis-postgres
   ```
3. **Juntar o PR #6** (se ainda não foi):
   ```
   gh pr merge 6 --repo anndyf/axis --merge
   ```
4. **Ver a sessão da nuvem** do PR #5. Quando ela terminar a Etapa 2, pedir ao Claude: *"roda a branch do visual"* para testar localmente antes de juntar.
5. Dizer ao Claude: **"vamos continuar: Fase 2"**.

## Fase 2 · plataforma (próxima, feita localmente)

1. **Admin de plataforma separado das escolas**
   - tabela própria `PlataformaAdmin` (sem `escolaId`);
   - login próprio em `admin.<dominio>` (local: `admin.localhost:3000`);
   - o proxy trata `admin` como endereço da plataforma, não como escola;
   - painel sai de `/dashboard/plataforma` e vai para `/plataforma`, sem o menu das escolas.
   Motivo: hoje o admin de plataforma é usuário da CETEP. Se a CETEP for suspensa, perde-se o acesso.
2. **TRIAL com prazo**
   - campo `Escola.trialAte`;
   - escola nova nasce em TRIAL com 30 dias (hoje nasce ATIVA);
   - prazo vencido mostra a página "período de teste encerrado"; a plataforma ativa ou estende.
3. **Convite em vez de senha**
   - o formulário de escola nova não pede senha;
   - o admin da escola recebe um link por e-mail (fluxo existente `TokenRedefinicaoSenha` + `src/lib/mail.ts`) e é obrigado a trocar a senha (`deveTrocarSenha`);
   - o link também aparece na tela, para copiar, caso o e-mail não esteja configurado.
4. **Auditoria**: tabela `auditoria_plataforma` registra criar, suspender, reativar, cancelar, trocar plano e estender teste (quem, quando, valores antes e depois).
5. **Testes**: proxy reconhece `admin`; bloqueio por fim do teste; convite cria usuário sem senha utilizável; usuário de escola é recusado em `/plataforma` e na API.

## Fase 3 · migrar as telas para `can()` (depois do merge do PR #5)

- Regra: nenhuma tela nova testa `isSuperuser/isDirecao/isStaff/isAEE` direto, só `can(user, 'permissao')` de `src/lib/rbac.ts`.
- Lotes, um PR por lote:
  1. Notas e avaliação
  2. Chamada e frequência
  3. Estudantes, ocorrências e conselho
  4. Usuários e configurações
  5. AEE
  6. Relatórios e PDFs
  7. APIs
- Ao final, teste que falha se algum arquivo usar `isSuperuser`/`isDirecao` fora do `rbac.ts`.
- **É aqui que a Coordenação passa a ver as telas pedagógicas.**

**O que a Coordenação pode fazer (aprovado):**
- **Pode:** ver estudantes, turmas, notas, frequência e relatórios de todas as turmas; gerir ocorrências e o conselho de classe; ver o painel AEE (só leitura).
- **Não pode:** lançar notas no lugar do professor; criar usuários; mexer nas configurações da escola.

## Fase 4 · limpeza

- Remover `isSuperuser`, `isDirecao`, `isStaff`, `isAEE`, `isPlatformAdmin` e `corSecundaria` (com migration).
- `isPortalUser` (estudante) fica.

## Decisões já tomadas

- **Perfis:** lista de papéis (ADMIN, DIRECAO, COORDENACAO, PROFESSOR, AEE) com `can()` central. Feito no PR #6.
- **Marca:** azul Áxis `#205EE6` fixo em menu, botões, links e foco; a escola aparece no logo e nos PDFs, e a cor dela só como detalhe.
- **Visual:** modelo A (institucional, menu azul-marinho, base nas capturas do Figma).
- **Plataforma:** login separado, TRIAL com prazo, convite por e-mail, auditoria.

## Peculiaridades do ambiente (Mac)

- **Projeto no SSD externo** `/Volumes/anndy`. Se ele desconectar, o servidor cai e o git mostra tudo como "deletado". É só reconectar; não restaure nada.
- **Banco local:** container Docker `axis-postgres`, Postgres 17, porta **5433**, senha `devpassword`. O `.env` usa o database `postgres`; os testes usam `axis_test`.
- **Push:** o remote `origin` aponta para `git@github-axis:`, que não existe neste Mac, e a chave SSH só tem leitura. O push funciona pelo login do `gh` (usuário anndyf). Para corrigir de vez:
  ```
  git remote set-url origin https://github.com/anndyf/axis.git
  gh auth setup-git
  ```
- **Internet lenta:** se o `npm install` falhar por timeout:
  ```
  npm install --prefer-offline --fetch-timeout=900000 --fetch-retries=10
  ```
- **Logins de teste:** `LOGINS_TESTE.md`. Exemplos: `admin`/`admin123`, `direcao`/`direcao123`, `coordenacao`/`coordenacao123`, `professor`/`professor123`.
- **Rodar:** `npm run dev`, depois abrir http://localhost:3000. Testes: `npx tsc --noEmit` e `npx vitest run`.
