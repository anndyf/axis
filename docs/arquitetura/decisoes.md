# 6. Decisões — o que precisa da dona do produto

> **Resumo.** Esta lista reúne as escolhas de **produto e negócio** que a revisão encontrou e que **não** foram tomadas aqui, em ordem de prioridade (as que travam trabalho primeiro).
> Cada item traz a pergunta em linguagem simples, as opções com prós e contras, a recomendação e **o que fica travado** enquanto não houver resposta.
> Cada decisão tem um código fixo (D-01, D-02...) usado nos outros documentos; a **posição na lista** é a prioridade, o código é só a referência.
> Boa notícia: as fases 0 a 3 do roteiro (segurança, garantia de módulo, assinaturas no banco, papéis) **não dependem** de nenhuma decisão difícil e podem começar já.
> As cinco mais urgentes: **D-03** (escolas públicas, privadas ou ambas no lançamento), **D-01** (o que é Núcleo e quais são os módulos), **D-14** (janela da migração na CETEP), **D-06** (quais etapas atender primeiro) e **D-04** (vender para redes agora ou depois).

Legenda de prioridade: 🔴 bloqueia fase próxima · 🟠 bloqueia fase intermediária · 🟢 pode esperar.

---

### 1. 🔴 D-03 — Para quem o Áxis será vendido primeiro: escolas públicas, privadas ou ambas?

- **Por que importa**: muda o que é prioridade. Escola pública precisa de Censo, documentos oficiais no padrão da rede, integração (ou convivência) com o sistema da secretaria estadual/municipal (ex.: SIGEduc na Bahia). Escola privada precisa de financeiro, contrato, matrícula/rematrícula com cobrança, portal da família caprichado.
- **Opções**:
  - (a) **Pública primeiro** — prós: a CETEP já é pública, o produto atual nasceu para ela; o diário e a frequência já soam como o SIGEduc. Contras: a escola estadual já é obrigada a usar o sistema da rede, então o Áxis vira "sistema complementar" (o que a escola não tem no oficial: provas, AEE, indicadores) — a venda é por escola, com orçamento pequeno, ou por rede (municipal), com licitação.
  - (b) **Privada primeiro** — prós: decisão de compra rápida (a própria escola), disposição a pagar por assinatura. Contras: exige o módulo Financeiro e portal da família antes; concorrência forte de sistemas privados estabelecidos.
  - (c) **Ambas desde o início** — prós: mercado maior. Contras: dobra o escopo do primeiro ano.
- **Recomendação**: **(a) pública, com foco em redes municipais e escolas técnicas**, e o Financeiro como módulo posterior. O Áxis já tem o que um professor de rede pública reconhece; redes municipais pequenas costumam não ter sistema próprio e precisam do Censo.
- **Trava**: prioridade das fases 9–11 × Financeiro; nomes e conteúdo dos pacotes (D-11); fase 6 (tipos de matrícula da rede privada, como contrato).

### 2. 🔴 D-01 — O que entra no Núcleo obrigatório e qual é a lista de módulos?

- **Por que importa**: define o `ModuloId` que todo o código vai marcar na fase 1 (difícil mudar depois sem retrabalho no mapa de rotas).
- **Opções**:
  - (a) **Catálogo do documento 4** (13 módulos + Núcleo, com Banco de Questões separado do Gerador de Provas) — prós: granular, permite pacotes variados. Contras: mais combinações para testar e explicar.
  - (b) **Menos módulos, maiores** (ex.: "Pedagógico" = Diário + Notas + Resultados; "Ferramentas" = Questões + Provas + Planejamento) — prós: simples de vender. Contras: impede o caso "gestão pedagógica sem notas" que a própria dona citou.
  - (c) **Núcleo maior** (incluir Diário no Núcleo) — prós: toda escola tem diário. Contras: tira a opção de vender só cadastro/secretaria.
- **Recomendação**: **(a)**, porque o código fica granular e os **pacotes** (D-11) agrupam para a venda — granularidade técnica não obriga a vender módulo por módulo. Confirmar especialmente: Diário **fora** do Núcleo; Banco de Questões separado do Gerador.
- **Trava**: fase 1 (pode começar com a lista do documento 4 e ajustar o mapa se mudar, com custo baixo).

### 3. 🔴 D-14 — Quando a CETEP pode passar pela troca para "matrícula por ano" (fase 6)?

- **Por que importa**: é a mudança mais arriscada (mexe na leitura de notas e frequência). Feita no meio do fechamento do ano, pode atrapalhar conselho de classe e resultado final.
- **Opções**:
  - (a) **Antes do fechamento de 2026** (nov/2026) — prós: o fechamento e a rematrícula de 2027 já saem no fluxo novo. Contras: pouco tempo; fases 3–5 precisam estar prontas.
  - (b) **Na virada** (entre o fim do conselho e o início de 2027) — prós: o ano velho já está fechado. Contras: secretaria ocupada com rematrícula.
  - (c) **Depois da 1ª unidade de 2027** — prós: tempo para testar com calma em cópia. Contras: a rematrícula 2027 ainda usa o "promover turma" atual (que funciona).
- **Recomendação**: **(c)**, com a fase 6 rodando em **cópia do banco** durante o fechamento de 2026 para validar a equivalência com dados reais. A virada de 2027 usa o fluxo atual; o histórico de 2026 é reconstruído no backfill.
- **Trava**: data de execução das fases 6–7.

### 4. 🔴 D-06 — Quais etapas e modalidades o Áxis atende no lançamento?

- **Por que importa**: Educação Infantil e anos iniciais pedem **parecer descritivo/conceito** (sem nota), chamada por dia, campos de experiência da BNCC; técnico e EJA pedem regime semestral/modular.
- **Opções**: (a) Fundamental anos finais + Médio + Técnico + EJA (o que já funciona com nota numérica); (b) tudo, incluindo Infantil e anos iniciais (exige conceito/parecer); (c) começar pelo atual e anunciar Infantil como "em breve".
- **Recomendação**: **(a) com o catálogo completo no banco** (custa pouco) e o conceito/parecer como primeira entrega depois da fase 11 — isso abre as redes municipais (que concentram infantil e fundamental I).
- **Trava**: seed do catálogo (fase 4, leve) e escopo do motor de avaliação conceitual.

### 5. 🟠 D-04 — Vender para redes (mantenedora com várias escolas) agora ou depois?

- **Opções**: (a) só escolas avulsas no início; (b) redes desde já (painel consolidado, padrões herdados, transferência entre unidades); (c) preparar o banco para rede (`Mantenedora` opcional) mas só vender avulso por enquanto.
- **Prós/contras**: (a) simples, mas pode exigir remodelagem depois; (b) maior contrato por venda, mas mais escopo (herança de configuração em tudo); (c) custo baixo agora e não fecha a porta.
- **Recomendação**: **(c)** — o `schema-alvo.prisma` já traz `Mantenedora` opcional; a herança de configurações e o painel de rede ficam para depois.
- **Trava**: fase 8 (herança) e módulo Indicadores de rede.

### 6. 🟠 D-05 — Numa rede, a mesma pessoa é um cadastro só em todas as escolas?

- **Exemplo**: aluno transferido da Escola A para a Escola B da mesma rede municipal; mãe com filhos em duas unidades.
- **Opções**: (a) **Pessoa por escola** (cada escola tem a sua cópia; a transferência copia os dados) — prós: isolamento simples e forte, igual ao de hoje; LGPD mais simples (cada escola controla os seus). Contras: duplicação; mãe com dois logins. (b) **Pessoa por mantenedora** (cadastro único na rede, vínculos por escola) — prós: sem duplicação, transferência instantânea. Contras: o isolamento passa a ter dois níveis (rede e escola), mais complexo de testar.
- **Recomendação**: **(a) agora**, com o campo `mantenedoraId` previsto, e um "transferir dentro da rede" que copia o cadastro. Rever quando houver o primeiro cliente-rede.
- **Trava**: fase 5a.

### 7. 🟠 D-02 — O que acontece com os dados quando um módulo é desligado?

- **Opções**: (a) somem das telas na hora (ficam no banco); (b) **somente leitura** por um período e depois só exportação; (c) somente leitura para sempre.
- **Recomendação**: **(b)** com 90 dias de leitura, e uma exceção: **histórico, atas e resultados finais já fechados ficam sempre legíveis enquanto a escola for cliente** (a escola é obrigada a emiti-los). Nunca apagar ao desligar.
- **Trava**: fase 2 (estado `SOMENTE_LEITURA` e prazos).

### 8. 🟠 D-11 — Quais pacotes vender e como precificar?

- **Opções**: (a) pacotes fixos (Essencial, Pedagógico, Completo) + add-ons; (b) à la carte (escola monta); (c) pacote único com tudo.
- **Recomendação**: **(a)** — pacotes para a maioria e add-ons para o resto (documento 4.5.2). **Preço não definido** nesta revisão: precisa de pesquisa de mercado e de custo (infraestrutura por estudante, suporte, SMS/WhatsApp).
- **Trava**: nomes dos planos no backfill da fase 2 (pode usar os três atuais e renomear depois).

### 9. 🟠 D-08 — A partir de que idade o estudante tem login próprio?

- **Opções**: (a) qualquer idade (como hoje: login = matrícula); (b) configurável por escola (ex.: a partir do 6º ano); (c) a partir de 12 anos (adolescente, ECA) por padrão, configurável.
- **Recomendação**: **(c)** — crianças acessam pelo login do responsável; a escola pode mudar a idade. Combina com o art. 14 da LGPD (melhor interesse) e reduz contas inativas.
- **Trava**: fase 5c.

### 10. 🟠 D-09 — Por quanto tempo guardar cada tipo de dado, e quando anonimizar?

- **Exemplos**: histórico e atas (guarda permanente da escrituração escolar); observações de chamada; fichas AEE de ex-alunos; autorizações vencidas; logs de acesso; dados de escola que cancelou o contrato.
- **Opções**: (a) prazos fixos do Áxis para todas; (b) padrões do Áxis, ajustáveis pela escola dentro de limites; (c) a escola define tudo.
- **Recomendação**: **(b)**, com orientação jurídica para os padrões (o Áxis é **operador**; a escola, **controladora**). Sugestão de partida: logs 5 anos; observações de chamada e ocorrências até 5 anos após a saída; AEE/saúde até 5 anos após a saída; histórico e atas: entregar à escola e nunca apagar sem ordem dela.
- **Trava**: fase 10 (e o contrato de assinatura).

### 11. 🟠 D-12 — O portal do estudante (com notas) faz parte de "Avaliação e Notas" ou de "Comunicação e Portal da Família"?

- **Opções**: (a) o portal **básico** (estudante vê o próprio boletim e frequência) vem junto com NOT/DIA, e COM acrescenta o **responsável**, comunicados e notificações; (b) todo portal é COM.
- **Recomendação**: **(a)** — hoje a CETEP já tem o portal do estudante; tirar isso dela seria um rebaixamento. COM vende o que é novo (família, avisos, autorizações).
- **Trava**: mapa de rotas da fase 1 (`portal/**`).

### 12. 🟠 D-13 — Período de teste e o que fazer quando a escola passa do limite de estudantes

- **Opções (teste)**: 14, 30 ou 60 dias; com tudo liberado ou só o pacote escolhido. **Opções (limite)**: bloquear novas matrículas; cobrar excedente; só avisar e negociar.
- **Recomendação**: teste de **30 dias com o pacote escolhido** (escola testa o que vai comprar) e, no limite, **avisar e cobrar excedente** — **nunca bloquear matrícula** de estudante.
- **Trava**: fase 2 (campos e regras de teste/limite).

### 13. 🟢 D-07 — A escola pode criar papéis próprios?

- **Opções**: (a) só os papéis do sistema; (b) papéis próprios montados a partir das permissões existentes; (c) papéis do sistema + "ajustes finos" por usuário.
- **Recomendação**: **(b)**, depois que a fase 3 estabilizar com os papéis do sistema. (c) é difícil de auditar.
- **Trava**: tela de papéis (fase 3b, parte final).

### 14. 🟢 D-17 — O que a página pública de verificação de documento mostra?

- **Opções**: (a) só "documento válido/cancelado" + tipo + data + escola; (b) (a) + nome do estudante abreviado (ex.: "Maria S. O."); (c) cópia do PDF.
- **Recomendação**: **(b)** — permite a quem recebe o documento conferir sem expor dados; (c) expõe dados de menor a quem tiver o código.
- **Trava**: fase 9a.

### 15. 🟢 D-10 — Quantos campos personalizados e quem pode criá-los?

- **Opções**: limite por entidade (20/50/sem limite); só direção/secretaria ou também a mantenedora.
- **Recomendação**: **50 por entidade**, criados por Secretaria/Direção (e Mantenedora quando houver rede). Campos sensíveis exigem confirmação explícita ("este campo guarda dado de saúde/religião/...").
- **Trava**: fase 8b.

### 16. 🟢 D-19 — Situações próprias do regimento (ex.: "Conservado", "Dependência" na CETEP)

- **Opções**: (a) situações fixas, a escola só renomeia e escolhe quais usa; (b) a escola cria situações novas.
- **Recomendação**: **(a)** — situação nova sem significado fixo quebra Censo, histórico e relatórios (documento 3.4.3). Confirmar com a CETEP o significado exato de *Conservado* no regimento dela para mapear corretamente.
- **Trava**: backfill das situações na fase 6 (precisa do mapeamento).

### 17. 🟢 D-15 — Vocabulário padrão das telas

- **Pergunta**: confirmar os padrões propostos (documento 3.4.1): **Unidade** para etapa, **Componente curricular** na gestão e **Disciplina** na tela do professor, **Série/Ano** conforme a etapa, **Matrícula** para o código do aluno, **Enturmação**, **Remanejamento**, **Situação final**.
- **Recomendação**: adotar — é o vocabulário de SIGEduc, i-Educar e SUAP, e a escola pode renomear.
- **Trava**: textos das telas novas a partir da fase 4.

### 18. 🟢 D-18 — Censo Escolar: gerar o arquivo de importação ou só relatórios de conferência?

- **Opções**: (a) gerar o arquivo no leiaute do Educacenso (migração de dados); (b) gerar relatórios para a secretaria digitar/conferir no sistema do INEP; (c) não tratar.
- **Contexto**: escola estadual na Bahia normalmente tem os dados do Censo carregados pela rede; para ela, (b) basta. Rede municipal sem sistema próprio precisa de (a).
- **Recomendação**: **(b) primeiro, (a) quando houver cliente-rede municipal** (depende de D-03/D-04). O modelo de dados já fica pronto para (a).
- **Trava**: fase 11b.

### 19. 🟢 D-16 — Financeiro escolar: construir ou integrar?

- **Opções**: (a) construir completo (contratos, mensalidades, boletos/Pix via gateway, inadimplência, notas fiscais); (b) módulo leve (contratos e mensalidades) integrado a um gateway de cobrança e a um sistema contábil externo; (c) não oferecer.
- **Recomendação**: **(b)** quando D-03 incluir escolas privadas; antes disso, manter o esqueleto atual fora do menu.
- **Trava**: módulo FIN (pós-fase 11).

### 20. 🟢 D-20 — Notificações por WhatsApp/SMS

- **Pergunta**: oferecer? como cobrar (custo por mensagem)?
- **Opções**: (a) só e-mail e push (o app já é PWA), sem custo variável; (b) WhatsApp/SMS como add-on por pacote de mensagens; (c) incluído no plano.
- **Recomendação**: **(a) no lançamento do módulo Comunicação e (b) como add-on** — WhatsApp é o canal mais usado pelas famílias, mas tem custo por mensagem e regras da plataforma (modelos aprovados), então não cabe "incluído".
- **Trava**: módulo COM (fase pós-11).

---

## Decisões já tomadas (registradas em planos anteriores — não reabrir sem motivo)

| Tema | Decisão | Onde |
|---|---|---|
| Atividades da etapa | Configurável por esquema (ESCOLA ou PROFESSOR) | `plano-avaliacao-frequencia.md`, seção 5 |
| Chamada por aula ou por dia | Configurável por esquema | idem |
| Frequência geral ou por componente | Configurável; padrão GERAL 75% | idem |
| Nota conceitual | Campo no schema, implementação depois | idem |
| Fórmula livre | Não; 5 formas de cálculo + pesos | idem |
| Subdomínio por escola | `escola.dominio` | `plano-multi-tenant-axis.md` |
