# 1. Inventário — o que existe hoje no Áxis

> **Resumo.** Este documento lista tudo o que o Áxis tem hoje (outubro/2026, `main` em `ac0b607`): as 46 tabelas do banco, as ~60 telas e as 63 rotas de API.
> Para cada item, mostra quem usa, a qual **módulo vendável** deveria pertencer (catálogo proposto no documento 4), os problemas e o destino proposto.
> As conclusões principais:
> (1) o **núcleo acadêmico é bom e configurável** (avaliação, calendário, chamada, frequência), mas está preso a uma estrutura de "estudante = uma turma";
> (2) **o cadastro de pessoas é mínimo**: o estudante tem 4 dados, não existem responsáveis, documentos, endereço nem saúde;
> (3) **o módulo contratado quase não é conferido no servidor**: só 3 rotas e 2 páginas checam (banco de questões e financeiro); o resto só some do menu;
> (4) restam **regras e textos fixos do CETEP** (abreviações de disciplinas da Bahia, normalização de siglas PROEJA, e-mail `@cetep.edu.br`);
> (5) há **lacunas de permissão** em alguns PDFs de relatório (só conferem login, não o papel) que devem ser corrigidas antes de crescer.
> Nada aqui foi alterado: é um retrato para orientar os próximos documentos.

---

## 1.1 Como ler as tabelas

- **Módulo proposto**: a "caixa" vendável à qual o item deveria pertencer. Siglas usadas (definidas no documento 4):
  `NUC` Núcleo (obrigatório) · `SEC` Secretaria Escolar · `DIA` Diário de Classe e Frequência · `NOT` Avaliação e Notas · `RES` Conselho e Resultados · `AEE` Inclusão/AEE · `PRV` Avaliações e Provas (banco de questões, gerador, simulados) · `PLA` Planejamento · `COM` Comunicação e Portal da Família · `REC` Recursos (laboratórios/espaços) · `FIN` Financeiro · `IND` Indicadores · `DOC` Documentos oficiais · `PLT` Plataforma (ferramenta interna da dona do Áxis, não é vendida).
- **Destino**: `Manter` (fica como está), `Ampliar` (fica, mas ganha campos/funções), `Refazer` (a ideia fica, a estrutura muda), `Remover` (sai ou é absorvido por outra coisa).
- **"Checa módulo?"**: se o servidor confere que a escola contratou aquele módulo. Hoje a resposta é quase sempre **não** — o módulo só esconde o item do menu (`modulosVisiveis()` em `src/lib/modules.ts`). Quem souber o endereço abre a tela ou chama a API.
- **Papéis hoje** são booleanos em `User`: `isSuperuser` (administrador da escola), `isDirecao`, `isStaff` (professor/equipe), `isAEE`, `isPortalUser` (aluno no portal), `isPlatformAdmin` (dona do Áxis). As regras ficam em `can()` (`src/lib/rbac.ts`) com 5 ações: `gestao`, `staff`, `superuser`, `aee`, `staffPuro`. Muitas rotas ainda conferem os booleanos direto, sem `can()`.

---

## 1.2 Entidades (tabelas do banco)

46 models em `prisma/schema.prisma`. "Escola?" indica se a tabela tem `escolaId` próprio (isolamento direto) ou se depende de outra tabela para saber a escola (isolamento indireto, mais frágil: toda consulta precisa lembrar de fazer o "caminho" até a escola).

### Plataforma e acesso

| Entidade | O que guarda | Escola? | Módulo | Problemas | Destino |
|---|---|---|---|---|---|
| `Escola` | Nome, subdomínio (`slug`), plano, status, logo, cores | — (é a raiz) | NUC | Sem CNPJ, código INEP, endereço, dependência administrativa (pública/privada), mantenedora, rede. Plano é enum fixo | **Ampliar** (dados oficiais) e ligar a `Mantenedora`/`Assinatura` |
| `EscolaModulo` | Liga/desliga módulo por escola (override do plano) | sim | PLT | Sem datas (início, fim, trial), sem origem (plano × add-on × cortesia), sem estado "só leitura" | **Refazer** como `AssinaturaModulo` |
| `PlanoTipo` (enum) | BASICO / PRO / ENTERPRISE | — | PLT | Plano fixo no código; `planoMinimo` em cada módulo amarra módulo a plano | **Refazer** como tabela `Plano` + `PlanoModulo` |
| `StatusEscola` (enum) | TRIAL / ATIVA / SUSPENSA / CANCELADA | — | PLT | Ok; falta data de fim do trial | Manter + datas na assinatura |
| `User` | Login, senha, nome, 6 booleanos de papel, `estudanteId` (portal) | sim | NUC | Papéis em booleanos; mistura "conta de acesso" com "pessoa"; não há CPF, telefone, cargo, vínculo funcional; um usuário de portal só pode ver **um** estudante (irmãos não cabem); responsável não existe | **Refazer**: `Usuario` (só acesso) + `Pessoa` + `VinculoPapel` |
| `GlobalConfig` | Ano letivo atual da escola | sim | NUC | Tabela com um único campo útil | **Remover** (vai para `ConfiguracaoEscola` / `AnoLetivo` ativo) |
| `TokenRedefinicaoSenha` | Link de "esqueci a senha" (só hash) | via User | NUC | — | Manter |
| `TentativaAcesso` | Limitador de tentativas de login | global | NUC | — | Manter |
| `AuditLog` | Quem fez o quê (entidade, ação, detalhe, IP) | via User | NUC | Sem `escolaId` direto; não registra **leitura** de dados sensíveis (AEE/saúde), que a LGPD pede | **Ampliar** (`escolaId`, tipo "leitura sensível") |

### Estrutura da escola

| Entidade | O que guarda | Escola? | Módulo | Problemas | Destino |
|---|---|---|---|---|---|
| `Curso` | Nome, sigla, modalidade (texto), nível (enum), turnos (texto), esquema padrão | sim | NUC | "Curso" serve para técnico, mas no fundamental/infantil a escola pensa em **etapa/ano**, não curso. Modalidade e turno em texto livre | **Refazer** como `Curso` + `Etapa`/`Serie` (ver doc 2) |
| `NivelEnsino` (enum) | FUNDAMENTAL_I/II, MEDIO, TECNICO, EJA, OUTRO | — | NUC | Falta Educação Infantil (creche/pré-escola) e separação nível × modalidade (EJA e técnico são modalidades, não níveis) | **Refazer** em `EtapaEnsino` + `Modalidade` alinhados ao Censo |
| `Turma` | Nome, curso, turno, série, ano letivo, esquema | sim | NUC | `curso`, `turno`, `modalidade`, `serie` duplicados em texto; `anoLetivo` opcional; sem sala, capacidade, código INEP, tipo de atendimento | **Ampliar** (chaves reais, `anoLetivoId`, sala, vagas) |
| `Disciplina` | Nome, área, carga horária — **pertence a uma turma** | via Turma | NUC | Não há catálogo de componentes curriculares: "Matemática" existe N vezes (uma por turma). Dificulta histórico, relatórios por componente, Censo e matriz | **Refazer**: `ComponenteCurricular` (catálogo) + `TurmaComponente` (oferta na turma) |
| `AreaConhecimento` | Áreas (Linguagens, Exatas...) | sim | NUC | Ok | Manter |
| `MatrizCurricular` | Nome de disciplina por curso/série/ano | **não** (via cursoId) | PLA | Sem `escolaId`; guarda nome em texto; sem carga horária, sem obrigatoriedade; não é usada para validar histórico | **Refazer** como `MatrizCurricular` + `MatrizItem` (componente, carga, série) |
| `HorarioAula` | Grade semanal da turma (dia, tempo, disciplina, professor) | via Turma | DIA | Texto legado (`disciplina`, `professor`) ainda guardado; sem vigência (troca de horário no meio do ano apaga o passado) | **Ampliar** (vigência) e remover o texto legado |
| `TempoAula` | Tempos por turno (07:00–07:50) | sim | DIA | `turno` em texto | Manter (turno vira enum/tabela) |
| `Laboratorio` | Espaços reserváveis | sim | REC | Só laboratórios; não há "salas" gerais | **Ampliar** para `Espaco` (sala, laboratório, quadra) |

### Pessoas e vida escolar

| Entidade | O que guarda | Escola? | Módulo | Problemas | Destino |
|---|---|---|---|---|---|
| `Estudante` | Matrícula, nome, data de nascimento, sexo, **uma** turma, turma anterior, status (texto) | sim | NUC/SEC | Faltam: nome social, CPF, certidão, NIS, cor/raça, nacionalidade, naturalidade, endereço, contatos, filiação, responsáveis, saúde, transporte, autorizações. "Matrícula" é só um número, não um registro de vida escolar. Uma única turma: a promoção **move** o aluno e o vínculo com o ano anterior fica só via `turmaAnteriorId` (um nível só). Status em texto livre (`ATIVO`, `REMOVIDO_VIA_VARREDURA`). `onDelete: Cascade` da turma apaga o aluno junto | **Refazer**: `Pessoa` + `Estudante` + `Matricula` (por ano) + `Enturmacao` |
| `AEEProfile` | CIDs, condição, recomendações, foto, contato | via Estudante | AEE | Dados de saúde (sensíveis) sem registro de quem leu; contato de emergência mora aqui em vez de no cadastro de responsáveis; sem tipo de deficiência no padrão do Censo; sem PEI/plano de AEE | **Ampliar** (ficha AEE + PEI) e separar `SaudeEstudante` |
| `AEEAcknowledgement` | Professor confirmou leitura da ficha AEE | via perfil | AEE | Ok (bom recurso) | Manter |
| `Ocorrencia` / `OcorrenciaEstudante` | Ocorrências disciplinares | sim | SEC (ou COM) | `tipo` em texto; sem medida aplicada, ciência do responsável, gravidade | **Ampliar** |
| `Justificativa` | Atestado/abono por período | sim | DIA | Ok | Manter |

### Diário, avaliação e resultados

| Entidade | O que guarda | Escola? | Módulo | Problemas | Destino |
|---|---|---|---|---|---|
| `PeriodoLetivo` | Ano letivo com início e fim | sim | NUC | Bom; deveria ser a referência única de "ano" (hoje `anoLetivo` Int espalhado em 6 tabelas) | **Ampliar** → `AnoLetivo` (status aberto/fechado) |
| `EtapaCalendario` | Datas de cada unidade e prazo de lançamento | via período | NUC | Ok | Manter |
| `DiaNaoLetivo` / `DiaLetivoExtra` | Feriados, recessos, sábados letivos | sim | NUC | Ok | Manter |
| `Aula` | Registro de aula (data, tempos, conteúdo, situação) | sim | DIA | Bom; liga a `Disciplina` (por turma) | Manter (passa a ligar a `TurmaComponente`) |
| `Falta` | Só a exceção (quem faltou) | via Aula | DIA | Bom desenho | Manter (passa a ligar a `Enturmacao`) |
| `ObservacaoChamada` | Observação do professor por aluno/aula | via Aula | DIA | Ok | Manter |
| `EsquemaAvaliacao` | Regra de avaliação configurável (etapas, cálculo, recuperação, frequência) | sim | NOT | **Conquista a manter.** Falta: conceito/parecer (só NUMERICA implementado) | Manter + conceito/parecer |
| `EsquemaUnidade` / `EsquemaAtividade` | Etapas e atividades-modelo | via esquema | NOT | Ok | Manter |
| `AvaliacaoDisciplina` / `NotaAvaliacao` | Avaliações criadas pelo professor | via disciplina | NOT | Ok | Manter |
| `NotaFinal` | Resultado do aluno numa disciplina (nota, recuperação, status) | via disciplina | NOT/RES | Chave `estudante × disciplina`: como a disciplina é da turma, o ano vem por tabela. Se o aluno muda de turma no meio do ano, as notas ficam na disciplina da turma antiga | **Ampliar**: ligar a `Enturmacao`/`Matricula` |
| `NotaUnidade` / `NotaAtividade` | Nota de cada etapa e atividade | via nota | NOT | Ok | Manter |
| `NotaFinalAudit` | Histórico de mudança de nota | via nota | NOT | Ok | Manter |
| `StatusNota` (enum) | APROVADO, RECUPERACAO, DESISTENTE, CONSERVADO... | — | RES | Mistura situação da **disciplina** com situação da **matrícula** (DESISTENTE é da matrícula). `REPROVADO_FALTA` é calculado na leitura, não existe no enum | **Refazer**: `SituacaoComponente` × `SituacaoMatricula` |

### Ferramentas pedagógicas

| Entidade | O que guarda | Escola? | Módulo | Problemas | Destino |
|---|---|---|---|---|---|
| `PlanoEnsino` | Plano de ensino do professor (texto) | **não** (via professor) | PLA | Sem `escolaId`; disciplina em texto (`disciplinaNome`); não liga ao diário | **Ampliar** |
| `Questao` | Questão objetiva A–E, dificuldade, status de aprovação | **não** (via professor) | PRV | Sem `escolaId`; só objetiva com 5 alternativas fixas; sem habilidade BNCC | **Ampliar** (`escolaId`, tipos de questão, habilidade) |
| `Prova` | Prova montada (snapshot das questões) | **não** (via turma/professor) | PRV | Sem `escolaId`; `unidade` Int e `tipo` texto | **Ampliar** |
| `NotaSimulado` | Nota de simulado por aluno/área/unidade | via estudante | PRV | `anoLetivo @default(2026)` fixo; unicidade removida (pode duplicar) | **Ampliar** |
| `ResponsavelSimulado` | Professor responsável por lançar o simulado | via turma | PRV | Nome confunde com "responsável do aluno"; `anoLetivo @default(2026)` | **Renomear** (`AplicadorSimulado`) |
| `ReservaLaboratorio` | Reserva de laboratório | via laboratório | REC | `turno` texto; `disciplina` texto | Manter/ampliar |
| `Message` / `MessageRead` / `MessageDelete` | Mensagens, comunicados e chamados (tickets) | sim | COM | Mistura comunicado, chamado de suporte e "cadastro pendente" num modelo só; sem destinatário por grupo (turma, responsáveis) | **Refazer** em `Comunicado` + `Chamado` |

### Itens com valor fixo de 2026 no schema (risco de virada de ano)

`GlobalConfig.anoLetivoAtual @default(2026)`, `NotaSimulado.anoLetivo @default(2026)`, `MatrizCurricular.anoLetivo @default(2026)`, `ResponsavelSimulado.anoLetivo @default(2026)`, e `promover/route.ts` com `|| 2026`. Todos devem passar a ligar a `AnoLetivo`.

---

## 1.3 Telas do painel (`src/app/dashboard/**`) e portal (`src/app/portal/**`)

"Guarda" = o que a própria página confere no servidor. O `dashboard/layout.tsx` já bloqueia aluno do portal (redireciona para `/portal`) e obriga troca de senha.

| Tela (rota) | O que faz | Quem usa hoje | Guarda | Checa módulo? | Módulo | Problemas | Destino |
|---|---|---|---|---|---|---|---|
| `/dashboard` | Painel inicial por perfil | todos | login | usa a lista para os cartões | NUC | — | Manter |
| `/dashboard/perfil` | Dados e senha do próprio usuário | todos | login | — | NUC | — | Manter |
| `/dashboard/mensagens` | Mensagens, comunicados e chamados | todos | login + papéis inline | não | COM | 961 linhas de actions; mistura conceitos | Refazer (doc 4, COM) |
| `/dashboard/laboratorios` | Reserva de laboratórios | equipe (exceto AEE) | login | não | REC | — | Manter |
| `/dashboard/turmas` (+ `nova`, `[id]/editar`) | Cadastro de turmas | gestão | `isSuperuser/isDirecao` na lista; editar só login | não | NUC | Formulário com curso/turno/série em texto | Ampliar |
| `/dashboard/turmas/[id]/horario` | Grade semanal da turma | gestão | inline | não | DIA | Sem vigência | Ampliar |
| `/dashboard/turmas/[id]/relatorio` | Relatório da turma (notas, frequência) | equipe | inline | não | RES | — | Manter |
| `/dashboard/turmas/[id]/status` | Status por aluno/disciplina | equipe | só login | não | RES | Abreviação fixa "HISTÓRIA DA BAHIA" no cliente | Ampliar |
| `/dashboard/disciplinas` (+ `nova`, `[id]/editar`) | Disciplinas por turma | administrador | `isSuperuser` na lista | não | NUC | Disciplina repetida por turma | Refazer (catálogo) |
| `/dashboard/estudantes` | Lista e busca de estudantes | gestão | inline | não | NUC/SEC | Cadastro mínimo | Refazer (ficha completa) |
| `/dashboard/estudantes/novo`, `[id]/editar` | Formulário do estudante | gestão | só login (API confere) | não | SEC | 4 campos | Refazer |
| `/dashboard/estudantes/importar` | Importar CSV de alunos | gestão | só login (API confere) | não | SEC | Cria turma "no susto" se não existir | Ampliar (importação guiada com prévia) |
| `/dashboard/estudantes/[id]/boletim` | Boletim do aluno | equipe | só login | não | NOT | — | Manter |
| `/dashboard/reportar-estudante` | Professor avisa que falta um aluno na lista | professor | login | não | NUC | Vira chamado na caixa de mensagens | Manter (vira "solicitação à secretaria") |
| `/dashboard/ocorrencias` | Ocorrências | gestão | só login (API confere) | não | SEC | — | Ampliar |
| `/dashboard/aee`, `/dashboard/aee/[matricula]` | Fichas AEE e ciência dos professores | AEE, direção | inline | não | AEE | Sem registro de leitura (LGPD) | Ampliar |
| `/dashboard/chamada`, `chamada/fazer`, `chamada/diario` | Chamada e diário de classe | professor, gestão | `can('staff')` | não | DIA | — | Manter |
| `/dashboard/frequencia` | Infrequência, justificativas | gestão | `can('gestao')` | não | DIA | — | Manter |
| `/dashboard/notas`, `notas/lancar/[turmaId]` | Lançamento de notas | professor | inline | não | NOT | — | Manter |
| `/dashboard/notas/avaliacoes` | Avaliações criadas pelo professor | professor | `can('staff')` | não | NOT | — | Manter |
| `/dashboard/notas/recuperacao` (+ `[turmaId]`) | Recuperação final | professor | inline | não | NOT | — | Manter |
| `/dashboard/resultados` (+ `[turmaId]`) | Resultado final da turma | gestão | inline / só login no detalhe | não | RES | Abreviações fixas da Bahia no cliente | Ampliar |
| `/dashboard/conselho-classe` (+ `[turmaId]`) | Conselho de classe | gestão | **só login** na página (API confere `gestao`) | não | RES | Página abre para qualquer equipe; ação é barrada só na API | Ampliar (guarda na página) |
| `/dashboard/planos` | Planos de ensino | professor, gestão | só login | não | PLA | — | Ampliar |
| `/dashboard/matriz` | Matriz curricular | gestão | inline | não | PLA (ou NUC) | Sem `escolaId` na tabela | Refazer |
| `/dashboard/questoes` | Banco de questões | professor, gestão | inline | **sim** (`banco-questoes`, exceto admin) | PRV | — | Manter (padrão a generalizar) |
| `/dashboard/provas` | Gerador de provas | gestão | inline | **não** (só menu) | PRV | Cabeçalho do PDF com textos do CETEP (plano multi-tenant, seção 8) | Ampliar |
| `/dashboard/simulados` (+ `responsaveis`) | Simulados e responsáveis | equipe | inline | **não** (só menu) | PRV | — | Ampliar |
| `/dashboard/financeiro` | Esqueleto do financeiro | gestão | `can('gestao')` | **sim** | FIN | Sem requisito de produto | Refazer quando houver requisito |
| `/dashboard/usuarios` (+ `novo`, `[id]/editar`, `[id]/disciplinas`, `[id]/importar-horario`) | Usuários e vínculos de professor | administrador | `isSuperuser` | não | NUC | Papéis por caixas de seleção booleanas | Refazer (papéis) |
| `/dashboard/admin/pendencias` | Aprovação de cadastros de professor | gestão | inline | não | NUC | — | Manter |
| `/dashboard/admin/unificar-turmas` | Ferramenta de manutenção (juntar turmas duplicadas) | administrador | **nenhuma na página** (API confere) | não | NUC | Ferramenta de migração do projeto original | Remover após a migração |
| `/dashboard/auditoria` | Log de auditoria | administrador | `isSuperuser` | não | NUC | — | Ampliar (leituras sensíveis) |
| `/dashboard/configuracoes` (+ `avaliacao`, `calendario`, `identidade`) | Esquemas de avaliação, calendário letivo, identidade visual | administrador/gestão | `isSuperuser` / `can('gestao')` | não | NUC (avaliação → NOT) | Página-índice sem guarda (só links) | Ampliar (nomenclaturas, campos personalizados, módulos) |
| `/dashboard/plataforma` | Gestão das escolas (dona do Áxis) | `isPlatformAdmin` | sim | — | PLT | Conta da plataforma "mora" dentro de uma escola (CETEP) | Ampliar (assinaturas) |
| `/dashboard/ui`, `/dashboard/paleta` | Vitrine do design system, paleta Ctrl+K | admin / todos | `can('superuser')` | — | — | Ferramentas internas | Manter |
| `/portal` | Portal do **aluno**: boletim, frequência, avisos | aluno (`isPortalUser`) | sim | não | COM (portal) / NUC | Só o aluno; não existe responsável; um login = um aluno | Refazer como Portal da Família (responsável vê vários filhos) |
| Telas públicas: `/login`, `/entrada`, `/cadastro-professor`, `/redefinir-senha`, `/trocar-senha`, `/escola-invalida` | Acesso | todos | — | — | NUC | — | Manter |

---

## 1.4 Rotas de API (`src/app/api/**`)

63 arquivos `route.ts`. Todas filtram por `escolaId` da sessão (o teste `src/lib/isolamento-escolas.test.ts` cobre ~78 tentativas de vazamento). A coluna "Papel" mostra a checagem de papel encontrada no código.

| Rota | Métodos | O que faz | Papel conferido | Checa módulo? | Módulo | Problemas | Destino |
|---|---|---|---|---|---|---|---|
| `auth/[...nextauth]` | — | Login (NextAuth) | — | — | NUC | — | Manter |
| `auth/change-password` | PUT | Troca de senha | login | — | NUC | — | Manter |
| `public/v1/register` | POST | Autocadastro público (desativado, responde 403) | — | — | NUC | Código morto | Remover |
| `config` | GET, PUT | Ano letivo atual e liga/desliga banco de questões | `isSuperuser` no PUT | lê módulos | NUC | Toggle de módulo fora da tela de plataforma | Refazer (vai para assinatura) |
| `areas` | GET | Lista áreas | login | — | NUC | Aluno do portal também lê (baixo risco) | Manter |
| `cursos`, `cursos/[id]` | POST, PUT, DELETE | Cursos | `can('gestao')` | — | NUC | — | Refazer (etapas) |
| `turmas`, `turmas/[id]` | GET, POST, PUT, DELETE | Turmas | `isSuperuser/isDirecao` inline | — | NUC | Excluir turma apaga alunos em cascata | Ampliar + proteger exclusão |
| `turmas/[id]/clonar` | POST | Copia turma e disciplinas | `isSuperuser` | — | NUC | — | Manter |
| `turmas/[id]/promover` | POST | Cria turma do próximo ano e **move** os alunos | `isSuperuser` | — | SEC | Promove a turma inteira sem olhar o resultado de cada aluno; usa `as any`; `|| 2026` | **Refazer** como "rematrícula/fechamento do ano" (doc 2) |
| `admin/merge-turmas` | GET, POST | Junta turmas duplicadas (migra questões e alunos) | `isSuperuser/isDirecao` | — | NUC | Ferramenta do projeto original | Remover após migração |
| `disciplinas`, `disciplinas/[id]` | GET, POST, PUT, DELETE | Disciplinas da turma | `can('gestao')` | — | NUC | — | Refazer (catálogo) |
| `matriz`, `matriz/importar` | GET, POST, PATCH, DELETE / POST | Matriz curricular e aplicação na turma | `can('gestao')` | — | PLA | — | Refazer |
| `esquemas-avaliacao`, `[id]` | GET, POST, PUT, DELETE | Regras de avaliação | `isSuperuser` | — | NOT | — | Manter |
| `estudantes`, `estudantes/[id]` | GET, POST, PUT, DELETE | Cadastro de estudantes | `can('gestao')` / `can('staff')` na busca | — | SEC/NUC | 4 campos | Refazer |
| `estudantes/sincronizar` | POST | Sincroniza turma com CSV (marca ausentes `REMOVIDO_VIA_VARREDURA`) | `can('gestao')` | — | SEC | Status em texto livre; "remove" sem registrar transferência/abandono | Refazer (movimentação) |
| `upload-csv` | POST | Importa alunos e cria turmas | `can('gestao')` | — | SEC | Cria turma sem curso/esquema | Ampliar (importação guiada) |
| `estudantes/[id]/aee`, `.../atestar` | POST, DELETE / POST | Ficha AEE e ciência | `can('aee')` / inline | **não** | AEE | Sem log de leitura | Ampliar + `exigirModulo('AEE')` |
| `ocorrencias`, `ocorrencias/[id]` | GET, POST, PUT, DELETE | Ocorrências | inline | — | SEC | — | Ampliar |
| `notas/lancar` | POST | Lançamento em lote (transação) | `can('staff')` + vínculo | **não** | NOT | — | Manter + `exigirModulo('NOT')` |
| `notas/recuperacao` | POST | Recuperação final | `isStaff/isSuperuser` inline | **não** | NOT | — | Manter + módulo |
| `notas/turma/[turmaId]/disciplina/[disciplinaId]` | GET | Notas de uma disciplina | `can('staff')`/`gestao` | **não** | NOT | — | Manter + módulo |
| `conselho-classe` | POST | Decisões do conselho (lote atômico) | `can('gestao')` | **não** | RES | — | Manter + módulo |
| `boletim/[id]/pdf` | GET | PDF do boletim | aluno só o próprio | **não** | NOT | — | Manter + módulo |
| `relatorio/turma/[id]/pdf` | GET | PDF da turma | inline (equipe) | **não** | RES | — | Manter + módulo |
| `relatorio/turma/[id]/disciplina/[disciplinaId]/pdf` | GET | PDF por disciplina | **só login** | **não** | RES | ⚠️ Um aluno logado no portal da mesma escola provavelmente consegue baixar o PDF da turma inteira chamando o endereço direto (a checagem é só `escolaId`). **Confirmar com teste** | Corrigir já (fase 0) |
| `relatorio/resultados/[id]/pdf` | GET | Ata/resultado final da turma | **só login** | **não** | RES | ⚠️ Mesmo caso acima; e mapa fixo de abreviações de disciplinas do CETEP (`HISTÓRIA DA BAHIA`, `PROJETO TECNOLOGIAS SOCIAIS`...) | Corrigir já + abreviação configurável |
| `relatorio/status/[id]/pdf` | GET | Status da turma | **só login** | **não** | RES | ⚠️ Mesmo caso acima | Corrigir já |
| `relatorios/professores-pendentes` | GET | Professores com lançamento pendente | `can('gestao')` | — | IND | — | Manter |
| `planos`, `planos/[id]`, `planos/[id]/pdf`, `planos/relatorio/pdf` | vários | Planos de ensino | inline | **não** | PLA | — | Manter + módulo |
| `planos/utils/compativeis` | GET | Turmas compatíveis para replicar plano | só login (usa o próprio usuário) | — | PLA | Baixo risco | Manter |
| `questoes`, `questoes/[id]` | GET, POST, PUT, DELETE | Banco de questões | inline | **sim** só no POST de `questoes` | PRV | Checagem parcial (GET/PUT/DELETE não conferem) | Completar |
| `questoes/check-duplicate` | POST | Detecta questão duplicada do professor | só login | não | PRV | — | Manter + módulo |
| `provas`, `provas/[id]`, `provas/filtros` | GET, POST, DELETE | Gerador de provas | inline | **não** | PRV | — | Manter + módulo |
| `simulados`, `simulados/responsaveis` | GET, POST, DELETE | Simulados | inline | **não** | PRV | — | Manter + módulo |
| `laboratorios`, `laboratorios/reservas`, `reservas/[id]` | GET, POST, PATCH, DELETE | Laboratórios e reservas | inline | **não** | REC | — | Manter + módulo |
| `financeiro` | GET | Esqueleto | `can('gestao')` | **sim** | FIN | — | Refazer quando houver requisito |
| `usuarios`, `usuarios/[id]`, `toggle-status`, `aprovar`, `aprovar-em-massa` | vários | Usuários | `isSuperuser` inline | — | NUC | Booleanos de papel | Refazer (papéis) |
| `usuarios/transferir` | POST | Passa autoria de notas e turmas de um professor para outro | `isSuperuser` | — | NUC | Útil; "transfere autoria" de nota (cuidado com auditoria) | Manter |
| `usuarios/[id]/verificar-horario`, `importar-horario` | POST | Lê o horário do professor (texto) e vincula disciplinas | `isSuperuser` | — | DIA | **Regra fixa do CETEP**: normalização de siglas PROEJA (`1TELEN1eja → 1TELN1E`) | Remover/generalizar (importação de horário por planilha) |
| `plataforma/escolas`, `plataforma/escolas/[id]` | GET, POST, PATCH | Painel da dona do Áxis | `exigirAdminPlataforma` | — | PLT | — | Ampliar (assinaturas) |
| `manifest` (fora de `api/`) | GET | Manifest PWA por escola | — | — | NUC | — | Manter |

### Server actions (`"use server"`)

| Arquivo | O que faz | Papel | Módulo | Observação |
|---|---|---|---|---|
| `dashboard/chamada/actions.ts` | Salvar chamada, conteúdo, observações | via `chamada-acesso` | DIA | Precisa `exigirModulo('DIA')` |
| `dashboard/frequencia/actions.ts` | Justificativas | `can('gestao')` | DIA | idem |
| `dashboard/notas/avaliacoes/actions.ts` | Avaliações do professor | vínculo com a disciplina | NOT | idem |
| `dashboard/configuracoes/calendario/actions.ts` | Calendário letivo | `can('gestao')` | NUC | — |
| `dashboard/configuracoes/identidade/actions.ts` | Logo e cor | `can('gestao')` | NUC | — |
| `dashboard/estudantes/actions.ts` | Ações de estudante | inline | SEC | — |
| `dashboard/mensagens/actions.ts` | Mensagens e chamados (961 linhas) | inline | COM | E-mail remetente padrão `no-reply@cetep.edu.br` |
| `dashboard/simulados/actions.ts` | "Reportar estudante faltante" (cria chamado para a secretaria) | **só escola**, sem papel | NUC | Nome do arquivo engana. Server actions podem ser chamadas direto (sem passar pelo layout que barra o portal), então um aluno logado provavelmente consegue criar chamados. Confirmar com teste e mover para `secretaria/solicitacoes` |
| `dashboard/turmas/schedule-actions.ts` | Salvar horário | inline | DIA | — |
| `dashboard/usuarios/actions.ts` | Contar pendentes | só escola | NUC | — |
| `dashboard/admin/pendencias/actions.ts` | Aprovar cadastros | inline | NUC | — |
| `dashboard/paleta/actions.ts` | Busca Ctrl+K | `can` | NUC | — |
| `portal/actions.ts` | Dados do portal do aluno | aluno | COM | Só o próprio aluno (bom) |
| `login/actions.ts` | Login | — | NUC | — |

---

## 1.5 Regras e textos fixos do projeto original (CETEP/LNAB)

| Onde | O quê | Destino |
|---|---|---|
| `api/relatorio/resultados/[id]/pdf`, `resultados/[turmaId]/ResultadosClient.tsx`, `turmas/[id]/status/RelatorioStatusClient.tsx` | Dicionário fixo de abreviações (`HISTÓRIA DA BAHIA`, `FUNDAMENTOS DA COMPUTAÇÃO`...) | Campo `abreviacao` no componente curricular |
| `api/usuarios/[id]/verificar-horario` | Normalização de códigos de turma PROEJA do CETEP | Importação de horário genérica por planilha |
| `dashboard/mensagens/actions.ts` | Remetente `no-reply@cetep.edu.br` | Remetente da plataforma + nome da escola |
| `StatusNota` com `CONSERVADO`, `DEPENDENCIA` | Situações do regimento do CETEP | Situações configuráveis por rede (doc 3) |
| `Curso.modalidade` (ex.: "EPI") e turmas como "1TELN1E" | Siglas internas | Modalidades do Censo + código livre da turma |
| `Prova`/gerador | Cabeçalho de prova pensado para o CETEP | Modelo de documento com a identidade da escola (doc 3) |
| Defaults `2026` | Ver 1.2 | `AnoLetivo` |
| `lib/plataforma.ts` | Conta da plataforma dentro da escola CETEP | Usuários da plataforma fora das escolas |

---

## 1.6 Conquistas que a nova arquitetura precisa manter

1. **Isolamento por escola**: subdomínio → `x-escola-id` no `proxy.ts`, nunca vindo do cliente; `escolaId` da sessão em toda consulta; teste automático de vazamento.
2. **Permissões centralizadas** em `can()` — a direção está certa; falta terminar a migração (≈26 arquivos com checagem inline) e trocar booleanos por papéis.
3. **Regras puras em `src/lib/services`** (notas, frequência, calendário, chamada, diário) com testes: o motor não conhece banco nem tela.
4. **Esquema de avaliação configurável** (5 formas de cálculo, recuperação por etapa e final, frequência geral ou por componente).
5. **Calendário letivo + horário + chamada** produzindo "aulas previstas" — base para o diário oficial.
6. **Segurança de acesso** (limite de tentativas, redefinição por link, troca obrigatória de senha, CSP).

## 1.7 Lacunas de segurança encontradas nesta leitura (para a fase 0 do roteiro)

1. Três PDFs de relatório (`relatorio/resultados`, `relatorio/status`, `relatorio/turma/.../disciplina`) conferem só login + escola, não o papel. Um aluno do portal provavelmente consegue baixá-los chamando a URL. **Ação**: adicionar ao `isolamento-escolas.test.ts` no bloco "aluno do portal" e corrigir.
2. Server action `reportarEstudanteFaltante` (em `simulados/actions.ts`) não confere papel.
3. Rotas dos módulos pagos aceitam chamadas com o módulo desligado (exceto banco de questões no POST e financeiro).
4. `Questao`, `Prova`, `PlanoEnsino`, `MatrizCurricular` não têm `escolaId` próprio: o isolamento depende de cada consulta lembrar o caminho (professor → escola, turma → escola, curso → escola).

*Fontes internas: `prisma/schema.prisma`, `src/lib/rbac.ts`, `src/lib/modules.ts`, `src/lib/modules-server.ts`, `src/proxy.ts`, `src/lib/isolamento-escolas.test.ts`, os três planos na raiz e o `git log` (123 commits).*
