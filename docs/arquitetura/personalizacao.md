# 3. Personalização — como cada escola adapta o Áxis

> **Resumo.** Escolas diferentes (creche particular, escola municipal de fundamental, colégio técnico estadual, EJA noturna) precisam de coisas diferentes, mas o Áxis precisa continuar **um sistema só**, que dá para manter e testar.
> A proposta organiza a personalização em **cinco camadas**: (1) **configurações estruturadas** que já existem e funcionam (esquema de avaliação, calendário, tempos, identidade visual); (2) **campos personalizados** que a escola cria para pedir informações a mais; (3) **formulário de matrícula configurável** (o que pedir, o que é obrigatório, em que ordem); (4) **nomenclaturas** (unidade/bimestre/trimestre, série/ano, turma) e etapas oferecidas; (5) **modelos de documentos** com a identidade da escola.
> Para os campos personalizados, a recomendação é guardar em **JSONB** (uma coluna de dados flexíveis do PostgreSQL) com as definições em tabela, e não em EAV nem em colunas novas.
> Para não virar um sistema impossível de manter, o documento termina com a lista do que **não** é personalizável: regras legais, situações do Censo, permissões básicas, cálculo de frequência, isolamento entre escolas e o formato dos dados oficiais.
> Herança de **rede** (mantenedora define, escola ajusta) atravessa todas as camadas.

---

## 3.1 As camadas e quem decide

| Camada | Exemplos | Quem configura | Herda da rede? | Estado hoje |
|---|---|---|---|---|
| 1. Configurações estruturadas | Esquema de avaliação, calendário letivo, tempos de aula, frequência mínima, identidade visual | Direção/secretaria | Sim (rede pode travar) | ✅ existe (exceto herança) |
| 2. Campos personalizados | "Igreja que frequenta", "Tamanho da camiseta do uniforme", "Linha do ônibus" | Secretaria | Sim | ❌ |
| 3. Formulário de matrícula | Quais campos padrão e personalizados aparecem, obrigatórios, ordem, seções | Secretaria | Sim | ❌ |
| 4. Nomenclaturas e oferta | "Unidade" × "Bimestre"; "Série" × "Ano"; etapas e modalidades oferecidas | Direção | Sim | parcial (nome das etapas no esquema) |
| 5. Modelos de documentos | Declaração, histórico, boletim, ata, autorizações | Secretaria | Sim | ❌ (PDFs fixos no código) |

Regra de herança (quando houver rede): cada configuração tem três estados — **definida pela rede e travada**, **definida pela rede e ajustável pela escola**, **livre da escola**. Sem rede, tudo é "livre da escola".

---

## 3.2 Campos personalizados

### 3.2.1 Definição

Tabela `CampoPersonalizado` (por escola, ou por mantenedora):

| Atributo | Valores | Observação |
|---|---|---|
| entidade | estudante, responsável, matrícula, profissional, turma, ocorrência | Onde o campo "mora" |
| chave | `tamanho_camiseta` | Gerada do rótulo, **imutável** depois de criada (os dados guardados usam a chave) |
| rótulo, texto de ajuda | "Tamanho da camiseta" | Pode mudar à vontade |
| tipo | texto curto, texto longo, número, data, sim/não, lista de opções (uma), lista de opções (várias), telefone, CPF, e-mail, arquivo (anexo) | Cada tipo tem validação pronta |
| opções | para listas: `[{valor:"P",rotulo:"P"}, ...]` | Valor estável, rótulo editável |
| obrigatoriedade | nunca / na matrícula / sempre | "Na matrícula" = exigido só no formulário de matrícula |
| validação extra | mínimo/máximo, tamanho, expressão simples (só para texto) | Sem código livre |
| onde aparece | ficha do estudante, formulário de matrícula, portal da família (responsável preenche/atualiza), lista da turma, relatórios | |
| **sensível?** | sim/não | Se sim: só papéis com permissão `campos.sensiveis.ler`, fica fora de exportações gerais, leitura registrada. Não pode ser marcado como obrigatório |
| exportável? | sim/não | Se entra no CSV/planilha e em qual coluna |
| situação | ativo / arquivado | Campo nunca é apagado se tiver dados; arquivado some dos formulários e continua no histórico |
| ordem, seção | para o formulário | |

### 3.2.2 Armazenamento: três alternativas

| Critério | **JSONB** na própria tabela (`Estudante.camposExtras`) | **EAV** (tabela `ValorCampo`: entidade, campo, valor) | **Colunas fixas** (migration por pedido) |
|---|---|---|---|
| O que é | Um "envelope" de dados flexíveis no PostgreSQL, indexável | Uma linha por valor de cada campo de cada pessoa | Criar coluna nova no banco quando uma escola pedir |
| Leitura da ficha | 1 consulta, já vem junto | Junção com N linhas | 1 consulta |
| Busca/filtro ("alunos com camiseta M") | Bom com índice GIN; tipos ficam no JSON (comparar número/data exige conversão) | Ruim em volume (junções), mas tipado se tiver coluna por tipo | Ótimo |
| Relatórios | Bom: o Postgres extrai `camposExtras->>'tamanho_camiseta'` | Pivotar linhas em colunas é trabalhoso | Ótimo |
| Validação | Feita no código a partir da definição (Zod gerado da definição) | Idem | Pelo banco |
| Multi-escola | Cada escola tem suas chaves; sem conflito | Idem | **Inviável**: coluna de uma escola aparece para todas |
| Migração quando o campo muda de tipo | Script que converte os valores daquela chave | Idem | Migration |
| Prisma (ORM) | Suportado (`Json`), consultas por chave via filtro JSON ou SQL tipado | Suportado | Suportado |
| LGPD (apagar/anonimizar um campo, exportar dados do titular) | Simples: remover a chave do JSON | Simples: apagar linhas | Simples |
| Risco | JSON "lixo" se a validação falhar — mitigado por validar sempre no serviço e por teste | Lento e verboso | Explode o schema |

**Recomendação: JSONB** (`camposExtras Json @default("{}")`) nas tabelas `Estudante`, `VinculoResponsavel`/`Pessoa`, `Matricula` e `Profissional`, com:

- definições em `CampoPersonalizado`;
- um serviço puro `validarCamposExtras(definicoes, valores)` em `src/lib/services` (testado como os motores de nota);
- índice GIN (*Generalized Inverted Index*, índice do Postgres para buscar dentro de JSON) só quando a escola marcar o campo como "filtrável" em listas;
- **campos sensíveis em JSON separado** (`camposSensiveis`) na tabela sensível correspondente (`SaudeEstudante`), para a permissão e o registro de leitura funcionarem por tabela;
- limite de quantidade (ex.: 50 campos por entidade) para proteger desempenho — número é decisão D-10.

### 3.2.3 Impacto em busca, relatórios e exportação

- **Busca rápida (Ctrl+K)**: não busca em campos personalizados (só nome, código, CPF) — evita lentidão e vazamento de campo sensível.
- **Listas e filtros**: campos marcados "filtrável" viram filtro na lista de estudantes.
- **Relatórios**: o gerador de relatório/planilha (CSV/XLSX) oferece os campos exportáveis como colunas opcionais.
- **Censo**: campos personalizados **nunca** alimentam o Censo. Dado do Censo é campo padrão (documento 2).
- **Exportação do titular (LGPD)**: todos os campos, inclusive sensíveis, com rótulo legível.

---

## 3.3 Formulário de matrícula configurável

Tabela `ModeloFormulario` (por escola, tipo = matrícula nova / rematrícula / atualização cadastral pelo portal):

- **Seções** (Dados do estudante, Documentos, Endereço, Responsáveis, Saúde, Transporte, Autorizações, Informações adicionais) com ordem.
- **Itens**: referência a um **campo padrão** (ex.: `pessoa.cpf`) ou a um **campo personalizado**, com obrigatoriedade *no formulário* e texto de ajuda próprio.
- **Regras fixas que o formulário não pode desligar**: nome, data de nascimento, ao menos um responsável legal para menor de 18 anos, série/curso pretendido — sem eles não existe matrícula.
- **Avisos do Censo**: o editor do formulário mostra "este campo é exigido pelo Censo Escolar" ao lado de cor/raça, nacionalidade, transporte etc. A escola pode deixá-lo opcional na matrícula, mas o sistema lista pendências antes da exportação do Censo.
- **Documentos a anexar**: lista configurável (certidão, comprovante de residência, cartão de vacina, histórico da escola anterior), com "entregue/pendente" — a secretaria acompanha a pendência sem barrar a matrícula.
- **Pré-matrícula pelo portal** (fase futura): o mesmo modelo é usado na tela pública/da família; a secretaria confere e efetiva.

Herança: a rede publica um modelo; a escola pode acrescentar itens e (se a rede permitir) tornar opcionais os itens não fixos.

---

## 3.4 Nomenclaturas, modalidades e etapas

### 3.4.1 Rótulos configuráveis

Tabela `Nomenclatura` (por escola, com padrão da plataforma). Somente **rótulos de tela e documento**; o significado no sistema não muda.

| Conceito no sistema | Padrão (soa como SIGEduc/sistemas brasileiros) | Alternativas comuns |
|---|---|---|
| Etapa de avaliação | **Unidade** | Bimestre, Trimestre, Semestre, Etapa, Período |
| Ano/série | **Série** (médio/técnico), **Ano** (fundamental) — automático pela etapa | Módulo, Período, Grupo, Fase, Eixo, Segmento |
| Turma | **Turma** | Classe, Sala, Grupo |
| Componente curricular | **Componente curricular** (telas de gestão) / **Disciplina** (telas do professor) | Matéria, Campo de experiência (infantil) |
| Recuperação | **Recuperação** | Estudos de recuperação, Prova final, Exame |
| Conselho de classe | **Conselho de classe** | Conselho de ano/série |
| Responsável | **Responsável** | Família, Encarregado |
| Matrícula (código do aluno) | **Matrícula** | RA, Código, Número |

Hoje o esquema de avaliação já permite nomear cada etapa ("1ª Unidade"); o novo `Nomenclatura` cobre o **termo genérico** usado em menus e relatórios ("Lançar notas da unidade" × "do bimestre").

Implementação: função `termo(escola, 'etapa', { plural, artigo })` lida no servidor e enviada ao cliente junto com a sessão; textos com concordância simples (o/a, os/as) cadastrados junto com o rótulo.

### 3.4.2 Oferta da escola

Na configuração inicial (assistente de implantação), a escola marca as **etapas** que oferece (do catálogo nacional, documento 2.4.1). Isso:

- cria cursos e séries padrão (com nomes padrão editáveis);
- sugere o esquema de avaliação padrão por etapa (ex.: Educação Infantil → parecer descritivo, sem nota, frequência mínima 60%; Fundamental anos iniciais → chamada por dia; Médio → por aula, 75%);
- liga/desliga partes de tela (sem infantil, nada de "campos de experiência"; sem técnico, nada de eixo tecnológico).

### 3.4.3 Situações e regras do regimento

Algumas escolas têm situações próprias do regimento (a CETEP usa *Conservado* e *Dependência*). Proposta: as **situações do componente e da matrícula são fixas** (documento 2.3.3, alinhadas ao Censo), e a escola configura:

- quais delas usa (ex.: escola sem progressão parcial desliga *Dependência*);
- o **rótulo** e a **sigla** de cada uma no boletim e na ata (ex.: *CO — Conservado* como rótulo de "Reprovado" no regimento da escola, se for o caso) — decisão D-19;
- o número máximo de dependências.

---

## 3.5 Modelos de documentos

Documentos oficiais (declaração de matrícula, de frequência, de transferência, de conclusão, boletim, histórico, ata de resultados finais, ficha individual, autorizações) saem de **modelos**, não de código fixo.

| Item | Proposta |
|---|---|
| Formato do modelo | HTML com marcadores (`{{estudante.nome}}`, `{{matricula.serie}}`, `{{escola.endereco}}`) e blocos prontos (tabela de notas, tabela do histórico, quadro de frequência, assinaturas), convertido em PDF no servidor. Linguagem de modelo **sem lógica livre** (só substituição, repetições e condicionais simples), para não permitir código da escola rodando no servidor |
| Identidade da escola | Cabeçalho com brasão/logo da escola **e** da mantenedora (ex.: Governo do Estado), nome, código INEP, ato de autorização/credenciamento, endereço; rodapé com assinaturas (cargo + nome) |
| Modelos de fábrica | O Áxis fornece modelos padrão por tipo; a escola **duplica e ajusta** (não edita o de fábrica) |
| Versão | Cada modelo tem versão; o `DocumentoEmitido` guarda qual versão gerou o documento |
| Verificação | QR code + código curto impresso; a página pública de conferência mostra **apenas** tipo, data, escola, nome abreviado e situação (válido/cancelado) — nunca dados sensíveis. Detalhe na decisão D-17 |
| Assinatura | Fase 1: assinatura impressa/escaneada + QR. Fase 2 (opcional): assinatura eletrônica (gov.br ou certificado ICP-Brasil) — decisão futura |
| Quem edita | Secretaria com permissão `documento.modelo.editar`; pré-visualização com dados de um aluno de exemplo |

---

## 3.6 O que NÃO deve ser personalizável

Para o Áxis continuar sendo **um** produto testável:

| Não personalizável | Por quê |
|---|---|
| Isolamento entre escolas, autenticação, regras de senha | Segurança |
| Lista de **permissões** (a escola pode montar papéis com elas, não criar permissões novas) | O código só conhece as permissões que existem |
| Situações da matrícula e do componente (só rótulo/uso) | Censo, histórico e relatórios dependem de um significado fixo |
| Cálculo de frequência (aulas dadas − faltas não abonadas) e regra legal mínima (75%/60%) | LDB. A escola pode exigir **mais**, não menos |
| Formas de cálculo de nota fora das 5 existentes + conceito/parecer | Fórmula livre (estilo i-Educar) é cara de testar; já foi decisão registrada no plano de avaliação |
| Campos padrão do Censo e seus valores (cor/raça, deficiência, transporte...) | São listas oficiais |
| Estrutura das tabelas (nada de "colunas por escola") | Manutenção |
| Fluxo de vida escolar (matrícula → enturmação → movimentações → fechamento) | O histórico depende dele |
| Código rodando dentro de modelos (scripts, fórmulas em documentos) | Segurança |
| Telas (layout) | Uma tela por função; personalização é de rótulos, campos e itens visíveis, não de layout |
| Dados sensíveis obrigatórios | LGPD (minimização) |

Regra de bolso para pedidos novos: **se a variação aparece em mais de uma escola, vira configuração estruturada; se é de uma escola só, vira campo personalizado ou rótulo; se exige lógica nova, vira funcionalidade do produto para todos** (ou não é feita).

---

## 3.7 Onde mora cada configuração (técnico)

| Configuração | Tabela | Leitura |
|---|---|---|
| Identidade, contatos oficiais, termos | `Escola`, `ConfiguracaoEscola` | `escolaDaRequisicao()` (já existe, com cache por requisição) |
| Nomenclaturas | `Nomenclatura` | carregadas com a sessão |
| Campos personalizados | `CampoPersonalizado` | serviço de validação + formulário dinâmico |
| Formulários | `ModeloFormulario`, `ItemFormulario` | tela de matrícula |
| Documentos | `ModeloDocumento` (+ versão) | gerador de PDF |
| Avaliação, calendário, tempos | já existem | motores em `src/lib/services` |
| Herança de rede | coluna `mantenedoraId` + `escolaId` nas tabelas acima, e `bloqueado` | serviço `configuracaoEfetiva(escola, chave)` que resolve escola ?? rede ?? padrão |
