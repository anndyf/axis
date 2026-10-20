# Registro de atividades do Áxis

Diário do que foi feito, do que está rodando e do que vem a seguir. Fica na branch `registro`, atualizada a cada ação (sem PR).

- Ver no navegador: https://github.com/anndyf/axis/blob/registro/REGISTRO.md
- Ver no VS Code de outro computador: `git fetch origin` e depois `git show origin/registro:REGISTRO.md` (ou abrir a branch `registro`).
- Como montar o ambiente e as regras do projeto: `CONTINUAR.md` na `main`.

> **Para o Claude (em qualquer computador):** leia este arquivo e o `CONTINUAR.md` ao começar. A cada ação relevante (merge, sessão da nuvem iniciada ou concluída, validação, correção, decisão da dona do produto), atualize as seções "Agora" e "Histórico" (com data), faça commit e push direto na branch `registro`, sem PR. Não altere a `main` por causa deste arquivo.

---

## Agora

**Rodando na nuvem**
- Fases 0, 1 e 2 do roteiro de arquitetura (segurança, `exigirModulo` no servidor, planos/assinaturas). Branch `fase/0-1-2-seguranca-modulos`. Iniciada em 20/10. Quando terminar: validar localmente (migrations, testes, revisão de segurança).

**Pronto para iniciar quando quiser**
- Fase 3a (papéis e permissões) em paralelo: instrução em `docs/sessoes-nuvem/fase-3a.md`, numa sessão nova (branch `main`, Opus 5.5).

**Esperando decisão da dona do produto**
- As 20 decisões de `docs/arquitetura/decisoes.md`. As 5 mais urgentes: D-03 (público-alvo), D-01 (núcleo e módulos), D-14 (quando a CETEP migra para matrícula por ano), D-06 (etapas de ensino no lançamento), D-04 (redes agora ou depois).

**Próximos passos**
1. Validar o PR das fases 0-1-2 quando a nuvem terminar.
2. Tipografia, etapa 2: títulos de seção maiores (hoje 12px em negrito), rótulos discretos, sem Maiúscula Em Cada Palavra. Depois do PR das fases 0-1-2, porque mexe nas mesmas telas.
3. Fases seguintes do roteiro conforme as decisões.

---

## Histórico

### 20/10/2026
- Revisão de arquitetura concluída na nuvem e mergeada (PR #12): inventário, domínio-alvo, personalização, módulos e planos, roteiro de migração em 12 fases, 20 decisões, schema-alvo. Apontou 3 possíveis falhas de segurança (PDFs sem checagem de papel, `reportarEstudanteFaltante` sem papel, módulos pagos sem trava no servidor), que entram na fase 0.
- Tipografia: fonte Inter no lugar da Geist, `font-bold` limitado a 600, títulos com peso 600 (PR #11, mergeado). Escolha da dona do produto: opção B da comparação, "o mais próximo de sistemas de gestão acadêmica".
- Documento de passagem entre computadores `CONTINUAR.md` e instruções prontas em `docs/sessoes-nuvem/` (PR #13, mergeado).
- Iniciada na nuvem a sessão das fases 0, 1 e 2.
- Criada esta branch `registro`.

### 19/10/2026
- Menu lateral azul-marinho #0F1D3D nos temas claro e escuro (PR #10).
- Recuperação final mostra "precisa X" por aluno, calculado pelo motor de notas nos três modos de recuperação; subtotal e textos sem o 5 fixo; temporizador de sessão sem derrubar a tela (PR #9). 367 testes.
- Mobile com cara de app, inspirado no SIGEduc e nas referências (PR #8): barra inferior por perfil, início do professor por turma e disciplina, chamada em cartões com falta por tempo e observação por aluno, calendário da disciplina com legenda, diário por unidade, "Salvar e replicar" conteúdo, notas e portal em cartões. Migration `20261020010000_falta_tempos_observacao_chamada`.
- Painel da plataforma: conta da plataforma protegida contra tomada por superuser da escola, acesso conferido no banco, criação de escola completa e auditada; PDFs com o mínimo do esquema (PR #7).
- Visual premium, etapa 2 (PR #5): marca azul Áxis #205EE6, painel inicial por perfil.
- Revisão de arquitetura iniciada na nuvem com retomada agendada para 23:51.

### 18/10/2026 e antes
- Projeto clonado, ambiente local montado (PostgreSQL 17 na porta 5433, bancos `axis_dev` e `axis_test`, usuários de teste em `LOGINS_TESTE.md`).
- Regra de avaliação configurável (formas de cálculo, pesos, recuperação), notas por etapa em todas as telas, remoção das colunas legadas `nota_1/2/3`.
- Segurança P0: redefinição de senha por link, limite de tentativas de login, troca obrigatória de senha, cabeçalhos HTTP, CI no GitHub Actions, teste de isolamento entre escolas (cerca de 40 vazamentos corrigidos).
- Calendário letivo, tempos de aula e horário com disciplina e professor.
- Na nuvem: chamada e frequência completas, diário de classe, atividades do professor, lançamento de notas atômico (branch `melhorias/logica-frequencia`); design system, identidade da escola, login novo, tema escuro, busca Ctrl+K e CSP (visual premium, etapa 1).
