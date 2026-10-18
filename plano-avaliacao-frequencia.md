# Plano: Avaliação, Frequência e Horário de Aulas — Sistema Áxis

**Objetivo:** fazer o motor de notas cobrir os sistemas de avaliação mais usados pelas escolas brasileiras (não só "média simples das unidades") e criar o módulo de **frequência**, usando o **horário de aulas** e o **calendário letivo** como base para saber quais aulas existiram e, portanto, quais faltas são possíveis.

## Status (atualizado em 18/10/2026)

| Passo (seção 4) | Situação |
|---|---|
| 1. Decisões | ✅ Seção 5 |
| 2. Regra de avaliação (schema + motor) | ✅ Migration `avaliacao_regra_configuravel`; motor com 5 formas de cálculo, peso por etapa, `MEDIA_COM_UNIDADE`, `MEDIA_COM_FINAL`; esquemas legados com resultado idêntico (testes) |
| 3. Tela de esquemas | ✅ Escala, forma de cálculo por etapa e final, recuperação, frequência (campos gravados; chamada ainda não existe) |
| 4. Migrar leitores de `nota1/2/3` | ✅ Todas as telas, PDFs e o portal leem `NotaUnidade` com colunas U1..UN do esquema da turma (`src/lib/services/notas-leitura.ts`). Lançamento parou o dual-write; seed grava no modelo novo. Colunas `nota_1/2/3` e `is_desistente_unid1/2/3` removidas (migration `remove_colunas_notas_legadas`, que antes copia para `notas_unidades` qualquer nota ainda sem etapas) |
| 5–9 | ⏳ Não iniciados |

Pendências pequenas registradas no caminho:
- `api/conselho-classe` ainda valida a nota de recuperação contra 0–10 fixo (deveria usar `notaMaxima` do esquema).
- `api/notas/lancar` grava aluno por aluno sem transação: se o 3º aluno de um lote tem nota inválida, os 2 primeiros já ficaram salvos.

---

## 1. Onde estamos hoje

| Peça | Situação atual | Limitação |
|---|---|---|
| `EsquemaAvaliacao` | N unidades, cada uma com N atividades. Nota da unidade = **soma** das atividades. Média final = **média simples** das unidades | Não tem peso por unidade, outras formas de compor a unidade (média, ponderada, maior nota), escala (0–10 vs 0–100), conceito, nem "exame final com média" |
| Atividades | Definidas pela escola no esquema (igual para todos os professores) | Na prática o professor costuma decidir quantas avaliações faz em cada etapa |
| `HorarioAula` | `turmaId + diaSemana + horario (nº do tempo)`, com **disciplina e professor em texto livre** | Não liga com `Disciplina`/`User`, não tem horário de início/fim, não serve de base para chamada |
| Calendário | Só `GlobalConfig.anoLetivoAtual` | Não existem datas de início/fim, bimestres, feriados ou dias letivos |
| Frequência | Só `isDesistenteUnid1/2/3` (marca "DS/INF" manual) | Não há chamada, contagem de faltas nem regra dos 75% |
| `Disciplina` | Nome + turma + área | Sem carga horária / aulas semanais |

---

## 2. Inspiração: como os sistemas existentes modelam isso

### 2.1 Notas

| Modelo | Como funciona | Onde se vê |
|---|---|---|
| **Média aritmética das etapas** | `MF = (B1 + B2 + B3 + B4) / 4` | Modelo mais comum em redes com bimestres. É o que o Áxis já faz |
| **Média ponderada das etapas** | `MF = (2·N1 + 3·N2) / 5` — etapas finais pesam mais | Comum em institutos federais e cursos técnicos |
| **Soma de pontos** | Ano vale 100 pontos (ex.: 30 + 30 + 40); aprova com 60 | Comum em escolas particulares |
| **Forma de cálculo da etapa escolhida** | Dentro da etapa: maior nota, média aritmética, média ponderada, soma com divisor ou soma simples | SUAP-EDU (IFs) — o professor escolhe por diário ([manual IFSul](http://cpte.ifsul.edu.br/docs/suap-edu/Manual%20do%20Docente%20SUAP-Edu.pdf), [UENP](https://nti.uenp.edu.br/wp-content/uploads/2023/10/suapEDU-Execucao-de-Semestre-Professor.pdf)) |
| **Fórmula configurável** | Variáveis como `E1..En` (etapas), `Se` (soma das etapas), `Et` (nº de etapas), `Rc` (recuperação) | i-Educar — "fórmulas de cálculo da média", reaproveitadas entre regras ([docs i-Educar](https://ieducar.org/docs/user-regras-avaliacao-notas.html)) |
| **Categorias com peso** | Provas 60%, trabalhos 30%, participação 10% — vale para todas as atividades da categoria | Google Classroom, Canvas, Moodle |
| **Conceito / parecer** | A–E ou "Atingiu / Parcialmente / Não atingiu"; parecer descritivo | Anos iniciais e educação infantil |

**Recuperação**, nas variações que aparecem nesses sistemas:
- **Paralela (por etapa):** substitui a nota da etapa se for maior, ou faz média com ela.
- **Final / exame:** nota mínima isolada **ou** média entre média anual e exame (`(MA + EF) / 2 ≥ 5` — o README do Áxis já descrevia essa regra) **ou** substitui a menor etapa.
- **Conselho de classe:** decisão administrativa, não fórmula (o Áxis já trata assim).

### 2.2 Frequência

- **Regra legal:** LDB art. 24, VI — mínimo de **75% do total de horas letivas** para aprovação no ensino fundamental e médio. O regimento da escola pode ser mais exigente (ex.: 85%) ou exigir frequência mínima **por componente** ([art. 24 LDB](https://modeloinicial.com.br/lei/L-9394-1996/lei-diretrizes-bases-educacao-nacional/art-24), [CEEd-RS](https://www.ceed.rs.gov.br/upload/arquivos/202001/17165648-1211301815reso-0233.pdf)). Pré-escola tem regra própria (60%, art. 31, IV).
- **i-Educar:** a frequência mora dentro da própria regra de avaliação, com "tipo de presença" **geral** ou **por componente** e percentual mínimo. Aluno sem nenhuma falta lançada deve dar 100%, não "vazio" — bug real corrigido por eles ([PR #1209](https://github.com/portabilis/i-educar/pull/1209)).
- **SUAP / diário de classe:** o diário registra **data, quantidade de aulas, conteúdo ministrado e frequência** de cada aula ([manual IFSul](http://cpte.ifsul.edu.br/docs/suap-edu/Manual%20do%20Docente%20SUAP-Edu.pdf)).
- **Anos iniciais:** é comum a chamada ser **por dia** (professor polivalente), não por aula.

---

## 3. Proposta de modelo

### 3.1 Regra de avaliação (evolução do `EsquemaAvaliacao`)

A ideia é a do i-Educar: **uma "regra" por curso/turma que define notas E frequência**, já que a situação final do aluno combina as duas.

```prisma
enum TipoNota       { NUMERICA CONCEITUAL }
enum FormaCalculo   { SOMA MEDIA_ARITMETICA MEDIA_PONDERADA SOMA_COM_DIVISOR MAIOR_NOTA }
enum ModoRecuperacaoUnidade { SUBSTITUI_SE_MAIOR MEDIA_COM_UNIDADE }           // + MEDIA_COM_UNIDADE
enum ModoRecuperacaoFinal   { NOTA_MINIMA_ISOLADA SUBSTITUI_MENOR_UNIDADE MEDIA_COM_FINAL } // + MEDIA_COM_FINAL
enum ApuracaoFrequencia     { GERAL POR_COMPONENTE }
enum RegistroFrequencia     { POR_AULA POR_DIA }
enum DefinicaoAtividades    { ESCOLA PROFESSOR }

model EsquemaAvaliacao {
  // ...campos atuais...
  tipoNota              TipoNota            @default(NUMERICA)
  notaMaxima            Float               @default(10)    // 10 ou 100
  casasDecimais         Int                 @default(1)
  formaCalculoFinal     FormaCalculo        @default(MEDIA_ARITMETICA) // como as ETAPAS viram a média final
  notaMinimaExameFinal  Float?                                  // usado em MEDIA_COM_FINAL
  definicaoAtividades   DefinicaoAtividades @default(ESCOLA)
  // Frequência (mesma regra decide aprovação)
  registroFrequencia    RegistroFrequencia  @default(POR_AULA)
  apuracaoFrequencia    ApuracaoFrequencia  @default(GERAL)    // LDB: total de horas letivas
  frequenciaMinima      Float               @default(75)
}

model EsquemaUnidade {
  // ...campos atuais...
  peso         Float        @default(1)      // peso da etapa na média final (ponderada)
  formaCalculo FormaCalculo @default(SOMA)   // como as ATIVIDADES viram a nota da etapa
  divisor      Float?                        // SOMA_COM_DIVISOR
}

model EsquemaAtividade {
  // hoje "peso" = quanto a atividade vale (soma direta). Separar os dois conceitos:
  notaMaxima Float           // quanto vale (ex.: prova vale 6)
  peso       Float @default(1) // quanto pesa (MEDIA_PONDERADA)
}
```

**Migração sem mudar resultado:** cada esquema legado vira `formaCalculo = SOMA` (etapa), `formaCalculoFinal = MEDIA_ARITMETICA`, `notaMaxima da atividade = peso atual`, `peso = 1`. É exatamente a conta de hoje.

**Atividades definidas pelo professor** (`definicaoAtividades = PROFESSOR`, modelo SUAP): a escola define as etapas e a forma de cálculo; o professor cria as avaliações de cada etapa no diário dele, dentro dos limites (ex.: soma das notas máximas ≤ nota máxima da etapa). Isso pede um modelo novo `AvaliacaoDisciplina (disciplinaId, esquemaUnidadeId, nome, data, notaMaxima, peso)` ao lado do template da escola.

**Fórmula livre (estilo i-Educar):** fica para depois. Os cinco modos de cálculo + pesos cobrem os modelos da seção 2.1 sem precisar de um interpretador de fórmulas.

### 3.2 Calendário letivo

```prisma
model PeriodoLetivo {          // o ano (ou semestre) letivo da escola
  id, escolaId, anoLetivo, inicio DateTime, fim DateTime
}
model EtapaCalendario {        // datas de cada etapa de um esquema naquele ano
  id, periodoLetivoId, esquemaUnidadeId, inicio, fim, prazoLancamento DateTime?
}
model DiaNaoLetivo {           // feriado, recesso, planejamento...
  id, escolaId, data, tipo (FERIADO|RECESSO|PLANEJAMENTO|OUTRO), descricao, turmaId? // turmaId = só aquela turma
}
model DiaLetivoExtra {         // sábado letivo / reposição
  id, escolaId, data, seguirHorarioDe Int // dia da semana cuja grade é usada
}
```

### 3.3 Horário de aulas (base das faltas)

```prisma
model TempoAula {              // grade de tempos da escola, por turno
  id, escolaId, turno, ordem, inicio String /* "07:00" */, fim String /* "07:50" */
}
model HorarioAula {            // substitui o atual (texto livre -> chaves reais)
  id, turmaId, diaSemana, tempoAulaId, disciplinaId, professorId?,
  vigenteDe DateTime, vigenteAte DateTime?   // troca de horário no meio do ano sem perder o histórico
}
model Disciplina {
  // + cargaHoraria Int?  (horas no período)  + aulasSemanais Int?
}
```

**Aulas previstas** = horário vigente × dias letivos da etapa (calendário − dias não letivos + dias extras). Com isso o sistema sabe, antes de qualquer chamada, quantas aulas cada disciplina deveria ter, e consegue avisar se a carga horária não vai fechar.

### 3.4 Frequência

```prisma
model Aula {                   // o "registro de aula" do diário
  id, turmaId, disciplinaId?,  // null = chamada diária (anos iniciais)
  professorId?, data, tempoAulaId?, quantidade Int @default(1),
  conteudo String?,            // conteúdo ministrado
  situacao (PREVISTA|REALIZADA|CANCELADA), chamadaRealizada Boolean
  @@unique([turmaId, data, tempoAulaId])
}
model Falta {                  // só a exceção é gravada; quem não tem Falta estava presente
  id, aulaId, estudanteId, justificativaId?
  @@unique([aulaId, estudanteId])
}
model Justificativa {          // atestado, abono legal...
  id, estudanteId, inicio, fim, tipo (ATESTADO|ABONO_LEGAL|OUTRO),
  efeito (ABONA|SO_JUSTIFICA), // ABONA: falta não conta; SO_JUSTIFICA: conta, mas fica registrada
  documentoUrl?, registradoPorId
}
```

- **Gravar só as faltas** (mais `chamadaRealizada` na aula) evita ~30 linhas por aula por turma e deixa "sem falta = presente" explícito. Isso já evita o bug do i-Educar citado acima.
- **Aulas materializadas sob demanda:** a `Aula` é criada quando o professor abre a chamada daquele dia (a partir do horário). As previstas são calculadas, não pré-geradas para o ano todo.
- **Cálculo:** `frequência = (aulas realizadas − faltas não abonadas) / aulas realizadas`, por disciplina e geral. A regra (`GERAL` ou `POR_COMPONENTE` + `frequenciaMinima`) decide qual número vale para aprovação.
- **Situação final:** novo status `REPROVADO_FALTA`. O motor passa a decidir com nota **e** frequência. Os `isDesistenteUnid*` atuais passam a poder ser derivados da frequência (aluno sem presença na etapa).
- **Alertas:** o `risk-analysis.ts` ganha risco por infrequência. Faltas reiteradas sem justificativa são caso de comunicação ao Conselho Tutelar (ECA, art. 56) — vale ter um relatório para isso.

### 3.5 Motor de cálculo (`src/lib/services/notas.ts`)

Continua sendo funções puras e testadas:
- `calcularNotaEtapa(atividades, formaCalculo, divisor)`
- `calcularMediaFinal(etapas com peso, formaCalculoFinal)` + recuperação por etapa e final (com o novo `MEDIA_COM_FINAL`)
- `calcularFrequencia(aulasRealizadas, faltas, abonos)` → percentual
- `calcularSituacaoFinal(nota, frequencia, regra)` → status

---

## 4. Ordem de execução

1. **Decisões em aberto** (seção 5).
2. **Regra de avaliação:** schema aditivo (seção 3.1) + migração dos esquemas legados para os campos novos, com o motor provando que dá o mesmo resultado nas 450 notas atuais.
3. **Tela de esquemas:** peso da etapa, forma de cálculo, escala, tipo de recuperação.
4. **Migrar os leitores de `nota1/2/3`** (~16 telas/PDFs: relatórios, resultados, conselho, boletim, portal) para ler as etapas do modelo novo, com colunas U1…UN dinâmicas. Depois, desligar o dual-write e remover as colunas antigas.
5. **Atividades por professor** (se a decisão for essa).
6. **Calendário letivo** + **tempos de aula** + **horário com chaves reais** (migrar o texto livre atual casando nome de disciplina/professor; o que não casar fica para revisão manual).
7. **Chamada:** registro de aula + faltas, a partir do horário.
8. **Cálculo de frequência** no boletim, portal, relatórios e na situação final (`REPROVADO_FALTA`).
9. **Justificativas/abonos** e relatório de infrequência.

---

## 5. Decisões (confirmadas em 18/10/2026)

| # | Pergunta | Decisão |
|---|---|---|
| 1 | Quem define as atividades de cada etapa? | **Configurável por esquema** (`definicaoAtividades`): ESCOLA primeiro, PROFESSOR no passo 5 |
| 2 | Chamada por aula ou por dia? | **Configurável por esquema**; padrão POR_AULA, POR_DIA para anos iniciais |
| 3 | Frequência mínima geral ou por componente? | **Configurável**; padrão GERAL 75% (LDB) |
| 4 | Nota conceitual (A–E) já? | **Não** — campo `tipoNota` no schema, só NUMERICA implementada |
| 5 | Fórmula livre tipo i-Educar? | Não por enquanto — os 5 modos + pesos cobrem os modelos comuns |
