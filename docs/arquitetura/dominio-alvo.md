# 2. Domínio-alvo — o modelo de uma escola real

> **Resumo.** Este documento descreve **como o Áxis deveria enxergar uma escola** depois da revisão, independente de como o código está hoje.
> A mudança central é separar quatro ideias que hoje estão misturadas: **a pessoa** (quem é: nome, documentos, endereço), **o papel dela na escola** (estudante, responsável, professor, secretaria...), **a vida escolar** (em que ano, curso e turma o estudante esteve, e o que aconteceu: aprovação, transferência, abandono) e **a conta de acesso** (login e senha).
> Com isso, o estudante passa a ter cadastro completo (documentos, saúde, deficiência, transporte, autorizações), os responsáveis passam a existir com vínculos claros (filiação, responsável legal, financeiro, quem pode buscar), e cada ano letivo vira uma **matrícula** própria, com **enturmações** (passagens por turmas) e **movimentações** registradas — o que permite histórico escolar, documentos e exportação para o Censo Escolar.
> A estrutura da escola ganha **etapas e modalidades no padrão do Censo** (infantil a EJA e técnico), um **catálogo de componentes curriculares** e uma **matriz curricular** de verdade.
> Os booleanos de papel (`isDirecao`, `isStaff`...) são trocados por **papéis com permissões**, com um caminho de migração que não quebra a CETEP.
> No fim há um diagrama das entidades e a lista do que é decisão de produto (detalhada no documento 6).

---

## 2.1 Princípios do modelo

1. **A escola continua sendo o "inquilino"** (*tenant*: a unidade que isola os dados). Toda tabela nova com dado de pessoa ou de vida escolar tem `escolaId` **próprio** — nada de isolamento "por caminho" (via turma ou via professor), que é frágil (ver inventário 1.7).
2. **Pessoa ≠ papel ≠ conta.** Uma mesma pessoa pode ser mãe de um aluno e professora da escola; pode ter ou não um login. Isso evita cadastrar a mesma pessoa duas vezes.
3. **Nada da vida escolar é apagado ou sobrescrito.** Mudar de turma, transferir, abandonar ou concluir gera um **registro com data**, não uma troca de campo. O histórico sai disso.
4. **Vocabulário de sistema acadêmico brasileiro** (o que o professor já conhece do SIGEduc, i-Educar, SUAP): *matrícula*, *enturmação*, *remanejamento*, *componente curricular*, *unidade/etapa*, *situação final*, *diário de classe*, *ata de resultados finais*, *histórico escolar*.
5. **Alinhado ao Censo Escolar (Educacenso/INEP)**: os campos e as listas de opções (cor/raça, nacionalidade, deficiência, transporte, etapa de ensino) seguem as categorias do Censo, para a exportação ser uma conversão direta e não um "de-para" manual.
6. **Dados sensíveis separados** (saúde, deficiência, CID, decisões judiciais): ficam em tabelas próprias, com permissão própria e registro de quem leu (LGPD, seção 2.8).

---

## 2.2 Pessoa e cadastros

### 2.2.1 Pessoa (a base de todos)

`Pessoa` guarda o que identifica alguém, seja estudante, responsável ou profissional. Uma linha por pessoa **por escola** (ver decisão D-05 no documento 6 sobre compartilhar pessoas entre escolas de uma mesma rede).

| Grupo | Campos | Observação |
|---|---|---|
| Identificação | nome civil, **nome social** (Decreto 8.727/2016 e normas de educação: o nome social aparece nas telas e chamadas; o civil nos documentos oficiais quando exigido), data de nascimento, sexo (como o Censo pede), cor/raça (branca, preta, parda, amarela, indígena, não declarada) | Abaixo de 16 anos, a cor/raça é **declarada pelo responsável**; a partir de 16, autodeclaração. Guardar quem declarou |
| Nacionalidade | nacionalidade (brasileira, brasileira nascida no exterior/naturalizada, estrangeira), país de nascimento, UF e município de nascimento (código IBGE) | Código IBGE evita "Salvador", "salvador-ba", "SSA" |
| Documentos | CPF, RG (número, órgão emissor, UF, data de expedição), certidão de nascimento (modelo novo: matrícula de 32 dígitos; modelo antigo: livro/folha/termo/cartório), NIS (Número de Identificação Social — usado no Bolsa Família e no acompanhamento de frequência do programa), Cartão Nacional de Saúde (SUS), passaporte/RNM para estrangeiros | Tabela `DocumentoPessoa` (tipo + número + dados extras), para não criar 20 colunas vazias |
| Endereço | CEP, logradouro, número, complemento, bairro, município (IBGE), UF, **zona de residência (urbana/rural)**, localização diferenciada (área de assentamento, terra indígena, quilombola) | Zona e localização diferenciada são campos do Censo |
| Contatos | telefones (tipo: celular, residencial, trabalho, recado; se tem WhatsApp), e-mails | Tabela `ContatoPessoa`, vários por pessoa |
| Foto | foto (opcional) | Uso de imagem depende de autorização (2.2.4) |

### 2.2.2 Estudante

`Estudante` = uma `Pessoa` no papel de aluno daquela escola. Guarda o que é **permanente** do aluno; o que é **de cada ano** vai para `Matricula` (2.3).

| Grupo | Campos |
|---|---|
| Identificação escolar | código interno da escola (o "número de matrícula" que a CETEP usa hoje continua existindo como **código do estudante**), **código INEP do aluno** (ID gerado pelo Educacenso), RA/código da rede estadual (quando a rede tiver) |
| Transporte | usa transporte escolar público? (sim/não); poder público responsável (municipal/estadual); tipos de veículo (rodoviário: vans, micro-ônibus, ônibus, bicicleta, tração animal, outro; aquaviário: embarcações por capacidade) — listas do Censo |
| Programas sociais | beneficiário de programas (ex.: Bolsa Família — informar NIS) — opcional, sensível |
| Situação de vida | **restrição judicial** de convívio/guarda (quem não pode buscar ou receber informação) — sensível, só secretaria e direção |
| Observações | observações gerais da secretaria |

### 2.2.3 Saúde, deficiência e AEE (tabelas sensíveis)

| Tabela | Campos | Quem vê |
|---|---|---|
| `SaudeEstudante` | tipo sanguíneo, **alergias** (alimentar, medicamentosa, outras — com gravidade), **medicações de uso contínuo** (nome, dose, horário, se a escola administra e com qual autorização), restrições alimentares, condições crônicas (asma, diabetes, epilepsia...), plano de saúde, orientações em caso de emergência | Secretaria, direção, coordenação; professores veem **só o resumo de alerta** ("alergia grave a amendoim") |
| `DeficienciaEstudante` | tipos conforme o Censo (deficiência física, intelectual, visual — cegueira/baixa visão/visão monocular, auditiva — surdez/deficiência auditiva, surdocegueira, múltipla; **transtorno do espectro autista**; **altas habilidades/superdotação**), laudo (opcional: o Censo aceita outros documentos comprobatórios, como o próprio plano de AEE), data | AEE, direção, coordenação, secretaria |
| `RecursoAvaliacao` | recursos para provas (prova ampliada, superampliada, em braile, ledor, transcritor, intérprete de Libras, leitura labial, tempo adicional, sala especial) | AEE e professores da turma (o professor precisa saber para montar a prova) |
| `FichaAEE` (hoje `AEEProfile`) | condição, CIDs (opcional), recomendações, foto, ciência dos professores (`AEEAcknowledgement`, que já existe) | AEE, direção; professor vê recomendações e confirma ciência |
| `PlanoAEE` (PEI — Plano Educacional Individualizado) | objetivos, estratégias, recursos, período, profissionais, avaliação periódica | AEE, coordenação, professor da turma (leitura) |

> **Por que separar CID e laudo:** a Lei Brasileira de Inclusão e as orientações do Censo não exigem laudo médico para o atendimento educacional especializado; o CID é dado de saúde (sensível, art. 11 da LGPD). O modelo permite registrar a deficiência **sem** CID, e o CID fica opcional e mais restrito.

### 2.2.4 Autorizações e termos

`Autorizacao` (por estudante): tipo (uso de imagem e voz; **saída desacompanhado**; passeios/atividades externas; administração de medicação; participação em pesquisa; termo de ciência LGPD), decisão (autoriza/não autoriza), **quem assinou** (o responsável legal, `Pessoa`), quando, como (papel assinado digitalizado, aceite no portal), validade (ano letivo, data, permanente até revogar), revogação.

A ideia é que cada tipo de autorização tenha um **modelo de texto** configurável pela escola (documento 3) e que o portal da família permita o aceite digital.

### 2.2.5 Responsáveis e vínculos

Hoje **não existem**. No alvo:

- O responsável é uma `Pessoa` (com CPF, contatos, endereço, profissão/escolaridade opcionais).
- O vínculo entre estudante e responsável é a tabela `VinculoResponsavel`, com:

| Campo | Para quê |
|---|---|
| parentesco | mãe, pai, avó/avô, tio(a), irmão(ã), padrasto/madrasta, tutor(a), guardião(ã), outro |
| `filiacao` (1 ou 2, ou nenhum) | o Censo e os documentos pedem "filiação 1" e "filiação 2" (não mais "mãe" e "pai" fixos) |
| `responsavelLegal` | quem responde legalmente e assina (matrícula, autorizações, consentimento LGPD do art. 14) |
| `responsavelFinanceiro` | quem paga (escolas privadas; usado pelo módulo Financeiro) |
| `autorizadoBuscar` | pode retirar o aluno da escola |
| `proibidoBuscar` / restrição | ordem judicial ou pedido do responsável legal (com documento) |
| `moraCom` | estudante mora com esta pessoa |
| `contatoEmergencia` + ordem | a quem ligar primeiro |
| `recebeComunicados` | entra na lista do portal/avisos |
| `acessoPortal` | pode ter login no Portal da Família |
| vigência | início/fim (ex.: guarda que mudou) |

- Um responsável pode ter **vários estudantes** (irmãos) e enxergar todos no portal com um só login — impossível hoje, porque `User.estudanteId` aponta para um estudante só.
- Autorizados a buscar que não são parentes (motorista de van, vizinha) também são `Pessoa` + `VinculoResponsavel` com só `autorizadoBuscar = true`.

### 2.2.6 Profissionais da escola

`Profissional` = uma `Pessoa` no papel de funcionário:

| Campo | Observação |
|---|---|
| funções (pode ter várias) | docente, auxiliar/assistente educacional, profissional de apoio escolar (para alunos com deficiência), tradutor-intérprete de Libras, docente titular/auxiliar, coordenador pedagógico, secretário escolar, diretor, vice-diretor, orientador educacional, bibliotecário, merendeira, porteiro etc. (o Censo pede a função do profissional em cada turma) |
| vínculo funcional | concursado/efetivo, contrato temporário, terceirizado, CLT (escolas privadas) |
| escolaridade e formação | nível, curso superior, licenciatura, pós-graduação, formação continuada (dados do Censo para docentes) |
| matrícula funcional | número do servidor (rede pública) |
| lotação | em quais escolas da rede está e com qual carga horária |

`Docencia` liga profissional a **turma × componente** (quem dá aula de quê, em qual turma, de quando a quando) — substitui as relações `disciplinasPermitidas` e `turmasPermitidas` de hoje e permite **substituição** (professor substituto num período) sem perder quem lançou o quê.

### 2.2.7 Conta de acesso

`Usuario` = só o login (e-mail/usuário, senha, troca obrigatória, último acesso, ativo). Liga-se a **uma `Pessoa`** (opcional para contas técnicas). O que a conta pode fazer vem dos **papéis** (2.5). Portal da família e portal do estudante deixam de ser "um tipo de usuário" (`isPortalUser`) e passam a ser papéis.

---
